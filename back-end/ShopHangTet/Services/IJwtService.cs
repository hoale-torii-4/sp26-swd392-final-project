using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    /// <summary>
    /// Interface cho JWT Service - quản lý token authentication
    /// </summary>
    public interface IJwtService
    {
        string GenerateToken(UserModel user);
        string? ValidateToken(string token);
        DateTime GetTokenExpiration(string token);
    }
}
