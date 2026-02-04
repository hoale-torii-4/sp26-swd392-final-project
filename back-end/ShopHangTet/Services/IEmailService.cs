using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    /// <summary>
    /// Interface cho Email Service - gửi email xác nhận và thông báo
    /// </summary>
    public interface IEmailService
    {
        Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true);
        Task<bool> SendOtpAsync(string email, string otpCode);
        Task<bool> SendOrderConfirmationAsync(string email, OrderModel order);
        Task<bool> SendOrderConfirmationAsync(string email, string orderCode, decimal totalAmount);
        Task<bool> SendOrderStatusUpdateAsync(string email, OrderModel order);
        Task<bool> SendWelcomeEmailAsync(string email, string fullName);
    }
}
