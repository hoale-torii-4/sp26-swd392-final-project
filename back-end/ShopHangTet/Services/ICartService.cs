using ShopHangTet.DTOs;

namespace ShopHangTet.Services
{
    public interface ICartService
    {
        /// Lấy cart theo userId hoặc sessionId
        Task<CartDto> GetCartAsync(string? userId, string? sessionId);

        /// Thêm item vào cart
        Task<CartDto> AddToCartAsync(string? userId, string? sessionId, AddToCartDto dto);

        /// Cập nhật số lượng item trong cart
        Task<CartDto> UpdateCartItemAsync(string? userId, string? sessionId, string cartItemId, UpdateCartItemDto dto);

        /// Xóa item khỏi cart
        Task<CartDto> RemoveCartItemAsync(string? userId, string? sessionId, string cartItemId);

        /// Xóa toàn bộ cart
        Task ClearCartAsync(string? userId, string? sessionId);

        /// Merge guest cart vào user cart khi login
        Task<CartDto> MergeCartAsync(string userId, string sessionId);
    }
}
