using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AiController : ControllerBase
    {
        private readonly IAiService _aiService;

        public AiController(IAiService aiService)
        {
            _aiService = aiService;
        }

        [HttpGet("ask")]
        public async Task<IActionResult> Ask([FromQuery] string message)
        {
            var result = await _aiService.AskAsync(message);
            return Ok(new { response = result });
        }
    }
}
