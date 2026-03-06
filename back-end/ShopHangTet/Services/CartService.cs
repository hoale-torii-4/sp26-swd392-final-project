using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services;

public class CartService : ICartService
{
    private readonly ShopHangTetDbContext _context;

    public CartService(ShopHangTetDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<CartDto>> GetCartAsync(string? userId, string? sessionId)
    {
        var cart = await FindCartAsync(userId, sessionId);

        if (cart == null)
            return ApiResponse<CartDto>.SuccessResult(new CartDto(), "Cart empty");

        return ApiResponse<CartDto>.SuccessResult(MapCart(cart));
    }

    public async Task<ApiResponse<CartDto>> AddToCartAsync(string? userId, string? sessionId, AddToCartDto dto)
    {
        var cart = await GetOrCreateCartAsync(userId, sessionId);

        cart.Items.Add(new CartItem
        {
            Type = dto.Type,
            GiftBoxId = dto.GiftBoxId,
            CustomBoxId = dto.CustomBoxId,
            Quantity = dto.Quantity
        });

        await _context.SaveChangesAsync();

        return ApiResponse<CartDto>.SuccessResult(MapCart(cart));
    }

    public async Task<ApiResponse<CartDto>> UpdateCartItemAsync(string? userId, string? sessionId, string itemId, UpdateCartItemDto dto)
    {
        var cart = await FindCartAsync(userId, sessionId);

        var item = cart?.Items.FirstOrDefault(x => x.Id == itemId);

        if (item == null)
            return ApiResponse<CartDto>.ErrorResult("Item not found");

        item.Quantity = dto.Quantity;

        await _context.SaveChangesAsync();

        return ApiResponse<CartDto>.SuccessResult(MapCart(cart!));
    }

    public async Task<ApiResponse<CartDto>> RemoveFromCartItemAsync(string? userId, string? sessionId, string itemId)
    {
        var cart = await FindCartAsync(userId, sessionId);

        if (cart == null)
            return ApiResponse<CartDto>.ErrorResult("Cart not found");

        cart.Items.RemoveAll(x => x.Id == itemId);

        await _context.SaveChangesAsync();

        return ApiResponse<CartDto>.SuccessResult(MapCart(cart));
    }

    public async Task<ApiResponse<CartDto>> ClearCartAsync(string? userId, string? sessionId)
    {
        var cart = await FindCartAsync(userId, sessionId);

        if (cart == null)
            return ApiResponse<CartDto>.ErrorResult("Cart not found");

        cart.Items.Clear();

        await _context.SaveChangesAsync();

        return ApiResponse<CartDto>.SuccessResult(MapCart(cart));
    }

    private async Task<Cart?> FindCartAsync(string? userId, string? sessionId)
    {
        if (!string.IsNullOrWhiteSpace(userId))
            return await _context.Carts.FirstOrDefaultAsync(x => x.UserId == userId);

        if (!string.IsNullOrWhiteSpace(sessionId))
            return await _context.Carts.FirstOrDefaultAsync(x => x.SessionId == sessionId);

        return null;
    }

    private async Task<Cart> GetOrCreateCartAsync(string? userId, string? sessionId)
    {
        var cart = await FindCartAsync(userId, sessionId);

        if (cart != null)
            return cart;

        cart = new Cart
        {
            UserId = userId,
            SessionId = sessionId,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Carts.Add(cart);

        await _context.SaveChangesAsync();

        return cart;
    }

    private CartDto MapCart(Cart cart)
    {
        return new CartDto
        {
            Id = cart.Id,
            UserId = cart.UserId,
            SessionId = cart.SessionId,
            TotalItems = cart.Items.Sum(x => x.Quantity),
            TotalAmount = 0,
            Items = []
        };
    }
}
