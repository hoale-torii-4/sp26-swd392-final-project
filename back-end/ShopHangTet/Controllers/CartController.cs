using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;
    private readonly ILogger<CartController> _logger;

    public CartController(ICartService cartService, ILogger<CartController> logger)
    {
        _cartService = cartService;
        _logger = logger;
    }

    /// Lấy giỏ hàng hiện tại (theo userId hoặc sessionId)
    [HttpGet]
    public async Task<IActionResult> GetCart([FromQuery] string? userId, [FromQuery] string? sessionId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(sessionId))
            {
                return BadRequest(ApiResponse<string>.ErrorResult("userId or sessionId is required"));
            }

            var cart = await _cartService.GetCartAsync(userId, sessionId);
            return Ok(ApiResponse<CartDto>.SuccessResult(cart));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cart");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Thêm sản phẩm vào giỏ hàng
    [HttpPost("items")]
    public async Task<IActionResult> AddToCart([FromQuery] string? userId, [FromQuery] string? sessionId, [FromBody] AddToCartDto dto)
    {
        try
        {
            if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(sessionId))
            {
                return BadRequest(ApiResponse<string>.ErrorResult("userId or sessionId is required"));
            }

            var cart = await _cartService.AddToCartAsync(userId, sessionId, dto);
            return Ok(ApiResponse<CartDto>.SuccessResult(cart, "Item added to cart"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding to cart");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Cập nhật số lượng item trong giỏ
    [HttpPut("items/{cartItemId}")]
    public async Task<IActionResult> UpdateCartItem(
        string cartItemId,
        [FromQuery] string? userId,
        [FromQuery] string? sessionId,
        [FromBody] UpdateCartItemDto dto)
    {
        try
        {
            if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(sessionId))
            {
                return BadRequest(ApiResponse<string>.ErrorResult("userId or sessionId is required"));
            }

            var cart = await _cartService.UpdateCartItemAsync(userId, sessionId, cartItemId, dto);
            return Ok(ApiResponse<CartDto>.SuccessResult(cart, "Cart item updated"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating cart item");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Xóa item khỏi giỏ
    [HttpDelete("items/{cartItemId}")]
    public async Task<IActionResult> RemoveCartItem(
        string cartItemId,
        [FromQuery] string? userId,
        [FromQuery] string? sessionId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(sessionId))
            {
                return BadRequest(ApiResponse<string>.ErrorResult("userId or sessionId is required"));
            }

            var cart = await _cartService.RemoveCartItemAsync(userId, sessionId, cartItemId);
            return Ok(ApiResponse<CartDto>.SuccessResult(cart, "Cart item removed"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cart item");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Xóa toàn bộ giỏ hàng
    [HttpDelete]
    public async Task<IActionResult> ClearCart([FromQuery] string? userId, [FromQuery] string? sessionId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(sessionId))
            {
                return BadRequest(ApiResponse<string>.ErrorResult("userId or sessionId is required"));
            }

            await _cartService.ClearCartAsync(userId, sessionId);
            return Ok(ApiResponse<string>.SuccessResult("Cart cleared"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing cart");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Merge guest cart vào user cart khi login
    [HttpPost("merge")]
    public async Task<IActionResult> MergeCart([FromQuery] string userId, [FromQuery] string sessionId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(sessionId))
            {
                return BadRequest(ApiResponse<string>.ErrorResult("Both userId and sessionId are required"));
            }

            var cart = await _cartService.MergeCartAsync(userId, sessionId);
            return Ok(ApiResponse<CartDto>.SuccessResult(cart, "Cart merged successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error merging cart");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }
}
