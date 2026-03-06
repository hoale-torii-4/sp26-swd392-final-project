using Microsoft.EntityFrameworkCore;
using ShopHangTet.Models;

namespace ShopHangTet.Data;

public static class SeedData
{
    public static async Task InitializeAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ShopHangTetDbContext>();

        await context.Database.EnsureCreatedAsync();

        await SeedItems(context);
        await SeedTags(context);
        await SeedCollections(context);
        await SeedGiftBoxes(context);

        await context.SaveChangesAsync();

        Console.WriteLine("----> Seed completed");
    }

    // ======================================================
    // ITEMS
    // ======================================================

    private static async Task SeedItems(ShopHangTetDbContext context)
    {
        if (await context.Items.AnyAsync()) return;

        var items = new List<Item>
        {
            new() { Name="Hạt điều rang muối", Category=ItemCategory.NUT, Price=85000, StockQuantity=1000 },
            new() { Name="Hạt macca", Category=ItemCategory.NUT, Price=160000, StockQuantity=1000 },
            new() { Name="Hạt hạnh nhân", Category=ItemCategory.NUT, Price=130000, StockQuantity=1000 },
            new() { Name="Hạt óc chó", Category=ItemCategory.NUT, Price=140000, StockQuantity=1000 },
            new() { Name="Hạt dẻ cười", Category=ItemCategory.NUT, Price=150000, StockQuantity=1000 },

            new() { Name="Butter cookies", Category=ItemCategory.FOOD, Price=90000, StockQuantity=1000 },
            new() { Name="Socola Jinkeli", Category=ItemCategory.FOOD, Price=120000, StockQuantity=1000 },
            new() { Name="Socola Ferrero", Category=ItemCategory.FOOD, Price=180000, StockQuantity=1000 },
            new() { Name="Kẹo tiramisu", Category=ItemCategory.FOOD, Price=95000, StockQuantity=1000 },

            new() { Name="Mứt xoài", Category=ItemCategory.FOOD, Price=85000, StockQuantity=1000 },
            new() { Name="Mứt dừa", Category=ItemCategory.FOOD, Price=75000, StockQuantity=1000 },
            new() { Name="Mứt gừng", Category=ItemCategory.FOOD, Price=80000, StockQuantity=1000 },

            new() { Name="Trà ô long", Category=ItemCategory.DRINK, Price=120000, StockQuantity=1000 },
            new() { Name="Trà sen Tây Hồ", Category=ItemCategory.DRINK, Price=180000, StockQuantity=1000 },
            new() { Name="Trà lài", Category=ItemCategory.DRINK, Price=95000, StockQuantity=1000 },

            new() { Name="Rượu vang đỏ", Category=ItemCategory.ALCOHOL, Price=320000, StockQuantity=500 },
            new() { Name="Rượu Chivas 12", Category=ItemCategory.ALCOHOL, Price=750000, StockQuantity=300 },
            new() { Name="Rượu Chivas 21", Category=ItemCategory.ALCOHOL, Price=2300000, StockQuantity=200 },

            new() { Name="Khô gà lá chanh", Category=ItemCategory.FOOD, Price=120000, StockQuantity=1000 },
            new() { Name="Khô bò", Category=ItemCategory.FOOD, Price=180000, StockQuantity=1000 }
        };

        await context.Items.AddRangeAsync(items);

        Console.WriteLine($"Seeded {items.Count} Items");
    }

    // ======================================================
    // TAGS
    // ======================================================

    private static async Task SeedTags(ShopHangTetDbContext context)
    {
        if (await context.Tags.AnyAsync()) return;

        var tags = new List<Tag>
        {
            new() { Name="Gia đình", Type="RECIPIENT" },
            new() { Name="Bạn bè", Type="RECIPIENT" },
            new() { Name="Đối tác", Type="RECIPIENT" },
            new() { Name="Nhân viên", Type="RECIPIENT" },
            new() { Name="Người lớn tuổi", Type="RECIPIENT" },

            new() { Name="Sum vầy", Type="MEANING" },
            new() { Name="Tri ân", Type="MEANING" },
            new() { Name="Chúc sức khỏe", Type="MEANING" },
            new() { Name="Chúc tài lộc", Type="MEANING" },
            new() { Name="Chúc thành công", Type="MEANING" }
        };

        await context.Tags.AddRangeAsync(tags);
    }

    // ======================================================
    // COLLECTIONS
    // ======================================================

    private static async Task SeedCollections(ShopHangTetDbContext context)
    {
        if (await context.Collections.AnyAsync()) return;

        var collections = new List<Collection>
        {
            new()
            {
                Name="Xuân Đoàn Viên",
                PricingMultiplier=1.35m,
                PackagingFee=150000
            },
            new()
            {
                Name="Cát Tường Phú Quý",
                PricingMultiplier=1.5m,
                PackagingFee=300000
            },
            new()
            {
                Name="Lộc Xuân Doanh Nghiệp",
                PricingMultiplier=1.35m,
                PackagingFee=150000
            },
            new()
            {
                Name="An Nhiên Tân Xuân",
                PricingMultiplier=1.35m,
                PackagingFee=150000
            },
            new()
            {
                Name="Xuân Gắn Kết",
                PricingMultiplier=1.35m,
                PackagingFee=150000
            }
        };

        await context.Collections.AddRangeAsync(collections);
    }

    // ======================================================
    // GIFT BOXES
    // ======================================================

    private static async Task SeedGiftBoxes(ShopHangTetDbContext context)
    {
        if (await context.GiftBoxes.AnyAsync()) return;

        var items = await context.Items.ToListAsync();
        var collections = await context.Collections.ToListAsync();

        string Id(string name) => items.First(x => x.Name == name).Id;

        decimal Calc(string collection, params string[] itemNames)
        {
            var col = collections.First(x => x.Name == collection);

            var total = itemNames.Sum(name =>
                items.First(x => x.Name == name).Price);

            return Math.Round(total * col.PricingMultiplier + col.PackagingFee);
        }

        var boxes = new List<GiftBox>
        {
            new()
            {
                Name="Gia Ấm",
                CollectionId=collections.First(c=>c.Name=="Xuân Đoàn Viên").Id,
                Price=Calc("Xuân Đoàn Viên","Hạt điều rang muối","Mứt dừa","Butter cookies","Trà lài"),
                Images=["https://ibb.co/xKcfgX53"],
                Items=
                [
                    new(){ItemId=Id("Hạt điều rang muối"),Quantity=1},
                    new(){ItemId=Id("Mứt dừa"),Quantity=1},
                    new(){ItemId=Id("Butter cookies"),Quantity=1},
                    new(){ItemId=Id("Trà lài"),Quantity=1}
                ]
            },

            new()
            {
                Name="Trường Thọ",
                CollectionId=collections.First(c=>c.Name=="Xuân Đoàn Viên").Id,
                Price=Calc("Xuân Đoàn Viên","Táo đỏ","Mứt gừng","Trà sen Tây Hồ","Bánh pía mini"),
                Images=["https://ibb.co/fYM2624p"]
            }
        };

        await context.GiftBoxes.AddRangeAsync(boxes);

        Console.WriteLine($"Seeded {boxes.Count} GiftBoxes");
    }
}
