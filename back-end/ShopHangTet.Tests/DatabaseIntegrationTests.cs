using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using ShopHangTet.Data; // Nhớ using đúng namespace chứa DbContext của nhóm
using Xunit;

namespace ShopHangTet.Tests
{
    public class DatabaseIntegrationTests
    {
        [Fact]
        public async Task SeedData_ShouldNotCrash_WhenDatabaseSchemaChanges()
        {
            // 1. Giả lập kết nối đến một MongoDB ảo (Chạy cổng 27017 mặc định)
            var connectionString = "mongodb://localhost:27017/ShopHangTet_TestDB";
            var client = new MongoClient(connectionString);

            var options = new DbContextOptionsBuilder<ShopHangTetDbContext>()
                .UseMongoDB(client, client.Settings.Server.Host)
                .Options;

            using var context = new ShopHangTetDbContext(options);

            // 2. GHI LẠI HIỆN TRƯỜNG: Bắt nó chạy hàm lấy dữ liệu hoặc Seed y hệt lỗi trên Render
            // Nếu Model (C#) có cột PackagingFee mà DB cũ không có, lệnh này sẽ VĂNG LỖI ngay lập tức!
            var exception = await Record.ExceptionAsync(async () =>
            {
                // Gọi hàm bị lỗi của bạn (thay bằng tên class SeedData thực tế của nhóm)
                // Ví dụ: await SeedData.SeedCollectionsAsync(context);

                // Hoặc test đơn giản bằng cách lôi thử dữ liệu lên:
                var testQuery = await context.Collections.FirstOrDefaultAsync();
            });

            // 3. KẾT LUẬN: Đảm bảo rằng không có lỗi nào văng ra (Nếu văng ra -> Báo đỏ (Fail))
            Assert.Null(exception);
        }
    }
}