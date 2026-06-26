# Minimal Blazor Canvas Demo

This repository is a small **.NET 10 Blazor WebAssembly app hosted inside a GitHub Copilot canvas extension**.

The sample focuses on verifying the integration paths between Copilot, the extension process, and Blazor.

## What it demonstrates

1. **Agent action to Blazor**: invoke the `set-message` canvas action and the Blazor UI updates through SSE.
2. **Blazor to Copilot**: click **Send to Copilot** in Blazor, the extension calls `session.send`, and the UI records the queued message status.
3. **Agent action to event log**: invoke `append-event` and Blazor receives the new event through SSE.
4. **Blazor to extension API**: click **Trigger Blazor ping** and Blazor calls the extension HTTP API, which mutates state and broadcasts SSE.
5. **Open/reload**: open the `blazor-canvas` canvas or invoke `reload` to restart the loopback server.

## Feature pages

- **Overview** explains the integration patterns and the canvas actions to try.
- **Actions** explains each Blazor-originated trigger, the extension/API flow, and the expected result.
- **Monitor** explains what to watch while SSE, agent actions, and persisted state changes happen.

The header language toggle switches the UI between Japanese and English.

## Project layout

- `.github/extensions/blazor-canvas/extension.mjs`
  - Registers the `blazor-canvas` canvas.
  - Serves the published Blazor app on `127.0.0.1`.
  - Exposes sample APIs:
    - `GET /api/sample/state`
    - `POST /api/sample/ask-copilot`
    - `POST /api/sample/blazor-ping`
    - `POST /api/sample/reset`
    - `GET /api/events`
  - Persists state at `~/.copilot/extensions/blazor-canvas/artifacts/canvas-state.json`.
  - Exposes canvas actions: `reload`, `set-message`, and `append-event`.

- `BlazorCanvasDemo/Pages/Home.razor`
  - Overview page with links to the focused test pages.

- `BlazorCanvasDemo/Pages/Actions.razor`
  - Sends data from Blazor to Copilot or the extension API.

- `BlazorCanvasDemo/Pages/Monitor.razor`
  - Displays the current sample state, store path, SSE status, Copilot send status, and event log.

- `BlazorCanvasDemo/wwwroot/js/sampleEvents.js`
  - Connects `/api/events` to Blazor through JS interop.

## Build

From the repository root:

```bash
dotnet publish BlazorCanvasDemo/BlazorCanvasDemo.csproj -c Release -o publish/blazorcanvas
```

Then reload the Copilot extension or reopen the canvas.
