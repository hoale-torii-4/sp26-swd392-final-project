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
                BaseAddress = new Uri("https://api.groq.com/openai/v1/")
            };

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            // Xóa mấy cái Header HTTP-Referer với X-Title đi vì Google không cần cái này
        }

        public async Task<string> AskAsync(string message)
        {
            // Viết một kịch bản thép cho con AI
            var systemPrompt = @"Bạn là nhân viên tư vấn nhiệt tình, duyên dáng của Shop Hàng Tết.
Quy tắc tối thượng:
1. Luôn xưng hô là 'em' và gọi khách là 'anh/chị'.
2. Luôn trả lời ngắn gọn, súc tích, có dùng emoji cho thân thiện.
3. TUYỆT ĐỐI KHÔNG bán hoặc tư vấn các sản phẩm không có trong danh sách cửa hàng cung cấp.";

            var requestBody = new
            {
                model = "llama-3.3-70b-versatile",
                messages = new[]
                {
        new { role = "system", content = systemPrompt },
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
        // Thêm hàm này vào dưới hàm AskAsync cũ trong file AiService.cs
        public async Task<string> AskWithHistoryAsync(List<object> conversationHistory)
        {
            var requestBody = new
            {
                model = "llama-3.3-70b-versatile", // Hoặc model Groq/Gemini bạn đang dùng
                messages = conversationHistory, // Đẩy nguyên cục lịch sử vào đây
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