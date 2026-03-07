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

        // Chỉ đọc cart, KHÔNG tạo mới
        private async Task<Cart?> GetCartByOwnerAsync(string? userId, string? sessionId)
        {
            if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(sessionId))
                return null;

            var cart = await _context.Set<Cart>()
                .FirstOrDefaultAsync(c =>
                    (!string.IsNullOrWhiteSpace(userId) && c.UserId == userId) ||
                    (!string.IsNullOrWhiteSpace(sessionId) && c.SessionId == sessionId));

            if (cart != null)
            {
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
                    var giftBox = await _context.Set<GiftBox>()
                        .FirstOrDefaultAsync(g => g.Id == item.GiftBoxId);

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
                    ProductId = item.GiftBoxId ?? item.CustomBoxId ?? string.Empty,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    Name = name
                });
            }

            return dto;
        }

        public async Task<ApiResponse<CartDto>> GetCartAsync(string? userId, string? sessionId)
        {
            var cart = await GetCartByOwnerAsync(userId, sessionId);

            if (cart == null)
            {
                return ApiResponse<CartDto>.SuccessResult(new CartDto
                {
                    UserId = userId,
                    SessionId = sessionId
                });
            }

            return ApiResponse<CartDto>.SuccessResult(await MapToDtoAsync(cart));
        }

        public async Task<ApiResponse<CartDto>> AddToCartAsync(string? userId, string? sessionId, AddToCartDto dto)
        {
            if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(sessionId))
                return ApiResponse<CartDto>.ErrorResult("Không xác định được người dùng!");

            var cart = await GetCartByOwnerAsync(userId, sessionId);

            if (cart == null)
            {
                cart = new Cart
                {
                    UserId = userId,
                    SessionId = sessionId
                };

                _context.Set<Cart>().Add(cart);
                await _context.SaveChangesAsync();

                cart.Items = new List<CartItem>();
            }

            decimal unitPrice = 0;

#pragma warning disable CS0618
            var targetId = dto.Id ?? dto.GiftBoxId ?? dto.CustomBoxId;
#pragma warning restore CS0618
            if (string.IsNullOrWhiteSpace(targetId))
                return ApiResponse<CartDto>.ErrorResult("Item Id is required");

            if (dto.Type == OrderItemType.READY_MADE)
            {
                var giftBox = await _context.Set<GiftBox>()
                    .FirstOrDefaultAsync(g => g.Id == targetId);

                if (giftBox == null)
                    return ApiResponse<CartDto>.ErrorResult("Không tìm thấy hộp quà!");

                unitPrice = giftBox.Price;
            }
            else if (dto.Type == OrderItemType.MIX_MATCH)
            {
                var customBox = await _context.Set<CustomBox>()
                    .FirstOrDefaultAsync(c => c.Id == targetId);

                if (customBox == null)
                    return ApiResponse<CartDto>.ErrorResult("Không tìm thấy custom box!");

                unitPrice = customBox.TotalPrice;
            }

            var existingItem = cart.Items.FirstOrDefault(i =>
                i.Type == dto.Type &&
                ((dto.Type == OrderItemType.READY_MADE && i.GiftBoxId == targetId) ||
                 (dto.Type == OrderItemType.MIX_MATCH && i.CustomBoxId == targetId)));

            if (existingItem != null)
            {
                existingItem.Quantity += dto.Quantity;
                existingItem.UnitPrice = unitPrice;

                _context.Set<CartItem>().Update(existingItem);
            }
            else
            {
                var newItem = new CartItem
                {
                    CartId = cart.Id,
                    UserId = cart.UserId,
                    SessionId = cart.SessionId,
                    Type = dto.Type,
                    GiftBoxId = dto.Type == OrderItemType.READY_MADE ? targetId : null,
                    CustomBoxId = dto.Type == OrderItemType.MIX_MATCH ? targetId : null,
                    Quantity = dto.Quantity,
                    UnitPrice = unitPrice,
                    AddedAt = DateTime.UtcNow
                };

                cart.Items.Add(newItem);
                _context.Set<CartItem>().Add(newItem);
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<CartDto>.SuccessResult(await MapToDtoAsync(cart), "Đã thêm vào giỏ hàng");
        }

        public async Task<ApiResponse<CartDto>> UpdateCartItemAsync(string? userId, string? sessionId, string cartItemId, UpdateCartItemDto dto)
        {
            var cart = await GetCartByOwnerAsync(userId, sessionId);

            if (cart == null)
                return ApiResponse<CartDto>.ErrorResult("Giỏ hàng trống!");

            var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);

            if (item == null)
                return ApiResponse<CartDto>.ErrorResult("Không tìm thấy sản phẩm!");

            item.Quantity = dto.Quantity;

            _context.Set<CartItem>().Update(item);

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<CartDto>.SuccessResult(await MapToDtoAsync(cart), "Đã cập nhật số lượng");
        }

        public async Task<ApiResponse<bool>> RemoveFromCartItemAsync(string? userId, string? sessionId, string cartItemId)
        {
            var cart = await GetCartByOwnerAsync(userId, sessionId);

            if (cart == null)
                return ApiResponse<bool>.ErrorResult("Giỏ hàng trống!");

            var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);

            if (item == null)
                return ApiResponse<bool>.ErrorResult("Không tìm thấy item để xóa!");

            _context.Set<CartItem>().Remove(item);

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResult(true, "Đã xóa sản phẩm");
        }

        public async Task<ApiResponse<bool>> ClearCartAsync(string? userId, string? sessionId)
        {
            var cart = await GetCartByOwnerAsync(userId, sessionId);

            if (cart == null)
                return ApiResponse<bool>.ErrorResult("Giỏ hàng trống!");

            if (cart.Items.Any())
            {
                _context.Set<CartItem>().RemoveRange(cart.Items);
                cart.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
            }

            return ApiResponse<bool>.SuccessResult(true, "Đã làm sạch giỏ hàng");
        }
    }
}