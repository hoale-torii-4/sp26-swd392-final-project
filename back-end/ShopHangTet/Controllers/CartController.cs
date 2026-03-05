using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;
using System.Security.Claims;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        private (string? UserId, string? SessionId) GetUserOrSession()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("Id")?.Value
                      ?? User.FindFirst("id")?.Value
                      ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

            var sessionId = Request.Headers["X-Session-Id"].FirstOrDefault();
            return (userId, sessionId);
        }

        // Kiểm tra xem khách có ID không
        private bool IsValidIdentity(string? userId, string? sessionId)
        {
            return !string.IsNullOrWhiteSpace(userId) || !string.IsNullOrWhiteSpace(sessionId);
        }

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var (userId, sessionId) = GetUserOrSession();

            if (!IsValidIdentity(userId, sessionId))
                return BadRequest(ApiResponse<CartDto>.ErrorResult("Từ chối phục vụ: Vui lòng cung cấp Token đăng nhập hoặc Header X-Session-Id"));

            var result = await _cartService.GetCartAsync(userId, sessionId);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDto dto)
        {
            var (userId, sessionId) = GetUserOrSession();

            if (!IsValidIdentity(userId, sessionId))
                return BadRequest(ApiResponse<CartDto>.ErrorResult("Từ chối phục vụ: Vui lòng cung cấp Token đăng nhập hoặc Header X-Session-Id"));

            var result = await _cartService.AddToCartAsync(userId, sessionId, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update/{itemId}")]
        public async Task<IActionResult> UpdateCartItem([FromRoute] string itemId, [FromBody] UpdateCartItemDto dto)
        {
            var (userId, sessionId) = GetUserOrSession();

            if (!IsValidIdentity(userId, sessionId))
                return BadRequest(ApiResponse<CartDto>.ErrorResult("Từ chối phục vụ: Vui lòng cung cấp Token đăng nhập hoặc Header X-Session-Id"));

            var result = await _cartService.UpdateCartItemAsync(userId, sessionId, itemId, dto);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpDelete("remove/{itemId}")]
        public async Task<IActionResult> RemoveFromCart([FromRoute] string itemId)
        {
            var (userId, sessionId) = GetUserOrSession();

            if (!IsValidIdentity(userId, sessionId))
                return BadRequest(ApiResponse<CartDto>.ErrorResult("Từ chối phục vụ: Vui lòng cung cấp Token đăng nhập hoặc Header X-Session-Id"));

            var result = await _cartService.RemoveFromCartItemAsync(userId, sessionId, itemId);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        [HttpDelete("clear")]
        public async Task<IActionResult> ClearCart()
        {
            var (userId, sessionId) = GetUserOrSession();

            if (!IsValidIdentity(userId, sessionId))
                return BadRequest(ApiResponse<CartDto>.ErrorResult("Từ chối phục vụ: Vui lòng cung cấp Token đăng nhập hoặc Header X-Session-Id"));

            var result = await _cartService.ClearCartAsync(userId, sessionId);
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}