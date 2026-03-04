using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    public class CartService : ICartService
    {
        private readonly ShopHangTetDbContext _context;

        public CartService(ShopHangTetDbContext context)
        {
            _context = context;
        }

        // Hàm phụ trợ: Tìm giỏ hàng hoặc tạo mới nếu chưa có
        private async Task<Cart> GetOrCreateCartAsync(string? userId, string? sessionId)
        {
            var cart = await _context.Set<Cart>()
                .FirstOrDefaultAsync(c =>
                    (!string.IsNullOrEmpty(userId) && c.UserId == userId) ||
                    (!string.IsNullOrEmpty(sessionId) && c.SessionId == sessionId));

            if (cart == null)
            {
                cart = new Cart { UserId = userId, SessionId = sessionId };
                _context.Set<Cart>().Add(cart);
            }
            return cart;
        }

        // Hàm phụ trợ: Chuyển Model sang Dto để trả về cho Frontend
        private CartDto MapToDto(Cart cart)
        {
            var dto = new CartDto
            {
                Id = cart.Id,
                UserId = cart.UserId,
                SessionId = cart.SessionId,
                TotalAmount = cart.Items.Sum(i => i.Quantity * i.UnitPrice),
                TotalItems = cart.Items.Sum(i => i.Quantity),
                Items = cart.Items.Select(i => new CartItemDto
                {
                    Id = i.Id,
                    Type = i.Type,
                    GiftBoxId = i.GiftBoxId,
                    CustomBoxId = i.CustomBoxId,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    // Name = TODO: Nối với ProductService để lấy tên sản phẩm hiển thị ra đây
                }).ToList()
            };
            return dto;
        }

        public async Task<ApiResponse<CartDto>> GetCartAsync(string? userId, string? sessionId)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            return ApiResponse<CartDto>.SuccessResult(MapToDto(cart));
        }

        public async Task<ApiResponse<CartDto>> AddToCartAsync(string? userId, string? sessionId, AddToCartDto dto)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);

            // Kiểm tra xem món hàng này đã có trong giỏ chưa
            var existingItem = cart.Items.FirstOrDefault(i =>
                i.Type == dto.Type &&
                ((dto.Type == OrderItemType.READY_MADE && i.GiftBoxId == dto.GiftBoxId) ||
                 (dto.Type == OrderItemType.MIX_MATCH && i.CustomBoxId == dto.CustomBoxId)));

            if (existingItem != null)
            {
                existingItem.Quantity += dto.Quantity;
            }
            else
            {
                // Món mới tinh
                var newItem = new CartItem
                {
                    Type = dto.Type,
                    GiftBoxId = dto.GiftBoxId,
                    CustomBoxId = dto.CustomBoxId,
                    Quantity = dto.Quantity,
                    UnitPrice = 0 // TODO: Gọi ProductService để lấy giá thật của sản phẩm gán vào đây
                };
                cart.Items.Add(newItem);
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<CartDto>.SuccessResult(MapToDto(cart), "Đã thêm vào giỏ hàng");
        }

        public async Task<ApiResponse<CartDto>> UpdateCartItemAsync(string? userId, string? sessionId, string cartItemId, UpdateCartItemDto dto)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);

            if (item == null)
                return ApiResponse<CartDto>.ErrorResult("Không tìm thấy sản phẩm trong giỏ");

            item.Quantity = dto.Quantity;
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<CartDto>.SuccessResult(MapToDto(cart), "Đã cập nhật số lượng");
        }

        public async Task<ApiResponse<bool>> RemoveFromCartItemAsync(string? userId, string? sessionId, string cartItemId)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);

            if (item != null)
            {
                cart.Items.Remove(item);
                cart.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return ApiResponse<bool>.SuccessResult(true, "Đã xóa sản phẩm khỏi giỏ");
        }

        public async Task<ApiResponse<bool>> ClearCartAsync(string? userId, string? sessionId)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            cart.Items.Clear();
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResult(true, "Đã làm sạch giỏ hàng");
        }
    }
}
