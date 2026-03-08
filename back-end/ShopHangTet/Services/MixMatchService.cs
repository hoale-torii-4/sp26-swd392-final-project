using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Text.Json;

namespace ShopHangTet.Services;

public class MixMatchService : IMixMatchService
{
    private readonly ShopHangTetDbContext _context;

    public MixMatchService(ShopHangTetDbContext context)
    {
        _context = context;
    }

    private static (string status, string label) GetStockStatus(int qty)
    {
        if (qty == 0) return ("OUT_OF_STOCK", "Out of stock");
        if (qty <= 20) return ("LOW_STOCK", "Low stock");
        return ("IN_STOCK", "In stock");
    }

    public async Task<object> GetItemsAsync(string? search, string? category, bool? isActive, int page, int pageSize)
    {
        var query = _context.Items.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(i => i.Name.Contains(search));

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(i => i.Category.ToString() == category);

        if (isActive.HasValue)
            query = query.Where(i => i.IsActive == isActive.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(i => i.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var data = items.Select(i =>
        {
            var (status, label) = GetStockStatus(i.StockQuantity);
            return new MixMatchItemResponseDTO
            {
                Id = i.Id,
                Name = i.Name,
                Image = (i.Images != null && i.Images.Any()) ? i.Images.First() : "item-default.jpg",
                Category = i.Category.ToString(),
                CategoryLabel = i.Category.ToString(),
                Price = i.Price,
                IsAlcohol = i.IsAlcohol,
                StockQuantity = i.StockQuantity,
                StockStatus = status,
                StockStatusLabel = label,
                IsActive = i.IsActive,
                StatusLabel = i.IsActive ? "Active" : "Disabled"
            };
        }).ToList();

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        return new PagedResult<MixMatchItemResponseDTO>
        {
            Data = data,
            TotalItems = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<MixMatchItemResponseDTO?> GetItemByIdAsync(string id)
    {
        var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
        if (item == null) return null;

        var (status, label) = GetStockStatus(item.StockQuantity);

        return new MixMatchItemResponseDTO
        {
            Id = item.Id,
            Name = item.Name,
            Image = (item.Images != null && item.Images.Any()) ? item.Images.First() : "item-default.jpg",
            Category = item.Category.ToString(),
            CategoryLabel = item.Category.ToString(),
            Price = item.Price,
            IsAlcohol = item.IsAlcohol,
            StockQuantity = item.StockQuantity,
            StockStatus = status,
            StockStatusLabel = label,
            IsActive = item.IsActive,
            StatusLabel = item.IsActive ? "Active" : "Disabled"
        };
    }

    public async Task<string> CreateItemAsync(MixMatchCreateDTO dto)
    {
        var item = new Item
        {
            Name = dto.Name,
            Price = dto.Price,
            Category = Enum.Parse<ItemCategory>(dto.Category),
            Images = string.IsNullOrWhiteSpace(dto.Image) ? new List<string>() : new List<string> { dto.Image },
            IsAlcohol = dto.IsAlcohol,
            StockQuantity = 0,
            IsActive = dto.IsActive
        };

        await _context.Items.AddAsync(item);
        await _context.SaveChangesAsync();
        return item.Id;
    }

    public async Task UpdateItemAsync(string id, MixMatchUpdateDTO dto)
    {
        var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
        if (item == null) throw new InvalidOperationException("Item not found");

        item.Name = dto.Name;
        item.Price = dto.Price;
        item.Category = Enum.Parse<ItemCategory>(dto.Category);
        item.IsAlcohol = dto.IsAlcohol;
        item.IsActive = dto.IsActive;
        if (!string.IsNullOrWhiteSpace(dto.Image))
        {
            item.Images = new List<string> { dto.Image };
        }

        _context.Items.Update(item);
        await _context.SaveChangesAsync();
    }

    public async Task ToggleItemStatusAsync(string id, bool isActive)
    {
        var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
        if (item == null) throw new InvalidOperationException("Item not found");
        item.IsActive = isActive;
        _context.Items.Update(item);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteItemAsync(string id)
    {
        // Check GiftBoxes
        var usedInGift = await _context.GiftBoxes.AnyAsync(g => g.Items.Any(it => it.ItemId == id));
        if (usedInGift) throw new InvalidOperationException("Cannot delete item because it is used in existing gift boxes or orders");

        // Check CustomBoxes
        var usedInCustom = await _context.CustomBoxes.AnyAsync(cb => cb.Items.Any(it => it.ItemId == id));
        if (usedInCustom) throw new InvalidOperationException("Cannot delete item because it is used in existing gift boxes or orders");

        // Check Orders (snapshot items)
        var usedInOrders = await _context.Orders.AnyAsync(o => o.Items.Any(oi => oi.SnapshotItems.Any(si => si.ItemId == id)));
        if (usedInOrders) throw new InvalidOperationException("Cannot delete item because it is used in existing gift boxes or orders");

        var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
        if (item == null) return;

        _context.Items.Remove(item);
        await _context.SaveChangesAsync();
    }

    public Task<List<object>> GetCategoriesAsync()
    {
        var list = new List<object>
        {
            new { value = "NUT", label = "Hạt" },
            new { value = "FOOD", label = "Snack" },
            new { value = "DRINK", label = "Trà" },
            new { value = "ALCOHOL", label = "Rượu" }
        };

        return Task.FromResult(list);
    }

    public async Task<MixMatchRuleDTO> GetRulesAsync()
    {
        var cfg = await _context.SystemConfigs.FirstOrDefaultAsync(s => s.Id == "MIX_MATCH_RULE");
        if (cfg == null || string.IsNullOrWhiteSpace(cfg.EmailTemplate))
        {
            return new MixMatchRuleDTO();
        }

        try
        {
            var dto = JsonSerializer.Deserialize<MixMatchRuleDTO>(cfg.EmailTemplate);
            return dto ?? new MixMatchRuleDTO();
        }
        catch
        {
            return new MixMatchRuleDTO();
        }
    }

    public async Task UpdateRulesAsync(MixMatchRuleDTO dto)
    {
        var cfg = await _context.SystemConfigs.FirstOrDefaultAsync(s => s.Id == "MIX_MATCH_RULE");
        var json = JsonSerializer.Serialize(dto);
        if (cfg == null)
        {
            cfg = new SystemConfig
            {
                Id = "MIX_MATCH_RULE",
                EmailTemplate = json,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.SystemConfigs.AddAsync(cfg);
        }
        else
        {
            cfg.EmailTemplate = json;
            cfg.UpdatedAt = DateTime.UtcNow;
            _context.SystemConfigs.Update(cfg);
        }

        await _context.SaveChangesAsync();
    }
}
