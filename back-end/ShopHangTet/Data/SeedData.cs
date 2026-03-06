using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using ShopHangTet.Data;
using ShopHangTet.Models;

public static class SeedData
{
    public static async Task InitializeAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ShopHangTetDbContext>();

        try
        {
            await context.Database.EnsureCreatedAsync();

            await SeedTagsAsync(context);
            await SeedCollectionsAsync(context);
            await SeedItemsAsync(context);
            await SeedGiftBoxesAsync(context);
            await SeedDeliverySlotsAsync(context);
            await SeedDemoCustomBoxAsync(context);
            await SeedDemoOrderAndInventoryLogsAsync(context);

            await context.SaveChangesAsync();
            Console.WriteLine("----> Seed du lieu thanh cong: Tags, Collections, Items, GiftBoxes, DeliverySlots, DemoCustomBox, DemoOrder, DemoInventoryLogs");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Seed error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }
    }

    private static async Task SeedTagsAsync(ShopHangTetDbContext context)
    {
        if (await context.Tags.AnyAsync()) return;

        var tags = new List<Tag>
        {
            new Tag { Name = "Gia đình", Type = "RECIPIENT", IsActive = true },
            new Tag { Name = "Bạn bè", Type = "RECIPIENT", IsActive = true },
            new Tag { Name = "Đối tác", Type = "RECIPIENT", IsActive = true },
            new Tag { Name = "Nhân viên", Type = "RECIPIENT", IsActive = true },
            new Tag { Name = "Người lớn tuổi", Type = "RECIPIENT", IsActive = true },
            new Tag { Name = "Doanh nghiệp", Type = "RECIPIENT", IsActive = true },

            new Tag { Name = "Sum vầy", Type = "MEANING", IsActive = true },
            new Tag { Name = "Tri ân", Type = "MEANING", IsActive = true },
            new Tag { Name = "Mừng năm mới", Type = "MEANING", IsActive = true },
            new Tag { Name = "Chúc sức khỏe", Type = "MEANING", IsActive = true },
            new Tag { Name = "Chúc tài lộc", Type = "MEANING", IsActive = true },
            new Tag { Name = "Chúc thành công", Type = "MEANING", IsActive = true },

            new Tag { Name = "Tết Nguyên Đán", Type = "OCCASION", IsActive = true }
        };

        await context.Tags.AddRangeAsync(tags);
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
            },
            new Collection
            {
                Name = "An Nhiên Tân Xuân",
                Description = "Bộ sưu tập quà Tết sức khỏe, tinh tế",
                DisplayOrder = 4,
                IsActive = true
            },
            new Collection
            {
                Name = "Xuân Gắn Kết",
                Description = "Bộ sưu tập quà Tết nhẹ nhàng, thân tình",
                DisplayOrder = 5,
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
            // NHOM HAT - DINH DUONG (10)
            new Item { Name = "Hạt điều rang muối", Category = ItemCategory.NUT, Price = 85000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Hạt macca", Category = ItemCategory.NUT, Price = 160000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Hạt hạnh nhân", Category = ItemCategory.NUT, Price = 130000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Hạt óc chó", Category = ItemCategory.NUT, Price = 140000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Hạt dẻ cười", Category = ItemCategory.NUT, Price = 150000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Đậu phộng rang", Category = ItemCategory.NUT, Price = 45000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Hạt hướng dương", Category = ItemCategory.NUT, Price = 55000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Hạt bí xanh", Category = ItemCategory.NUT, Price = 95000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Hạt điều wasabi", Category = ItemCategory.NUT, Price = 110000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Hạt mix cao cấp", Category = ItemCategory.NUT, Price = 180000, StockQuantity = 1000, IsActive = true },

            // NHOM BANH - KEO (12)
            new Item { Name = "Butter cookies", Category = ItemCategory.FOOD, Price = 90000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Bánh quy bơ Đan Mạch", Category = ItemCategory.FOOD, Price = 150000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Socola Jinkeli", Category = ItemCategory.FOOD, Price = 120000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Socola Ferrero", Category = ItemCategory.FOOD, Price = 180000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Kẹo tiramisu", Category = ItemCategory.FOOD, Price = 95000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Kẹo nougat", Category = ItemCategory.FOOD, Price = 120000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Bánh pía mini", Category = ItemCategory.FOOD, Price = 85000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Bánh quy yến mạch", Category = ItemCategory.FOOD, Price = 110000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Socola đen 70%", Category = ItemCategory.FOOD, Price = 140000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Kẹo trái cây mềm", Category = ItemCategory.FOOD, Price = 85000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Kẹo caramel", Category = ItemCategory.FOOD, Price = 100000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Bánh hạnh nhân lát", Category = ItemCategory.FOOD, Price = 130000, StockQuantity = 1000, IsActive = true },

            // NHOM MUT - TRAI CAY SAY (10)
            new Item { Name = "Mứt xoài", Category = ItemCategory.FOOD, Price = 85000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Mứt dừa", Category = ItemCategory.FOOD, Price = 75000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Mứt gừng", Category = ItemCategory.FOOD, Price = 80000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Mứt dứa", Category = ItemCategory.FOOD, Price = 70000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Nho khô", Category = ItemCategory.FOOD, Price = 95000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Táo đỏ", Category = ItemCategory.FOOD, Price = 110000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Mứt me", Category = ItemCategory.FOOD, Price = 75000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Mứt cam", Category = ItemCategory.FOOD, Price = 90000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Mận sấy", Category = ItemCategory.FOOD, Price = 120000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Dứa sấy dẻo", Category = ItemCategory.FOOD, Price = 85000, StockQuantity = 1000, IsActive = true },

            // NHOM TRA (8)
            new Item { Name = "Trà ô long", Category = ItemCategory.DRINK, Price = 120000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Trà sen Tây Hồ", Category = ItemCategory.DRINK, Price = 180000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Trà lài", Category = ItemCategory.DRINK, Price = 95000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Trà thảo mộc", Category = ItemCategory.DRINK, Price = 110000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Trà hoa quả", Category = ItemCategory.DRINK, Price = 100000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Trà gừng mật ong", Category = ItemCategory.DRINK, Price = 110000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Trà atiso", Category = ItemCategory.DRINK, Price = 110000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Trà xanh Nhật", Category = ItemCategory.DRINK, Price = 150000, StockQuantity = 1000, IsActive = true },

            // NHOM RUOU (6)
            new Item { Name = "Rượu vang đỏ (Chile/Pháp entry)", Category = ItemCategory.ALCOHOL, Price = 320000, StockQuantity = 500, IsAlcohol = true, IsActive = true },
            new Item { Name = "Rượu Batise", Category = ItemCategory.ALCOHOL, Price = 280000, StockQuantity = 500, IsAlcohol = true, IsActive = true },
            new Item { Name = "Rượu Chivas 12", Category = ItemCategory.ALCOHOL, Price = 750000, StockQuantity = 300, IsAlcohol = true, IsActive = true },
            new Item { Name = "Rượu Chivas 21", Category = ItemCategory.ALCOHOL, Price = 2300000, StockQuantity = 200, IsAlcohol = true, IsActive = true },
            new Item { Name = "Rượu vang trắng", Category = ItemCategory.ALCOHOL, Price = 300000, StockQuantity = 500, IsAlcohol = true, IsActive = true },
            new Item { Name = "Rượu sake", Category = ItemCategory.ALCOHOL, Price = 350000, StockQuantity = 500, IsAlcohol = true, IsActive = true },

            // NHOM DAC SAN MAN (4)
            new Item { Name = "Khô gà lá chanh", Category = ItemCategory.FOOD, Price = 120000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Khô bò", Category = ItemCategory.FOOD, Price = 180000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Chà bông cá hồi", Category = ItemCategory.FOOD, Price = 210000, StockQuantity = 1000, IsActive = true },
            new Item { Name = "Lạp xưởng tươi", Category = ItemCategory.FOOD, Price = 160000, StockQuantity = 1000, IsActive = true }
        };

        await context.Items.AddRangeAsync(items);
        Console.WriteLine($"----> Seeded {items.Count} Items");
    }

    private static async Task SeedGiftBoxesAsync(ShopHangTetDbContext context)
    {
        if (await context.GiftBoxes.AnyAsync()) return;

        var collections = await context.Collections.ToListAsync();
        var tags = await context.Tags.ToListAsync();
        var items = await context.Items.ToListAsync();

        if (!collections.Any() || !items.Any()) return;

        var collectionMap = collections.ToDictionary(c => c.Name, c => c.Id);
        var tagMap = tags.ToDictionary(t => t.Name, t => t.Id);
        var itemMap = items.ToDictionary(i => i.Name, i => i.Id);

        string GetCollectionId(string collectionName)
        {
            if (!collectionMap.TryGetValue(collectionName, out var id))
                throw new InvalidOperationException($"Collection not found: {collectionName}");
            return id;
        }

        string GetItemId(string itemName)
        {
            if (!itemMap.TryGetValue(itemName, out var id))
                throw new InvalidOperationException($"Item not found: {itemName}");
            return id;
        }

        List<string> GetTagIds(params string[] tagNames)
        {
            var ids = new List<string>();
            foreach (var tagName in tagNames)
            {
                if (!tagMap.TryGetValue(tagName, out var id))
                    throw new InvalidOperationException($"Tag not found: {tagName}");
                ids.Add(id);
            }

            return ids;
        }

        GiftBox CreateGiftBox(
            string collectionName,
            string boxName,
            decimal price,
            string recipientTag,
            string meaningTag,
            params string[] itemNames)
        {
            return new GiftBox
            {
                Name = $"{collectionName} - {boxName}",
                Description = $"Hộp quà {boxName} thuộc collection {collectionName}",
                Price = price,
                CollectionId = GetCollectionId(collectionName),
                Tags = GetTagIds(recipientTag, meaningTag),
                Images = new List<string> { "seed-box.jpg" },
                Items = itemNames.Select(itemName => new GiftBoxItem
                {
                    ItemId = GetItemId(itemName),
                    Quantity = 1
                }).ToList(),
                IsActive = true
            };
        }

        var giftBoxes = new List<GiftBox>
        {
            // 1) XUAN DOAN VIEN (8)
            CreateGiftBox("Xuân Đoàn Viên", "Gia Ấm", 620000, "Gia đình", "Sum vầy",
                "Hạt điều rang muối", "Mứt dừa", "Butter cookies", "Trà lài"),
            CreateGiftBox("Xuân Đoàn Viên", "Trường Thọ", 760000, "Người lớn tuổi", "Chúc sức khỏe",
                "Táo đỏ", "Mứt gừng", "Trà sen Tây Hồ", "Bánh pía mini"),
            CreateGiftBox("Xuân Đoàn Viên", "Sum Vầy", 790000, "Bạn bè", "Mừng năm mới",
                "Hạt macca", "Kẹo tiramisu", "Nho khô", "Trà ô long"),
            CreateGiftBox("Xuân Đoàn Viên", "Tri Ân", 1050000, "Đối tác", "Tri ân",
                "Hạt hạnh nhân", "Socola Jinkeli", "Trà ô long", "Rượu Batise"),
            CreateGiftBox("Xuân Đoàn Viên", "Đoàn Tụ", 900000, "Gia đình", "Mừng năm mới",
                "Hạt óc chó", "Mứt xoài", "Trà sen Tây Hồ", "Bánh quy bơ Đan Mạch"),
            CreateGiftBox("Xuân Đoàn Viên", "Xuân Hòa", 560000, "Gia đình", "Sum vầy",
                "Đậu phộng rang", "Mứt dứa", "Trà lài", "Butter cookies"),
            CreateGiftBox("Xuân Đoàn Viên", "Ấm Tình", 900000, "Bạn bè", "Tri ân",
                "Hạt macca", "Socola Ferrero", "Trà ô long", "Nho khô"),
            CreateGiftBox("Xuân Đoàn Viên", "Phúc Lộc", 960000, "Gia đình", "Chúc tài lộc",
                "Hạt điều rang muối", "Mứt gừng", "Trà thảo mộc", "Rượu vang đỏ (Chile/Pháp entry)"),

            // 2) CAT TUONG PHU QUY (9)
            CreateGiftBox("Cát Tường Phú Quý", "Doanh Gia", 2150000, "Đối tác", "Chúc thành công",
                "Rượu Chivas 12", "Hạt dẻ cười", "Socola Ferrero", "Trà ô long"),
            CreateGiftBox("Cát Tường Phú Quý", "Thịnh Phát", 4500000, "Doanh nghiệp", "Chúc tài lộc",
                "Rượu Chivas 21", "Hạt macca", "Hạt óc chó", "Trà sen Tây Hồ"),
            CreateGiftBox("Cát Tường Phú Quý", "Tri Ân", 1300000, "Nhân viên", "Tri ân",
                "Rượu vang đỏ (Chile/Pháp entry)", "Bánh quy bơ Đan Mạch", "Mứt xoài", "Trà lài"),
            CreateGiftBox("Cát Tường Phú Quý", "Cao Niên", 980000, "Người lớn tuổi", "Chúc sức khỏe",
                "Táo đỏ", "Hạt óc chó", "Trà thảo mộc", "Mứt gừng"),
            CreateGiftBox("Cát Tường Phú Quý", "Giao Hảo", 1380000, "Bạn bè", "Mừng năm mới",
                "Rượu vang đỏ (Chile/Pháp entry)", "Khô bò", "Hạt điều rang muối", "Socola Jinkeli"),
            CreateGiftBox("Cát Tường Phú Quý", "Vượng Phát", 2200000, "Đối tác", "Chúc tài lộc",
                "Rượu Chivas 12", "Hạt óc chó", "Socola Ferrero", "Trà sen Tây Hồ"),
            CreateGiftBox("Cát Tường Phú Quý", "Kim Ngọc", 1450000, "Người lớn tuổi", "Mừng năm mới",
                "Rượu vang đỏ (Chile/Pháp entry)", "Táo đỏ", "Hạt macca", "Trà thảo mộc"),
            CreateGiftBox("Cát Tường Phú Quý", "Thành Công", 2100000, "Doanh nghiệp", "Chúc thành công",
                "Rượu Chivas 12", "Hạt dẻ cười", "Bánh quy bơ Đan Mạch", "Trà ô long"),
            CreateGiftBox("Cát Tường Phú Quý", "Phúc Quý", 1300000, "Nhân viên", "Chúc tài lộc",
                "Rượu vang đỏ (Chile/Pháp entry)", "Socola Jinkeli", "Hạt điều rang muối", "Trà lài"),

            // 3) LOC XUAN DOANH NGHIEP (8)
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Tri Ân", 650000, "Nhân viên", "Tri ân",
                "Butter cookies", "Hạt điều rang muối", "Mứt dứa", "Trà lài"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Đồng Hành", 1180000, "Đối tác", "Chúc thành công",
                "Rượu vang đỏ (Chile/Pháp entry)", "Hạt macca", "Trà ô long", "Socola Jinkeli"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Khởi Lộc", 1900000, "Doanh nghiệp", "Chúc tài lộc",
                "Rượu Chivas 12", "Hạt dẻ cười", "Trà sen Tây Hồ", "Bánh quy bơ Đan Mạch"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Gắn Kết", 720000, "Bạn bè", "Tri ân",
                "Khô gà lá chanh", "Hạt điều rang muối", "Trà ô long", "Mứt xoài"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Đồng Tâm", 720000, "Nhân viên", "Mừng năm mới",
                "Butter cookies", "Hạt macca", "Mứt dứa", "Trà lài"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Hợp Tác", 1400000, "Đối tác", "Chúc thành công",
                "Rượu vang đỏ (Chile/Pháp entry)", "Hạt hạnh nhân", "Trà sen Tây Hồ", "Socola Ferrero"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Khai Xuân", 1650000, "Doanh nghiệp", "Chúc tài lộc",
                "Rượu Chivas 12", "Hạt óc chó", "Trà ô long", "Bánh pía mini"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Bền Vững", 750000, "Bạn bè", "Mừng năm mới",
                "Khô gà lá chanh", "Hạt điều rang muối", "Trà hoa quả", "Mứt xoài"),

            // 4) AN NHIEN TAN XUAN (7)
            CreateGiftBox("An Nhiên Tân Xuân", "Trường Thọ", 950000, "Người lớn tuổi", "Chúc sức khỏe",
                "Táo đỏ", "Hạt óc chó", "Trà thảo mộc", "Chà bông cá hồi"),
            CreateGiftBox("An Nhiên Tân Xuân", "An Khang", 750000, "Gia đình", "Chúc sức khỏe",
                "Hạt hạnh nhân", "Mứt dừa", "Trà sen Tây Hồ", "Mứt gừng"),
            CreateGiftBox("An Nhiên Tân Xuân", "Thanh Nhã", 650000, "Bạn bè", "Mừng năm mới",
                "Trà hoa quả", "Hạt điều rang muối", "Nho khô", "Bánh pía mini"),
            CreateGiftBox("An Nhiên Tân Xuân", "Bình An", 750000, "Người lớn tuổi", "Chúc sức khỏe",
                "Táo đỏ", "Hạt óc chó", "Trà thảo mộc", "Mứt gừng"),
            CreateGiftBox("An Nhiên Tân Xuân", "Thiện Tâm", 820000, "Gia đình", "Tri ân",
                "Hạt hạnh nhân", "Mứt dừa", "Trà sen Tây Hồ", "Nho khô"),
            CreateGiftBox("An Nhiên Tân Xuân", "Tâm Giao", 750000, "Bạn bè", "Tri ân",
                "Trà hoa quả", "Hạt macca", "Bánh pía mini", "Mứt xoài"),
            CreateGiftBox("An Nhiên Tân Xuân", "An Lành", 950000, "Người lớn tuổi", "Mừng năm mới",
                "Hạt dẻ cười", "Táo đỏ", "Trà thảo mộc", "Chà bông cá hồi"),

            // 5) XUAN GAN KET (8)
            CreateGiftBox("Xuân Gắn Kết", "Chia Sẻ", 650000, "Bạn bè", "Tri ân",
                "Khô gà lá chanh", "Hạt điều rang muối", "Trà lài", "Mứt dứa"),
            CreateGiftBox("Xuân Gắn Kết", "Sum Họp", 900000, "Gia đình", "Sum vầy",
                "Bánh quy bơ Đan Mạch", "Mứt xoài", "Trà ô long", "Hạt macca"),
            CreateGiftBox("Xuân Gắn Kết", "Tri Ân", 1050000, "Nhân viên", "Tri ân",
                "Rượu vang đỏ (Chile/Pháp entry)", "Socola Jinkeli", "Trà lài", "Hạt hạnh nhân"),
            CreateGiftBox("Xuân Gắn Kết", "Thân Giao", 1250000, "Đối tác", "Chúc thành công",
                "Rượu Batise", "Hạt dẻ cười", "Trà ô long", "Khô bò"),
            CreateGiftBox("Xuân Gắn Kết", "Tâm Ý", 650000, "Nhân viên", "Mừng năm mới",
                "Khô gà lá chanh", "Hạt điều rang muối", "Trà lài", "Mứt dứa"),
            CreateGiftBox("Xuân Gắn Kết", "Thân Ái", 900000, "Gia đình", "Tri ân",
                "Bánh quy bơ Đan Mạch", "Mứt xoài", "Trà ô long", "Hạt hạnh nhân"),
            CreateGiftBox("Xuân Gắn Kết", "Hòa Thuận", 1300000, "Đối tác", "Chúc tài lộc",
                "Rượu Batise", "Hạt dẻ cười", "Socola Ferrero", "Trà sen Tây Hồ"),
            CreateGiftBox("Xuân Gắn Kết", "Gắn Bó", 900000, "Bạn bè", "Sum vầy",
                "Khô bò", "Hạt macca", "Trà lài", "Nho khô")
        };

        await context.GiftBoxes.AddRangeAsync(giftBoxes);
        Console.WriteLine($"----> Seeded {giftBoxes.Count} GiftBoxes");
    }

    private static async Task SeedDeliverySlotsAsync(ShopHangTetDbContext context)
    {
        if (await context.DeliverySlots.AnyAsync()) return;

        var slots = new List<DeliverySlot>();
        var startDate = new DateTime(2026, 1, 20);

        for (int day = 0; day < 10; day++)
        {
            var date = startDate.AddDays(day);

            slots.Add(new DeliverySlot
            {
                DeliveryDate = date,
                MaxOrdersPerDay = 100,
                CurrentOrderCount = 0,
                IsLocked = false
            });
        }

        await context.DeliverySlots.AddRangeAsync(slots);
        Console.WriteLine($"----> Seeded {slots.Count} DeliverySlots");
    }

    private static async Task SeedDemoCustomBoxAsync(ShopHangTetDbContext context)
    {
        const string demoMarker = "DEMO_CUSTOM_BOX";
        if (await context.CustomBoxes.AnyAsync(x => x.GreetingMessage == demoMarker)) return;

        var drinkItem = await context.Items.FirstOrDefaultAsync(x => x.Category == ItemCategory.DRINK && x.IsActive);
        var foodItem = await context.Items.FirstOrDefaultAsync(x => x.Category == ItemCategory.FOOD && x.IsActive);
        var nutItem = await context.Items.FirstOrDefaultAsync(x => x.Category == ItemCategory.NUT && x.IsActive);

        if (drinkItem == null || foodItem == null || nutItem == null)
        {
            Console.WriteLine("----> Skip demo custom box seed: missing DRINK/FOOD/NUT item");
            return;
        }

        var customBoxItems = new List<CustomBoxItem>
        {
            new() { ItemId = drinkItem.Id, Quantity = 1 },
            new() { ItemId = foodItem.Id, Quantity = 2 },
            new() { ItemId = nutItem.Id, Quantity = 1 }
        };

        var demoCustomBox = new CustomBox
        {
            Items = customBoxItems,
            TotalPrice = (drinkItem.Price * 1) + (foodItem.Price * 2) + (nutItem.Price * 1),
            GreetingMessage = demoMarker,
            CanvaCardLink = "https://demo.local/custom-box-1",
            HideInvoice = false,
            CreatedAt = DateTime.UtcNow
        };

        await context.CustomBoxes.AddAsync(demoCustomBox);
        Console.WriteLine("----> Seeded demo CustomBox for Mix & Match");
    }

    private static async Task SeedDemoOrderAndInventoryLogsAsync(ShopHangTetDbContext context)
    {
        const string demoOrderCode = "SHT9999990001";
        if (await context.Orders.AnyAsync(x => x.OrderCode == demoOrderCode)) return;

        var giftBox = await context.GiftBoxes.FirstOrDefaultAsync(x => x.IsActive);
        if (giftBox == null)
        {
            Console.WriteLine("----> Skip demo order seed: no active GiftBox");
            return;
        }

        var itemIds = giftBox.Items.Select(x => x.ItemId).ToList();
        var itemMap = await context.Items
            .Where(x => itemIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x);

        var snapshotItems = giftBox.Items.Select(x =>
        {
            itemMap.TryGetValue(x.ItemId, out var sourceItem);
            return new OrderItemSnapshotItem
            {
                ItemId = x.ItemId,
                ItemName = sourceItem?.Name ?? "Unknown Item",
                Quantity = x.Quantity,
                UnitPrice = sourceItem?.Price ?? 0
            };
        }).ToList();

        var order = new OrderModel
        {
            Id = ObjectId.GenerateNewId(),
            OrderCode = demoOrderCode,
            OrderType = OrderType.B2C,
            CustomerName = "Demo Customer",
            CustomerEmail = "demo@example.com",
            CustomerPhone = "0900000000",
            Items = new List<OrderItem>
            {
                new()
                {
                    ProductName = giftBox.Name,
                    Type = OrderItemType.READY_MADE,
                    Quantity = 1,
                    UnitPrice = giftBox.Price,
                    TotalPrice = giftBox.Price,
                    SnapshotItems = snapshotItems,
                    GiftBoxId = ObjectId.Parse(giftBox.Id)
                }
            },
            DeliveryAddress = new DeliveryAddress
            {
                RecipientName = "Demo Customer",
                RecipientPhone = "0900000000",
                AddressLine = "123 Demo Street",
                Ward = "Demo Ward",
                District = "Demo District",
                City = "Ho Chi Minh",
                Notes = "Demo seed order",
                Quantity = 1,
                GreetingMessage = "Demo greeting",
                HideInvoice = false
            },
            DeliveryDate = DateTime.UtcNow.AddDays(1),
            SubTotal = 420000,
            ShippingFee = 30000,
            TotalAmount = 450000,
            Status = OrderStatus.PAYMENT_CONFIRMING,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = OrderStatus.PAYMENT_CONFIRMING,
            Timestamp = DateTime.UtcNow,
            UpdatedBy = "System",
            Notes = "Demo seeded order waiting for payment"
        });

        await context.Orders.AddAsync(order);

        var demoLogItems = giftBox.Items.Take(2).ToList();
        foreach (var logItem in demoLogItems)
        {
            context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = order.Id.ToString(),
                ItemId = logItem.ItemId,
                Quantity = -1,
                Action = "DEDUCT",
                CreatedAt = DateTime.UtcNow
            });
        }

        Console.WriteLine("----> Seeded demo Order PAYMENT_CONFIRMING and InventoryLogs");
    }
}
