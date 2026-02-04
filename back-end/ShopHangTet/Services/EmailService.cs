using ShopHangTet.Models;
using System.Net.Mail;
using System.Net;

namespace ShopHangTet.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true)
        {
            try
            {
                var smtpSettings = _configuration.GetSection("Smtp");
                var host = smtpSettings["Host"] ?? "smtp.gmail.com";
                var port = int.Parse(smtpSettings["Port"] ?? "587");
                var username = smtpSettings["Username"] ?? "";
                var password = smtpSettings["Password"] ?? "";
                var from = smtpSettings["From"] ?? username;

                if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
                {
                    _logger.LogWarning("SMTP credentials not configured. Email not sent.");
                    return true; // Return true để không block flow
                }

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                var message = new MailMessage(from!, to, subject, body)
                {
                    IsBodyHtml = isHtml
                };

                await client.SendMailAsync(message);
                _logger.LogInformation($"Email sent successfully to {to}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {to}");
                return false;
            }
        }

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
