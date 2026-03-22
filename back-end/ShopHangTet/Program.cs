using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using MongoDB.Driver;
using ShopHangTet.Data;
using ShopHangTet.Repositories;
using ShopHangTet.Services;
using System.Text;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Lấy Connection String
var mongoConnectionString = builder.Configuration.GetConnectionString("MongoConnection")
    ?? throw new InvalidOperationException("MongoDB connection string is required. Set ConnectionStrings:MongoConnection in appsettings.json.");

// Database name: ưu tiên Mongo:DatabaseName / MONGO_DATABASE_NAME,
// nếu không có thì lấy từ connection string (mongodb://.../dbName).
// Tránh fallback cứng vì rất dễ trỏ nhầm DB và API trả rỗng dù dữ liệu có tồn tại.
var mongoDatabaseName = builder.Configuration["Mongo:DatabaseName"]
    ?? builder.Configuration["MONGO_DATABASE_NAME"]
    ?? MongoUrl.Create(mongoConnectionString).DatabaseName;

if (string.IsNullOrWhiteSpace(mongoDatabaseName))
{
    throw new InvalidOperationException(
        "Mongo database name is missing. Please set Mongo:DatabaseName (or MONGO_DATABASE_NAME), " +
        "or include database name in MongoConnection string (mongodb+srv://.../YourDbName)."
    );
}

Console.WriteLine($"[Startup] Mongo database in use: {mongoDatabaseName}");

//Thêm Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Giữ nguyên tên thuộc tính như trong C#
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

//Cấu hình OpenAPI .NET 9 với JWT Support
builder.Services.AddOpenApi();

//Memory Cache for OTP
builder.Services.AddMemoryCache();

//Cấu hình MongoDB với Entity Framework Core
builder.Services.AddDbContext<ShopHangTetDbContext>(options =>
{
    options.UseMongoDB(mongoConnectionString, mongoDatabaseName);
});

//Đăng ký MongoDB Driver (cho Repositories)
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = MongoClientSettings.FromConnectionString(mongoConnectionString);
    settings.ServerApi = new ServerApi(ServerApiVersion.V1);
    return new MongoClient(settings);
});

builder.Services.AddScoped<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(mongoDatabaseName);
});

//Authentication & Authorization với JWT
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] 
    ?? throw new InvalidOperationException("JWT SecretKey is required. Please configure Jwt:SecretKey in appsettings.json or environment variables.");
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

//Cấu hình CORS (Cho phép Vue.js truy cập API)
// Lấy chuỗi CORS
var origins = builder.Configuration["Cors:Origins"]?.Split(',') ?? new[]
{
    "http://localhost:5173",
    "http://localhost:3000",
    "https://shophangtet-web.onrender.com"
};
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueApp",
        policy => policy.WithOrigins(origins)
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());
});

//Đăng ký Core Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailService, EmailService>();

//Đăng ký Application Services
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddHostedService<OrderExpirationBackgroundService>();

// Collection admin service
builder.Services.AddScoped<ICollectionService, CollectionService>();
builder.Services.AddScoped<IGiftBoxService, GiftBoxService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
// Internal user management
builder.Services.AddScoped<InternalUserService>();
// Mix & Match admin service
builder.Services.AddScoped<IMixMatchService, MixMatchService>();
// Review moderation service
builder.Services.AddScoped<IReviewService, ReviewService>();

// Mix & Match customer-facing service
builder.Services.AddScoped<IMixMatchCustomerService, MixMatchCustomerService>();

// Reports
builder.Services.AddScoped<IReportService, ReportService>();
// Dashboard
builder.Services.AddScoped<IDashboardService, DashboardService>();

// Đăng ký AI Service
var groqApiKey = builder.Configuration["Groq:ApiKey"]
    ?? throw new InvalidOperationException("Groq ApiKey is required. Please configure Groq:ApiKey in appsettings.json.");

builder.Services.AddSingleton<AiService>(sp =>
    new AiService(groqApiKey)); // Đưa Groq Key vào

var app = builder.Build();

//Cấu hình Pipeline cho môi trường Development
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


//Kích hoạt Middleware
app.UseCors("AllowVueApp");
app.UseHttpsRedirection();

app.UseAuthentication(); // Thêm Authentication middleware
app.UseAuthorization();

app.MapControllers();

// Seed data
var seedEnabled = builder.Configuration.GetValue<bool>("Seed:Enabled");

if (seedEnabled)
{
    await SeedData.InitializeAsync(app);
}

await app.RunAsync();