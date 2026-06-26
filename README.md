# Blazor Canvas Demo

This project demonstrates how to host a .NET 10 Blazor WebAssembly UI inside a GitHub Copilot canvas extension.

## Overview

The solution uses two pieces together:

1. A Copilot canvas extension implemented in `/.github/extensions/blazor-canvas/extension.mjs`
2. A minimal Blazor WebAssembly app in `/BlazorCanvasDemo`

The canvas extension starts a local loopback HTTP server that serves the published Blazor output, then returns that URL to the canvas runtime. The canvas panel renders the Blazor app as its UI.

## Current architecture

- `/.github/extensions/blazor-canvas/extension.mjs`
    - Registers the `blazor-canvas` canvas with Copilot
    - Exposes a `reload` action for the canvas
    - Serves the published Blazor files from a local loopback server
    - Exposes a loopback `POST /api/chat` endpoint used by the Blazor UI
    - Returns the served URL to the canvas runtime when the canvas is opened

- `/BlazorCanvasDemo`
    - Minimal .NET 10 Blazor WebAssembly app
    - Renders a chat UI that sends prompts to the extension and displays AI replies

## How it works

1. Publish the Blazor app with:
   `dotnet publish BlazorCanvasDemo/BlazorCanvasDemo.csproj -c Release -o publish/blazorcanvas`
2. The canvas extension serves the contents of `publish/blazorcanvas/wwwroot` over a local loopback HTTP server.
3. Opening the canvas returns that URL to the Copilot runtime.
4. The Blazor page posts user prompts to `POST /api/chat`.
5. The extension forwards each prompt to Copilot AI with `session.sendAndWait(...)`.
6. The AI response is returned as JSON and rendered in the canvas chat transcript.

## Run locally

Run this command from the repository root:

```bash
dotnet publish BlazorCanvasDemo/BlazorCanvasDemo.csproj -c Release -o publish/blazorcanvas
```

Then reload the Copilot extension (or reopen the canvas) so the extension starts serving the published files.

## Files of interest

- `.github/extensions/blazor-canvas/extension.mjs`
- `BlazorCanvasDemo/Program.cs`
- `BlazorCanvasDemo/Pages/Home.razor`
- `BlazorCanvasDemo/BlazorCanvasDemo.csproj`

## Notes

- This example uses the published Blazor output rather than `dotnet run` for a more stable local hosting flow.
- The canvas UI is served from `127.0.0.1` loopback only, which matches the canvas runtime requirement.
- The canvas extension exposes `reload` as an agent-callable action, while the Blazor UI uses `POST /api/chat` for interactive AI responses.
