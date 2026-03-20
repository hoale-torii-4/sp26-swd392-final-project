using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services;

/// Service xử lý Custom Box (Mix & Match) cho phía khách hàng.
/// Validation rule (min/max item, SAVORY...) được thực hiện tại OrderService.ValidateMixMatchRulesAsync
/// khi checkout, không validate lại tại đây để tránh duplicate logic.
public class MixMatchCustomerService : IMixMatchCustomerService
{
    private readonly ShopHangTetDbContext _context;

    public MixMatchCustomerService(ShopHangTetDbContext context)
    {
        _context = context;
    }

    // TẠO CUSTOM BOX
    /// userId có thể là ObjectId của Member hoặc session string của Guest.
    /// Validation rule Mix & Match chỉ thực thi khi checkout (ValidateMixMatchRulesAsync).
    public async Task<string> CreateCustomBoxAsync(string userId, CreateCustomBoxDTO dto)
    {
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("UserId is required");
        if (dto?.Items == null || !dto.Items.Any()) throw new ArgumentException("Items are required");

        var totalItems = dto.Items.Sum(x => x.Quantity);
        if (totalItems < 4 || totalItems > 6)
            throw new InvalidOperationException("Mix & Match phải có tổng từ 4 đến 6 món");

        await ValidateMixMatchItemsAsync(dto.Items);

        var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var itemsDict = await _context.Items
            .Where(i => itemIds.Contains(i.Id) && i.IsActive)
            .ToDictionaryAsync(i => i.Id);

        // Kiểm tra tất cả item tồn tại và đang active
        var notFound = itemIds.Except(itemsDict.Keys).ToList();
        if (notFound.Any())
            throw new InvalidOperationException(
                $"Sản phẩm không tồn tại hoặc đã tắt: {string.Join(", ", notFound)}");

        var customBox = new CustomBox
        {
            UserId = userId,
            Items = dto.Items
                .Select(i => new CustomBoxItem { ItemId = i.ItemId, Quantity = i.Quantity })
                .ToList(),
            TotalPrice = dto.Items.Sum(i => itemsDict[i.ItemId].Price * i.Quantity),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.CustomBoxes.AddAsync(customBox);
        await _context.SaveChangesAsync();
        return customBox.Id;
    }

    // ĐỌC
    public async Task<CustomBoxResponseDTO?> GetCustomBoxAsync(string id)
    {
        var box = await _context.CustomBoxes.FirstOrDefaultAsync(cb => cb.Id == id);
        return box == null ? null : await MapAsync(box);
    }

    public async Task<CustomBoxResponseDTO?> GetCustomBoxByUserAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return null;

        var box = await _context.CustomBoxes
            .Where(cb => cb.UserId == userId)
            .OrderByDescending(cb => cb.CreatedAt)
            .FirstOrDefaultAsync();

        return box == null ? null : await MapAsync(box);
    }

    public async Task<List<CustomBoxResponseDTO>> GetCustomBoxesByUserAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new();

        var boxes = await _context.CustomBoxes
            .Where(cb => cb.UserId == userId)
            .OrderByDescending(cb => cb.CreatedAt)
            .ToListAsync();

        var result = new List<CustomBoxResponseDTO>();
        foreach (var box in boxes)
            result.Add(await MapAsync(box));

        return result;
    }

    // ════════════════════════════════════════════════════════════════════
    // CẬP NHẬT / XÓA
    // ════════════════════════════════════════════════════════════════════

    public async Task<bool> UpdateCustomBoxAsync(string userId, string boxId, CreateCustomBoxDTO dto)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(boxId))
            return false;

        var box = await _context.CustomBoxes
            .FirstOrDefaultAsync(cb => cb.Id == boxId && cb.UserId == userId);
        if (box == null)
            throw new InvalidOperationException("Custom box not found or access denied");

        var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var itemsDict = await _context.Items
            .Where(i => itemIds.Contains(i.Id) && i.IsActive)
            .ToDictionaryAsync(i => i.Id);

        var notFound = itemIds.Except(itemsDict.Keys).ToList();
        if (notFound.Any())
            throw new InvalidOperationException(
                $"Sản phẩm không tồn tại hoặc đã tắt: {string.Join(", ", notFound)}");

        box.Items = dto.Items
            .Select(i => new CustomBoxItem { ItemId = i.ItemId, Quantity = i.Quantity })
            .ToList();
        box.TotalPrice = dto.Items.Sum(i => itemsDict[i.ItemId].Price * i.Quantity);
        box.UpdatedAt = DateTime.UtcNow;

        _context.CustomBoxes.Update(box);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteCustomBoxAsync(string userId, string boxId)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(boxId))
            return false;

        var box = await _context.CustomBoxes
            .FirstOrDefaultAsync(cb => cb.Id == boxId && cb.UserId == userId);
        if (box == null) return false;

        _context.CustomBoxes.Remove(box);
        await _context.SaveChangesAsync();
        return true;
    }

    // ════════════════════════════════════════════════════════════════════
    // MAP DTO
    // ════════════════════════════════════════════════════════════════════

    private async Task<CustomBoxResponseDTO> MapAsync(CustomBox box)
    {
        var itemIds = box.Items.Select(i => i.ItemId).Distinct().ToList();
        var itemsDict = await _context.Items
            .Where(i => itemIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id);

        var items = box.Items.Select(i =>
        {
            itemsDict.TryGetValue(i.ItemId, out var item);
            var price = item?.Price ?? 0m;
            return new CustomBoxItemResponseDTO
            {
                ItemId = i.ItemId,
                Name = item?.Name ?? string.Empty,
                Price = price,
                Quantity = i.Quantity,
                Subtotal = price * i.Quantity,
                ImageUrl = item?.Images?.FirstOrDefault()
            };
        }).ToList();

        return new CustomBoxResponseDTO
        {
            Id = box.Id,
            Items = items,
            TotalItems = box.Items.Sum(x => x.Quantity),
            TotalPrice = box.TotalPrice,
            CreatedAt = box.CreatedAt
        };
    }

    private static Task ValidateMixMatchItemsAsync(List<CreateCustomBoxItemDTO> items)
    {
        if (items.Count == 0)
            throw new InvalidOperationException("Phải có ít nhất 1 item");

        if (items.Any(i => string.IsNullOrWhiteSpace(i.ItemId)))
            throw new InvalidOperationException("ItemId là bắt buộc");

        if (items.Any(i => i.Quantity <= 0))
            throw new InvalidOperationException("Số lượng item phải lớn hơn 0");

        return Task.CompletedTask;
    }
}
