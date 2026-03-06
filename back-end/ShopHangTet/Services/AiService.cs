using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ShopHangTet.Services
{
    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;

        public AiService(string apiKey)
        {
            _httpClient = new HttpClient
            {
                BaseAddress = new Uri("https://openrouter.ai/api/v1/")
            };

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            _httpClient.DefaultRequestHeaders.Add("HTTP-Referer", "http://localhost");
            _httpClient.DefaultRequestHeaders.Add("X-Title", "ShopHangTet");
        }

        public async Task<string> AskAsync(string message)
        {
            var requestBody = new
            {
                model = "qwen/qwen3-vl-235b-a22b-thinking",
                messages = new[]
                {
                    new { role = "user", content = message }
                },
                max_tokens = 1000
            };

            var content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync("chat/completions", content);

            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new Exception(json);

            using var doc = JsonDocument.Parse(json);

            return doc.RootElement
                      .GetProperty("choices")[0]
                      .GetProperty("message")
                      .GetProperty("content")
                      .GetString() ?? "";
        }
    }
}