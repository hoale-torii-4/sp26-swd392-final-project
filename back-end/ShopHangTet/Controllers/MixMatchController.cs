using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/admin/mix-match")]
    public class MixMatchController : ControllerBase
    {
        private readonly IMixMatchService _service;
        private readonly IMixMatchCustomerService _customerService;

        public MixMatchController(IMixMatchService service, IMixMatchCustomerService customerService)
        {
            _service = service;
            _customerService = customerService;
        }

        [HttpGet("items")]
        public async Task<ActionResult<object>> GetItems([FromQuery] string? search, [FromQuery] string? category, [FromQuery] bool? isActive, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var res = await _service.GetItemsAsync(search, category, isActive, page, pageSize);
            return Ok(res);
        }

        [HttpGet("items/{id}")]
        public async Task<ActionResult<MixMatchItemResponseDTO>> GetItem(string id)
        {
            var item = await _service.GetItemByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("items")]
        public async Task<ActionResult<string>> CreateItem([FromBody] MixMatchCreateDTO dto)
        {
            var id = await _service.CreateItemAsync(dto);
            return CreatedAtAction(nameof(GetItem), new { id }, id);
        }

        [HttpPut("items/{id}")]
        public async Task<IActionResult> UpdateItem(string id, [FromBody] MixMatchUpdateDTO dto)
        {
            await _service.UpdateItemAsync(id, dto);
            return NoContent();
        }

        public class StatusDto { public bool IsActive { get; set; } }

        [HttpPatch("items/{id}/status")]
        public async Task<IActionResult> ToggleStatus(string id, [FromBody] StatusDto body)
        {
            await _service.ToggleItemStatusAsync(id, body.IsActive);
            return NoContent();
        }

        [HttpDelete("items/{id}")]
        public async Task<IActionResult> DeleteItem(string id)
        {
            await _service.DeleteItemAsync(id);
            return NoContent();
        }

        [HttpGet("categories")]
        public async Task<ActionResult<List<object>>> GetCategories()
        {
            var list = await _service.GetCategoriesAsync();
            return Ok(list);
        }

        [HttpGet("rules")]
        public async Task<ActionResult<MixMatchRuleDTO>> GetRules()
        {
            var rules = await _service.GetRulesAsync();
            return Ok(rules);
        }

        [HttpPut("rules")]
        public async Task<IActionResult> UpdateRules([FromBody] MixMatchRuleDTO dto)
        {
            await _service.UpdateRulesAsync(dto);
            return NoContent();
        }

        // Customer-facing endpoints for custom boxes
        [HttpPost]
        [Route("/api/mix-match/custom-box")]
        public async Task<ActionResult<string>> CreateCustomBox([FromBody] CreateCustomBoxDTO dto)
        {
            var id = await _customerService.CreateCustomBoxAsync(dto);
            return CreatedAtAction(nameof(GetCustomBox), new { id }, id);
        }

        [HttpGet]
        [Route("/api/mix-match/custom-box/{id}")]
        public async Task<ActionResult<CustomBoxResponseDTO>> GetCustomBox(string id)
        {
            var res = await _customerService.GetCustomBoxAsync(id);
            if (res == null) return NotFound();
            return Ok(res);
        }
    }
}
