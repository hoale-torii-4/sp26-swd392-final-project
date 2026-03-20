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

        await SeedItemsAsync(context);
        await context.SaveChangesAsync();

        await SeedTagsAsync(context);
        await context.SaveChangesAsync();

        await SeedCollectionsAsync(context);
        await context.SaveChangesAsync();

        await SeedGiftBoxesAsync(context);

        await context.SaveChangesAsync();
    }

    private static async Task SeedItemsAsync(ShopHangTetDbContext context)
    {
        var itemsWithImages = new (string Name, ItemCategory Category, decimal Price, int Stock, bool IsAlcohol, string Image)[]
        {
            // Nhóm hạt - dinh dưỡng (10 items)
            ("Hạt điều rang muối", ItemCategory.NUT, 85000, 1000, false, "https://tiemphonui.com/cdn/shop/files/1_11.png?v=1742183452"),
            ("Hạt macca", ItemCategory.NUT, 160000, 1000, false, "https://bizweb.dktcdn.net/thumb/1024x1024/100/458/914/products/6-271c920f-9514-491d-a1e4-92e4b4951eb2.jpg?v=1765197778150"),
            ("Hạt hạnh nhân", ItemCategory.NUT, 130000, 1000, false, "https://hatdieu.org/storage/images/arDzeLoAcVbd8z0AmlT7F2Dg1uJqBNKRrOO0A9Tj.jpeg"),
            ("Hạt óc chó", ItemCategory.NUT, 140000, 1000, false, "https://product.hstatic.net/1000141988/product/hat_oc_cho_chile_your_superfood_hu_300_g_b83288fb91754251be4a9f70b1ca8a2a_master.png"),
            ("Hạt dẻ cười", ItemCategory.NUT, 150000, 1000, false, "https://cdn1470.cdn4s4.io.vn/media/san-pham/cac-loai-hat-say/hat-de%CC%89-cu%CC%9Bo%CC%9Ai-my-hu.png"),
            ("Đậu phộng rang", ItemCategory.NUT, 45000, 1000, false, "https://catalog-assets-asia-southeast1.aeon-vn-prod.e.spresso.com/c3RvcmFnZS5nb29nbGVhcGlzLmNvbQ==/YWVvbnZpZXRuYW0tc3ByZXNzby1wdWJsaWM=/Rk9PRExJTkUgMjAyNA==/TUFS/MDQ2ODM4ODk=.jpg"),
            ("Hạt hướng dương", ItemCategory.NUT, 55000, 1000, false, "https://catalog-assets-asia-southeast1.aeon-vn-prod.e.spresso.com/c3RvcmFnZS5nb29nbGVhcGlzLmNvbQ==/YWVvbnZpZXRuYW0tc3ByZXNzby1wdWJsaWM=/Rk9PRExJTkUgMjAyNA==/TUFS/MDQ2ODM4ODk=.jpg"),
            ("Hạt bí xanh", ItemCategory.NUT, 95000, 1000, false, "https://catalog-assets-asia-southeast1.aeon-vn-prod.e.spresso.com/c3RvcmFnZS5nb29nbGVhcGlzLmNvbQ==/YWVvbnZpZXRuYW0tc3ByZXNzby1wdWJsaWM=/Rk9PRExJTkUgMjAyNA==/TUFS/MDQ2ODM4ODk=.jpg"),
            ("Hạt điều wasabi", ItemCategory.NUT, 110000, 1000, false, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsIYb970f9N22S5UCXjDe347Ggo0UcpKQPBg&s"),
            ("Hạt mix cao cấp", ItemCategory.NUT, 180000, 1000, false, "https://bizweb.dktcdn.net/100/447/068/products/64.png?v=1700034491443"),

            // Nhóm bánh - kẹo (12 items)
            ("Butter cookies", ItemCategory.FOOD, 90000, 1000, false, "https://product.hstatic.net/200000833669/product/ito-banhquybobuttercookieshop15cai_7c46364f51794e12a8e403a3ef91bc7c.png"),
            ("Bánh quy bơ Đan Mạch", ItemCategory.FOOD, 150000, 1000, false, "https://drive.gianhangvn.com/image/danh-quy-danisa-454g-2-1375405j12208.jpg"),
            ("Socola Jinkeli", ItemCategory.FOOD, 120000, 1000, false, "https://thucphamplaza.com/wp-content/uploads/products_img/ChatGPT-Image-Jan-12-2026-05_57_02-PM.png"),
            ("Socola Ferrero", ItemCategory.FOOD, 180000, 1000, false, "https://bizweb.dktcdn.net/thumb/grande/100/469/765/products/z6148081896960-5906ebaedc5e8041298078b2e53dfada.jpg"),
            ("Kẹo tiramisu", ItemCategory.FOOD, 95000, 1000, false, "https://product.hstatic.net/1000282430/product/290006263000_7662dbebb314499b85a52a1001325a1e.jpg"),
            ("Kẹo nougat", ItemCategory.FOOD, 120000, 1000, false, "https://product.hstatic.net/1000282430/product/290019966000_52c3451492f14e4eaf6a97b65b446126_grande.png"),
            ("Bánh pía mini", ItemCategory.FOOD, 85000, 1000, false, "https://www.dacsanhuongviet.vn/site/wp-content/uploads/2020/07/Pi%CC%81a-kim-sa-%C4%91a%CC%A3%CC%82u-xanh-la%CC%81-du%CC%9B%CC%81a-tru%CC%9B%CC%81ng-muo%CC%82%CC%81i-tan-cha%CC%89y-500gr.jpg"),
            ("Bánh quy yến mạch", ItemCategory.FOOD, 110000, 1000, false, "https://cdn.tgdd.vn/Files/2022/12/25/1498683/gioi-thieu-banh-quy-yen-mach-oat-krunch-moi-gion-ngon-tot-cho-suc-khoe-202212252327172797.jpg"),
            ("Socola đen 70%", ItemCategory.FOOD, 140000, 1000, false, "https://product.hstatic.net/200000361859/product/z4885692003680_46d7987c2cffbedd5ce7dec7a86bcf65_67ea65b6ee974006a7f7f50715b5cbe5_master.jpg"),
            ("Kẹo trái cây mềm", ItemCategory.FOOD, 85000, 1000, false, "https://www.fujimarket.vn/images_upload/san-pham/4902888254888-keo-mem-3-vi-trai-cay-morinaga-hi-chew-assortment-86g.jpg"),
            ("Kẹo caramel", ItemCategory.FOOD, 100000, 1000, false, "https://shop.annam-gourmet.com/pub/media/catalog/product/cache/ee0af4cad0f3673c5271df64bd520339/i/t/item_F123048_bebd.jpg"),
            ("Bánh hạnh nhân lát", ItemCategory.FOOD, 130000, 1000, false, "https://bizweb.dktcdn.net/thumb/grande/100/004/714/products/hanh-nhan-lat-200g.png?v=1671165513047"),

            // Nhóm mứt - trái cây sấy (10 items)
            ("Mứt xoài", ItemCategory.FOOD, 85000, 1000, false, "https://hailongfood.com/image/cache/catalog/h%E1%BA%A1t%20s%E1%BA%A5y%20kh%C3%B4/%E1%BA%A2nh%20b%C3%ACa%20sp/16-700x700.jpg"),
            ("Mứt dừa", ItemCategory.FOOD, 75000, 1000, false, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR00jNeYly_7H6TC--BnSP07K35utB8e29DIQ&s"),
            ("Mứt gừng", ItemCategory.FOOD, 80000, 1000, false, "https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-m0pqewys1kh949"),
            ("Mứt dứa", ItemCategory.FOOD, 70000, 1000, false, "https://product.hstatic.net/1000141988/product/mut_trai_dua_le_fruit_225_g__i0001241__84b6595bd9e842998c9560d8a5bd5aa4_master.jpg"),
            ("Nho khô", ItemCategory.FOOD, 95000, 1000, false, "https://hatduatruongdat.com/upload/product/dsc02573-4334.jpg"),
            ("Táo đỏ", ItemCategory.FOOD, 110000, 1000, false, "https://vn-test-11.slatic.net/p/5e686487d7a72f2a9a47cf8be855f192.png"),
            ("Mứt me", ItemCategory.FOOD, 75000, 1000, false, "https://www.baxiufood.vn/wp-content/uploads/2025/01/mut-me-chua-ngot-01.jpg"),
            ("Mứt cam", ItemCategory.FOOD, 90000, 1000, false, "https://product.hstatic.net/200000411483/product/cam_4a7e98858d6a472895369a767b7ec05f.png"),
            ("Mận sấy", ItemCategory.FOOD, 120000, 1000, false, "https://langfarm.com/_next/image?url=https%3A%2F%2Fprod-langfarm-bucketstack-bucketd7feb781-f2iejaoup3ga.s3.amazonaws.com%2Fimages%2F1727693750077_Man_say_deo_dac_san_Langfarm___00001_XL.jpg&w=3840&q=75"),
            ("Dứa sấy dẻo", ItemCategory.FOOD, 85000, 1000, false, "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpelgSKGZDTkLOBBtGb0uQ-aTGCJsM9dgx6w&s"),

            // Nhóm trà (8 items)
            ("Trà ô long", ItemCategory.DRINK, 120000, 1000, false, "https://product.hstatic.net/1000403402/product/10_6095866a7cd04a3d91acd0fcdbaf6591_1024x1024.png"),
            ("Trà sen Tây Hồ", ItemCategory.DRINK, 180000, 1000, false, "https://cheviet.vn/wp-content/uploads/2017/02/Hop-tra-uop-sen-460.jpg"),
            ("Trà lài", ItemCategory.DRINK, 95000, 1000, false, "https://product.hstatic.net/200000559893/product/poster-luc-tra-lai-500g_a3d3ed235d584e3db6cba04cd2f24871.png"),
            ("Trà thảo mộc", ItemCategory.DRINK, 110000, 1000, false, "https://product.hstatic.net/200000485529/product/tra-thao-moc-huong-thao_7ceb57794dcd4615baed91cd7b34ced3_master.jpg"),
            ("Trà hoa quả", ItemCategory.DRINK, 100000, 1000, false, "https://foodplaza.com.vn/wp-content/uploads/2020/07/36-tra-ahmad-hoa-qua-hon-hop-40gr-20-tui-loc.jpg"),
            ("Trà gừng mật ong", ItemCategory.DRINK, 110000, 1000, false, "https://goldenfarm.com.vn/wp-content/uploads/tra-gung-mat-ong-vien-vi-a-1.webp"),
            ("Trà atiso", ItemCategory.DRINK, 110000, 1000, false, "https://product.hstatic.net/200000312729/product/11e37896635248fea03bf7de040895c7_eb4a61d56a6741de83b31411d04c9f57.jpg"),
            ("Trà xanh Nhật", ItemCategory.DRINK, 150000, 1000, false, "https://bizweb.dktcdn.net/100/025/663/files/gyokuro-0815410d-c269-4755-ad28-6d1a874483f1.jpg?v=1765014587395"),

            // Nhóm rượu (6 items)
            ("Rượu vang đỏ", ItemCategory.ALCOHOL, 320000, 500, true, "https://wineinternationalassociation.org/wp-content/uploads/2023/06/Principal-bottles-1.jpg"),
            ("Rượu Batise", ItemCategory.ALCOHOL, 280000, 500, true, "https://chuyenruouvangnhapkhau.com/thumb/700x1000/2/upload/default/images/Vang%20%C3%9Ac/Ruou%20vang%20do%20Uc%20Batise%202.jpg"),
            ("Rượu Chivas 12", ItemCategory.ALCOHOL, 750000, 300, true, "https://ruoungoaigiasi.vn/image/catalog/san-pham/chivas/chivas-12/ruou-chivas-12-nam-700-ml.jpg"),
            ("Rượu Chivas 21", ItemCategory.ALCOHOL, 2300000, 200, true, "https://thebestwine.net/wp-content/uploads/2024/04/Chivas-21-Year-Old.webp"),
            ("Rượu vang trắng", ItemCategory.ALCOHOL, 300000, 500, true, "https://winecellar.vn/wp-content/uploads/2024/05/ruou-vang-trang-khong-con-cantina-zaccagnini-de-alcoholised-wine-white-1.jpg"),
            ("Rượu sake", ItemCategory.ALCOHOL, 350000, 500, true, "https://bizweb.dktcdn.net/100/237/115/products/9485002997790.jpg?v=1511316377803"),

            // Nhóm đặc sản mặn (4 items) - dùng SAVORY để validate Mix & Match ổn định
            ("Khô gà lá chanh", ItemCategory.SAVORY, 120000, 1000, false, "https://storage.googleapis.com/onelife-public/8938530880170.jpg"),
            ("Khô bò", ItemCategory.SAVORY, 180000, 1000, false, "https://product.hstatic.net/200000423303/product/1_f1d16d07a4484d589ca28c608c6c3557.png"),
            ("Chà bông cá hồi", ItemCategory.SAVORY, 210000, 1000, false, "https://ghienfood.com/wp-content/uploads/2020/02/baner1-1024x676.jpg"),
            ("Lạp xưởng tươi", ItemCategory.SAVORY, 160000, 1000, false, "https://dacsanvungmienngon.com/wp-content/uploads/2019/04/LAP-XUONG-HEO-5.jpg")
        };

        var existingItems = await context.Items.ToDictionaryAsync(x => x.Name, x => x);
        var newItems = new List<Item>();

        foreach (var x in itemsWithImages)
        {
            if (existingItems.TryGetValue(x.Name, out var existing))
            {
                existing.Category = x.Category;
                existing.Price = x.Price;
                existing.StockQuantity = Math.Max(existing.StockQuantity, x.Stock);
                existing.IsAlcohol = x.IsAlcohol;
                existing.IsActive = true;
                existing.Images = new List<string> { x.Image };
                context.Items.Update(existing);
                continue;
            }

            newItems.Add(new Item
            {
                Name = x.Name,
                Category = x.Category,
                Price = x.Price,
                StockQuantity = x.Stock,
                IsAlcohol = x.IsAlcohol,
                IsActive = true,
                Images = new List<string> { x.Image }
            });
        }

        if (newItems.Count > 0)
            await context.Items.AddRangeAsync(newItems);
    }

    private static async Task SeedTagsAsync(ShopHangTetDbContext context)
    {
        var tags = new List<Tag>
        {
            new() { Name = "Gia đình", Type = "RECIPIENT", IsActive = true },
            new() { Name = "Bạn bè", Type = "RECIPIENT", IsActive = true },
            new() { Name = "Đối tác", Type = "RECIPIENT", IsActive = true },
            new() { Name = "Doanh nghiệp", Type = "RECIPIENT", IsActive = true },
            new() { Name = "Nhân viên", Type = "RECIPIENT", IsActive = true },
            new() { Name = "Doanh nghiệp", Type = "RECIPIENT", IsActive = true },
            new() { Name = "Người lớn tuổi", Type = "RECIPIENT", IsActive = true },
            new() { Name = "Sum vầy", Type = "MEANING", IsActive = true },
            new() { Name = "Tri ân", Type = "MEANING", IsActive = true },
            new() { Name = "Mừng năm mới", Type = "MEANING", IsActive = true },
            new() { Name = "Lời cảm ơn", Type = "MEANING", IsActive = true },
            new() { Name = "Chúc sức khỏe", Type = "MEANING", IsActive = true },
            new() { Name = "Chúc tài lộc", Type = "MEANING", IsActive = true },
            new() { Name = "Chúc thành công", Type = "MEANING", IsActive = true }
        };

        var existingTags = await context.Tags.ToDictionaryAsync(x => x.Name, x => x);
        var newTags = new List<Tag>();

        foreach (var tag in tags)
        {
            if (existingTags.TryGetValue(tag.Name, out var existing))
            {
                existing.Type = tag.Type;
                existing.IsActive = true;
                context.Tags.Update(existing);
                continue;
            }

            newTags.Add(tag);
        }

        if (newTags.Count > 0)
            await context.Tags.AddRangeAsync(newTags);
    }

    private static async Task SeedCollectionsAsync(ShopHangTetDbContext context)
    {
        var collections = new List<Collection>
        {
            new()
            {
                Name = "Xuân Đoàn Viên",
                Description = "Bộ sưu tập tết ấm áp cho gia đình",
                PricingMultiplier = 1.35m,
                PackagingFee = 150000,
                DisplayOrder = 1,
                IsActive = true,
                CoverImage = "https://i.ibb.co/qLPMH7XZ/collection-1.jpg"
            },
            new()
            {
                Name = "Cát Tường Phú Quý",
                Description = "Bộ sưu tập cao cấp dành cho doanh nhân",
                PricingMultiplier = 1.5m,
                PackagingFee = 300000,
                DisplayOrder = 2,
                IsActive = true,
                CoverImage = "https://i.ibb.co/Ld1Fxx6z/collection-2.jpg"
            },
            new()
            {
                Name = "Lộc Xuân Doanh Nghiệp",
                Description = "Quà tết dành cho doanh nghiệp và đối tác",
                PricingMultiplier = 1.35m,
                PackagingFee = 150000,
                DisplayOrder = 3,
                IsActive = true,
                CoverImage = "https://i.ibb.co/n8C6bMN2/collection-3.jpg"
            },
            new()
            {
                Name = "An Nhiên Tân Xuân",
                Description = "Hộp quà tết thanh lịch cho người thân",
                PricingMultiplier = 1.35m,
                PackagingFee = 150000,
                DisplayOrder = 4,
                IsActive = true,
                CoverImage = "https://i.ibb.co/CpN60gc6/collection-4.jpg"
            },
            new()
            {
                Name = "Xuân Gắn Kết",
                Description = "Hộp quà gửi trao sự gắn kết",
                PricingMultiplier = 1.35m,
                PackagingFee = 150000,
                DisplayOrder = 5,
                IsActive = true,
                CoverImage = "https://i.ibb.co/HDtgGPjc/collection-5.jpg"
            }
        };

        var existingCollections = await context.Collections.ToDictionaryAsync(x => x.Name, x => x);
        var newCollections = new List<Collection>();

        foreach (var col in collections)
        {
            if (existingCollections.TryGetValue(col.Name, out var existing))
            {
                existing.Description = col.Description;
                existing.PricingMultiplier = col.PricingMultiplier;
                existing.PackagingFee = col.PackagingFee;
                existing.DisplayOrder = col.DisplayOrder;
                existing.IsActive = true;
                existing.CoverImage = col.CoverImage;
                context.Collections.Update(existing);
                continue;
            }

            newCollections.Add(col);
        }

        if (newCollections.Count > 0)
            await context.Collections.AddRangeAsync(newCollections);
    }

    private static async Task SeedGiftBoxesAsync(ShopHangTetDbContext context)
    {
        var items = await context.Items.ToDictionaryAsync(x => x.Name, x => x);
        var tags = await context.Tags.ToDictionaryAsync(x => x.Name, x => x.Id);
        var collectionDict = await context.Collections.ToDictionaryAsync(x => x.Name, x => x);
        var existingBoxes = await context.GiftBoxes.ToListAsync();

        var boxesToAdd = new List<GiftBox>();

        void UpsertBox(string name, string collectionName, decimal price, string[] tagNames, (string Name, int Qty)[] boxItems, string imageUrl)
        {
            if (!collectionDict.TryGetValue(collectionName, out var collection))
            {
                return null;
            }

            var itemEntries = boxItems.Select(x => new GiftBoxItem
            {
                ItemId = items.TryGetValue(x.Name, out var item) ? item.Id : string.Empty,
                Quantity = x.Qty,
                ItemPriceSnapshot = item?.Price ?? 0
            }).ToList();

            if (itemEntries.Any(x => string.IsNullOrWhiteSpace(x.ItemId)))
            {
                return null;
            }

            var existing = existingBoxes.FirstOrDefault(x => x.Name == name && x.CollectionId == collection.Id);
            if (existing != null)
            {
                existing.Description = $"Hộp quà {name} thuộc bộ sưu tập {collectionName}";
                existing.Price = price;
                existing.IsActive = true;
                existing.Images = new List<string> { imageUrl };
                existing.Tags = tagNames.Select(t => tags[t]).ToList();
                existing.Items = itemEntries;
                context.GiftBoxes.Update(existing);
                return;
            }

            boxesToAdd.Add(new GiftBox
            {
                Name = name,
                Description = $"Hộp quà {name} thuộc bộ sưu tập {collectionName}",
                CollectionId = collection.Id,
                Price = price,
                IsActive = true,
                Images = new List<string> { imageUrl },
                Tags = tagIds,
                Items = itemEntries
            });
        }

        // 1️⃣ XUÂN ĐOÀN VIÊN (8 hộp)
        UpsertBox("Gia Ấm", "Xuân Đoàn Viên", 620000, new[] { "Gia đình", "Sum vầy" },
            new[] { ("Hạt điều rang muối", 1), ("Mứt dừa", 1), ("Butter cookies", 1), ("Trà lài", 1) },
            "https://i.ibb.co/cKpC8kTx/1-1.jpg");
            "https://i.ibb.co/cKpC8kTx/1-1.jpg");

        UpsertBox("Trường Thọ", "Xuân Đoàn Viên", 760000, new[] { "Người lớn tuổi", "Chúc sức khỏe" },
            new[] { ("Táo đỏ", 1), ("Mứt gừng", 1), ("Trà sen Tây Hồ", 1), ("Bánh pía mini", 1) },
            "https://i.ibb.co/pv2xVxJz/1-2.jpg");
            "https://i.ibb.co/pv2xVxJz/1-2.jpg");

        UpsertBox("Sum Vầy", "Xuân Đoàn Viên", 790000, new[] { "Bạn bè", "Mừng năm mới" },
            new[] { ("Hạt macca", 1), ("Kẹo tiramisu", 1), ("Nho khô", 1), ("Trà ô long", 1) },
            "https://i.ibb.co/XZJxysF6/1-3.jpg");
            "https://i.ibb.co/XZJxysF6/1-3.jpg");

        UpsertBox("Tri Ân", "Xuân Đoàn Viên", 1050000, new[] { "Đối tác", "Tri ân" },
            new[] { ("Hạt hạnh nhân", 1), ("Socola Jinkeli", 1), ("Trà ô long", 1), ("Rượu Batise", 1) },
            "https://i.ibb.co/TM6QwRvR/1-4.jpg");
            "https://i.ibb.co/TM6QwRvR/1-4.jpg");

        UpsertBox("Đoàn Tụ", "Xuân Đoàn Viên", 900000, new[] { "Gia đình", "Mừng năm mới" },
            new[] { ("Hạt óc chó", 1), ("Mứt xoài", 1), ("Trà sen Tây Hồ", 1), ("Bánh quy bơ Đan Mạch", 1) },
            "https://i.ibb.co/PsgNBz1z/1-5.jpg");
            "https://i.ibb.co/PsgNBz1z/1-5.jpg");

        UpsertBox("Xuân Hòa", "Xuân Đoàn Viên", 560000, new[] { "Gia đình", "Sum vầy" },
            new[] { ("Đậu phộng rang", 1), ("Mứt dứa", 1), ("Trà lài", 1), ("Butter cookies", 1) },
            "https://i.ibb.co/Gf22BGwx/1-6.jpg");
            "https://i.ibb.co/Gf22BGwx/1-6.jpg");

        UpsertBox("Ấm Tình", "Xuân Đoàn Viên", 900000, new[] { "Bạn bè", "Tri ân" },
            new[] { ("Hạt macca", 1), ("Socola Ferrero", 1), ("Trà ô long", 1), ("Nho khô", 1) },
            "https://i.ibb.co/DHb9XYnN/1-7.jpg");
            "https://i.ibb.co/DHb9XYnN/1-7.jpg");

        UpsertBox("Phúc Lộc", "Xuân Đoàn Viên", 960000, new[] { "Gia đình", "Chúc tài lộc" },
            new[] { ("Hạt điều rang muối", 1), ("Mứt gừng", 1), ("Trà thảo mộc", 1), ("Rượu vang đỏ", 1) },
            "https://i.ibb.co/Pvfqm0S6/1-8.jpg");
            "https://i.ibb.co/Pvfqm0S6/1-8.jpg");

        // 2️⃣ CÁT TƯỜNG PHÚ QUÝ (9 hộp) - Pricing: 1.5x + 300000
        UpsertBox("Doanh Gia", "Cát Tường Phú Quý", 2150000, new[] { "Đối tác", "Chúc thành công" },
            new[] { ("Rượu Chivas 12", 1), ("Hạt dẻ cười", 1), ("Socola Ferrero", 1), ("Trà ô long", 1) },
            "https://i.ibb.co/Y7YfMD9b/2-1.jpg");
            "https://i.ibb.co/Y7YfMD9b/2-1.jpg");

        UpsertBox("Thịnh Phát", "Cát Tường Phú Quý", 4500000, new[] { "Doanh nghiệp", "Chúc tài lộc" },
            new[] { ("Rượu Chivas 21", 1), ("Hạt macca", 1), ("Hạt óc chó", 1), ("Trà sen Tây Hồ", 1) },
            "https://i.ibb.co/99YK8kx5/2-2.jpg");
            "https://i.ibb.co/99YK8kx5/2-2.jpg");

        UpsertBox("Tri Ân", "Cát Tường Phú Quý", 1300000, new[] { "Nhân viên", "Tri ân" },
            new[] { ("Rượu vang đỏ", 1), ("Bánh quy bơ Đan Mạch", 1), ("Mứt xoài", 1), ("Trà lài", 1) },
            "https://i.ibb.co/BVCPRFdd/2-3.jpg");
            "https://i.ibb.co/BVCPRFdd/2-3.jpg");

        UpsertBox("Cao Niên", "Cát Tường Phú Quý", 980000, new[] { "Người lớn tuổi", "Chúc sức khỏe" },
            new[] { ("Táo đỏ", 1), ("Hạt óc chó", 1), ("Trà thảo mộc", 1), ("Mứt gừng", 1) },
            "https://i.ibb.co/QvtdYXhB/2-4.jpg");
            "https://i.ibb.co/QvtdYXhB/2-4.jpg");

        UpsertBox("Giao Hảo", "Cát Tường Phú Quý", 1380000, new[] { "Bạn bè", "Mừng năm mới" },
            new[] { ("Rượu vang đỏ", 1), ("Khô bò", 1), ("Hạt điều rang muối", 1), ("Socola Jinkeli", 1) },
            "https://i.ibb.co/9kNDtD1S/2-5.jpg");
            "https://i.ibb.co/9kNDtD1S/2-5.jpg");

        UpsertBox("Vượng Phát", "Cát Tường Phú Quý", 2200000, new[] { "Đối tác", "Chúc tài lộc" },
            new[] { ("Rượu Chivas 12", 1), ("Hạt óc chó", 1), ("Socola Ferrero", 1), ("Trà sen Tây Hồ", 1) },
            "https://i.ibb.co/F4BdGyN2/2-6.jpg");
            "https://i.ibb.co/F4BdGyN2/2-6.jpg");

        UpsertBox("Kim Ngọc", "Cát Tường Phú Quý", 1450000, new[] { "Người lớn tuổi", "Mừng năm mới" },
            new[] { ("Rượu vang đỏ", 1), ("Táo đỏ", 1), ("Hạt macca", 1), ("Trà thảo mộc", 1) },
            "https://i.ibb.co/Rp4SGn4x/2-7.jpg");
            "https://i.ibb.co/Rp4SGn4x/2-7.jpg");

        UpsertBox("Thành Công", "Cát Tường Phú Quý", 2100000, new[] { "Doanh nghiệp", "Chúc thành công" },
            new[] { ("Rượu Chivas 12", 1), ("Hạt dẻ cười", 1), ("Bánh quy bơ Đan Mạch", 1), ("Trà ô long", 1) },
            "https://i.ibb.co/N68rdKzV/2-8.jpg");
            "https://i.ibb.co/N68rdKzV/2-8.jpg");

        UpsertBox("Phúc Quý", "Cát Tường Phú Quý", 1300000, new[] { "Nhân viên", "Chúc tài lộc" },
            new[] { ("Rượu vang đỏ", 1), ("Socola Jinkeli", 1), ("Hạt điều rang muối", 1), ("Trà lài", 1) },
            "https://i.ibb.co/60t12LgR/2-9.jpg");
            "https://i.ibb.co/60t12LgR/2-9.jpg");

        // 3️⃣ LỘC XUÂN DOANH NGHIỆP (8 hộp)
        UpsertBox("Tri Ân", "Lộc Xuân Doanh Nghiệp", 650000, new[] { "Nhân viên", "Tri ân" },
            new[] { ("Butter cookies", 1), ("Hạt điều rang muối", 1), ("Mứt dứa", 1), ("Trà lài", 1) },
            "https://i.ibb.co/0RznzxJY/3-1.jpg");
            "https://i.ibb.co/0RznzxJY/3-1.jpg");

        UpsertBox("Đồng Hành", "Lộc Xuân Doanh Nghiệp", 1180000, new[] { "Đối tác", "Chúc thành công" },
            new[] { ("Rượu vang đỏ", 1), ("Hạt macca", 1), ("Trà ô long", 1), ("Socola Jinkeli", 1) },
            "https://i.ibb.co/4RPWFghh/3-2.jpg");

        UpsertBox("Khởi Lộc", "Lộc Xuân Doanh Nghiệp", 1900000, new[] { "Doanh nghiệp", "Chúc tài lộc" },
            new[] { ("Rượu Chivas 12", 1), ("Hạt dẻ cười", 1), ("Trà sen Tây Hồ", 1), ("Bánh quy bơ Đan Mạch", 1) },
            "https://i.ibb.co/chPZw22Q/3-3.jpg");
            "https://i.ibb.co/chPZw22Q/3-3.jpg");

        UpsertBox("Gắn Kết", "Lộc Xuân Doanh Nghiệp", 720000, new[] { "Bạn bè", "Tri ân" },
            new[] { ("Khô gà lá chanh", 1), ("Hạt điều rang muối", 1), ("Trà ô long", 1), ("Mứt xoài", 1) },
            "https://i.ibb.co/sdjR9HcQ/3-4.jpg");

        UpsertBox("Đồng Tâm", "Lộc Xuân Doanh Nghiệp", 720000, new[] { "Nhân viên", "Mừng năm mới" },
            new[] { ("Butter cookies", 1), ("Hạt macca", 1), ("Mứt dứa", 1), ("Trà lài", 1) },
            "https://i.ibb.co/jPV0q2CQ/3-5.jpg");

        UpsertBox("Hợp Tác", "Lộc Xuân Doanh Nghiệp", 1400000, new[] { "Đối tác", "Chúc thành công" },
            new[] { ("Rượu vang đỏ", 1), ("Hạt hạnh nhân", 1), ("Trà sen Tây Hồ", 1), ("Socola Ferrero", 1) },
            "https://i.ibb.co/kYGt8f3/3-6.jpg");

        UpsertBox("Khai Xuân", "Lộc Xuân Doanh Nghiệp", 1650000, new[] { "Doanh nghiệp", "Chúc tài lộc" },
            new[] { ("Rượu Chivas 12", 1), ("Hạt óc chó", 1), ("Trà ô long", 1), ("Bánh pía mini", 1) },
            "https://i.ibb.co/fVf362bf/3-7.jpg");
            "https://i.ibb.co/fVf362bf/3-7.jpg");

        UpsertBox("Bền Vững", "Lộc Xuân Doanh Nghiệp", 750000, new[] { "Bạn bè", "Mừng năm mới" },
            new[] { ("Khô gà lá chanh", 1), ("Hạt điều rang muối", 1), ("Trà hoa quả", 1), ("Mứt xoài", 1) },
            "https://i.ibb.co/fz0pjPvL/3-8.jpg");

        // 4️⃣ AN NHIÊN TÂN XUÂN (7 hộp)
        UpsertBox("Trường Thọ", "An Nhiên Tân Xuân", 950000, new[] { "Người lớn tuổi", "Chúc sức khỏe" },
            new[] { ("Táo đỏ", 1), ("Hạt óc chó", 1), ("Trà thảo mộc", 1), ("Chà bông cá hồi", 1) },
            "https://i.ibb.co/677WmZjF/4-1.jpg");

        UpsertBox("An Khang", "An Nhiên Tân Xuân", 750000, new[] { "Gia đình", "Chúc sức khỏe" },
            new[] { ("Hạt hạnh nhân", 1), ("Mứt dừa", 1), ("Trà sen Tây Hồ", 1), ("Mứt gừng", 1) },
            "https://i.ibb.co/dsJXSW5t/4-2.jpg");

        UpsertBox("Thanh Nhã", "An Nhiên Tân Xuân", 650000, new[] { "Bạn bè", "Mừng năm mới" },
            new[] { ("Trà hoa quả", 1), ("Hạt điều rang muối", 1), ("Nho khô", 1), ("Bánh pía mini", 1) },
            "https://i.ibb.co/xS25TjqJ/4-3.jpg");

        UpsertBox("Bình An", "An Nhiên Tân Xuân", 750000, new[] { "Người lớn tuổi", "Chúc sức khỏe" },
            new[] { ("Táo đỏ", 1), ("Hạt óc chó", 1), ("Trà thảo mộc", 1), ("Mứt gừng", 1) },
            "https://i.ibb.co/H36gGts/4-4.jpg");

        UpsertBox("Thiện Tâm", "An Nhiên Tân Xuân", 820000, new[] { "Gia đình", "Tri ân" },
            new[] { ("Hạt hạnh nhân", 1), ("Mứt dừa", 1), ("Trà sen Tây Hồ", 1), ("Nho khô", 1) },
            "https://i.ibb.co/GQG2xc7j/4-5.jpg");

        UpsertBox("Tâm Giao", "An Nhiên Tân Xuân", 750000, new[] { "Bạn bè", "Tri ân" },
            new[] { ("Trà hoa quả", 1), ("Hạt macca", 1), ("Bánh pía mini", 1), ("Mứt xoài", 1) },
            "https://i.ibb.co/kVRYBhj2/4-6.jpg");

        UpsertBox("An Lành", "An Nhiên Tân Xuân", 950000, new[] { "Người lớn tuổi", "Mừng năm mới" },
            new[] { ("Hạt dẻ cười", 1), ("Táo đỏ", 1), ("Trà thảo mộc", 1), ("Chà bông cá hồi", 1) },
            "https://i.ibb.co/sJXc97L9/4-7.jpg");

        // 5️⃣ XUÂN GẮN KẾT (8 hộp)
        UpsertBox("Chia Sẻ", "Xuân Gắn Kết", 650000, new[] { "Bạn bè", "Tri ân" },
            new[] { ("Khô gà lá chanh", 1), ("Hạt điều rang muối", 1), ("Trà lài", 1), ("Mứt dứa", 1) },
            "https://i.ibb.co/0wdv8Rg/5-1.jpg");

        UpsertBox("Sum Họp", "Xuân Gắn Kết", 900000, new[] { "Gia đình", "Sum vầy" },
            new[] { ("Bánh quy bơ Đan Mạch", 1), ("Mứt xoài", 1), ("Trà ô long", 1), ("Hạt macca", 1) },
            "https://i.ibb.co/5WRT5xwd/5-2.jpg");

        UpsertBox("Tri Ân", "Xuân Gắn Kết", 1050000, new[] { "Nhân viên", "Tri ân" },
            new[] { ("Rượu vang đỏ", 1), ("Socola Jinkeli", 1), ("Trà lài", 1), ("Hạt hạnh nhân", 1) },
            "https://i.ibb.co/5gqWg0S4/5-3.jpg");

        UpsertBox("Thân Giao", "Xuân Gắn Kết", 1250000, new[] { "Đối tác", "Chúc thành công" },
            new[] { ("Rượu Batise", 1), ("Hạt dẻ cười", 1), ("Trà ô long", 1), ("Khô bò", 1) },
            "https://i.ibb.co/7xvVN9Lk/5-4.jpg");

        UpsertBox("Tâm Ý", "Xuân Gắn Kết", 650000, new[] { "Nhân viên", "Mừng năm mới" },
            new[] { ("Khô gà lá chanh", 1), ("Hạt điều rang muối", 1), ("Trà lài", 1), ("Mứt dứa", 1) },
            "https://i.ibb.co/fG4CGHrs/5-5.jpg");

        UpsertBox("Thân Ái", "Xuân Gắn Kết", 900000, new[] { "Gia đình", "Tri ân" },
            new[] { ("Bánh quy bơ Đan Mạch", 1), ("Mứt xoài", 1), ("Trà ô long", 1), ("Hạt hạnh nhân", 1) },
            "https://i.ibb.co/nNjBQtz5/5-6.jpg");

        UpsertBox("Hòa Thuận", "Xuân Gắn Kết", 1300000, new[] { "Đối tác", "Chúc tài lộc" },
            new[] { ("Rượu Batise", 1), ("Hạt dẻ cười", 1), ("Socola Ferrero", 1), ("Trà sen Tây Hồ", 1) },
            "https://i.ibb.co/XZcq5r0G/5-7.jpg");

        UpsertBox("Gắn Bó", "Xuân Gắn Kết", 900000, new[] { "Bạn bè", "Sum vầy" },
            new[] { ("Khô bò", 1), ("Hạt macca", 1), ("Trà lài", 1), ("Nho khô", 1) },
            "https://i.ibb.co/wZwb1w2g/5-8.jpg");

        if (boxesToAdd.Count > 0)
            await context.GiftBoxes.AddRangeAsync(boxesToAdd);
    }
}


