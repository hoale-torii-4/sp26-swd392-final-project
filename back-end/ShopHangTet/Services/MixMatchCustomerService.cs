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

    public async Task<string> CreateCustomBoxAsync(CreateCustomBoxDTO dto)
    {
        if (dto == null || dto.Items == null) throw new ArgumentException("Items are required");

        var totalItems = dto.Items.Sum(x => x.Quantity);
        if (totalItems < 4 || totalItems > 6)
            throw new InvalidOperationException("Custom box must contain between 4 and 6 items.");

        var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        var itemsDict = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id);
        if (itemsDict.Count != itemIds.Count)
            throw new InvalidOperationException("One or more selected items were not found.");

        var customBox = new CustomBox
        {
            Items = dto.Items.Select(i => new CustomBoxItem { ItemId = i.ItemId, Quantity = i.Quantity }).ToList()
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

    public async Task<CustomBoxResponseDTO?> GetCustomBoxAsync(string id)
    {
        var box = await _context.CustomBoxes.FirstOrDefaultAsync(cb => cb.Id == id);
        if (box == null) return null;

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
                Subtotal = price * i.Quantity
            };
        }).ToList();

        return new CustomBoxResponseDTO
        {
            Id = box.Id,
            Items = items,
            TotalItems = box.Items.Sum(x => x.Quantity),
            TotalPrice = box.TotalPrice
        };
    }
}
