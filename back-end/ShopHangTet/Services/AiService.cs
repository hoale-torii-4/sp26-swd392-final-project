<<<<<<< Updated upstream
﻿
using System.Text.Json;
using System.Text;

=======
﻿using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
>>>>>>> Stashed changes
namespace ShopHangTet.Services
{
    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;
<<<<<<< Updated upstream
        private readonly string _apiKey;

        public AiService(IConfiguration configuration)
        {
            _httpClient = new HttpClient();
            _apiKey = configuration["Gemini:ApiKey"];

            if (string.IsNullOrEmpty(_apiKey))
                throw new InvalidOperationException("Gemini API Key missing.");
        }

        public async Task<string> AskAsync(string message)
        {
            var body = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = message }
                        }
                    }
                }
            };
            // Use v1beta for preview models
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={_apiKey}";

            var request = new HttpRequestMessage(HttpMethod.Post, url);
            
            request.Content = new StringContent(
                JsonSerializer.Serialize(body), 
                Encoding.UTF8, 
                "application/json");

            var response = await _httpClient.SendAsync(request);
            if(response.IsSuccessStatusCode)
            {
                using var responseContent = await response.Content.ReadAsStreamAsync();
                using var jsonDoc = await JsonDocument.ParseAsync(responseContent);

                var text = jsonDoc.RootElement
    .GetProperty("candidates")[0]
    .GetProperty("content")
    .GetProperty("parts")[0]
    .GetProperty("text")
    .GetString();
                return text ?? "No response from Gemini";
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                return $"Error: {response.StatusCode}, Details: {errorContent}";
            }
=======

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

        public async Task<string> AskAsync(string prompt)
        {
            var requestBody = new
            {
                model = "qwen/qwen3-vl-235b-a22b-thinking",
                messages = new[]
                {
                new { role = "user", content = prompt }
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
>>>>>>> Stashed changes
        }
    }
}
