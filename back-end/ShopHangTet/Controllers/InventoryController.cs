using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    // Xem kho: ADMIN + STAFF đều được
    // Điều chỉnh tồn kho: ADMIN only
    [ApiController]
    [Route("api/admin/inventory")]
    [Authorize(Roles = "ADMIN,STAFF")]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _service;

        public InventoryController(IInventoryService service)
        {
            _service = service;
        }

        /// GET /api/admin/inventory?search=&category=&stockStatus=LOW_STOCK&page=1&pageSize=20
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string? search,
            [FromQuery] string? category,
            [FromQuery] string? stockStatus,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var res = await _service.GetInventoryAsync(search, category, stockStatus, page, pageSize);
            return Ok(ApiResponse<PagedResult<InventoryItemResponseDTO>>.SuccessResult(res));
        }

        /// GET /api/admin/inventory/items/{id}
        [HttpGet("items/{id}")]
        public async Task<IActionResult> GetItem(string id)
        {
            var dto = await _service.GetItemDetailAsync(id);
            if (dto == null)
                return NotFound(ApiResponse<object>.ErrorResult("Item not found"));
            return Ok(ApiResponse<InventoryItemDetailDTO>.SuccessResult(dto));
        }

        /// GET /api/admin/inventory/summary
        [HttpGet("summary")]
        public async Task<IActionResult> Summary()
        {
            var res = await _service.GetInventorySummaryAsync();
            return Ok(ApiResponse<InventorySummaryDTO>.SuccessResult(res));
        }

        /// GET /api/admin/inventory/logs?search=&changeType=DEDUCT&source=&date=2025-01-28&page=1&pageSize=20
        [HttpGet("logs")]
        public async Task<IActionResult> GetLogs(
            [FromQuery] string? search,
            [FromQuery] string? changeType,
            [FromQuery] string? source,
            [FromQuery] DateTime? date,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var res = await _service.GetInventoryLogsAsync(search, changeType, source, date, page, pageSize);
            return Ok(ApiResponse<PagedResult<InventoryLogDTO>>.SuccessResult(res));
        }

        /// POST /api/admin/inventory/adjust — ADMIN only
        /// Body: { "itemId": "...", "adjustType": "INCREASE"|"DECREASE", "quantity": 10, "reason": "..." }
        [HttpPost("adjust")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> Adjust([FromBody] InventoryAdjustRequestDTO dto)
        {
            try
            {
                await _service.AdjustInventoryAsync(dto);
                return Ok(ApiResponse<object>.SuccessResult(
                    new { itemId = dto.ItemId, adjustType = dto.AdjustType, quantity = dto.Quantity },
                    $"Đã {(dto.AdjustType == "INCREASE" ? "nhập" : "điều chỉnh giảm")} {dto.Quantity} đơn vị"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }
    }
}