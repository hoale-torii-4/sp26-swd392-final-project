using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    // ════════════════════════════════════════════════════════════════════
    // ADMIN Collection Management
    // Route: /api/admin/collections/...
    // ════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/admin/collections")]
    [Authorize(Roles = "ADMIN")]
    public class CollectionsController : ControllerBase
    {
        private readonly ICollectionService _service;

        public CollectionsController(ICollectionService service)
        {
            _service = service;
        }

        // ── List & Detail ────────────────────────────────────────────────

        /// GET /api/admin/collections
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var list = await _service.GetCollectionsAsync();
            return Ok(ApiResponse<List<CollectionResponseDTO>>.SuccessResult(list));
        }

        /// GET /api/admin/collections/{id}
        [HttpGet("{id}", Name = "GetCollectionById")]
        public async Task<IActionResult> GetById(string id)
        {
            var dto = await _service.GetCollectionByIdAsync(id);
            if (dto == null)
                return NotFound(ApiResponse<object>.ErrorResult("Collection not found"));
            return Ok(ApiResponse<CollectionResponseDTO>.SuccessResult(dto));
        }

        // ── CRUD ─────────────────────────────────────────────────────────

        /// POST /api/admin/collections
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CollectionCreateDTO dto)
        {
            try
            {
                var id = await _service.CreateCollectionAsync(dto);
                return CreatedAtRoute("GetCollectionById", new { id },
                    ApiResponse<object>.SuccessResult(new { id }, "Collection created"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// PUT /api/admin/collections/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] CollectionUpdateDTO dto)
        {
            try
            {
                await _service.UpdateCollectionAsync(id, dto);
                return Ok(ApiResponse<object>.SuccessResult(new { id }, "Collection updated"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// PATCH /api/admin/collections/{id}/status — ẩn/hiện collection
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleStatus(string id, [FromBody] CollectionStatusDto body)
        {
            try
            {
                await _service.ToggleCollectionStatusAsync(id, body.IsActive);
                return Ok(ApiResponse<object>.SuccessResult(
                    new { id, isActive = body.IsActive },
                    body.IsActive ? "Collection đã hiện" : "Collection đã ẩn"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// DELETE /api/admin/collections/{id}
        /// Không được xóa nếu còn GiftBox liên kết
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                await _service.DeleteCollectionAsync(id);
                return Ok(ApiResponse<object>.SuccessResult(new { id }, "Collection deleted"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        // ── Reorder ───────────────────────────────────────────────────────

        /// PUT /api/admin/collections/reorder
        /// Body: [{ "id": "...", "displayOrder": 1 }, ...]
        /// Dùng PUT thay PATCH vì gửi toàn bộ danh sách thứ tự mới
        [HttpPut("reorder")]
        public async Task<IActionResult> Reorder([FromBody] List<CollectionReorderDTO> items)
        {
            if (items == null || !items.Any())
                return BadRequest(ApiResponse<object>.ErrorResult("Danh sách reorder không được rỗng"));

            try
            {
                await _service.ReorderCollectionsAsync(items);
                return Ok(ApiResponse<object>.SuccessResult(
                    new { updated = items.Count },
                    $"Đã cập nhật thứ tự {items.Count} collection"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }
    }

    public class CollectionStatusDto
    {
        public bool IsActive { get; set; }
    }
}
