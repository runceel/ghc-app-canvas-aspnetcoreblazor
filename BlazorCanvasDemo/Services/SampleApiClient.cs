using System.Net.Http.Json;
using System.Text.Json;
using BlazorCanvasDemo.Models;

namespace BlazorCanvasDemo.Services;

public sealed class SampleApiClient(HttpClient http)
{
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<ApiResult<SampleStateDto>> GetStateAsync()
    {
        using var response = await http.GetAsync("/api/sample/state");
        return await ReadApiResponseAsync<SampleStateDto>(response);
    }

    public async Task<ApiResult<SampleStateDto>> SendToCopilotAsync(string message)
    {
        using var response = await http.PostAsJsonAsync("/api/sample/ask-copilot", new MessageRequest
        {
            Message = message,
        });
        return await ReadApiResponseAsync<SampleStateDto>(response);
    }

    public async Task<ApiResult<SampleStateDto>> TriggerBlazorPingAsync(string message)
    {
        using var response = await http.PostAsJsonAsync("/api/sample/blazor-ping", new MessageRequest
        {
            Message = message,
        });
        return await ReadApiResponseAsync<SampleStateDto>(response);
    }

    public async Task<ApiResult<SampleStateDto>> ResetAsync()
    {
        using var response = await http.PostAsync("/api/sample/reset", null);
        return await ReadApiResponseAsync<SampleStateDto>(response);
    }

    private static async Task<ApiResult<T>> ReadApiResponseAsync<T>(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        if (response.IsSuccessStatusCode)
        {
            var payload = string.IsNullOrWhiteSpace(body)
                ? default
                : JsonSerializer.Deserialize<T>(body, JsonOptions);
            return new ApiResult<T>(payload, null);
        }

        if (!string.IsNullOrWhiteSpace(body))
        {
            try
            {
                var errorPayload = JsonSerializer.Deserialize<ApiErrorResponse>(body, JsonOptions);
                if (!string.IsNullOrWhiteSpace(errorPayload?.Error))
                {
                    return new ApiResult<T>(default, errorPayload.Error);
                }
            }
            catch (JsonException)
            {
                return new ApiResult<T>(default, $"Request failed ({(int)response.StatusCode}) and returned invalid error JSON.");
            }
        }

        return new ApiResult<T>(default, $"Request failed ({(int)response.StatusCode}).");
    }
}
