import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(extensionDir, "..", "..", "..");
const publishDir = path.join(workspaceRoot, "publish", "blazorcanvas", "wwwroot");
const maxRequestBytes = 32 * 1024;
const maxPromptChars = 4000;
const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
    ".wasm": "application/wasm",
};

let sessionRef = null;
let serverEntry = null;
let startupPromise = null;

function log(message, level = "info") {
    if (!sessionRef) {
        return;
    }
    void sessionRef.log(message, { level });
}

function createStatusError(statusCode, message) {
    return Object.assign(new Error(message), { statusCode });
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(payload));
}

function resolveServePath(requestPath) {
    const decodedPath = decodeURIComponent(requestPath);
    const safePath = path.normalize(decodedPath).replace(/^([a-zA-Z]:)?[\\/]+/, "");
    return path.resolve(publishDir, safePath === "" ? "." : safePath);
}

async function sendFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] ?? "application/octet-stream";
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(body);
}

async function readJsonBody(req) {
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of req) {
        totalBytes += chunk.length;
        if (totalBytes > maxRequestBytes) {
            throw createStatusError(413, `Request body must be ${maxRequestBytes} bytes or smaller.`);
        }
        chunks.push(chunk);
    }

    if (totalBytes === 0) {
        throw createStatusError(400, "Request body is required.");
    }

    let parsedBody;
    try {
        parsedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw createStatusError(400, "Request body must be valid JSON.");
    }

    if (parsedBody === null || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        throw createStatusError(400, "Request body must be a JSON object.");
    }

    return parsedBody;
}

function normalizePrompt(prompt) {
    if (typeof prompt !== "string") {
        throw createStatusError(400, "`prompt` must be a string.");
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
        throw createStatusError(400, "`prompt` must not be empty.");
    }

    if (trimmedPrompt.length > maxPromptChars) {
        throw createStatusError(400, `\`prompt\` must be ${maxPromptChars} characters or fewer.`);
    }

    return trimmedPrompt;
}

async function askCopilot(prompt) {
    if (!sessionRef) {
        throw createStatusError(503, "Copilot session is not ready yet.");
    }

    const promptForAgent = [
        "You are responding from the Blazor canvas chat UI.",
        "Answer the user request directly and keep formatting simple Markdown.",
        "",
        `User message:`,
        prompt,
    ].join("\n");
    const responseEvent = await sessionRef.sendAndWait({ prompt: promptForAgent }, 120000);
    const responseText = responseEvent?.data?.content?.trim();
    if (!responseText) {
        throw createStatusError(502, "AI returned an empty response.");
    }

    return responseText;
}

async function handleChatRequest(req, res) {
    if (req.method !== "POST") {
        res.writeHead(405, {
            Allow: "POST",
            "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
        return;
    }

    try {
        const body = await readJsonBody(req);
        const prompt = normalizePrompt(body.prompt);
        const reply = await askCopilot(prompt);
        sendJson(res, 200, { reply });
    } catch (error) {
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 502;
        const message = error instanceof Error ? error.message : "Unexpected chat API error.";
        sendJson(res, statusCode, { error: message });
        log(`Canvas chat request failed (${statusCode}): ${message}`, statusCode >= 500 ? "error" : "warning");
    }
}

async function handleStaticRequest(requestPath, res) {
    const requestedPath = resolveServePath(requestPath);
    const relativeToRoot = path.relative(publishDir, requestedPath);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
    }

    try {
        const stats = await stat(requestedPath);
        if (stats.isDirectory()) {
            const indexFile = path.join(requestedPath, "index.html");
            await sendFile(res, indexFile);
            return;
        }
        await sendFile(res, requestedPath);
    } catch {
        const fallback = path.join(publishDir, "index.html");
        try {
            await sendFile(res, fallback);
        } catch {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not Found");
        }
    }
}

async function handleRequest(req, res) {
    const requestPath = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    if (requestPath === "/api/chat") {
        await handleChatRequest(req, res);
        return;
    }

    await handleStaticRequest(requestPath, res);
}

async function waitForBlazorServer(url, timeoutMs = 60000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(url, { method: "GET" });
            if (response.ok) {
                return;
            }
        } catch {
            // The app is still starting up.
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Timed out waiting for Blazor app at ${url}`);
}

async function ensureBlazorApp() {
    if (serverEntry) {
        await waitForBlazorServer(serverEntry.url);
        return;
    }

    if (startupPromise) {
        await startupPromise;
        return;
    }

    startupPromise = (async () => {
        log("Starting the published Blazor WebAssembly app for the canvas...");
        const server = createServer((req, res) => {
            void handleRequest(req, res).catch((error) => {
                const message = error instanceof Error ? error.message : "Unexpected request handler error.";
                log(`Canvas request failed: ${message}`, "error");
                if (res.writableEnded) {
                    return;
                }
                if (!res.headersSent) {
                    sendJson(res, 500, { error: "Internal server error." });
                    return;
                }
                res.end();
            });
        });

        await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
        const address = server.address();
        const port = typeof address === "object" && address ? address.port : 0;
        const url = `http://127.0.0.1:${port}/`;
        serverEntry = { server, url };
        globalThis.__blazorCanvasUrl = url;
        log(`Serving published Blazor files from ${publishDir}`);
        await waitForBlazorServer(url);
    })();

    try {
        await startupPromise;
    } finally {
        startupPromise = null;
    }
}

function stopBlazorApp() {
    if (!serverEntry) {
        return;
    }

    const entry = serverEntry;
    serverEntry = null;
    delete globalThis.__blazorCanvasUrl;
    return new Promise((resolve) => entry.server.close(() => resolve()));
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "blazor-canvas",
            displayName: "Blazor Canvas",
            description: "Show a .NET 10 Blazor WebAssembly screen inside a Copilot canvas",
            actions: [
                {
                    name: "reload",
                    description: "Restart the Blazor app behind the canvas",
                    handler: async () => {
                        await stopBlazorApp();
                        await ensureBlazorApp();
                        return { ok: true, url: serverEntry?.url ?? null };
                    },
                },
            ],
            open: async () => {
                await ensureBlazorApp();
                return {
                    title: "Blazor Canvas",
                    url: serverEntry?.url ?? null,
                };
            },
            onClose: async () => {
                await stopBlazorApp();
            },
        }),
    ],
});

sessionRef = session;
void sessionRef.log("Blazor canvas extension is ready.");
