using ShopHangTet.Models;
using Microsoft.EntityFrameworkCore; // Thêm cái này để dùng ToListAsync, AnyAsync

public static class SeedData
{
    public static async Task InitializeAsync(WebApplication app) // Đổi thành async Task
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ShopHangTetDbContext>();

        // Kiểm tra kết nối và tạo DB nếu chưa có
        await context.Database.EnsureCreatedAsync(); 

        // Sử dụng AnyAsync để tránh block thread
        if (!await context.Products.AnyAsync())
        {
            context.Products.AddRange(
                new Product { Name = "Rượu Vang Đỏ", Price = 500000, Category = "Rượu", Meaning = "Quà biếu đối tác", IsComponent = true },
                new Product { Name = "Bánh Quy Bơ", Price = 150000, Category = "Bánh", Meaning = "Quà sum vầy", IsComponent = true },
                new Product { Name = "Giỏ quà Đoàn Viên", Price = 1200000, Category = "Giỏ quà sẵn", Meaning = "Quà sum vầy", IsComponent = false }
            );
            
            await context.SaveChangesAsync();
            Console.WriteLine("----> Đã Seed dữ liệu mẫu thành công vào MongoDB!");
        }
    }
}