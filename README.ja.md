# Minimal Blazor Canvas Demo

このリポジトリは、**.NET 10 Blazor WebAssembly アプリを GitHub Copilot canvas extension 内で表示する**最小サンプルです。

Copilot、extension プロセス、Blazor の連携パターンを確認するサンプルです。

## 確認できること

1. **Agent action から Blazor**: `set-message` canvas action を実行すると、Blazor UI が SSE 経由で更新されます。
2. **Blazor から Copilot**: Blazor の **Send to Copilot** ボタンで extension が `session.send` を呼び、UI はキューされたメッセージ状態をすぐに表示します。
3. **Agent action からイベントログ**: `append-event` を実行すると、Blazor が SSE で新しいイベントを受け取ります。
4. **Blazor から extension API**: **Trigger Blazor ping** ボタンで Blazor が extension HTTP API を呼び、状態更新と SSE 通知を確認できます。
5. **open / reload**: `blazor-canvas` を開く、または `reload` action を実行して loopback サーバーの再起動を確認できます。

## 機能説明ページ

- **Overview** は、連携パターンと試せる canvas action を説明します。
- **Actions** は、Blazor から開始する操作ごとに、トリガー、extension/API の流れ、期待される結果を説明します。
- **Monitor** は、SSE、agent action、永続化された状態変更を見るポイントを説明します。

ヘッダーの言語切替で、日本語 / 英語を切り替えられます。

## 構成

- `.github/extensions/blazor-canvas/extension.mjs`
  - `blazor-canvas` canvas を登録します。
  - 公開済み Blazor アプリを `127.0.0.1` で配信します。
  - 次のサンプル API を提供します。
    - `GET /api/sample/state`
    - `POST /api/sample/ask-copilot`
    - `POST /api/sample/blazor-ping`
    - `POST /api/sample/reset`
    - `GET /api/events`
  - 状態を `~/.copilot/extensions/blazor-canvas/artifacts/canvas-state.json` に保存します。
  - canvas action として `reload`, `set-message`, `append-event` を提供します。

- `BlazorCanvasDemo/Pages/Home.razor`
  - 概要ページです。機能確認用ページへのリンクを表示します。

- `BlazorCanvasDemo/Pages/Actions.razor`
  - Blazor から Copilot または extension API へデータを送信します。

- `BlazorCanvasDemo/Pages/Monitor.razor`
  - 現在の状態、保存先、SSE 状態、Copilot 送信状態、イベントログを表示します。

- `BlazorCanvasDemo/wwwroot/js/sampleEvents.js`
  - `/api/events` を Blazor の JS interop コールバックへ接続します。

## ビルド

リポジトリルートで実行します。

```bash
dotnet publish BlazorCanvasDemo/BlazorCanvasDemo.csproj -c Release -o publish/blazorcanvas
```

その後、Copilot extension を再読み込みするか canvas を開き直してください。
