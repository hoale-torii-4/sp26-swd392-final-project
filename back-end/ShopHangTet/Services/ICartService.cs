using ShopHangTet.DTOs;

namespace ShopHangTet.Services;

public interface ICartService
{
    Task<ApiResponse<CartDto>> GetCartAsync(string? userId, string? sessionId);

    Task<ApiResponse<CartDto>> AddToCartAsync(string? userId, string? sessionId, AddToCartDto dto);

    Task<ApiResponse<CartDto>> UpdateCartItemAsync(string? userId, string? sessionId, string itemId, UpdateCartItemDto dto);

    Task<ApiResponse<CartDto>> RemoveFromCartItemAsync(string? userId, string? sessionId, string itemId);

    Task<ApiResponse<CartDto>> ClearCartAsync(string? userId, string? sessionId);
}
