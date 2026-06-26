namespace BlazorCanvasDemo.Models;

public sealed class SampleStateDto
{
    public string MessageFromAgent { get; set; } = string.Empty;
    public string MessageFromBlazor { get; set; } = string.Empty;
    public string LastCopilotReply { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public string StorePath { get; set; } = string.Empty;
    public List<SampleEventItemDto> Events { get; set; } = [];
}

public sealed class SampleEventItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Level { get; set; } = "info";
    public string Message { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public sealed class SampleEventDto
{
    public string Kind { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public SampleStateDto? State { get; set; }
}

public sealed class MessageRequest
{
    public string Message { get; set; } = string.Empty;
}

public sealed class ApiErrorResponse
{
    public string? Error { get; set; }
}

public readonly record struct ApiResult<T>(T? Payload, string? Error);
