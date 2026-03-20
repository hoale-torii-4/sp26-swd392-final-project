using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;
using System.Security.Claims;

namespace ShopHangTet.Controllers
{
    // ADMIN — quản lý item và cấu hình rules
    // Route: /api/admin/mix-match/...
    [ApiController]
    [Route("api/admin/mix-match")]
    [Authorize(Roles = "ADMIN")]
    public class AdminMixMatchController : ControllerBase
    {
        private readonly IMixMatchService _service;

        public AdminMixMatchController(IMixMatchService service)
        {
            _service = service;
        }

        // ── Items ────────────────────────────────────────────────────────
        /// GET /api/admin/mix-match/items?search=&category=&isActive=&page=1&pageSize=20
        [HttpGet("items")]
        public async Task<IActionResult> GetItems(
            [FromQuery] string? search,
            [FromQuery] string? category,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var res = await _service.GetItemsAsync(search, category, isActive, page, pageSize);
            return Ok(res);
        }

        /// GET /api/admin/mix-match/items/{id}
        [HttpGet("items/{id}")]
        public async Task<ActionResult<MixMatchItemResponseDTO>> GetItem(string id)
        {
            var item = await _service.GetItemByIdAsync(id);
            if (item == null) return NotFound(ApiResponse<object>.ErrorResult("Item not found"));
            return Ok(ApiResponse<MixMatchItemResponseDTO>.SuccessResult(item));
        }

        /// POST /api/admin/mix-match/items
        [HttpPost("items")]
        public async Task<IActionResult> CreateItem([FromBody] MixMatchCreateDTO dto)
        {
            try
            {
                var id = await _service.CreateItemAsync(dto);
                return CreatedAtAction(nameof(GetItem), new { id }, ApiResponse<object>.SuccessResult(new { id }, "Item created"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// PUT /api/admin/mix-match/items/{id}
        [HttpPut("items/{id}")]
        public async Task<IActionResult> UpdateItem(string id, [FromBody] MixMatchUpdateDTO dto)
        {
            try
            {
                await _service.UpdateItemAsync(id, dto);
                return Ok(ApiResponse<object>.SuccessResult(new { id }, "Item updated"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// PATCH /api/admin/mix-match/items/{id}/status
        [HttpPatch("items/{id}/status")]
        public async Task<IActionResult> ToggleStatus(string id, [FromBody] MixMatchStatusDto body)
        {
            try
            {
                await _service.ToggleItemStatusAsync(id, body.IsActive);
                return Ok(ApiResponse<object>.SuccessResult(
                    new { id, isActive = body.IsActive },
                    body.IsActive ? "Item đã bật" : "Item đã tắt"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// DELETE /api/admin/mix-match/items/{id}
        [HttpDelete("items/{id}")]
        public async Task<IActionResult> DeleteItem(string id)
        {
            try
            {
                await _service.DeleteItemAsync(id);
                return Ok(ApiResponse<object>.SuccessResult(new { id }, "Item deleted"));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        // ── Categories ───────────────────────────────────────────────────
        /// GET /api/admin/mix-match/categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var list = await _service.GetCategoriesAsync();
            return Ok(ApiResponse<List<object>>.SuccessResult(list));
        }

        // ── Rules ────────────────────────────────────────────────────────
        /// GET /api/admin/mix-match/rules
        [HttpGet("rules")]
        public async Task<IActionResult> GetRules()
        {
            var rules = await _service.GetRulesAsync();
            return Ok(ApiResponse<MixMatchRuleDTO>.SuccessResult(rules));
        }

        /// PUT /api/admin/mix-match/rules
        [HttpPut("rules")]
        public async Task<IActionResult> UpdateRules([FromBody] MixMatchRuleDTO dto)
        {
            try
            {
                await _service.UpdateRulesAsync(dto);
                return Ok(ApiResponse<object>.SuccessResult(dto, "Rules updated"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }
    }

    // CUSTOMER — browse items, build custom box, validate
    // Route: /api/mix-match/...
    [ApiController]
    [Route("api/mix-match")]
    public class MixMatchController : ControllerBase
    {
        private readonly IMixMatchService _adminService;
        private readonly IMixMatchCustomerService _customerService;
        private readonly IOrderService _orderService;

        public MixMatchController(
            IMixMatchService adminService,
            IMixMatchCustomerService customerService,
            IOrderService orderService)
        {
            _adminService = adminService;
            _customerService = customerService;
            _orderService = orderService;
        }

        // ── Public endpoints (không cần login) ──────────────────────────
        /// Lấy danh sách item để khách chọn — chỉ trả item IsActive=true
        /// GET /api/mix-match/items?category=DRINK&page=1&pageSize=50
        [HttpGet("items")]
        public async Task<IActionResult> GetAvailableItems(
            [FromQuery] string? category,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            // Luôn filter isActive=true cho khách
            var res = await _adminService.GetItemsAsync(search, category, isActive: true, page, pageSize);
            return Ok(res);
        }

        /// Lấy rules Mix & Match — frontend dùng để validate realtime khi khách build hộp
        /// GET /api/mix-match/rules
        [HttpGet("rules")]
        public async Task<IActionResult> GetRules()
        {
            var rules = await _adminService.GetRulesAsync();
            return Ok(ApiResponse<MixMatchRuleDTO>.SuccessResult(rules,
                "Quy tắc Mix & Match"));
        }

        /// Lấy danh sách nhóm sản phẩm
        /// GET /api/mix-match/categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var list = await _adminService.GetCategoriesAsync();
            return Ok(ApiResponse<List<object>>.SuccessResult(list));
        }

        // ── Custom Box — Guest và Member ─────────────────────────────────
        /// Tạo custom box mới
        /// POST /api/mix-match/custom-box
        /// Guest: userId lấy từ body (session-based), Member: từ JWT
        [HttpPost("custom-box")]
        public async Task<IActionResult> CreateCustomBox([FromBody] CreateCustomBoxDTO dto)
        {
            try
            {
                // Member dùng userId từ token, Guest truyền qua header X-Session-Id
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? Request.Headers["X-Session-Id"].FirstOrDefault()
                    ?? "guest";

                var id = await _customerService.CreateCustomBoxAsync(userId, dto);
                return CreatedAtAction(nameof(GetCustomBox), new { id },
                    ApiResponse<object>.SuccessResult(new { id }, "Custom box created"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// Lấy thông tin 1 custom box theo id
        /// GET /api/mix-match/custom-box/{id}
        [HttpGet("custom-box/{id}")]
        public async Task<IActionResult> GetCustomBox(string id)
        {
            var res = await _customerService.GetCustomBoxAsync(id);
            if (res == null) return NotFound(ApiResponse<object>.ErrorResult("Custom box not found"));
            return Ok(ApiResponse<CustomBoxResponseDTO>.SuccessResult(res));
        }

        /// Validate custom box theo rules Mix & Match
        /// GET /api/mix-match/custom-box/{id}/validate
        [HttpGet("custom-box/{id}/validate")]
        public async Task<IActionResult> ValidateCustomBox(string id)
        {
            try
            {
                var result = await _orderService.ValidateMixMatchRulesAsync(id);
                return Ok(new ApiResponse<MixMatchValidationResult>
                {
                    Success = result.IsValid,
                    Message = result.IsValid
                        ? "Hộp quà hợp lệ — có thể tiến hành đặt hàng"
                        : "Hộp quà chưa đáp ứng điều kiện",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        // ── Custom Box — Member only ──────────────────────────────────────
        /// Custom box mới nhất của user đang login
        /// GET /api/mix-match/custom-box/me
        [Authorize]
        [HttpGet("custom-box/me")]
        public async Task<IActionResult> GetMyCustomBox()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var res = await _customerService.GetCustomBoxByUserAsync(userId);
            if (res == null) return NotFound(ApiResponse<object>.ErrorResult("Chưa có custom box nào"));
            return Ok(ApiResponse<CustomBoxResponseDTO>.SuccessResult(res));
        }

        /// Tất cả custom box của user đang login
        /// GET /api/mix-match/custom-box/me/all
        [Authorize]
        [HttpGet("custom-box/me/all")]
        public async Task<IActionResult> GetMyCustomBoxes()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var res = await _customerService.GetCustomBoxesByUserAsync(userId);
            return Ok(ApiResponse<List<CustomBoxResponseDTO>>.SuccessResult(res));
        }

        /// Cập nhật custom box
        /// PUT /api/mix-match/custom-box/{id}
        [Authorize]
        [HttpPut("custom-box/{id}")]
        public async Task<IActionResult> UpdateCustomBox(
            string id, [FromBody] CreateCustomBoxDTO dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            try
            {
                var success = await _customerService.UpdateCustomBoxAsync(userId, id, dto);
                if (!success)
                    return NotFound(ApiResponse<object>.ErrorResult("Custom box not found or access denied"));
                return Ok(ApiResponse<object>.SuccessResult(new { id }, "Custom box updated"));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
            }
        }

        /// Xóa custom box
        /// DELETE /api/mix-match/custom-box/{id}
        [Authorize]
        [HttpDelete("custom-box/{id}")]
        public async Task<IActionResult> DeleteCustomBox(string id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var success = await _customerService.DeleteCustomBoxAsync(userId, id);
            if (!success)
                return NotFound(ApiResponse<object>.ErrorResult("Custom box not found or access denied"));
            return Ok(ApiResponse<object>.SuccessResult(new { id }, "Custom box deleted"));
        }
    }

    // Shared DTO dùng cho cả hai controller
    public class MixMatchStatusDto
    {
        public bool IsActive { get; set; }
    }
}
