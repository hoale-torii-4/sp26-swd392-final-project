using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    // ════════════════════════════════════════════════════════════════════
    // ADMIN GiftBox Management
    // Route: /api/admin/giftboxes/...
    // ════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/admin/giftboxes")]
    [Authorize(Roles = "ADMIN")]
    public class GiftBoxesController : ControllerBase
    {
        private readonly IGiftBoxService _service;

        public GiftBoxesController(IGiftBoxService service)
        {
            _service = service;
        }

        // ── List & Detail ────────────────────────────────────────────────

        /// GET /api/admin/giftboxes?collectionId=&keyword=&status=true&page=1&pageSize=20
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string? collectionId,
            [FromQuery] string? keyword,
            [FromQuery] bool? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _service.GetGiftBoxesAsync(collectionId, keyword, status, page, pageSize);
            return Ok(ApiResponse<PagedResult<GiftBoxListResponseDTO>>.SuccessResult(result));
        }

        /// GET /api/admin/giftboxes/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var dto = await _service.GetGiftBoxByIdAsync(id);
            if (dto == null)
                return NotFound(ApiResponse<object>.ErrorResult("Gift box not found"));
            return Ok(ApiResponse<GiftBoxDetailResponseDTO>.SuccessResult(dto));
        }

        // ── CRUD ─────────────────────────────────────────────────────────

        /// POST /api/admin/giftboxes
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] GiftBoxCreateDTO dto)
        {
            try
            {
                var id = await _service.CreateGiftBoxAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id },
                    ApiResponse<object>.SuccessResult(new { id }, "Gift box created"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// PUT /api/admin/giftboxes/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] GiftBoxUpdateDTO dto)
        {
            try
            {
                await _service.UpdateGiftBoxAsync(id, dto);
                return Ok(ApiResponse<object>.SuccessResult(new { id }, "Gift box updated"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// PATCH /api/admin/giftboxes/{id}/status — bật/tắt hiển thị
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleStatus(string id, [FromBody] GiftBoxStatusDTO body)
        {
            try
            {
                await _service.ToggleGiftBoxStatusAsync(id, body.IsActive);
                return Ok(ApiResponse<object>.SuccessResult(
                    new { id, isActive = body.IsActive },
                    body.IsActive ? "Gift box đã bật hiển thị" : "Gift box đã tắt hiển thị"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// DELETE /api/admin/giftboxes/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                await _service.DeleteGiftBoxAsync(id);
                return Ok(ApiResponse<object>.SuccessResult(new { id }, "Gift box deleted"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        // ── Dropdown helpers (dùng trong form tạo/sửa GiftBox) ───────────

        /// GET /api/admin/giftboxes/collections — dropdown chọn collection
        [HttpGet("collections")]
        public async Task<IActionResult> GetCollections()
        {
            var list = await _service.GetCollectionsAsync();
            return Ok(ApiResponse<List<SimpleCollectionDTO>>.SuccessResult(list));
        }

        /// GET /api/admin/giftboxes/items — dropdown chọn item (thành phần)
        [HttpGet("items")]
        public async Task<IActionResult> GetItems()
        {
            var list = await _service.GetItemsAsync();
            return Ok(ApiResponse<List<SimpleItemDTO>>.SuccessResult(list));
        }

        /// GET /api/admin/giftboxes/tags — dropdown chọn tag
        [HttpGet("tags")]
        public async Task<IActionResult> GetTags()
        {
            var list = await _service.GetTagsAsync();
            return Ok(ApiResponse<List<SimpleTagDTO>>.SuccessResult(list));
        }
    }
}
