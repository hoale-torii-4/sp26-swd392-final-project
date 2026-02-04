using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;
using MongoDB.Driver;
using ShopHangTet.Data;
using ShopHangTet.Interfaces;
using ShopHangTet.Repositories;
using ShopHangTet.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Thêm Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Giữ nguyên tên thuộc tính như trong C#
    });

// 2. Cấu hình OpenAPI .NET 9 với JWT Support
builder.Services.AddOpenApi();

// 3. Memory Cache for OTP
builder.Services.AddMemoryCache();

// 4. Cấu hình MongoDB với Entity Framework Core
builder.Services.AddDbContext<ShopHangTetDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("MongoConnection");
    var databaseName = "ShopHangTetDb";
    options.UseMongoDB(connectionString ?? "mongodb://localhost:27017", databaseName);
});

// 5. Đăng ký MongoDB Driver (cho Repositories)
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var connectionString = builder.Configuration.GetConnectionString("MongoConnection") ?? "mongodb://localhost:27017";
    return new MongoClient(connectionString);
});

builder.Services.AddScoped<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase("ShopHangTetDb");
});

// 6. Authentication & Authorization với JWT
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ?? "ShopHangTet_DefaultSecretKey_2024_MongoDB_VerySecureKey123456789";
var key = Encoding.UTF8.GetBytes(jwtSecretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ShopHangTet",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ShopHangTet.Client",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 7. Cấu hình CORS (Cho phép Vue.js truy cập API)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueApp",
        policy => policy.WithOrigins("http://localhost:5173", "http://localhost:3000") // Port Vue.js và React
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());
});

// 8. Đăng ký Core Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// 9. Đăng ký Repository Dependencies
builder.Services.AddScoped<IDeliverySlotRepository, DeliverySlotRepository>();

// 10. Đăng ký Application Services
builder.Services.AddScoped<IOrderService, OrderService>();
// builder.Services.AddScoped<OrderService>();

// TODO PHASE 2: Implement và uncomment các services sau
// builder.Services.AddScoped<IUserService, UserService>();
// builder.Services.AddScoped<IProductService, ProductService>();
// builder.Services.AddScoped<ICartService, CartService>();
// builder.Services.AddScoped<IAddressService, AddressService>();
// builder.Services.AddScoped<IOrderService, OrderService>();
// builder.Services.AddScoped<IReviewService, ReviewService>();
// builder.Services.AddScoped<IChatService, ChatService>();

var app = builder.Build();

// 11. Cấu hình Pipeline cho môi trường Development
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // Tạo file openapi.json

    // Truy cập tại: http://localhost:PORT/scalar/v1
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("Shop Hàng Tết API")
               .WithTheme(ScalarTheme.BluePlanet)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
    
    // Log the Scalar URL for easy access
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        var urls = app.Urls;
        foreach (var url in urls)
        {
            Console.WriteLine($"📋 Scalar API Documentation: {url}/scalar/v1");
        }
    });
}

// 12. Kích hoạt Middleware
app.UseCors("AllowVueApp");
app.UseHttpsRedirection();

app.UseAuthentication(); // Thêm Authentication middleware
app.UseAuthorization();

app.MapControllers();

// Seed data
await SeedData.InitializeAsync(app);

await app.RunAsync();