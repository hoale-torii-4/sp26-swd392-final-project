using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Text.RegularExpressions;

namespace ShopHangTet.Controllers;

/// Controller xử lý thanh toán qua SePay webhook
[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<PaymentController> _logger;
     private readonly IConfiguration _configuration;

    public PaymentController(IOrderService orderService, ILogger<PaymentController> logger, IConfiguration configuration)
    {
        _orderService = orderService;
        _logger = logger;
        _configuration = configuration;
    }

    /// URL cấu hình trên SePay Dashboard: https://domain/api/payment/webhook
    [HttpPost("webhook")]
    public async Task<IActionResult> ReceiveWebhook([FromBody] SePayWebhookDto data)
    {
        // Bảo mật: Kiểm tra SePay Webhook Token
        var configuredToken = _configuration["SePay:WebhookToken"];
        if (!string.IsNullOrEmpty(configuredToken))
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            // Hỗ trợ cả "Apikey TOKEN" lẫn "Bearer TOKEN"
            var receivedToken = authHeader.StartsWith("Apikey ", StringComparison.OrdinalIgnoreCase)
                ? authHeader[7..]
                : authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                    ? authHeader[7..]
                    : authHeader;

            if (!string.Equals(receivedToken.Trim(), configuredToken, StringComparison.Ordinal))
            {
                _logger.LogWarning("SePay webhook rejected: invalid token from IP {IP}", HttpContext.Connection.RemoteIpAddress);
                return Ok(new { status = 200 });
            }
        }

        try
        {
            _logger.LogInformation("SePay webhook received: TransferType={Type}, Amount={Amount}, Content={Content}",
                data.TransferType, data.TransferAmount, data.Content);

            // 1. Chỉ xử lý nếu là tiền vào
            if (!string.Equals(data.TransferType, "in", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Skipping non-incoming transfer: {Type}", data.TransferType);
                return Ok(new { status = 200 });
            }

            // 2. Guard: Content null/empty → không có mã đơn hàng
            if (string.IsNullOrWhiteSpace(data.Content))
            {
                _logger.LogWarning("SePay webhook: Content is empty, cannot extract order code");
                return Ok(new { status = 200 });
            }

            // 3. Dùng Regex để tìm mã đơn hàng (VD: SHT2602261234) trong nội dung chuyển khoản
            var match = Regex.Match(data.Content, @"SHT\d+", RegexOptions.IgnoreCase);
            if (!match.Success)
            {
                _logger.LogWarning("No order code found in transfer content: {Content}", data.Content);
                return Ok(new { status = 200 });
            }

            string orderCode = match.Value.ToUpper();
            _logger.LogInformation("Found order code: {OrderCode}, Amount: {Amount}", orderCode, data.TransferAmount);

            // 4. Gọi service xác nhận thanh toán và cập nhật trạng thái + trừ kho
            var result = await _orderService.ConfirmPaymentAsync(orderCode, data.TransferAmount);

            if (result)
                _logger.LogInformation("Payment confirmed for order: {OrderCode}", orderCode);
            else
                _logger.LogWarning("Payment confirmation failed for order: {OrderCode} (not found, wrong status, or insufficient amount)", orderCode);

            // Luôn trả về 200 để SePay dừng gửi lại
            return Ok(new { status = 200 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SePay webhook");
            // Vẫn trả 200 để tránh SePay retry liên tục khi có lỗi nội bộ
            return Ok(new { status = 200 });
        }
    }

    /// <summary>
    /// API để Frontend polling mỗi 3 giây kiểm tra trạng thái thanh toán đơn hàng.
    /// </summary>
    [HttpGet("check-status/{orderCode}")]
    public async Task<IActionResult> CheckPaymentStatus(string orderCode)
    {
        try
        {
            var order = await _orderService.GetOrderByCodeAsync(orderCode);
            if (order == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Order not found"));
            }

            var response = new PaymentStatusResponseDto
            {
                OrderCode = order.OrderCode,
                Status = order.Status.ToString(),
                TotalAmount = order.TotalAmount,
                IsPaid = order.Status != OrderStatus.PAYMENT_CONFIRMING
            };

            return Ok(ApiResponse<PaymentStatusResponseDto>.SuccessResult(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking payment status for order: {OrderCode}", orderCode);
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }
}
