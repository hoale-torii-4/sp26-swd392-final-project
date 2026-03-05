using Microsoft.EntityFrameworkCore;
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

            await context.SaveChangesAsync();

            await SeedGiftBoxesAsync(context);
            await SeedTestDatasetAsync(context);
            await SeedDeliverySlotsAsync(context);

            await context.SaveChangesAsync();
            Console.WriteLine("----> Seed du lieu thanh cong: Tags, Collections, Items, GiftBoxes, DeliverySlots");
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

        var existingKeys = await context.Tags
            .Select(t => new { t.Name, t.Type })
            .ToListAsync();

        var existingSet = existingKeys
            .Select(x => $"{x.Name}|{x.Type}")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var missingTags = tags
            .Where(t => !existingSet.Contains($"{t.Name}|{t.Type}"))
            .ToList();

        if (missingTags.Count > 0)
        {
            await context.Tags.AddRangeAsync(missingTags);
        }
    }

    private static async Task SeedCollectionsAsync(ShopHangTetDbContext context)
    {
        var collections = new List<Collection>
        {
            new Collection
            {
                Name = "Xuân Đoàn Viên",
                Description = "Bộ sưu tập quà Tết truyền thống, ấm áp cho gia đình",
                CoverImage = "https://ibb.co/xKcfgX53",
                PricingMultiplier = 1.35m,
                PackagingFee = 150000m,
                DisplayOrder = 1,
                IsActive = true
            },
            new Collection
            {
                Name = "Cát Tường Phú Quý",
                Description = "Bộ sưu tập quà Tết cao cấp, sang trọng",
                CoverImage = "https://placehold.co/1200x800/png?text=Cat+Tuong+Phu+Quy",
                PricingMultiplier = 1.50m,
                PackagingFee = 300000m,
                DisplayOrder = 2,
                IsActive = true
            },
            new Collection
            {
                Name = "Lộc Xuân Doanh Nghiệp",
                Description = "Bộ sưu tập quà Tết dành cho doanh nghiệp",
                CoverImage = "https://placehold.co/1200x800/png?text=Loc+Xuan+Doanh+Nghiep",
                PricingMultiplier = 1.35m,
                PackagingFee = 200000m,
                DisplayOrder = 3,
                IsActive = true
            },
            new Collection
            {
                Name = "An Nhiên Tân Xuân",
                Description = "Bộ sưu tập quà Tết sức khỏe, tinh tế",
                CoverImage = "https://placehold.co/1200x800/png?text=An+Nhien+Tan+Xuan",
                PricingMultiplier = 1.35m,
                PackagingFee = 180000m,
                DisplayOrder = 4,
                IsActive = true
            },
            new Collection
            {
                Name = "Xuân Gắn Kết",
                Description = "Bộ sưu tập quà Tết nhẹ nhàng, thân tình",
                CoverImage = "https://placehold.co/1200x800/png?text=Xuan+Gan+Ket",
                PricingMultiplier = 1.35m,
                PackagingFee = 180000m,
                DisplayOrder = 5,
                IsActive = true
            }
        };

        var existingNames = await context.Collections
            .Select(c => c.Name)
            .ToListAsync();

        var existingSet = existingNames.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missingCollections = collections
            .Where(c => !existingSet.Contains(c.Name))
            .ToList();

        if (missingCollections.Count > 0)
        {
            await context.Collections.AddRangeAsync(missingCollections);
        }

        var existingCollections = await context.Collections.ToListAsync();
        foreach (var seedCollection in collections)
        {
            var current = existingCollections.FirstOrDefault(x => x.Name.Equals(seedCollection.Name, StringComparison.OrdinalIgnoreCase));
            if (current == null) continue;

            current.CoverImage = seedCollection.CoverImage;
            current.PricingMultiplier = seedCollection.PricingMultiplier;
            current.PackagingFee = seedCollection.PackagingFee;
            current.DisplayOrder = seedCollection.DisplayOrder;
            current.IsActive = seedCollection.IsActive;
            if (string.IsNullOrWhiteSpace(current.Description))
            {
                current.Description = seedCollection.Description;
            }
        }
    }

    private static async Task SeedItemsAsync(ShopHangTetDbContext context)
    {
        static string BuildFallbackImageUrl(string itemName)
        {
            return $"https://placehold.co/1000x1000/png?text={Uri.EscapeDataString(itemName)}";
        }

        static List<string> GetItemImages(string itemName)
        {
            return itemName switch
            {
                // NUTS
                "Hạt điều rang muối" => new List<string> { "https://tiemphonui.com/cdn/shop/files/1_11.png?v=1742183452" },
                "Hạt macca" => new List<string> { "https://bizweb.dktcdn.net/thumb/1024x1024/100/458/914/products/6-271c920f-9514-491d-a1e4-92e4b4951eb2.jpg?v=1765197778150" },
                "Hạt hạnh nhân" => new List<string> { "https://hatdieu.org/storage/images/arDzeLoAcVbd8z0AmlT7F2Dg1uJqBNKRrOO0A9Tj.jpeg" },
                "Hạt óc chó" => new List<string> { "https://product.hstatic.net/1000141988/product/hat_oc_cho_chile_your_superfood_hu_300_g_b83288fb91754251be4a9f70b1ca8a2a_master.png" },
                "Hạt dẻ cười" => new List<string> { "https://cdn1470.cdn4s4.io.vn/media/san-pham/cac-loai-hat-say/hat-de%CC%89-cu%CC%9Bo%CC%9Bi-my-hu.png" },
                "Đậu phộng rang" => new List<string> { "https://catalog-assets-asia-southeast1.aeon-vn-prod.e.spresso.com/c3RvcmFnZS5nb29nbGVhcGlzLmNvbQ==/YWVvbnZpZXRuYW0tc3ByZXNzby1wdWJsaWM=/Rk9PRExJTkUgMjAyNA==/TUFS/MDQ2ODM4ODk=.jpg" },
                "Hạt hướng dương" => new List<string> { "https://catalog-assets-asia-southeast1.aeon-vn-prod.e.spresso.com/c3RvcmFnZS5nb29nbGVhcGlzLmNvbQ==/YWVvbnZpZXRuYW0tc3ByZXNzby1wdWJsaWM=/Rk9PRExJTkUgMjAyNA==/TUFS/MDQ2ODM4ODk=.jpg" },
                "Hạt bí xanh" => new List<string> { "https://catalog-assets-asia-southeast1.aeon-vn-prod.e.spresso.com/c3RvcmFnZS5nb29nbGVhcGlzLmNvbQ==/YWVvbnZpZXRuYW0tc3ByZXNzby1wdWJsaWM=/Rk9PRExJTkUgMjAyNA==/TUFS/MDQ2ODM4ODk=.jpg" },
                "Hạt điều wasabi" => new List<string> { "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsIYb970f9N22S5UCXjDe347Ggo0UcpKQPBg&s" },
                "Hạt mix cao cấp" => new List<string> { "https://bizweb.dktcdn.net/100/447/068/products/64.png?v=1700034491443" },

                // COOKIES & CANDY
                "Butter cookies" => new List<string> { "https://product.hstatic.net/200000833669/product/ito-banhquybobuttercookieshop15cai_7c46364f51794e12a8e403a3ef91bc7c.png" },
                "Bánh quy bơ Đan Mạch" => new List<string> { "https://drive.gianhangvn.com/image/danh-quy-danisa-454g-2-1375405j12208.jpg" },
                "Socola Jinkeli" => new List<string> { "https://thucphamplaza.com/wp-content/uploads/products_img/ChatGPT-Image-Jan-12-2026-05_57_02-PM.png" },
                "Socola Ferrero" => new List<string> { "https://bizweb.dktcdn.net/thumb/grande/100/469/765/products/z6148081896960-5906ebaedc5e8041298078b2e53dfada.jpg" },
                "Kẹo tiramisu" => new List<string> { "https://product.hstatic.net/1000282430/product/290006263000_7662dbebb314499b85a52a1001325a1e.jpg" },
                "Kẹo nougat" => new List<string> { "https://product.hstatic.net/1000282430/product/290019966000_52c3451492f14e4eaf6a97b65b446126_grande.png" },
                "Bánh pía mini" => new List<string> { "https://www.dacsanhuongviet.vn/site/wp-content/uploads/2020/07/Pi%CC%81a-kim-sa-%C4%91a%CC%A3%CC%82u-xanh-la%CC%81-du%CC%9B%CC%81a-tru%CC%9B%CC%81ng-muo%CC%82%CC%81i-tan-cha%CC%89y-500gr.jpg" },
                "Bánh quy yến mạch" => new List<string> { "https://cdn.tgdd.vn/Files/2022/12/25/1498683/gioi-thieu-banh-quy-yen-mach-oat-krunch-moi-gion-ngon-tot-cho-suc-khoe-202212252327172797.jpg" },
                "Socola đen 70%" => new List<string> { "https://product.hstatic.net/200000361859/product/z4885692003680_46d7987c2cffbedd5ce7dec7a86bcf65_67ea65b6ee974006a7f7f50715b5cbe5_master.jpg" },
                "Kẹo trái cây mềm" => new List<string> { "https://www.fujimarket.vn/images_upload/san-pham/4902888254888-keo-mem-3-vi-trai-cay-morinaga-hi-chew-assortment-86g.jpg" },
                "Kẹo caramel" => new List<string> { "https://shop.annam-gourmet.com/pub/media/catalog/product/cache/ee0af4cad0f3673c5271df64bd520339/i/t/item_F123048_bebd.jpg" },
                "Bánh hạnh nhân lát" => new List<string> { "https://bizweb.dktcdn.net/thumb/grande/100/004/714/products/hanh-nhan-lat-200g.png?v=1671165513047" },

                // DRIED FRUITS
                "Mứt xoài" => new List<string> { "https://hailongfood.com/image/cache/catalog/h%E1%BA%A1t%20s%E1%BA%A5y%20kh%C3%B4/%E1%BA%A2nh%20b%C3%ACa%20sp/16-700x700.jpg" },
                "Mứt dừa" => new List<string> { "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR00jNeYly_7H6TC--BnSP07K35utB8e29DIQ&s" },
                "Mứt gừng" => new List<string> { "https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-m0pqewys1kh949" },
                "Mứt dứa" => new List<string> { "https://product.hstatic.net/1000141988/product/mut_trai_dua_le_fruit_225_g__i0001241__84b6595bd9e842998c9560d8a5bd5aa4_master.jpg" },
                "Nho khô" => new List<string> { "https://hatduatruongdat.com/upload/product/dsc02573-4334.jpg" },
                "Táo đỏ" => new List<string> { "https://vn-test-11.slatic.net/p/5e686487d7a72f2a9a47cf8be855f192.png" },
                "Mứt me" => new List<string> { "https://www.baxiufood.vn/wp-content/uploads/2025/01/mut-me-chua-ngot-01.jpg" },

                // TEA
                "Trà ô long" => new List<string> { "https://placehold.co/1000x1000/png?text=Tra+o+long" },
                "Trà sen Tây Hồ" => new List<string> { "https://placehold.co/1000x1000/png?text=Tra+sen+Tay+Ho" },
                "Trà lài" => new List<string> { "https://placehold.co/1000x1000/png?text=Tra+lai" },
                "Trà thảo mộc" => new List<string> { "https://placehold.co/1000x1000/png?text=Tra+thao+moc" },
                "Trà hoa quả" => new List<string> { "https://placehold.co/1000x1000/png?text=Tra+hoa+qua" },
                "Trà gừng mật ong" => new List<string> { "https://placehold.co/1000x1000/png?text=Tra+gung+mat+ong" },
                "Trà atiso" => new List<string> { "https://placehold.co/1000x1000/png?text=Tra+atiso" },
                "Trà xanh Nhật" => new List<string> { "https://placehold.co/1000x1000/png?text=Tra+xanh+Nhat" },

                // ALCOHOL
                "Rượu vang đỏ (Chile/Pháp entry)" => new List<string> { "https://placehold.co/1000x1000/png?text=Ruou+vang+do" },
                "Rượu Batise" => new List<string> { "https://placehold.co/1000x1000/png?text=Ruou+Batise" },
                "Rượu Chivas 12" => new List<string> { "https://placehold.co/1000x1000/png?text=Ruou+Chivas+12" },
                "Rượu Chivas 21" => new List<string> { "https://placehold.co/1000x1000/png?text=Ruou+Chivas+21" },
                "Rượu vang trắng" => new List<string> { "https://placehold.co/1000x1000/png?text=Ruou+vang+trang" },
                "Rượu sake" => new List<string> { "https://placehold.co/1000x1000/png?text=Ruou+sake" },

                // SAVORY SPECIALTIES
                "Khô gà lá chanh" => new List<string> { "https://placehold.co/1000x1000/png?text=Kho+ga+la+chanh" },
                "Khô bò" => new List<string> { "https://placehold.co/1000x1000/png?text=Kho+bo" },
                "Chà bông cá hồi" => new List<string> { "https://placehold.co/1000x1000/png?text=Cha+bong+ca+hoi" },
                "Lạp xưởng tươi" => new List<string> { "https://placehold.co/1000x1000/png?text=Lap+xuong+tuoi" },

                _ => new List<string> { BuildFallbackImageUrl(itemName) }
            };
        }

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

        foreach (var item in items)
        {
            item.Images = GetItemImages(item.Name);
        }

        var existingItems = await context.Items.ToListAsync();
        var existingNames = existingItems.Select(i => i.Name).ToList();

        var existingSet = existingNames.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missingItems = items
            .Where(i => !existingSet.Contains(i.Name))
            .ToList();

        if (missingItems.Count > 0)
        {
            await context.Items.AddRangeAsync(missingItems);
            Console.WriteLine($"----> Seeded {missingItems.Count} Items");
        }

        var updatedImageCount = 0;
        foreach (var existingItem in existingItems)
        {
            if (existingItem.Images != null && existingItem.Images.Count > 0)
            {
                continue;
            }

            existingItem.Images = GetItemImages(existingItem.Name);
            updatedImageCount++;
        }

        if (updatedImageCount > 0)
        {
            Console.WriteLine($"----> Updated images for {updatedImageCount} existing Items");
        }
    }

    private static async Task SeedGiftBoxesAsync(ShopHangTetDbContext context)
    {
        var collections = await context.Collections.ToListAsync();
        var tags = await context.Tags.ToListAsync();
        var items = await context.Items.ToListAsync();

        if (!collections.Any() || !items.Any()) return;

        var collectionMap = collections.ToDictionary(c => c.Name, c => c.Id);
        var collectionDetailMap = collections.ToDictionary(c => c.Name, c => c);
        var tagMap = tags.ToDictionary(t => t.Name, t => t.Id);
        var itemMap = items.ToDictionary(i => i.Name, i => i.Id);

        string GetCollectionId(string collectionName)
        {
            if (!collectionMap.TryGetValue(collectionName, out var id))
                throw new InvalidOperationException($"Collection not found: {collectionName}");
            return id;
        }

        Collection GetCollection(string collectionName)
        {
            if (!collectionDetailMap.TryGetValue(collectionName, out var collection))
                throw new InvalidOperationException($"Collection not found: {collectionName}");
            return collection;
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

        decimal CalculateGiftBoxSeedPrice(string collectionName, string[] itemNames)
        {
            var collection = GetCollection(collectionName);
            var totalCost = itemNames.Sum(itemName =>
            {
                if (!itemMap.TryGetValue(itemName, out var itemId))
                    throw new InvalidOperationException($"Item not found: {itemName}");

                var item = items.First(x => x.Id == itemId);
                return item.Price;
            });

            var price = (totalCost * collection.PricingMultiplier) + collection.PackagingFee;
            return Math.Round(price, 0);
        }

        static string GetGiftBoxFallbackImage(string title)
        {
            return $"https://placehold.co/1200x800/png?text={Uri.EscapeDataString(title)}";
        }

        static string GetGiftBoxImageUrl(string collectionName, string boxName)
        {
            var key = $"{collectionName}|{boxName}";
            return key switch
            {
                "Xuân Đoàn Viên|Gia Ấm" => "https://ibb.co/xKcfgX53",
                "Xuân Đoàn Viên|Trường Thọ" => "https://ibb.co/fYM2624p",
                "Xuân Đoàn Viên|Sum Vầy" => "https://ibb.co/JRkjx7r8",
                "Xuân Đoàn Viên|Tri Ân" => "https://ibb.co/QvLWJnbn",
                "Xuân Đoàn Viên|Đoàn Tụ" => "https://ibb.co/fVH2mGrG",
                "Xuân Đoàn Viên|Xuân Hòa" => "https://ibb.co/JW7708LB",
                "Xuân Đoàn Viên|Ấm Tình" => "https://ibb.co/0RXCNK3k",
                "Xuân Đoàn Viên|Phúc Lộc" => "https://ibb.co/YFqHRwrL",
                _ => GetGiftBoxFallbackImage($"{collectionName}-{boxName}")
            };
        }

        GiftBox CreateGiftBox(
            string collectionName,
            string boxName,
            string recipientTag,
            string meaningTag,
            params string[] itemNames)
        {
            return new GiftBox
            {
                Name = $"{collectionName} - {boxName}",
                Description = $"Hộp quà {boxName} thuộc collection {collectionName}",
                Price = CalculateGiftBoxSeedPrice(collectionName, itemNames),
                CollectionId = GetCollectionId(collectionName),
                Tags = GetTagIds(recipientTag, meaningTag),
                Images = new List<string> { GetGiftBoxImageUrl(collectionName, boxName) },
                Items = itemNames.Select(itemName => new GiftBoxItem
                {
                    ItemId = GetItemId(itemName),
                    Quantity = 1,
                    ItemPriceSnapshot = items.First(x => x.Name == itemName).Price
                }).ToList(),
                IsActive = true
            };
        }

        var giftBoxes = new List<GiftBox>
        {
            // 1) XUAN DOAN VIEN (8)
            CreateGiftBox("Xuân Đoàn Viên", "Gia Ấm", "Gia đình", "Sum vầy",
                "Hạt điều rang muối", "Mứt dừa", "Butter cookies", "Trà lài"),
            CreateGiftBox("Xuân Đoàn Viên", "Trường Thọ", "Người lớn tuổi", "Chúc sức khỏe",
                "Táo đỏ", "Mứt gừng", "Trà sen Tây Hồ", "Bánh pía mini"),
            CreateGiftBox("Xuân Đoàn Viên", "Sum Vầy", "Bạn bè", "Mừng năm mới",
                "Hạt macca", "Kẹo tiramisu", "Nho khô", "Trà ô long"),
            CreateGiftBox("Xuân Đoàn Viên", "Tri Ân", "Đối tác", "Tri ân",
                "Hạt hạnh nhân", "Socola Jinkeli", "Trà ô long", "Rượu Batise"),
            CreateGiftBox("Xuân Đoàn Viên", "Đoàn Tụ", "Gia đình", "Mừng năm mới",
                "Hạt óc chó", "Mứt xoài", "Trà sen Tây Hồ", "Bánh quy bơ Đan Mạch"),
            CreateGiftBox("Xuân Đoàn Viên", "Xuân Hòa", "Gia đình", "Sum vầy",
                "Đậu phộng rang", "Mứt dứa", "Trà lài", "Butter cookies"),
            CreateGiftBox("Xuân Đoàn Viên", "Ấm Tình", "Bạn bè", "Tri ân",
                "Hạt macca", "Socola Ferrero", "Trà ô long", "Nho khô"),
            CreateGiftBox("Xuân Đoàn Viên", "Phúc Lộc", "Gia đình", "Chúc tài lộc",
                "Hạt điều rang muối", "Mứt gừng", "Trà thảo mộc", "Rượu vang đỏ (Chile/Pháp entry)"),

            // 2) CAT TUONG PHU QUY (9)
            CreateGiftBox("Cát Tường Phú Quý", "Doanh Gia", "Đối tác", "Chúc thành công",
                "Rượu Chivas 12", "Hạt dẻ cười", "Socola Ferrero", "Trà ô long"),
            CreateGiftBox("Cát Tường Phú Quý", "Thịnh Phát", "Doanh nghiệp", "Chúc tài lộc",
                "Rượu Chivas 21", "Hạt macca", "Hạt óc chó", "Trà sen Tây Hồ"),
            CreateGiftBox("Cát Tường Phú Quý", "Tri Ân", "Nhân viên", "Tri ân",
                "Rượu vang đỏ (Chile/Pháp entry)", "Bánh quy bơ Đan Mạch", "Mứt xoài", "Trà lài"),
            CreateGiftBox("Cát Tường Phú Quý", "Cao Niên", "Người lớn tuổi", "Chúc sức khỏe",
                "Táo đỏ", "Hạt óc chó", "Trà thảo mộc", "Mứt gừng"),
            CreateGiftBox("Cát Tường Phú Quý", "Giao Hảo", "Bạn bè", "Mừng năm mới",
                "Rượu vang đỏ (Chile/Pháp entry)", "Khô bò", "Hạt điều rang muối", "Socola Jinkeli"),
            CreateGiftBox("Cát Tường Phú Quý", "Vượng Phát", "Đối tác", "Chúc tài lộc",
                "Rượu Chivas 12", "Hạt óc chó", "Socola Ferrero", "Trà sen Tây Hồ"),
            CreateGiftBox("Cát Tường Phú Quý", "Kim Ngọc", "Người lớn tuổi", "Mừng năm mới",
                "Rượu vang đỏ (Chile/Pháp entry)", "Táo đỏ", "Hạt macca", "Trà thảo mộc"),
            CreateGiftBox("Cát Tường Phú Quý", "Thành Công", "Doanh nghiệp", "Chúc thành công",
                "Rượu Chivas 12", "Hạt dẻ cười", "Bánh quy bơ Đan Mạch", "Trà ô long"),
            CreateGiftBox("Cát Tường Phú Quý", "Phúc Quý", "Nhân viên", "Chúc tài lộc",
                "Rượu vang đỏ (Chile/Pháp entry)", "Socola Jinkeli", "Hạt điều rang muối", "Trà lài"),

            // 3) LOC XUAN DOANH NGHIEP (8)
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Tri Ân", "Nhân viên", "Tri ân",
                "Butter cookies", "Hạt điều rang muối", "Mứt dứa", "Trà lài"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Đồng Hành", "Đối tác", "Chúc thành công",
                "Rượu vang đỏ (Chile/Pháp entry)", "Hạt macca", "Trà ô long", "Socola Jinkeli"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Khởi Lộc", "Doanh nghiệp", "Chúc tài lộc",
                "Rượu Chivas 12", "Hạt dẻ cười", "Trà sen Tây Hồ", "Bánh quy bơ Đan Mạch"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Gắn Kết", "Bạn bè", "Tri ân",
                "Khô gà lá chanh", "Hạt điều rang muối", "Trà ô long", "Mứt xoài"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Đồng Tâm", "Nhân viên", "Mừng năm mới",
                "Butter cookies", "Hạt macca", "Mứt dứa", "Trà lài"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Hợp Tác", "Đối tác", "Chúc thành công",
                "Rượu vang đỏ (Chile/Pháp entry)", "Hạt hạnh nhân", "Trà sen Tây Hồ", "Socola Ferrero"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Khai Xuân", "Doanh nghiệp", "Chúc tài lộc",
                "Rượu Chivas 12", "Hạt óc chó", "Trà ô long", "Bánh pía mini"),
            CreateGiftBox("Lộc Xuân Doanh Nghiệp", "Bền Vững", "Bạn bè", "Mừng năm mới",
                "Khô gà lá chanh", "Hạt điều rang muối", "Trà hoa quả", "Mứt xoài"),

            // 4) AN NHIEN TAN XUAN (7)
            CreateGiftBox("An Nhiên Tân Xuân", "Trường Thọ", "Người lớn tuổi", "Chúc sức khỏe",
                "Táo đỏ", "Hạt óc chó", "Trà thảo mộc", "Chà bông cá hồi"),
            CreateGiftBox("An Nhiên Tân Xuân", "An Khang", "Gia đình", "Chúc sức khỏe",
                "Hạt hạnh nhân", "Mứt dừa", "Trà sen Tây Hồ", "Mứt gừng"),
            CreateGiftBox("An Nhiên Tân Xuân", "Thanh Nhã", "Bạn bè", "Mừng năm mới",
                "Trà hoa quả", "Hạt điều rang muối", "Nho khô", "Bánh pía mini"),
            CreateGiftBox("An Nhiên Tân Xuân", "Bình An", "Người lớn tuổi", "Chúc sức khỏe",
                "Táo đỏ", "Hạt óc chó", "Trà thảo mộc", "Mứt gừng"),
            CreateGiftBox("An Nhiên Tân Xuân", "Thiện Tâm", "Gia đình", "Tri ân",
                "Hạt hạnh nhân", "Mứt dừa", "Trà sen Tây Hồ", "Nho khô"),
            CreateGiftBox("An Nhiên Tân Xuân", "Tâm Giao", "Bạn bè", "Tri ân",
                "Trà hoa quả", "Hạt macca", "Bánh pía mini", "Mứt xoài"),
            CreateGiftBox("An Nhiên Tân Xuân", "An Lành", "Người lớn tuổi", "Mừng năm mới",
                "Hạt dẻ cười", "Táo đỏ", "Trà thảo mộc", "Chà bông cá hồi"),

            // 5) XUAN GAN KET (8)
            CreateGiftBox("Xuân Gắn Kết", "Chia Sẻ", "Bạn bè", "Tri ân",
                "Khô gà lá chanh", "Hạt điều rang muối", "Trà lài", "Mứt dứa"),
            CreateGiftBox("Xuân Gắn Kết", "Sum Họp", "Gia đình", "Sum vầy",
                "Bánh quy bơ Đan Mạch", "Mứt xoài", "Trà ô long", "Hạt macca"),
            CreateGiftBox("Xuân Gắn Kết", "Tri Ân", "Nhân viên", "Tri ân",
                "Rượu vang đỏ (Chile/Pháp entry)", "Socola Jinkeli", "Trà lài", "Hạt hạnh nhân"),
            CreateGiftBox("Xuân Gắn Kết", "Thân Giao", "Đối tác", "Chúc thành công",
                "Rượu Batise", "Hạt dẻ cười", "Trà ô long", "Khô bò"),
            CreateGiftBox("Xuân Gắn Kết", "Tâm Ý", "Nhân viên", "Mừng năm mới",
                "Khô gà lá chanh", "Hạt điều rang muối", "Trà lài", "Mứt dứa"),
            CreateGiftBox("Xuân Gắn Kết", "Thân Ái", "Gia đình", "Tri ân",
                "Bánh quy bơ Đan Mạch", "Mứt xoài", "Trà ô long", "Hạt hạnh nhân"),
            CreateGiftBox("Xuân Gắn Kết", "Hòa Thuận", "Đối tác", "Chúc tài lộc",
                "Rượu Batise", "Hạt dẻ cười", "Socola Ferrero", "Trà sen Tây Hồ"),
            CreateGiftBox("Xuân Gắn Kết", "Gắn Bó", "Bạn bè", "Sum vầy",
                "Khô bò", "Hạt macca", "Trà lài", "Nho khô")
        };

        var existingNames = await context.GiftBoxes
            .Select(g => g.Name)
            .ToListAsync();

        var existingSet = existingNames.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missingGiftBoxes = giftBoxes
            .Where(g => !existingSet.Contains(g.Name))
            .ToList();

        if (missingGiftBoxes.Count > 0)
        {
            await context.GiftBoxes.AddRangeAsync(missingGiftBoxes);
            Console.WriteLine($"----> Seeded {missingGiftBoxes.Count} GiftBoxes");
        }

        var existingGiftBoxes = await context.GiftBoxes.ToListAsync();
        var updatedGiftBoxImages = 0;
        var updatedGiftBoxPrices = 0;

        foreach (var existingGiftBox in existingGiftBoxes)
        {
            var hasInvalidImage = existingGiftBox.Images == null
                || existingGiftBox.Images.Count == 0
                || existingGiftBox.Images.All(x => string.IsNullOrWhiteSpace(x) || x.Equals("seed-box.jpg", StringComparison.OrdinalIgnoreCase));

            if (!hasInvalidImage)
            {
                // no-op, still check price sync below
            }

            var parts = existingGiftBox.Name.Split(" - ", 2, StringSplitOptions.TrimEntries);
            if (hasInvalidImage)
            {
                var imageUrl = parts.Length == 2
                    ? GetGiftBoxImageUrl(parts[0], parts[1])
                    : GetGiftBoxFallbackImage(existingGiftBox.Name);

                existingGiftBox.Images = new List<string> { imageUrl };
                updatedGiftBoxImages++;
            }

            var collection = collections.FirstOrDefault(c => c.Id == existingGiftBox.CollectionId);
            if (collection != null)
            {
                foreach (var giftBoxItem in existingGiftBox.Items)
                {
                    var sourceItem = items.FirstOrDefault(x => x.Id == giftBoxItem.ItemId);
                    if (sourceItem != null)
                    {
                        giftBoxItem.ItemPriceSnapshot = sourceItem.Price;
                    }
                }

                var totalCost = existingGiftBox.Items
                    .Where(i => itemMap.ContainsValue(i.ItemId))
                    .Sum(i => (i.ItemPriceSnapshot > 0 ? i.ItemPriceSnapshot : items.First(x => x.Id == i.ItemId).Price) * i.Quantity);

                var recalculated = Math.Round((totalCost * collection.PricingMultiplier) + collection.PackagingFee, 0);
                if (existingGiftBox.Price != recalculated)
                {
                    existingGiftBox.Price = recalculated;
                    updatedGiftBoxPrices++;
                }
            }
        }

        if (updatedGiftBoxImages > 0)
        {
            Console.WriteLine($"----> Updated images for {updatedGiftBoxImages} existing GiftBoxes");
        }
        if (updatedGiftBoxPrices > 0)
        {
            Console.WriteLine($"----> Recalculated prices for {updatedGiftBoxPrices} existing GiftBoxes using collection pricing rules");
        }
    }

    private static async Task SeedDeliverySlotsAsync(ShopHangTetDbContext context)
    {
        var slots = new List<DeliverySlot>();
        var startDate = DateTime.UtcNow.Date;
        var existingSlots = await context.DeliverySlots
            .Select(s => new { s.DeliveryDate, s.TimeSlot })
            .ToListAsync();

        var existingSet = existingSlots
            .Select(x => $"{x.DeliveryDate:yyyy-MM-dd}|{x.TimeSlot}")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        for (int day = 0; day < 10; day++)
        {
            var date = startDate.AddDays(day);
            var dateKey = date.ToString("yyyy-MM-dd");

            if (!existingSet.Contains($"{dateKey}|8AM-12PM"))
            {
                slots.Add(new DeliverySlot
                {
                    DeliveryDate = date,
                    TimeSlot = "8AM-12PM",
                    MaxOrdersPerSlot = 50,
                    CurrentOrderCount = 0,
                    IsLocked = false
                });
            }

            if (!existingSet.Contains($"{dateKey}|1PM-5PM"))
            {
                slots.Add(new DeliverySlot
                {
                    DeliveryDate = date,
                    TimeSlot = "1PM-5PM",
                    MaxOrdersPerSlot = 50,
                    CurrentOrderCount = 0,
                    IsLocked = false
                });
            }

            if (!existingSet.Contains($"{dateKey}|6PM-9PM"))
            {
                slots.Add(new DeliverySlot
                {
                    DeliveryDate = date,
                    TimeSlot = "6PM-9PM",
                    MaxOrdersPerSlot = 30,
                    CurrentOrderCount = 0,
                    IsLocked = false
                });
            }
        }

        if (slots.Count > 0)
        {
            await context.DeliverySlots.AddRangeAsync(slots);
            Console.WriteLine($"----> Seeded {slots.Count} DeliverySlots");
        }
    }

    private static async Task SeedTestDatasetAsync(ShopHangTetDbContext context)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        if (!string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        const string testGiftBoxName = "[TEST10K] QR Sandbox Box";

        var existed = await context.GiftBoxes.AnyAsync(x => x.Name == testGiftBoxName);
        if (existed)
        {
            return;
        }

        var collectionId = await context.Collections.Select(x => x.Id).FirstOrDefaultAsync();
        var cheapestItem = await context.Items.OrderBy(x => x.Price).FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(collectionId) || cheapestItem == null)
        {
            return;
        }

        var testGiftBox = new GiftBox
        {
            Name = testGiftBoxName,
            Description = "Gift box test cho QR amount 10.000 VND",
            Price = 10000,
            CollectionId = collectionId,
            Tags = new List<string>(),
            Images = new List<string> { "https://placehold.co/1200x800/png?text=TEST10K+QR+Sandbox+Box" },
            Items = new List<GiftBoxItem>
            {
                new GiftBoxItem
                {
                    ItemId = cheapestItem.Id,
                    Quantity = 1,
                    ItemPriceSnapshot = cheapestItem.Price
                }
            },
            IsActive = true
        };

        await context.GiftBoxes.AddAsync(testGiftBox);
        Console.WriteLine("----> Seeded test dataset: [TEST10K] QR Sandbox Box (10.000 VND)");
    }
}
