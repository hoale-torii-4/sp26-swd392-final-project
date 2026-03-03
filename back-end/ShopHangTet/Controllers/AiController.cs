<<<<<<< Updated upstream
﻿using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
=======
﻿using Microsoft.AspNetCore.Mvc;
>>>>>>> Stashed changes
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
<<<<<<< Updated upstream
    [Route("api/[controller]")]
    [ApiController]
    public class AiController : ControllerBase
    {
        private readonly IAiService _aiService;

        public AiController(IAiService aiService)
=======
    [ApiController]
    [Route("api/[controller]")]
    public class AiController : ControllerBase
    {
        private readonly AiService _aiService;

        public AiController(AiService aiService)
>>>>>>> Stashed changes
        {
            _aiService = aiService;
        }

<<<<<<< Updated upstream
        [HttpGet("ask")]
        public async Task<IActionResult> Ask([FromQuery] string message)
        {
            var result = await _aiService.AskAsync(message);
            return Ok(new { response = result });
=======
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
>>>>>>> Stashed changes
        }
    }
}
