using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Security.Claims;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CartController : ControllerBase
{
    private readonly ShopHangTetDbContext _context;

    public CartController(ShopHangTetDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCart([FromQuery] string? sessionId = null)
    {
        try
        {
            var resolvedSessionId = ResolveSessionId(sessionId);
            var cart = await FindCartAsync(resolvedSessionId);
            if (cart == null)
            {
                return Ok(ApiResponse<CartDto>.SuccessResult(new CartDto
                {
                    UserId = GetCurrentUserId(),
                    SessionId = resolvedSessionId
                }, "Cart is empty"));
            }

            return Ok(ApiResponse<CartDto>.SuccessResult(await MapCartAsync(cart), "Cart retrieved successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    [HttpPost("add")]
    public async Task<IActionResult> AddToCart([FromBody] AddToCartDto request, [FromQuery] string? sessionId = null)
    {
        try
        {
            var cart = await GetOrCreateCartAsync(ResolveSessionId(sessionId));
            var name = await ResolveCartProductAsync(request.Type, request.GiftBoxId, request.CustomBoxId);

            var existingItem = cart.Items.FirstOrDefault(x =>
                x.Type == request.Type &&
                x.GiftBoxId == request.GiftBoxId &&
                x.CustomBoxId == request.CustomBoxId);

            if (existingItem != null)
            {
                existingItem.Quantity += request.Quantity;
            }
            else
            {
                cart.Items.Add(new CartItem
                {
                    Type = request.Type,
                    GiftBoxId = request.GiftBoxId,
                    CustomBoxId = request.CustomBoxId,
                    Quantity = request.Quantity
                });
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResult(new
            {
                cartId = cart.Id,
                productName = name
            }, "Item added to cart successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    [HttpPut("update/{itemId}")]
    public async Task<IActionResult> UpdateCartItem(string itemId, [FromBody] UpdateCartItemDto request, [FromQuery] string? sessionId = null)
    {
        try
        {
            var cart = await FindCartAsync(ResolveSessionId(sessionId));
            if (cart == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Cart not found."));
            }

            var item = cart.Items.FirstOrDefault(x => x.Id == itemId);
            if (item == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Cart item not found."));
            }

            item.Quantity = request.Quantity;
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<CartDto>.SuccessResult(await MapCartAsync(cart), "Cart updated successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    [HttpDelete("remove/{itemId}")]
    public async Task<IActionResult> RemoveCartItem(string itemId, [FromQuery] string? sessionId = null)
    {
        try
        {
            var cart = await FindCartAsync(ResolveSessionId(sessionId));
            if (cart == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Cart not found."));
            }

            var removed = cart.Items.RemoveAll(x => x.Id == itemId) > 0;
            if (!removed)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Cart item not found."));
            }

            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<CartDto>.SuccessResult(await MapCartAsync(cart), "Cart item removed successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    [HttpDelete("clear")]
    public async Task<IActionResult> ClearCart([FromQuery] string? sessionId = null)
    {
        try
        {
            var cart = await FindCartAsync(ResolveSessionId(sessionId));
            if (cart == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Cart not found."));
            }

            cart.Items.Clear();
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<CartDto>.SuccessResult(await MapCartAsync(cart), "Cart cleared successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    private string? GetCurrentUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }

    private async Task<Cart?> FindCartAsync(string? sessionId)
    {
        var userId = GetCurrentUserId();
        if (!string.IsNullOrWhiteSpace(userId))
        {
            return await _context.Carts.FirstOrDefaultAsync(x => x.UserId == userId);
        }

        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return null;
        }

        return await _context.Carts.FirstOrDefaultAsync(x => x.SessionId == sessionId);
    }

    private async Task<Cart> GetOrCreateCartAsync(string? sessionId)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(sessionId))
        {
            sessionId = Guid.NewGuid().ToString("N");
        }

        var cart = await FindCartAsync(sessionId);
        if (cart != null)
        {
            return cart;
        }

        cart = new Cart
        {
            UserId = userId,
            SessionId = string.IsNullOrWhiteSpace(userId) ? sessionId : null,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Carts.Add(cart);
        await _context.SaveChangesAsync();

        if (string.IsNullOrWhiteSpace(userId) && !string.IsNullOrWhiteSpace(sessionId))
        {
            SetSessionCookie(sessionId);
        }

        return cart;
    }

    private string? ResolveSessionId(string? sessionId)
    {
        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            return sessionId;
        }

        return Request.Cookies["cart-session-id"];
    }

    private void SetSessionCookie(string sessionId)
    {
        Response.Cookies.Append("cart-session-id", sessionId, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            Expires = DateTimeOffset.UtcNow.AddDays(30)
        });
    }

    private async Task<string> ResolveCartProductAsync(OrderItemType type, string? giftBoxId, string? customBoxId)
    {
        if (type == OrderItemType.READY_MADE)
        {
            if (string.IsNullOrWhiteSpace(giftBoxId))
            {
                throw new InvalidOperationException("GiftBoxId is required for READY_MADE items.");
            }

            var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == giftBoxId);
            if (giftBox == null)
            {
                throw new InvalidOperationException("GiftBox not found.");
            }

            return giftBox.Name;
        }

        if (string.IsNullOrWhiteSpace(customBoxId))
        {
            throw new InvalidOperationException("CustomBoxId is required for MIX_MATCH items.");
        }

        var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == customBoxId);
        if (customBox == null)
        {
            throw new InvalidOperationException("CustomBox not found.");
        }

        return "Custom Mix & Match Box";
    }

    private async Task<CartDto> MapCartAsync(Cart cart)
    {
        var giftBoxIds = cart.Items
            .Where(x => x.Type == OrderItemType.READY_MADE && !string.IsNullOrWhiteSpace(x.GiftBoxId))
            .Select(x => x.GiftBoxId!)
            .Distinct()
            .ToList();

        var customBoxIds = cart.Items
            .Where(x => x.Type == OrderItemType.MIX_MATCH && !string.IsNullOrWhiteSpace(x.CustomBoxId))
            .Select(x => x.CustomBoxId!)
            .Distinct()
            .ToList();

        var giftBoxMap = await _context.GiftBoxes
            .Where(x => giftBoxIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => new { x.Name, x.Price, Image = x.Images.FirstOrDefault() });

        var customBoxMap = await _context.CustomBoxes
            .Where(x => customBoxIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.TotalPrice);

        var cartItems = cart.Items.Select(x =>
        {
            decimal unitPrice;
            string? name;
            string? image = null;

            if (x.Type == OrderItemType.READY_MADE)
            {
                if (x.GiftBoxId != null && giftBoxMap.TryGetValue(x.GiftBoxId, out var giftBox))
                {
                    unitPrice = giftBox.Price;
                    name = giftBox.Name;
                    image = giftBox.Image;
                }
                else
                {
                    unitPrice = 0;
                    name = null;
                }
            }
            else
            {
                unitPrice = x.CustomBoxId != null && customBoxMap.TryGetValue(x.CustomBoxId, out var customPrice) ? customPrice : 0;
                name = x.CustomBoxId != null && customBoxMap.ContainsKey(x.CustomBoxId) ? "Custom Mix & Match Box" : null;
            }

            return new CartItemDto
            {
                Id = x.Id,
                Type = x.Type,
                GiftBoxId = x.GiftBoxId,
                CustomBoxId = x.CustomBoxId,
                Quantity = x.Quantity,
                UnitPrice = unitPrice,
                Name = name,
                Image = image
            };
        }).ToList();

        return new CartDto
        {
            Id = cart.Id,
            UserId = cart.UserId,
            SessionId = cart.SessionId,
            TotalItems = cartItems.Sum(x => x.Quantity),
            TotalAmount = cartItems.Sum(x => x.Quantity * x.UnitPrice),
            Items = cartItems
        };
    }
}