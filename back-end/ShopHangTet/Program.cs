using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using DotNetEnv;
using MongoDB.Driver;
using ShopHangTet.Data;
using ShopHangTet.Repositories;
using ShopHangTet.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var envFilePath = Path.Combine(builder.Environment.ContentRootPath, ".env");
if (File.Exists(envFilePath))
{
    Env.Load(envFilePath);
}

var mongoConnectionString = Environment.GetEnvironmentVariable("MONGODB_CONNECTION_STRING")
    ?? builder.Configuration.GetConnectionString("MongoConnection")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("MongoDB connection string is required. Set MONGODB_CONNECTION_STRING or ConnectionStrings:MongoConnection/DefaultConnection.");
var mongoDatabaseName = Environment.GetEnvironmentVariable("MONGODB_DATABASE")
    ?? builder.Configuration["Mongo:DatabaseName"]
    ?? "ShopHangTetDb";

//Thêm Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Giữ nguyên tên thuộc tính như trong C#
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
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueApp",
        policy => policy.WithOrigins("http://localhost:5173", "http://localhost:3000") // Port Vue.js và React
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials());
});

//Đăng ký Core Services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailService, EmailService>();

//Đăng ký Repository Dependencies
builder.Services.AddScoped<IDeliverySlotRepository, DeliverySlotRepository>();

//Đăng ký Application Services
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddHostedService<OrderExpirationBackgroundService>();
// builder.Services.AddScoped<OrderService>();

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
var seedEnabledConfig = builder.Configuration.GetValue<bool?>("Seed:Enabled");
var seedEnabled = seedEnabledConfig;

if (seedEnabled is null && bool.TryParse(Environment.GetEnvironmentVariable("SEED_ENABLED"), out var seedEnabledFromEnv))
{
    seedEnabled = seedEnabledFromEnv;
}

if (seedEnabled ?? true)
{
    await SeedData.InitializeAsync(app);
}

await app.RunAsync();