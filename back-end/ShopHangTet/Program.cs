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
    ?? throw new InvalidOperationException("MongoDB connection string is required.");

var mongoDatabaseName = Environment.GetEnvironmentVariable("MONGODB_DATABASE")
    ?? builder.Configuration["Mongo:DatabaseName"]
    ?? "ShopHangTetDb";

builder.Services.AddControllers()
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = null;
});

builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();

builder.Services.AddDbContext<ShopHangTetDbContext>(options =>
{
    options.UseMongoDB(mongoConnectionString, mongoDatabaseName);
});

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

var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("JWT SecretKey is required.");

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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVueApp",
        policy => policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000",
                "https://shophangtet-web.onrender.com")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddScoped<IDeliverySlotRepository, DeliverySlotRepository>();

builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICartService, CartService>();

builder.Services.AddHostedService<OrderExpirationBackgroundService>();

var openRouterApiKey = Environment.GetEnvironmentVariable("OPENROUTER_API_KEY");

if (string.IsNullOrWhiteSpace(openRouterApiKey))
{
    throw new Exception("OPENROUTER_API_KEY not found.");
}

builder.Services.AddSingleton<AiService>(sp =>
    new AiService(openRouterApiKey));

var app = builder.Build();

app.MapOpenApi();

app.MapScalarApiReference(options =>
{
    options.WithTitle("Shop Hàng Tết API")
           .WithTheme(ScalarTheme.BluePlanet)
           .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
});

app.UseCors("AllowVueApp");
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

var seedEnabled = builder.Configuration.GetValue<bool?>("Seed:Enabled") ?? true;

if (seedEnabled)
{
    await SeedData.InitializeAsync(app);
}

await app.RunAsync();