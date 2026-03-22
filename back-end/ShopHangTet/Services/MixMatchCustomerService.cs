using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services;

public class MixMatchCustomerService : IMixMatchCustomerService
{
    private readonly ShopHangTetDbContext _context;

    public MixMatchCustomerService(ShopHangTetDbContext context)
    {
        _context = context;
    }

    public async Task<string> CreateCustomBoxAsync(string userId, CreateCustomBoxDTO dto)
    {
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("UserId is required");
        if (dto == null || dto.Items == null) throw new ArgumentException("Items are required");

        var totalItems = dto.Items.Sum(x => x.Quantity);
        if (totalItems < 4 || totalItems > 6)
            throw new InvalidOperationException("Mix & Match phải có tổng từ 4 đến 6 món");

        await ValidateMixMatchItemsAsync(dto.Items);

        var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var itemsDict = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id);
        if (itemsDict.Count != itemIds.Count)
            throw new InvalidOperationException("One or more selected items were not found.");

        var customBox = new CustomBox
        {
            UserId = userId,
            Items = dto.Items.Select(i => new CustomBoxItem { ItemId = i.ItemId, Quantity = i.Quantity }).ToList(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        decimal totalPrice = 0m;
        foreach (var it in customBox.Items)
        {
            var item = itemsDict[it.ItemId];
            totalPrice += item.Price * it.Quantity;
        }

        customBox.TotalPrice = totalPrice;

        await _context.CustomBoxes.AddAsync(customBox);
        await _context.SaveChangesAsync();

        return customBox.Id;
    }

    public async Task<CustomBoxResponseDTO?> GetCustomBoxByUserAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return null;
        var box = await _context.CustomBoxes
            .Where(cb => cb.UserId == userId)
            .OrderByDescending(cb => cb.CreatedAt)
            .FirstOrDefaultAsync();
        if (box == null) return null;
        return await MapCustomBoxAsync(box);
    }

    public async Task<List<CustomBoxResponseDTO>> GetCustomBoxesByUserAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return new List<CustomBoxResponseDTO>();

        var boxes = await _context.CustomBoxes
            .Where(cb => cb.UserId == userId)
            .OrderByDescending(cb => cb.CreatedAt)
            .ToListAsync();

        if (!boxes.Any()) return new List<CustomBoxResponseDTO>();

        var results = new List<CustomBoxResponseDTO>();
        foreach (var box in boxes)
        {
            results.Add(await MapCustomBoxAsync(box));
        }

        return results;
    }

    public async Task<CustomBoxResponseDTO?> GetCustomBoxAsync(string id)
    {
        var box = await _context.CustomBoxes.FirstOrDefaultAsync(cb => cb.Id == id);
        if (box == null) return null;
        return await MapCustomBoxAsync(box);
    }

    private async Task<CustomBoxResponseDTO> MapCustomBoxAsync(CustomBox box)
    {
        var itemIds = box.Items.Select(i => i.ItemId).Distinct().ToList();
        var itemsDict = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id);

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
    public async Task<bool> UpdateCustomBoxAsync(string userId, string boxId, CreateCustomBoxDTO dto)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(boxId)) return false;
        
        var box = await _context.CustomBoxes.FirstOrDefaultAsync(cb => cb.Id == boxId && cb.UserId == userId);
        if (box == null) throw new InvalidOperationException("Custom box not found or access denied");

        var totalItems = dto.Items.Sum(x => x.Quantity);
        if (totalItems < 4 || totalItems > 6)
            throw new InvalidOperationException("Mix & Match phải có tổng từ 4 đến 6 món");

        await ValidateMixMatchItemsAsync(dto.Items);

        var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var itemsDict = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id);
        if (itemsDict.Count != itemIds.Count)
            throw new InvalidOperationException("One or more selected items were not found.");

        box.Items = dto.Items.Select(i => new CustomBoxItem { ItemId = i.ItemId, Quantity = i.Quantity }).ToList();
        box.UpdatedAt = DateTime.UtcNow;

        decimal totalPrice = 0m;
        foreach (var it in box.Items)
        {
            var item = itemsDict[it.ItemId];
            totalPrice += item.Price * it.Quantity;
        }
        
        box.TotalPrice = totalPrice;

        _context.CustomBoxes.Update(box);
        await _context.SaveChangesAsync();
        
        return true;
    }

    public async Task<bool> DeleteCustomBoxAsync(string userId, string boxId)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(boxId)) return false;

        var box = await _context.CustomBoxes.FirstOrDefaultAsync(cb => cb.Id == boxId && cb.UserId == userId);
        if (box == null) return false;

        _context.CustomBoxes.Remove(box);
        await _context.SaveChangesAsync();
        
        return true;
    }

    private async Task ValidateMixMatchItemsAsync(List<CreateCustomBoxItemDTO> items)
    {
        var itemIds = items.Select(x => x.ItemId).ToList();
        var itemEntities = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
        var itemMap = itemEntities.ToDictionary(x => x.Id, x => x);

        int drinkCount = items.Where(i => itemMap.ContainsKey(i.ItemId) && itemMap[i.ItemId].Category == ItemCategory.DRINK).Sum(i => i.Quantity);
        int alcoholCount = items.Where(i => itemMap.ContainsKey(i.ItemId) && itemMap[i.ItemId].Category == ItemCategory.ALCOHOL).Sum(i => i.Quantity);
        int nutCount = items.Where(i => itemMap.ContainsKey(i.ItemId) && itemMap[i.ItemId].Category == ItemCategory.NUT).Sum(i => i.Quantity);
        int foodCount = items.Where(i => itemMap.ContainsKey(i.ItemId) && itemMap[i.ItemId].Category == ItemCategory.FOOD).Sum(i => i.Quantity);
        int snackCount = nutCount + foodCount;

        var savoryNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Khô gà lá chanh", "Khô bò", "Chà bông cá hồi", "Lạp xưởng tươi"
        };

        int savoryCount = items.Where(i => itemMap.ContainsKey(i.ItemId) && savoryNames.Contains(itemMap[i.ItemId].Name)).Sum(i => i.Quantity);

        bool hasChivas21 = items.Any(i => itemMap.ContainsKey(i.ItemId) && itemMap[i.ItemId].Name.Contains("Chivas 21", StringComparison.OrdinalIgnoreCase));

        if (drinkCount + alcoholCount < 1)
        {
            throw new InvalidOperationException("Mix & Match phải có ít nhất 1 sản phẩm nhóm đồ uống (Trà hoặc Rượu)");
        }

        if (snackCount < 2)
        {
            throw new InvalidOperationException("Mix & Match phải có ít nhất 2 sản phẩm nhóm snack (Hạt/Bánh/Kẹo)");
        }

        if (hasChivas21 && savoryCount > 1)
        {
            throw new InvalidOperationException("Hộp có Chivas 21 chỉ được chọn tối đa 1 món mặn");
        }
    }
}
