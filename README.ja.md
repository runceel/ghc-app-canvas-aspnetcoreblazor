# Blazor Canvas Demo

このプロジェクトは、.NET 10 の Blazor WebAssembly UI を GitHub Copilot の canvas extension の中で表示する方法を示すサンプルです。

## 概要

このソリューションは、次の 2 つを組み合わせて構成されています。

1. `/.github/extensions/blazor-canvas/extension.mjs` に実装した Copilot canvas extension
2. `/BlazorCanvasDemo` 配下の最小構成の Blazor WebAssembly アプリ

canvas extension は、公開済みの Blazor 出力をローカルの loopback HTTP サーバーで配信し、その URL を canvas runtime に返します。canvas パネルはその URL を読み込み、Blazor アプリを UI として表示します。

## 現在の構成

- `/.github/extensions/blazor-canvas/extension.mjs`
  - Copilot に `blazor-canvas` という canvas を登録する
  - canvas 用の `reload` アクションを公開する
  - ローカルの loopback サーバーで公開済み Blazor ファイルを配信する
  - Blazor UI から利用する loopback `POST /api/chat` エンドポイントを公開する
  - canvas を開いたときに配信中の URL を canvas runtime に返す

- `/BlazorCanvasDemo`
  - 最小構成の .NET 10 Blazor WebAssembly アプリ
  - プロンプト送信と AI 応答表示ができるチャット UI を表示する

## 動作の流れ

1. Blazor アプリを公開します。
   `dotnet publish BlazorCanvasDemo/BlazorCanvasDemo.csproj -c Release -o publish/blazorcanvas`
2. canvas extension が `publish/blazorcanvas/wwwroot` 配下のファイルをローカル loopback HTTP サーバーで配信する
3. canvas を開くと、その URL を Copilot runtime に返す
4. Blazor ページが `POST /api/chat` にユーザープロンプトを送信する
5. extension が `session.sendAndWait(...)` で Copilot AI に問い合わせる
6. AI 応答を JSON で返し、canvas 上のチャット履歴に表示する

## ローカルで実行する方法

リポジトリのルートで次のコマンドを実行します。

```bash
dotnet publish BlazorCanvasDemo/BlazorCanvasDemo.csproj -c Release -o publish/blazorcanvas
```

その後、Copilot extension を再読み込みするか、canvas を再オープンして、公開済みファイルを配信するようにします。

## 主要ファイル

- `.github/extensions/blazor-canvas/extension.mjs`
- `BlazorCanvasDemo/Program.cs`
- `BlazorCanvasDemo/Pages/Home.razor`
- `BlazorCanvasDemo/BlazorCanvasDemo.csproj`

## 補足

- このサンプルでは、`dotnet run` ではなく公開済みの Blazor 出力を使う構成にしています。これにより、ローカルでの配信がより安定しやすくなります。
- canvas UI は `127.0.0.1` の loopback アドレスのみで配信されます。これは canvas runtime の要件に合わせた構成です。
- canvas extension では、エージェントからは `reload` アクションを利用でき、Blazor UI からは `POST /api/chat` で AI 応答を取得できます。
