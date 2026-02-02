using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;
using ShopHangTet.Helpers;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Thêm Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Giữ nguyên tên thuộc tính như trong C#
        options.JsonSerializerOptions.Converters.Add(new ObjectIdConverter());//This is for MongoDB ObjectId string conversion; namespace: ShopHangTet.Helpers
    });
// 2.Token requirement
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes.Add("Bearer", new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Để sử dụng nhiều tính năng hơn, vui lòng đăng nhập token vô dùm nhé :)"
        });

        document.SecurityRequirements.Add(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        });
        return Task.CompletedTask;
    });
});

// 3. Cấu hình MongoDB với Entity Framework Core
builder.Services.AddDbContext<ShopHangTetDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("MongoConnection");
    var databaseName = "ShopHangTetDb";
    options.UseMongoDB(connectionString ?? "mongodb://localhost:27017", databaseName);
});

//--- Cấu hình JWT Authentication ---
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
// Lưu ý: Key phải khớp với appsettings.json và đủ dài
var secretKey = jwtSettings["SecretKey"] ?? "DayLaKhoaBiMatCuaNhomBanPhaiDaiHon32KyTuNhe@123";
var key = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false, // Tắt check Issuer/Audience cho đơn giản lúc dev
        ValidateAudience = false
    };
});
// ------------------------------------------------------------

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
app.UseAuthentication();//Nhận diện token
app.UseAuthorization();//Kiểm tra quyền truy cập
app.MapControllers();
await SeedData.InitializeAsync(app);

await app.RunAsync();