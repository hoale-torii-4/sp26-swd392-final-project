using ShopHangTet.DTOs;

namespace ShopHangTet.Services
{
    public interface ICartService
    {
        Task<ApiResponse<CartDto>> GetCartAsync(string? userId, string? sessionId);

        Task<ApiResponse<CartDto>> AddToCartAsync(string? userId, string? sessionId, AddToCartDto dto);

        Task<ApiResponse<CartDto>> UpdateCartItemAsync(string? userId, string? sessionId, string cartItemId, UpdateCartItemDto dto);

        Task<ApiResponse<bool>> RemoveFromCartItemAsync(string? userId, string? sessionId, string cartItemId);

        Task<ApiResponse<bool>> ClearCartAsync(string? userId, string? sessionId);
    }
}