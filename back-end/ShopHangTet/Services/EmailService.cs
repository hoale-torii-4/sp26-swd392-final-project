using ShopHangTet.Models;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace ShopHangTet.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;
        private readonly HttpClient _httpClient; // Thêm HttpClient cho Brevo

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClient = new HttpClient();
        }

        // REPLACE SMTP LOGIC WITH BREVO API
        public async Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true)
        {
            try
            {
                // Brevo API credentials
                var apiKey = Environment.GetEnvironmentVariable("Brevo__ApiKey") ?? _configuration["Brevo:ApiKey"];
                var senderEmail = Environment.GetEnvironmentVariable("Brevo__SenderEmail") ?? _configuration["Brevo:SenderEmail"];
                var senderName = Environment.GetEnvironmentVariable("Brevo__SenderName") ?? _configuration["Brevo:SenderName"] ?? "Shop Hàng Tết";

                if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(senderEmail))
                {
                    _logger.LogWarning("Brevo API credentials not configured. Email not sent.");
                    return true; // Return true to avoid blocking order processing, but log the issue for later resolution
                }

                var requestUri = "https://api.brevo.com/v3/smtp/email";

                // Data payload for Brevo API
                var payload = new
                {
                    sender = new { name = senderName, email = senderEmail },
                    to = new[] { new { email = to } },
                    subject = subject,
                    htmlContent = isHtml ? body : null,
                    textContent = !isHtml ? body : null
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                // Attach API key in headers
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("api-key", apiKey);
                _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                // HTTP Request
                var response = await _httpClient.PostAsync(requestUri, content);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"Email sent successfully via Brevo API to {to}");
                    return true;
                }
                else
                {
                    var errorMsg = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Failed to send email via Brevo. Error: {errorMsg}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Exception occurred while sending email to {to}");
                return false;
            }
        }

        // =========================================================================================
        // ORIGINAL LOGIC
        // =========================================================================================

        public async Task<bool> SendOtpAsync(string email, string otpCode)
        {
            var subject = "Mã xác thực OTP - Shop Hàng Tết";
            var body = $@"
                <h2>Xác thực tài khoản</h2>
                <p>Mã OTP của bạn là: <strong>{otpCode}</strong></p>
                <p>Mã này có hiệu lực trong 5 phút.</p>
                <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
                <hr>
                <p>Cảm ơn bạn đã sử dụng dịch vụ Shop Hàng Tết!</p>
            ";

            return await SendEmailAsync(email, subject, body, true);
        }

        public async Task<bool> SendOrderConfirmationAsync(string email, OrderModel order)
        {
            var subject = $"Xác nhận đơn hàng #{order.OrderCode} - Shop Hàng Tết";
            var body = $@"
                <h2>Cảm ơn bạn đã đặt hàng!</h2>
                <p><strong>Mã đơn hàng:</strong> {order.OrderCode}</p>
                <p><strong>Tổng tiền:</strong> {order.TotalAmount:N0} VNĐ</p>
                <p><strong>Ngày giao hàng:</strong> {order.DeliveryDate:dd/MM/yyyy}</p>
                <p><strong>Trạng thái:</strong> Đang xác nhận thanh toán</p>
                
                <h3>Thông tin giao hàng:</h3>
                <p><strong>Người nhận:</strong> {order.CustomerName}</p>
                <p><strong>Điện thoại:</strong> {order.CustomerPhone}</p>
                
                <hr>
                <p>Bạn có thể tra cứu đơn hàng bằng mã đơn và email tại website của chúng tôi.</p>
                <p>Cảm ơn bạn đã tin tưởng Shop Hàng Tết!</p>
            ";

            return await SendEmailAsync(email, subject, body, true);
        }

        public async Task<bool> SendOrderConfirmationAsync(string email, string orderCode, decimal totalAmount)
        {
            var subject = $"Xác nhận đơn hàng #{orderCode} - Shop Hàng Tết";
            var body = $@"
                <h2>Cảm ơn bạn đã đặt hàng!</h2>
                <p><strong>Mã đơn hàng:</strong> {orderCode}</p>
                <p><strong>Tổng tiền:</strong> {totalAmount:N0} VNĐ</p>
                <p><strong>Trạng thái:</strong> Đang xác nhận thanh toán</p>
                
                <hr>
                <p>Bạn có thể tra cứu đơn hàng bằng mã đơn và email tại website của chúng tôi.</p>
                <p>Cảm ơn bạn đã tin tưởng Shop Hàng Tết!</p>
            ";

            return await SendEmailAsync(email, subject, body, true);
        }

        public async Task<bool> SendOrderStatusUpdateAsync(string email, OrderModel order)
        {
            var statusText = GetStatusText(order.Status);
            var subject = $"Cập nhật đơn hàng #{order.OrderCode} - {statusText}";
            var body = $@"
                <h2>Cập nhật trạng thái đơn hàng</h2>
                <p><strong>Mã đơn hàng:</strong> {order.OrderCode}</p>
                <p><strong>Trạng thái mới:</strong> {statusText}</p>
                <p><strong>Cập nhật lúc:</strong> {DateTime.Now:dd/MM/yyyy HH:mm}</p>
                
                <hr>
                <p>Cảm ơn bạn đã tin tưởng Shop Hàng Tết!</p>
            ";

            return await SendEmailAsync(email, subject, body, true);
        }

        public async Task<bool> SendWelcomeEmailAsync(string email, string fullName)
        {
            var subject = "Chào mừng bạn đến với Shop Hàng Tết!";
            var body = $@"
                <h2>Xin chào {fullName}!</h2>
                <p>Chào mừng bạn đã đăng ký tài khoản tại Shop Hàng Tết.</p>
                <p>Bạn đã sẵn sàng khám phá các bộ sưu tập quà Tết cao cấp của chúng tôi!</p>
                
                <h3>Tính năng dành cho thành viên:</h3>
                <ul>
                    <li>Lưu địa chỉ giao hàng yêu thích</li>
                    <li>Đặt hàng B2B - giao nhiều địa chỉ</li>
                    <li>Theo dõi lịch sử đơn hàng</li>
                    <li>Đánh giá sản phẩm đã mua</li>
                </ul>
                
                <hr>
                <p>Cảm ơn bạn đã tin tưởng Shop Hàng Tết!</p>
            ";

            return await SendEmailAsync(email, subject, body, true);
        }

        private string GetStatusText(Models.OrderStatus status)
        {
            return status switch
            {
                Models.OrderStatus.PAYMENT_CONFIRMING => "Đang xác nhận thanh toán",
                Models.OrderStatus.PREPARING => "Đang chuẩn bị",
                Models.OrderStatus.SHIPPING => "Đang được giao",
                Models.OrderStatus.COMPLETED => "Hoàn thành",
                _ => "Không xác định"
            };
        }
    }
}
