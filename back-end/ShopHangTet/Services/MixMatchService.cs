using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace ShopHangTet.Services;

public class MixMatchService : IMixMatchService
{
    private readonly ShopHangTetDbContext _context;

    public MixMatchService(ShopHangTetDbContext context)
    {
        _context = context;
    }

    // ════════════════════════════════════════════════════════════════════
    // ITEMS
    // ════════════════════════════════════════════════════════════════════

    public async Task<object> GetItemsAsync(
        string? search, string? category, bool? isActive, int page, int pageSize)
    {
        var query = _context.Items.AsQueryable();

        if (!string.IsNullOrWhiteSpace(category)
            && Enum.TryParse<ItemCategory>(category, true, out var catEnum))
        {
            query = query.Where(i => i.Category == catEnum);
        }

        if (isActive.HasValue)
            query = query.Where(i => i.IsActive == isActive.Value);

        var items = await query.OrderBy(i => i.Name).ToListAsync();

        // Normalize search sau khi load (MongoDB EF Core không support string methods tốt)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = NormalizeSearch(search);
            items = items
                .Where(i => NormalizeSearch(i.Name).Contains(normalizedSearch))
                .ToList();
        }

        var total = items.Count;
        var safePage = Math.Max(1, page);
        var safeSize = Math.Clamp(pageSize, 1, 100);

        items = items
            .Skip((safePage - 1) * safeSize)
            .Take(safeSize)
            .ToList();

        var data = items.Select(i =>
        {
            var (status, label) = GetStockStatus(i.StockQuantity);
            return new MixMatchItemResponseDTO
            {
                Id = i.Id,
                Name = i.Name,
                Image = i.Images?.FirstOrDefault() ?? string.Empty,
                Category = i.Category.ToString(),
                CategoryLabel = GetCategoryLabel(i.Category),
                Price = i.Price,
                IsAlcohol = i.IsAlcohol,
                StockQuantity = i.StockQuantity,
                StockStatus = status,
                StockStatusLabel = label,
                IsActive = i.IsActive,
                StatusLabel = i.IsActive ? "Đang bán" : "Tạm ẩn"
            };
        }).ToList();

        return new PagedResult<MixMatchItemResponseDTO>
        {
            Data = data,
            TotalItems = total,
            Page = safePage,
            PageSize = safeSize,
            TotalPages = (int)Math.Ceiling(total / (double)safeSize)
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
            Image = item.Images?.FirstOrDefault() ?? string.Empty,
            Category = item.Category.ToString(),
            CategoryLabel = GetCategoryLabel(item.Category),
            Price = item.Price,
            IsAlcohol = item.IsAlcohol,
            StockQuantity = item.StockQuantity,
            StockStatus = status,
            StockStatusLabel = label,
            IsActive = item.IsActive,
            StatusLabel = item.IsActive ? "Đang bán" : "Tạm ẩn"
        };
    }

    public async Task<string> CreateItemAsync(MixMatchCreateDTO dto)
    {
        if (!Enum.TryParse<ItemCategory>(dto.Category, true, out var category))
            throw new InvalidOperationException(
                $"Category không hợp lệ: '{dto.Category}'. Các giá trị hợp lệ: DRINK, FOOD, NUT, ALCOHOL, SAVORY");

        var item = new Item
        {
            Name = dto.Name,
            Price = dto.Price,
            Category = category,
            Images = string.IsNullOrWhiteSpace(dto.Image)
                ? new List<string>()
                : new List<string> { dto.Image },
            IsAlcohol = dto.IsAlcohol || category == ItemCategory.ALCOHOL,
            StockQuantity = 0,
            IsActive = dto.IsActive
        };

        await _context.Items.AddAsync(item);
        await _context.SaveChangesAsync();
        return item.Id;
    }

    public async Task UpdateItemAsync(string id, MixMatchUpdateDTO dto)
    {
        var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new InvalidOperationException("Item not found");

        if (!Enum.TryParse<ItemCategory>(dto.Category, true, out var category))
            throw new InvalidOperationException(
                $"Category không hợp lệ: '{dto.Category}'. Các giá trị hợp lệ: DRINK, FOOD, NUT, ALCOHOL, SAVORY");

        item.Name = dto.Name;
        item.Price = dto.Price;
        item.Category = category;
        item.IsAlcohol = dto.IsAlcohol || category == ItemCategory.ALCOHOL;
        item.IsActive = dto.IsActive;

        if (!string.IsNullOrWhiteSpace(dto.Image))
            item.Images = new List<string> { dto.Image };

        _context.Items.Update(item);
        await _context.SaveChangesAsync();
    }

    public async Task ToggleItemStatusAsync(string id, bool isActive)
    {
        var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new InvalidOperationException("Item not found");

        item.IsActive = isActive;
        _context.Items.Update(item);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteItemAsync(string id)
    {
        // Kiểm tra item đang được dùng trong GiftBox
        var usedInGift = await _context.GiftBoxes
            .AnyAsync(g => g.Items.Any(it => it.ItemId == id));
        if (usedInGift)
            throw new InvalidOperationException(
                "Không thể xóa sản phẩm đang được dùng trong hộp quà có sẵn");

        // Kiểm tra item đang được dùng trong CustomBox
        var usedInCustom = await _context.CustomBoxes
            .AnyAsync(cb => cb.Items.Any(it => it.ItemId == id));
        if (usedInCustom)
            throw new InvalidOperationException(
                "Không thể xóa sản phẩm đang được dùng trong hộp quà Mix & Match");

        // Kiểm tra snapshot trong đơn hàng đã tạo
        var usedInOrders = await _context.Orders
            .AnyAsync(o => o.Items.Any(oi => oi.SnapshotItems.Any(si => si.ItemId == id)));
        if (usedInOrders)
            throw new InvalidOperationException(
                "Không thể xóa sản phẩm đã xuất hiện trong đơn hàng");

        var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
        if (item == null) return;

        _context.Items.Remove(item);
        await _context.SaveChangesAsync();
    }

    // ════════════════════════════════════════════════════════════════════
    // CATEGORIES — bao gồm SAVORY
    // ════════════════════════════════════════════════════════════════════

    public Task<List<object>> GetCategoriesAsync()
    {
        var list = new List<object>
        {
            new { value = "NUT",     label = "Hạt dinh dưỡng" },
            new { value = "FOOD",    label = "Bánh & Kẹo" },
            new { value = "DRINK",   label = "Trà" },
            new { value = "ALCOHOL", label = "Rượu" },
            new { value = "SAVORY",  label = "Đặc sản mặn" }  // ← MỚI
        };
        return Task.FromResult(list);
    }

    // ════════════════════════════════════════════════════════════════════
    // RULES — lưu trong SystemConfig với key MIX_MATCH_RULE
    // ════════════════════════════════════════════════════════════════════

    public async Task<MixMatchRuleDTO> GetRulesAsync()
    {
        var cfg = await _context.SystemConfigs
            .FirstOrDefaultAsync(s => s.Id == "MIX_MATCH_RULE");

        if (cfg == null || string.IsNullOrWhiteSpace(cfg.EmailTemplate))
            return GetDefaultRules();

        try
        {
            return JsonSerializer.Deserialize<MixMatchRuleDTO>(cfg.EmailTemplate)
                ?? GetDefaultRules();
        }
        catch
        {
            return GetDefaultRules();
        }
    }

    public async Task UpdateRulesAsync(MixMatchRuleDTO dto)
    {
        // Validate: min không được > max
        if (dto.MinItems > dto.MaxItems)
            throw new InvalidOperationException("MinItems không được lớn hơn MaxItems");
        if (dto.MinDrink < 0 || dto.MinSnack < 0 || dto.MaxSavory < 0)
            throw new InvalidOperationException("Các giá trị rule không được âm");

        var json = JsonSerializer.Serialize(dto);
        var cfg = await _context.SystemConfigs
            .FirstOrDefaultAsync(s => s.Id == "MIX_MATCH_RULE");

        if (cfg == null)
        {
            cfg = new Models.SystemConfig
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

    // ════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════

    private static MixMatchRuleDTO GetDefaultRules() => new()
    {
        MinItems = 4,
        MaxItems = 6,
        MinDrink = 1,
        MinSnack = 2,
        MaxSavory = 2
    };

    private static (string status, string label) GetStockStatus(int qty) => qty switch
    {
        0 => ("OUT_OF_STOCK", "Hết hàng"),
        <= 20 => ("LOW_STOCK", "Sắp hết"),
        _ => ("IN_STOCK", "Còn hàng")
    };

    private static string GetCategoryLabel(ItemCategory category) => category switch
    {
        ItemCategory.NUT => "Hạt dinh dưỡng",
        ItemCategory.FOOD => "Bánh & Kẹo",
        ItemCategory.DRINK => "Trà",
        ItemCategory.ALCOHOL => "Rượu",
        ItemCategory.SAVORY => "Đặc sản mặn",
        _ => category.ToString()
    };

    private static string NormalizeSearch(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var ch in normalized)
        {
            var cat = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (cat != UnicodeCategory.NonSpacingMark)
                builder.Append(ch == 'đ' ? 'd' : ch == 'Đ' ? 'D' : ch);
        }
        return builder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }
}
