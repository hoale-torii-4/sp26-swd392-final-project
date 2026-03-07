using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AiController : ControllerBase
    {
        private readonly AiService _aiService;

        public AiController(AiService aiService)
        {
            _aiService = aiService;
        }
        // POST: api/ai/chat
        [HttpPost("chat")]
        public async Task<IActionResult> Ask([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Message is required.");

            // Default language = Vietnamese
            var language = string.IsNullOrWhiteSpace(request.Language)
                ? "Vietnamese"
                : request.Language;

            var prompt = $"""
    Respond in {language}.
    {request.Message}
    """;

            var result = await _aiService.AskAsync(prompt);

            return Ok(new
            {
                response = result
            });
        }
        public class ChatRequest
        {
            public string Message { get; set; }
            public string? Language { get; set; }
        }
    }
}
