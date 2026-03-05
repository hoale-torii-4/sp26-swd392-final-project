using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System;
// Nhớ using AppDbContext của bạn ở đây

namespace ShopHangTet.Services
{
    public class CartService : ICartService
    {
        private readonly ShopHangTetDbContext _context; // Đổi thành tên thật của DbContext nhé

        public CartService(ShopHangTetDbContext context)
        {
            _context = context;
        }

        // Đã gỡ lệnh .Include() gây lỗi và thay bằng việc tự Query thủ công
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
                await _context.SaveChangesAsync(); // Cần lưu ngay để sinh ra Id cho Giỏ hàng mới
                cart.Items = new List<CartItem>();
            }
            else
            {
                // Tự tay "móc" dữ liệu từ bảng CartItems sang cho giỏ hàng này
                cart.Items = await _context.Set<CartItem>()
                    .Where(i => i.CartId == cart.Id)
                    .ToListAsync();
            }

            return cart;
        }

        private async Task<CartDto> MapToDtoAsync(Cart cart)
        {
            var dto = new CartDto
            {
                Id = cart.Id,
                UserId = cart.UserId,
                SessionId = cart.SessionId,
                TotalAmount = cart.Items.Sum(i => i.Quantity * i.UnitPrice),
                TotalItems = cart.Items.Sum(i => i.Quantity),
                Items = new List<CartItemDto>()
            };

            foreach (var item in cart.Items)
            {
                string name = "Sản phẩm không xác định";

                if (item.Type == OrderItemType.READY_MADE && !string.IsNullOrEmpty(item.GiftBoxId))
                {
                    var giftBox = await _context.Set<GiftBox>().FirstOrDefaultAsync(g => g.Id == item.GiftBoxId);
                    if (giftBox != null) name = giftBox.Name;
                }
                else if (item.Type == OrderItemType.MIX_MATCH)
                {
                    name = "Hộp quà tự chọn (Mix & Match)";
                }

                dto.Items.Add(new CartItemDto
                {
                    Id = item.Id,
                    Type = item.Type,
                    GiftBoxId = item.GiftBoxId,
                    CustomBoxId = item.CustomBoxId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    Name = name
                });
            }
            return dto;
        }

        public async Task<ApiResponse<CartDto>> GetCartAsync(string? userId, string? sessionId)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            return ApiResponse<CartDto>.SuccessResult(await MapToDtoAsync(cart));
        }

        public async Task<ApiResponse<CartDto>> AddToCartAsync(string? userId, string? sessionId, AddToCartDto dto)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);

            decimal unitPrice = 0;
            if (dto.Type == OrderItemType.READY_MADE && !string.IsNullOrEmpty(dto.GiftBoxId))
            {
                var giftBox = await _context.Set<GiftBox>().FirstOrDefaultAsync(g => g.Id == dto.GiftBoxId);
                if (giftBox == null) return ApiResponse<CartDto>.ErrorResult("Không tìm thấy hộp quà này trong hệ thống!");

                unitPrice = giftBox.Price;
            }

            var existingItem = cart.Items.FirstOrDefault(i =>
                i.Type == dto.Type &&
                ((dto.Type == OrderItemType.READY_MADE && i.GiftBoxId == dto.GiftBoxId) ||
                 (dto.Type == OrderItemType.MIX_MATCH && i.CustomBoxId == dto.CustomBoxId)));

            if (existingItem != null)
            {
                existingItem.Quantity += dto.Quantity;
                existingItem.UnitPrice = unitPrice;
                _context.Set<CartItem>().Update(existingItem); // Bắt buộc EF phải cập nhật
            }
            else
            {
                var newItem = new CartItem
                {
                    CartId = cart.Id,
                    UserId = cart.UserId,
                    SessionId = cart.SessionId,
                    Type = dto.Type,
                    GiftBoxId = dto.GiftBoxId,
                    CustomBoxId = dto.CustomBoxId,
                    Quantity = dto.Quantity,
                    UnitPrice = unitPrice,
                    AddedAt = DateTime.UtcNow
                };
                cart.Items.Add(newItem);
                _context.Set<CartItem>().Add(newItem); // Ép EF lưu thẳng vào bảng CartItems
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<CartDto>.SuccessResult(await MapToDtoAsync(cart), "Đã thêm vào giỏ hàng");
        }

        public async Task<ApiResponse<CartDto>> UpdateCartItemAsync(string? userId, string? sessionId, string cartItemId, UpdateCartItemDto dto)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);

            if (item == null) return ApiResponse<CartDto>.ErrorResult("Không tìm thấy sản phẩm trong giỏ");

            item.Quantity = dto.Quantity;
            _context.Set<CartItem>().Update(item);

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<CartDto>.SuccessResult(await MapToDtoAsync(cart), "Đã cập nhật số lượng");
        }

        public async Task<ApiResponse<bool>> RemoveFromCartItemAsync(string? userId, string? sessionId, string cartItemId)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);

            if (item != null)
            {
                _context.Set<CartItem>().Remove(item); // Xóa khỏi bảng CartItems
                cart.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return ApiResponse<bool>.SuccessResult(true, "Đã xóa sản phẩm khỏi giỏ");
        }

        public async Task<ApiResponse<bool>> ClearCartAsync(string? userId, string? sessionId)
        {
            var cart = await GetOrCreateCartAsync(userId, sessionId);
            if (cart.Items.Any())
            {
                _context.Set<CartItem>().RemoveRange(cart.Items); // Dọn sạch rác trong bảng
                cart.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return ApiResponse<bool>.SuccessResult(true, "Đã làm sạch giỏ hàng");
        }
    }
}