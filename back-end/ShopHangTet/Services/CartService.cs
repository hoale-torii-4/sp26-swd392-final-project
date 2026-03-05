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

        public async Task<CartDto> GetCartAsync(string? userId, string? sessionId)
        {
            var cart = await FindOrCreateCartAsync(userId, sessionId);
            return await MapToCartDtoAsync(cart);
        }

        public async Task<CartDto> AddToCartAsync(string? userId, string? sessionId, AddToCartDto dto)
        {
            var cart = await FindOrCreateCartAsync(userId, sessionId);

            // Kiểm tra xem item đã có trong cart chưa
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
                decimal unitPrice = 0;

                if (dto.Type == OrderItemType.READY_MADE && !string.IsNullOrEmpty(dto.GiftBoxId))
                {
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == dto.GiftBoxId);
                    if (giftBox == null) throw new InvalidOperationException("GiftBox not found");
                    unitPrice = giftBox.Price;
                }
                else if (dto.Type == OrderItemType.MIX_MATCH && !string.IsNullOrEmpty(dto.CustomBoxId))
                {
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == dto.CustomBoxId);
                    if (customBox == null) throw new InvalidOperationException("CustomBox not found");
                    unitPrice = customBox.TotalPrice;
                }

                cart.Items.Add(new CartItem
                {
                    Type = dto.Type,
                    GiftBoxId = dto.GiftBoxId,
                    CustomBoxId = dto.CustomBoxId,
                    Quantity = dto.Quantity,
                    UnitPrice = unitPrice,
                    AddedAt = DateTime.UtcNow
                });
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await MapToCartDtoAsync(cart);
        }

        public async Task<CartDto> UpdateCartItemAsync(string? userId, string? sessionId, string cartItemId, UpdateCartItemDto dto)
        {
            var cart = await FindOrCreateCartAsync(userId, sessionId);
            var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);

            if (item == null) throw new InvalidOperationException("Cart item not found");

            item.Quantity = dto.Quantity;
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await MapToCartDtoAsync(cart);
        }

        public async Task<CartDto> RemoveCartItemAsync(string? userId, string? sessionId, string cartItemId)
        {
            var cart = await FindOrCreateCartAsync(userId, sessionId);
            var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);

            if (item == null) throw new InvalidOperationException("Cart item not found");

            cart.Items.Remove(item);
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await MapToCartDtoAsync(cart);
        }

        public async Task ClearCartAsync(string? userId, string? sessionId)
        {
            var cart = await GetCartEntityAsync(userId, sessionId);
            if (cart == null) return;

            cart.Items.Clear();
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<CartDto> MergeCartAsync(string userId, string sessionId)
        {
            var guestCart = await _context.Carts.FirstOrDefaultAsync(c => c.SessionId == sessionId);
            var userCart = await FindOrCreateCartAsync(userId, null);

            if (guestCart != null && guestCart.Items.Any())
            {
                foreach (var guestItem in guestCart.Items)
                {
                    var existingItem = userCart.Items.FirstOrDefault(i =>
                        i.Type == guestItem.Type &&
                        ((guestItem.Type == OrderItemType.READY_MADE && i.GiftBoxId == guestItem.GiftBoxId) ||
                         (guestItem.Type == OrderItemType.MIX_MATCH && i.CustomBoxId == guestItem.CustomBoxId)));

                    if (existingItem != null)
                    {
                        existingItem.Quantity += guestItem.Quantity;
                    }
                    else
                    {
                        userCart.Items.Add(new CartItem
                        {
                            Type = guestItem.Type,
                            GiftBoxId = guestItem.GiftBoxId,
                            CustomBoxId = guestItem.CustomBoxId,
                            Quantity = guestItem.Quantity,
                            UnitPrice = guestItem.UnitPrice,
                            AddedAt = DateTime.UtcNow
                        });
                    }
                }

                // Xóa guest cart sau khi merge
                _context.Carts.Remove(guestCart);
            }

            userCart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await MapToCartDtoAsync(userCart);
        }

        // === Private helpers ===

        private async Task<Cart?> GetCartEntityAsync(string? userId, string? sessionId)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                return await _context.Carts.FirstOrDefaultAsync(c => c.UserId == userId);
            }

            if (!string.IsNullOrEmpty(sessionId))
            {
                return await _context.Carts.FirstOrDefaultAsync(c => c.SessionId == sessionId);
            }

            return null;
        }

        private async Task<Cart> FindOrCreateCartAsync(string? userId, string? sessionId)
        {
            var cart = await GetCartEntityAsync(userId, sessionId);

            if (cart == null)
            {
                cart = new Cart
                {
                    UserId = userId,
                    SessionId = sessionId,
                    Items = new List<CartItem>(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }

            return cart;
        }

        private async Task<CartDto> MapToCartDtoAsync(Cart cart)
        {
            var giftBoxIds = cart.Items
                .Where(i => i.Type == OrderItemType.READY_MADE && !string.IsNullOrEmpty(i.GiftBoxId))
                .Select(i => i.GiftBoxId!)
                .Distinct()
                .ToList();

            var giftBoxes = giftBoxIds.Any()
                ? await _context.GiftBoxes.Where(g => giftBoxIds.Contains(g.Id)).ToListAsync()
                : new List<GiftBox>();

            var giftBoxMap = giftBoxes.ToDictionary(g => g.Id, g => g);

            return new CartDto
            {
                Id = cart.Id,
                UserId = cart.UserId,
                SessionId = cart.SessionId,
                Items = cart.Items.Select(item =>
                {
                    string? name = null;
                    if (item.Type == OrderItemType.READY_MADE && !string.IsNullOrEmpty(item.GiftBoxId))
                    {
                        giftBoxMap.TryGetValue(item.GiftBoxId, out var gb);
                        name = gb?.Name;
                    }
                    else if (item.Type == OrderItemType.MIX_MATCH)
                    {
                        name = "Custom Mix & Match Box";
                    }

                    return new CartItemDto
                    {
                        Id = item.Id,
                        Type = item.Type,
                        GiftBoxId = item.GiftBoxId,
                        CustomBoxId = item.CustomBoxId,
                        Quantity = item.Quantity,
                        UnitPrice = item.UnitPrice,
                        Name = name
                    };
                }).ToList(),
                TotalAmount = cart.Items.Sum(i => i.UnitPrice * i.Quantity),
                TotalItems = cart.Items.Sum(i => i.Quantity)
            };
        }
    }
}
