namespace BlazorCanvasDemo.Services;

public sealed class DisplayLanguageService
{
    private static readonly Dictionary<string, string> English = new()
    {
        ["ActionsBlazorToCopilot"] = "Blazor -> Copilot",
        ["ActionsBlazorToCopilotDescription"] = "Queues a message with session.send and updates the send status.",
        ["ActionsBlazorToExtension"] = "Blazor -> extension API + SSE",
        ["ActionsBlazorToExtensionDescription"] = "Calls /api/sample/blazor-ping, updates state, and broadcasts SSE.",
        ["ActionsIntro"] = "These buttons verify Blazor-to-Copilot and Blazor-to-extension API paths.",
        ["ActionsNav"] = "Actions",
        ["ActionsTitle"] = "Send data from Blazor",
        ["AgentActionRouting"] = "Agent action routing",
        ["AgentActionRoutingDescription"] = "When Copilot invokes set-message or append-event, the result appears here.",
        ["AgentActionToBlazor"] = "Agent action -> Blazor",
        ["AgentActionToBlazorDescription"] = "Invoke set-message. This field updates through SSE.",
        ["AiToBlazor"] = "AI / agent -> Blazor display",
        ["AiToBlazorDescription"] = "Copilot invokes set-message. The extension stores the text, broadcasts SSE, and the Monitor page shows the new message.",
        ["AppEyebrow"] = "Blazor WASM + Copilot Canvas",
        ["AppTitle"] = "Minimal canvas checker",
        ["BlazorToCopilot"] = "Blazor -> Copilot send",
        ["BlazorToCopilotDescription"] = "The Actions page calls /api/sample/ask-copilot. The extension queues a Copilot message with session.send and immediately updates send status.",
        ["BlazorToExtension"] = "Blazor -> extension API + SSE",
        ["BlazorToExtensionDescription"] = "The Actions page calls /api/sample/blazor-ping. The extension appends an event and the Monitor page receives it through SSE.",
        ["CanvasActionsToTry"] = "Canvas actions to try from Copilot",
        ["CurrentState"] = "Current state",
        ["DefaultCopilotMessage"] = "This message came from the Blazor canvas.",
        ["DefaultPingMessage"] = "Blazor button clicked.",
        ["EventLog"] = "Event log",
        ["EventMessage"] = "Event message",
        ["FeatureGuide"] = "Feature guide",
        ["Flow"] = "Flow",
        ["FlowCopilot"] = "Blazor posts JSON to the extension, then the extension sends a user message to Copilot.",
        ["FlowPing"] = "Blazor calls the local extension API directly.",
        ["LatestEvent"] = "Latest event",
        ["LatestResult"] = "Latest result",
        ["LastBlazorMessage"] = "Last Blazor message",
        ["LastCopilotStatus"] = "Last Copilot send status",
        ["LastSsePayload"] = "Last SSE payload",
        ["LoadingState"] = "Loading sample state...",
        ["MessageFromBlazor"] = "Message from Blazor",
        ["MonitorIntro"] = "Keep this page open while invoking canvas actions or using the Actions page.",
        ["MonitorNav"] = "Monitor",
        ["MonitorTitle"] = "Live state and events",
        ["NoEvents"] = "No events yet.",
        ["NoStateLoaded"] = "No state loaded yet.",
        ["NoSseMessage"] = "No SSE message yet.",
        ["OpenReload"] = "Open / reload",
        ["OpenReloadDescription"] = "The canvas open path serves the published Blazor app from a loopback server. The reload action restarts that server.",
        ["OverviewIntro"] = "Each integration path has a dedicated page: Actions sends data from Blazor, and Monitor shows live state and events.",
        ["OverviewNav"] = "Overview",
        ["OverviewTitle"] = "Canvas integration patterns",
        ["PageTitle"] = "Minimal Blazor Canvas",
        ["Result"] = "Result",
        ["ResultCopilot"] = "The latest send status appears below and an event is added to Monitor.",
        ["ResultPing"] = "The extension appends an event and Monitor updates through SSE.",
        ["ResetSampleState"] = "Reset sample state",
        ["Resetting"] = "Resetting...",
        ["SendToCopilot"] = "Send to Copilot",
        ["Sending"] = "Sending...",
        ["SharedPersistedState"] = "Shared persisted state",
        ["SharedPersistedStateDescription"] = "The current state is stored in canvas-state.json, and this page shows the path.",
        ["SseDelivery"] = "SSE delivery",
        ["SseDeliveryDescription"] = "Every extension state change broadcasts a small event payload. This page updates without a browser reload.",
        ["SseLabel"] = "SSE",
        ["Sse_connected"] = "connected",
        ["Sse_connecting"] = "connecting",
        ["Sse_reconnecting"] = "reconnecting",
        ["Sse_unavailable"] = "unavailable",
        ["StorePath"] = "Store path",
        ["Trigger"] = "Trigger",
        ["TriggerCopilot"] = "Click Send to Copilot.",
        ["TriggerPing"] = "Click Trigger Blazor ping.",
        ["TriggerBlazorPing"] = "Trigger Blazor ping",
        ["TryActionsDescription_append-event"] = "Adds an event-log row visible on the Monitor page.",
        ["TryActionsDescription_reload"] = "Restarts the loopback Blazor server behind this canvas.",
        ["TryActionsDescription_set-message"] = "Sends a short message into the Monitor page through SSE.",
        ["Updated"] = "Updated",
        ["UseActionsPage"] = "Use Blazor buttons to send data to Copilot or call the extension HTTP API.",
        ["WatchMonitorPage"] = "Watch agent actions, state, and SSE events update the UI.",
        ["WhatMonitorProves"] = "What this page proves",
    };

    private static readonly Dictionary<string, string> Japanese = new()
    {
        ["ActionsBlazorToCopilot"] = "Blazor から Copilot",
        ["ActionsBlazorToCopilotDescription"] = "session.send でメッセージをキューし、送信状態を更新します。",
        ["ActionsBlazorToExtension"] = "Blazor から extension API + SSE",
        ["ActionsBlazorToExtensionDescription"] = "/api/sample/blazor-ping を呼び、状態を更新して SSE を配信します。",
        ["ActionsIntro"] = "Blazor から Copilot、または Blazor から extension API へ送る経路を確認するボタンです。",
        ["ActionsNav"] = "操作",
        ["ActionsTitle"] = "Blazor からデータを送る",
        ["AgentActionRouting"] = "Agent action のルーティング",
        ["AgentActionRoutingDescription"] = "Copilot が set-message や append-event を実行すると、結果がここに表示されます。",
        ["AgentActionToBlazor"] = "Agent action から Blazor",
        ["AgentActionToBlazorDescription"] = "set-message を実行してください。このフィールドが SSE 経由で更新されます。",
        ["AiToBlazor"] = "AI / agent から Blazor 表示",
        ["AiToBlazorDescription"] = "Copilot が set-message を実行します。extension がテキストを保存し、SSE を配信し、Monitor ページに新しいメッセージが表示されます。",
        ["AppEyebrow"] = "Blazor WASM + Copilot Canvas",
        ["AppTitle"] = "最小 canvas チェッカー",
        ["BlazorToCopilot"] = "Blazor から Copilot 送信",
        ["BlazorToCopilotDescription"] = "Actions ページが /api/sample/ask-copilot を呼びます。extension が session.send で Copilot メッセージをキューし、送信状態をすぐに更新します。",
        ["BlazorToExtension"] = "Blazor から extension API + SSE",
        ["BlazorToExtensionDescription"] = "Actions ページが /api/sample/blazor-ping を呼びます。extension がイベントを追加し、Monitor ページが SSE で受け取ります。",
        ["CanvasActionsToTry"] = "Copilot から試す canvas action",
        ["CurrentState"] = "現在の状態",
        ["DefaultCopilotMessage"] = "このメッセージは Blazor canvas から送信されました。",
        ["DefaultPingMessage"] = "Blazor ボタンがクリックされました。",
        ["EventLog"] = "イベントログ",
        ["EventMessage"] = "イベントメッセージ",
        ["FeatureGuide"] = "機能ガイド",
        ["Flow"] = "流れ",
        ["FlowCopilot"] = "Blazor が JSON を extension に POST し、extension が Copilot にユーザーメッセージを送ります。",
        ["FlowPing"] = "Blazor がローカル extension API を直接呼びます。",
        ["LatestEvent"] = "最新イベント",
        ["LatestResult"] = "最新結果",
        ["LastBlazorMessage"] = "最後の Blazor メッセージ",
        ["LastCopilotStatus"] = "最後の Copilot 送信状態",
        ["LastSsePayload"] = "最後の SSE ペイロード",
        ["LoadingState"] = "サンプル状態を読み込み中...",
        ["MessageFromBlazor"] = "Blazor からのメッセージ",
        ["MonitorIntro"] = "canvas action を実行したり Actions ページを使ったりしながら、このページを開いて確認します。",
        ["MonitorNav"] = "モニター",
        ["MonitorTitle"] = "状態とイベントのライブ表示",
        ["NoEvents"] = "イベントはまだありません。",
        ["NoStateLoaded"] = "状態はまだ読み込まれていません。",
        ["NoSseMessage"] = "SSE メッセージはまだありません。",
        ["OpenReload"] = "open / reload",
        ["OpenReloadDescription"] = "canvas の open 経路は、公開済み Blazor アプリを loopback サーバーから配信します。reload action はそのサーバーを再起動します。",
        ["OverviewIntro"] = "各連携経路に専用ページを設けたサンプルです。Actions で Blazor からデータを送り、Monitor で状態とイベントをリアルタイムに確認できます。",
        ["OverviewNav"] = "概要",
        ["OverviewTitle"] = "Canvas 連携パターン",
        ["PageTitle"] = "Minimal Blazor Canvas",
        ["Result"] = "結果",
        ["ResultCopilot"] = "最新の送信状態が下に表示され、Monitor にイベントが追加されます。",
        ["ResultPing"] = "extension がイベントを追加し、Monitor が SSE で更新されます。",
        ["ResetSampleState"] = "サンプル状態をリセット",
        ["Resetting"] = "リセット中...",
        ["SendToCopilot"] = "Copilot に送信",
        ["Sending"] = "送信中...",
        ["SharedPersistedState"] = "共有された永続状態",
        ["SharedPersistedStateDescription"] = "現在の状態は canvas-state.json に保存され、このページで保存先を確認できます。",
        ["SseDelivery"] = "SSE 配信",
        ["SseDeliveryDescription"] = "extension の状態変更ごとに小さなイベントペイロードを配信します。このページはブラウザー再読み込みなしで更新されます。",
        ["SseLabel"] = "SSE",
        ["Sse_connected"] = "接続済み",
        ["Sse_connecting"] = "接続中",
        ["Sse_reconnecting"] = "再接続中",
        ["Sse_unavailable"] = "利用不可",
        ["StorePath"] = "保存先",
        ["Trigger"] = "トリガー",
        ["TriggerCopilot"] = "Copilot に送信をクリックします。",
        ["TriggerPing"] = "Trigger Blazor ping をクリックします。",
        ["TriggerBlazorPing"] = "Blazor ping を実行",
        ["TryActionsDescription_append-event"] = "Monitor ページで見えるイベントログ行を追加します。",
        ["TryActionsDescription_reload"] = "この canvas の背後にある loopback Blazor サーバーを再起動します。",
        ["TryActionsDescription_set-message"] = "短いメッセージを SSE 経由で Monitor ページに送ります。",
        ["Updated"] = "更新日時",
        ["UseActionsPage"] = "Blazor ボタンから Copilot に送信、または extension HTTP API を呼び出します。",
        ["WatchMonitorPage"] = "agent action、状態、SSE イベントによる UI 更新を確認します。",
        ["WhatMonitorProves"] = "このページで確認できること",
    };

    public string Language { get; private set; } = "ja";
    public bool IsJapanese => Language == "ja";
    public event Action? Changed;

    public string ToggleLabel => IsJapanese ? "English" : "日本語";

    public void Toggle()
    {
        SetLanguage(IsJapanese ? "en" : "ja");
    }

    public void SetLanguage(string language)
    {
        var normalized = language == "en" ? "en" : "ja";
        if (Language == normalized)
        {
            return;
        }

        Language = normalized;
        Changed?.Invoke();
    }

    public string T(string key)
    {
        var table = IsJapanese ? Japanese : English;
        return table.TryGetValue(key, out var text) ? text : key;
    }

    public string DisplayStoredText(string value)
    {
        if (!IsJapanese || string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        const string sentPrefix = "Sent to Copilot. Message id: ";
        if (value.StartsWith(sentPrefix, StringComparison.Ordinal))
        {
            return $"Copilot に送信しました。Message id: {value[sentPrefix.Length..]}";
        }

        return value switch
        {
            "No message from an agent action yet." => "まだ agent action からのメッセージはありません。",
            "No message sent from Blazor yet." => "まだ Blazor から送信していません。",
            "No Copilot send yet." => "まだ Copilot に送信していません。",
            "Minimal canvas sample is ready." => "最小 canvas サンプルの準備ができました。",
            "Agent action updated the Blazor-visible message." => "Agent action で Blazor 表示メッセージを更新しました。",
            "Blazor queued a message to Copilot." => "Blazor が Copilot へのメッセージをキューしました。",
            "Blazor button clicked." => "Blazor ボタンがクリックされました。",
            "This message came from the Blazor canvas." => "このメッセージは Blazor canvas から送信されました。",
            _ => value,
        };
    }

    public string DisplayEventKind(string kind)
    {
        if (!IsJapanese)
        {
            return kind;
        }

        return kind switch
        {
            "agent-message" => "agent メッセージ",
            "agent-event" => "agent イベント",
            "blazor-ping" => "Blazor ping",
            "copilot-send" => "Copilot 送信",
            "initialized" => "初期化",
            "reset" => "リセット",
            "snapshot" => "スナップショット",
            _ => kind,
        };
    }
}
