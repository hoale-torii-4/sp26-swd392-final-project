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
                // 1. Đổi BaseAddress sang cổng chuẩn OpenAI của Google!
                BaseAddress = new Uri("https://generativelanguage.googleapis.com/v1beta/openai/")
            };

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            // Xóa mấy cái Header HTTP-Referer với X-Title đi vì Google không cần cái này
        }

        public async Task<string> AskAsync(string message)
        {
            var requestBody = new
            {
                // 2. Điền chính xác tên model xịn nhất mà bạn vừa tìm được
                model = "gemini-2.5-flash",
                messages = new[]
                    {
            new { role = "user", content = message }
        },
                max_tokens = 2000
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