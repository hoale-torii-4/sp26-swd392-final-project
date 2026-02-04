using ShopHangTet.Models;
using ShopHangTet.Data;
using Microsoft.EntityFrameworkCore;

public static class SeedData
{
    public static async Task InitializeAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ShopHangTetDbContext>();

        try
        {
            // Đảm bảo database được tạo
            await context.Database.EnsureCreatedAsync();

            // Seed Collections first
            await SeedCollectionsAsync(context);

            // Seed Items (Mix & Match ingredients)
            await SeedItemsAsync(context);

            // Seed Gift Boxes
            await SeedGiftBoxesAsync(context);

            await context.SaveChangesAsync();
            Console.WriteLine("----> Đã Seed dữ liệu mẫu thành công vào MongoDB!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Seed error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw; // Re-throw to see the error
        }
    }

    private static async Task SeedCollectionsAsync(ShopHangTetDbContext context)
    {
        if (await context.Collections.AnyAsync()) return;

        var collections = new List<Collection>
        {
            new Collection
            {
                Name = "Xuân Đoàn Viên",
                Description = "Bộ sưu tập quà Tết truyền thống, ấm áp cho gia đình",
                DisplayOrder = 1,
                IsActive = true
            },
            new Collection
            {
                Name = "Cát Tường Phú Quý", 
                Description = "Bộ sưu tập quà Tết cao cấp, sang trọng",
                DisplayOrder = 2,
                IsActive = true
            },
            new Collection
            {
                Name = "Lộc Xuân Doanh Nghiệp",
                Description = "Bộ sưu tập quà Tết dành cho doanh nghiệp",
                DisplayOrder = 3,
                IsActive = true
            }
        };

        await context.Collections.AddRangeAsync(collections);
    }

    private static async Task SeedItemsAsync(ShopHangTetDbContext context)
    {
        if (await context.Items.AnyAsync()) return;

        var items = new List<Item>
        {
            // Nuts
            new Item { Name = "Hạt điều rang muối", Category = "NUT", Price = 150000, StockQuantity = 1000 },
            new Item { Name = "Hạt macca", Category = "NUT", Price = 200000, StockQuantity = 500 },
            new Item { Name = "Hạt hạnh nhân", Category = "NUT", Price = 180000, StockQuantity = 800 },

            // Drinks  
            new Item { Name = "Trà ô long", Category = "DRINK", Price = 120000, StockQuantity = 1000 },
            new Item { Name = "Trà lài túi lọc", Category = "DRINK", Price = 100000, StockQuantity = 1200 },

            // Food
            new Item { Name = "Bánh butter cookies", Category = "FOOD", Price = 80000, StockQuantity = 1500 },
            new Item { Name = "Socola Ferrero", Category = "FOOD", Price = 120000, StockQuantity = 800 },

            // Alcohol
            new Item { Name = "Rượu vang đỏ", Category = "ALCOHOL", Price = 500000, StockQuantity = 200, IsAlcohol = true },
            new Item { Name = "Rượu Batise", Category = "ALCOHOL", Price = 300000, StockQuantity = 150, IsAlcohol = true }
        };

        await context.Items.AddRangeAsync(items);
    }

    private static async Task SeedGiftBoxesAsync(ShopHangTetDbContext context)
    {
        if (await context.GiftBoxes.AnyAsync()) return;

        var collections = await context.Collections.ToListAsync();
        if (!collections.Any()) return;

        var xuanDoanVien = collections.FirstOrDefault(c => c.Name == "Xuân Đoàn Viên");
        if (xuanDoanVien == null) return;

        var items = await context.Items.ToListAsync();
        if (!items.Any()) return;

        var giftBoxes = new List<GiftBox>
        {
            new GiftBox
            {
                Name = "Xuân Đoàn Viên - Gia Ấm",
                Description = "Hộp quà gia đình ấm áp với hạt điều, trà lài và bánh cookies",
                Price = 650000,
                CollectionId = xuanDoanVien.Id,
                Tags = new List<string> { "Gia đình", "Truyền thống" },
                Images = new List<string> { "gia-am-1.jpg" },
                Items = new List<GiftBoxItem>(),
                IsActive = true
            }
        };

        await context.GiftBoxes.AddRangeAsync(giftBoxes);
    }

}