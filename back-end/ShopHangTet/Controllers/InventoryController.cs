using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/admin/inventory")]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _service;

        public InventoryController(IInventoryService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<InventoryItemResponseDTO>>> Get([FromQuery] string? search, [FromQuery] string? category, [FromQuery] string? stockStatus, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var res = await _service.GetInventoryAsync(search, category, stockStatus, page, pageSize);
            return Ok(res);
        }

        [HttpGet("items/{id}")]
        public async Task<ActionResult<InventoryItemDetailDTO>> GetItem(string id)
        {
            var dto = await _service.GetItemDetailAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        [HttpGet("logs")]
        public async Task<ActionResult<PagedResult<InventoryLogDTO>>> GetLogs([FromQuery] string? search, [FromQuery] string? changeType, [FromQuery] string? source, [FromQuery] DateTime? date, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var res = await _service.GetInventoryLogsAsync(search, changeType, source, date, page, pageSize);
            return Ok(res);
        }

        [HttpPost("adjust")]
        public async Task<IActionResult> Adjust([FromBody] InventoryAdjustRequestDTO dto)
        {
            await _service.AdjustInventoryAsync(dto);
            return NoContent();
        }

        [HttpPost]
        public async Task<ActionResult<string>> Create([FromBody] InventoryCreateRequestDTO dto)
        {
            var id = await _service.CreateItemAsync(dto);
            return Ok(new { Id = id });
        }

        [HttpGet("summary")]
        public async Task<ActionResult<InventorySummaryDTO>> Summary()
        {
            var res = await _service.GetInventorySummaryAsync();
            return Ok(res);
        }
    }
}

