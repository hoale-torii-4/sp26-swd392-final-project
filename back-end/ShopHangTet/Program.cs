using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Thêm Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Giữ nguyên tên thuộc tính như trong C#
    });
// 2. Cấu hình OpenAPI .NET 9
builder.Services.AddOpenApi();

// 3. Cấu hình MongoDB với Entity Framework Core
builder.Services.AddDbContext<ShopHangTetDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("MongoConnection");
    var databaseName = "ShopHangTetDb";
    options.UseMongoDB(connectionString ?? "mongodb://localhost:27017", databaseName);
});

// 4. Cấu hình CORS (Cho phép Vue.js truy cập API)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueApp",
        policy => policy.WithOrigins("http://localhost:5173") // Port mặc định của Vite
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

var app = builder.Build();

// 5. Cấu hình Pipeline cho môi trường Development
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // Tạo file openapi.json

    // Truy cập tại: http://localhost:PORT/scalar/v1
    app.MapScalarApiReference(); 
}

// 6. Kích hoạt Middleware
app.UseCors("AllowVueApp");
// app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
await SeedData.InitializeAsync(app);

await app.RunAsync();