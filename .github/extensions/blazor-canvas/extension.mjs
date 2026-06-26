import { createServer } from "node:http";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const extensionName = "blazor-canvas";
const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(extensionDir, "..", "..", "..");
const publishDir = path.join(workspaceRoot, "publish", "blazorcanvas", "wwwroot");
const sampleStoreFile = path.join(resolveCopilotHome(), "extensions", extensionName, "artifacts", "canvas-state.json");
const maxRequestBytes = 16 * 1024;
const maxEvents = 10;
const eventLevels = new Set(["info", "success", "warning"]);
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
let sampleState = null;
let mutationQueue = Promise.resolve();
let eventSequence = 1;
let sseClientSequence = 1;
const sseClients = new Map();
const openInstanceIds = new Set();

function resolveCopilotHome() {
    const fromEnv = process.env.COPILOT_HOME?.trim();
    if (fromEnv) {
        return fromEnv;
    }

    const homeDir = process.env.USERPROFILE ?? process.env.HOME;
    if (homeDir) {
        return path.join(homeDir, ".copilot");
    }

    return path.join(workspaceRoot, ".copilot");
}

function log(message, level = "info") {
    if (sessionRef) {
        void sessionRef.log(message, { level });
    }
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

function ensureMethod(req, res, allowedMethod) {
    if (req.method === allowedMethod) {
        return true;
    }

    res.writeHead(405, {
        Allow: allowedMethod,
        "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify({ error: `Method not allowed. Use ${allowedMethod}.` }));
    return false;
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

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fieldName, maxLength) {
    if (typeof value !== "string") {
        throw createStatusError(400, `\`${fieldName}\` must be a string.`);
    }

    const normalized = value.trim();
    if (!normalized) {
        throw createStatusError(400, `\`${fieldName}\` must not be empty.`);
    }

    if (normalized.length > maxLength) {
        throw createStatusError(400, `\`${fieldName}\` must be ${maxLength} characters or fewer.`);
    }

    return normalized;
}

function normalizeOptionalText(value, fieldName, maxLength, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    return normalizeText(value, fieldName, maxLength);
}

function normalizeLevel(value) {
    const level = normalizeOptionalText(value, "level", 16, "info");
    if (!eventLevels.has(level)) {
        throw createStatusError(400, "`level` must be info, success, or warning.");
    }

    return level;
}

function normalizeEvent(rawEvent, index) {
    const raw = rawEvent && typeof rawEvent === "object" ? rawEvent : {};
    return {
        id: normalizeOptionalText(raw.id, "id", 80, `event-${index + 1}`),
        kind: normalizeOptionalText(raw.kind, "kind", 40, "sample"),
        level: eventLevels.has(raw.level) ? raw.level : "info",
        message: normalizeOptionalText(raw.message, "message", 240, "Sample event."),
        updatedAt: normalizeOptionalText(raw.updatedAt, "updatedAt", 80, new Date().toISOString()),
    };
}

function normalizeCopilotStatus(value) {
    const status = normalizeOptionalText(value, "lastCopilotReply", 800, "No Copilot send yet.");
    return status === "No Copilot reply yet." ? "No Copilot send yet." : status;
}

function defaultSampleState() {
    const now = new Date().toISOString();
    return {
        version: 1,
        updatedAt: now,
        messageFromAgent: "No message from an agent action yet.",
        messageFromBlazor: "No message sent from Blazor yet.",
        lastCopilotReply: "No Copilot send yet.",
        events: [
            {
                id: "event-1",
                kind: "initialized",
                level: "info",
                message: "Minimal canvas sample is ready.",
                updatedAt: now,
            },
        ],
    };
}

function normalizeSampleState(rawState) {
    if (!rawState || typeof rawState !== "object" || rawState.version !== 1) {
        return defaultSampleState();
    }

    return {
        version: 1,
        updatedAt: normalizeOptionalText(rawState.updatedAt, "updatedAt", 80, new Date().toISOString()),
        messageFromAgent: normalizeOptionalText(rawState.messageFromAgent, "messageFromAgent", 240, "No message from an agent action yet."),
        messageFromBlazor: normalizeOptionalText(rawState.messageFromBlazor, "messageFromBlazor", 240, "No message sent from Blazor yet."),
        lastCopilotReply: normalizeCopilotStatus(rawState.lastCopilotReply),
        events: Array.isArray(rawState.events)
            ? rawState.events.slice(0, maxEvents).map((event, index) => normalizeEvent(event, index))
            : defaultSampleState().events,
    };
}

async function ensureSampleState() {
    if (sampleState) {
        return;
    }

    await mkdir(path.dirname(sampleStoreFile), { recursive: true });

    try {
        const fileBody = await readFile(sampleStoreFile, "utf8");
        sampleState = normalizeSampleState(JSON.parse(fileBody));
        eventSequence = nextEventSequence(sampleState.events);
    } catch (error) {
        if (error?.code !== "ENOENT") {
            const message = error instanceof Error ? error.message : "Unknown sample state read error.";
            log(`Could not read sample state; resetting. ${message}`, "warning");
        }
        sampleState = defaultSampleState();
        eventSequence = nextEventSequence(sampleState.events);
        await persistSampleState();
    }
}

function nextEventSequence(events) {
    const numericIds = events
        .map((event) => /^event-(\d+)$/.exec(event.id)?.[1])
        .filter(Boolean)
        .map(Number);
    return Math.max(1, ...numericIds) + 1;
}

async function persistSampleState() {
    if (!sampleState) {
        return;
    }

    await mkdir(path.dirname(sampleStoreFile), { recursive: true });
    const tempFile = `${sampleStoreFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, `${JSON.stringify(sampleState, null, 2)}\n`, "utf8");
    await rename(tempFile, sampleStoreFile);
}

function addEvent(state, kind, level, message) {
    const event = {
        id: `event-${eventSequence++}`,
        kind,
        level,
        message,
        updatedAt: new Date().toISOString(),
    };
    state.events = [event, ...(state.events ?? [])].slice(0, maxEvents);
    return event;
}

function statePayload() {
    return {
        ...clone(sampleState ?? defaultSampleState()),
        storePath: sampleStoreFile,
    };
}

function writeSsePayload(res, payload) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcastSampleUpdate(kind, message) {
    if (!sampleState) {
        return;
    }

    const payload = {
        kind,
        message,
        updatedAt: sampleState.updatedAt,
        state: statePayload(),
    };

    for (const res of sseClients.values()) {
        writeSsePayload(res, payload);
    }
}

async function mutateSampleState(mutator, broadcastKind, broadcastMessage) {
    const run = mutationQueue.catch(() => undefined).then(async () => {
        await ensureSampleState();
        const result = await mutator(sampleState);
        sampleState.updatedAt = new Date().toISOString();
        await persistSampleState();
        if (broadcastKind) {
            broadcastSampleUpdate(broadcastKind, broadcastMessage);
        }
        return result ?? statePayload();
    });
    mutationQueue = run;
    return run;
}

function closeAllSseClients() {
    for (const res of sseClients.values()) {
        res.end();
    }
    sseClients.clear();
}

async function sendToCopilotFromBlazor(message) {
    if (!sessionRef) {
        throw createStatusError(503, "Copilot session is not ready.");
    }

    const prompt = [
        "Minimal Blazor canvas integration check:",
        "A Blazor button sent this message to Copilot through the extension.",
        "Reply with one short acknowledgement. Do not modify files.",
        "",
        `Message from the Blazor UI: ${message}`,
    ].join("\n");

    return sessionRef.send(prompt);
}

async function setMessageFromAgent(message) {
    return mutateSampleState(
        (state) => {
            state.messageFromAgent = message;
            addEvent(state, "agent-message", "success", "Agent action updated the Blazor-visible message.");
        },
        "agent-message",
        "Agent action updated the Blazor-visible message.",
    );
}

async function appendAgentEvent(message, level) {
    return mutateSampleState(
        (state) => {
            addEvent(state, "agent-event", level, message);
        },
        "agent-event",
        message,
    );
}

async function handleStateRequest(req, res) {
    if (!ensureMethod(req, res, "GET")) {
        return;
    }

    await ensureSampleState();
    sendJson(res, 200, statePayload());
}

async function handleAskCopilotRequest(req, res) {
    if (!ensureMethod(req, res, "POST")) {
        return;
    }

    const body = await readJsonBody(req);
    const message = normalizeText(body.message, "message", 240);
    const messageId = await sendToCopilotFromBlazor(message);
    const payload = await mutateSampleState(
        (state) => {
            state.messageFromBlazor = message;
            state.lastCopilotReply = `Sent to Copilot. Message id: ${messageId}`;
            addEvent(state, "copilot-send", "success", "Blazor queued a message to Copilot.");
        },
        "copilot-send",
        "Blazor queued a message to Copilot.",
    );

    sendJson(res, 200, payload);
}

async function handleBlazorPingRequest(req, res) {
    if (!ensureMethod(req, res, "POST")) {
        return;
    }

    const body = await readJsonBody(req);
    const message = normalizeOptionalText(body.message, "message", 160, "Blazor triggered an extension API event.");
    const payload = await mutateSampleState(
        (state) => {
            addEvent(state, "blazor-ping", "info", message);
        },
        "blazor-ping",
        message,
    );

    sendJson(res, 200, payload);
}

async function handleResetRequest(req, res) {
    if (!ensureMethod(req, res, "POST")) {
        return;
    }

    sampleState = defaultSampleState();
    eventSequence = nextEventSequence(sampleState.events);
    await persistSampleState();
    broadcastSampleUpdate("reset", "Sample state reset.");
    sendJson(res, 200, statePayload());
}

async function handleEventsRequest(req, res) {
    if (!ensureMethod(req, res, "GET")) {
        return;
    }

    await ensureSampleState();
    const clientId = sseClientSequence++;
    res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    sseClients.set(clientId, res);
    writeSsePayload(res, {
        kind: "snapshot",
        message: "Connected to sample events.",
        updatedAt: sampleState.updatedAt,
        state: statePayload(),
    });

    req.on("close", () => {
        sseClients.delete(clientId);
    });
}

async function handleApiRequest(req, res, requestPath) {
    if (requestPath === "/api/sample/state") {
        await handleStateRequest(req, res);
        return true;
    }

    if (requestPath === "/api/sample/ask-copilot") {
        await handleAskCopilotRequest(req, res);
        return true;
    }

    if (requestPath === "/api/sample/blazor-ping") {
        await handleBlazorPingRequest(req, res);
        return true;
    }

    if (requestPath === "/api/sample/reset") {
        await handleResetRequest(req, res);
        return true;
    }

    if (requestPath === "/api/events") {
        await handleEventsRequest(req, res);
        return true;
    }

    return false;
}

async function handleStaticRequest(res, requestPath) {
    const requestedPath = requestPath === "/" ? "/index.html" : requestPath;
    const filePath = resolveServePath(requestedPath);
    const withinPublishDir = filePath === publishDir || filePath.startsWith(`${publishDir}${path.sep}`);
    if (!withinPublishDir) {
        throw createStatusError(403, "Requested path is outside of the published Blazor app.");
    }

    try {
        const fileStat = await stat(filePath);
        if (fileStat.isFile()) {
            await sendFile(res, filePath);
            return;
        }
    } catch (error) {
        if (error?.code !== "ENOENT") {
            throw error;
        }
    }

    const fallbackPath = path.join(publishDir, "index.html");
    await sendFile(res, fallbackPath);
}

async function handleRequest(req, res) {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const requestPath = requestUrl.pathname;

    if (await handleApiRequest(req, res, requestPath)) {
        return;
    }

    await handleStaticRequest(res, requestPath);
}

async function waitForBlazorServer(url) {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return;
            }
        } catch {
            // Retry until the loopback server accepts connections.
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Blazor canvas server did not respond at ${url}.`);
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
        await ensureSampleState();
        log(`Minimal canvas state path: ${sampleStoreFile}`);
        log("Starting Minimal Blazor Canvas sample server...");

        const server = createServer((req, res) => {
            void handleRequest(req, res).catch((error) => {
                const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
                const message = error instanceof Error ? error.message : "Unexpected request handler failure.";
                log(`Canvas request failed (${statusCode}): ${message}`, statusCode >= 500 ? "error" : "warning");
                if (!res.headersSent) {
                    sendJson(res, statusCode, { error: message });
                    return;
                }
                res.end();
            });
        });

        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", () => {
                server.off("error", reject);
                resolve();
            });
        });

        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error("Failed to determine Blazor canvas server port.");
        }

        const url = `http://127.0.0.1:${address.port}/`;
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

async function stopBlazorApp() {
    if (!serverEntry) {
        return;
    }

    closeAllSseClients();
    const entry = serverEntry;
    serverEntry = null;
    delete globalThis.__blazorCanvasUrl;
    return new Promise((resolve) => entry.server.close(() => resolve()));
}

const textInputSchema = {
    type: "object",
    additionalProperties: false,
    required: ["message"],
    properties: {
        message: {
            type: "string",
            minLength: 1,
            maxLength: 240,
        },
    },
};

const eventInputSchema = {
    type: "object",
    additionalProperties: false,
    required: ["message"],
    properties: {
        message: {
            type: "string",
            minLength: 1,
            maxLength: 240,
        },
        level: {
            type: "string",
            enum: ["info", "success", "warning"],
        },
    },
};

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "blazor-canvas",
            displayName: "Blazor Canvas",
            description: "Show a minimal Blazor WebAssembly canvas integration checker",
            actions: [
                {
                    name: "reload",
                    description: "Restart the Blazor app behind the canvas",
                    handler: async () => {
                        await stopBlazorApp();
                        await ensureBlazorApp();
                        return {
                            title: "Minimal Blazor Canvas",
                            url: serverEntry?.url ?? null,
                        };
                    },
                },
                {
                    name: "set-message",
                    description: "Send a short message from the agent into the Blazor UI",
                    inputSchema: textInputSchema,
                    handler: async (ctx) => {
                        const message = normalizeText(ctx.input?.message, "message", 240);
                        return setMessageFromAgent(message);
                    },
                },
                {
                    name: "append-event",
                    description: "Append an event-log entry that Blazor receives through SSE",
                    inputSchema: eventInputSchema,
                    handler: async (ctx) => {
                        const message = normalizeText(ctx.input?.message, "message", 240);
                        const level = normalizeLevel(ctx.input?.level);
                        return appendAgentEvent(message, level);
                    },
                },
            ],
            open: async (ctx) => {
                openInstanceIds.add(ctx.instanceId);
                await ensureBlazorApp();
                return {
                    title: "Minimal Blazor Canvas",
                    url: serverEntry?.url ?? null,
                };
            },
            onClose: async (ctx) => {
                openInstanceIds.delete(ctx.instanceId);
                if (openInstanceIds.size === 0) {
                    await stopBlazorApp();
                }
            },
        }),
    ],
});

sessionRef = session;
