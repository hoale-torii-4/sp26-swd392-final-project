using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Text.RegularExpressions;
using System.Net;

namespace ShopHangTet.Controllers;

/// Controller xử lý thanh toán qua SePay webhook
[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private static readonly Regex OrderCodeRegex = new(@"\bSHT\d{3,10}\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly IOrderService _orderService;
    private readonly ILogger<PaymentController> _logger;
    private readonly IConfiguration _configuration;

    public PaymentController(IOrderService orderService, ILogger<PaymentController> logger, IConfiguration configuration)
    {
        _orderService = orderService;
        _logger = logger;
        _configuration = configuration;
    }

    /// URL cấu hình trên SePay Dashboard:
    [HttpPost("webhook")]
    [HttpPost("/hooks/sepay-payment")]
    public async Task<IActionResult> ReceiveWebhook([FromBody] SePayWebhookDto data)
    {
        // Bảo mật: Kiểm tra SePay Webhook Token
        var configuredToken = GetConfigValue("SePay:WebhookToken", "SEPAY_WEBHOOK_TOKEN");
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
                return Ok(new { success = true, status = 200 });
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
                return Ok(new { success = true, status = 200 });
            }

            // 2. Ưu tiên lấy mã đơn từ field code; fallback parse từ content
            var orderCode = ExtractOrderCode(data);
            if (string.IsNullOrWhiteSpace(orderCode))
            {
                _logger.LogWarning("No order code found in transfer content: {Content}", data.Content);
                return Ok(new { success = true, status = 200 });
            }

            _logger.LogInformation("Found order code: {OrderCode}, Amount: {Amount}", orderCode, data.TransferAmount);

            // 4. Gọi service xác nhận thanh toán và cập nhật trạng thái + trừ kho
            var result = await _orderService.ConfirmPaymentAsync(orderCode, data.TransferAmount);

            if (result)
                _logger.LogInformation("Payment confirmed for order: {OrderCode}", orderCode);
            else
                _logger.LogWarning("Payment confirmation failed for order: {OrderCode} (not found, wrong status, or insufficient amount)", orderCode);

            // Luôn trả về 200 để SePay dừng gửi lại
            return Ok(new { success = true, status = 200 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SePay webhook");
            // Vẫn trả 200 để tránh SePay retry liên tục khi có lỗi nội bộ
            return Ok(new { success = true, status = 200 });
        }
    }

    /// Tạo QR SePay cho đơn hàng với nội dung là mã đơn SHT... và số tiền chính xác.
    [HttpGet("create-qr/{orderCode}")]
    public async Task<IActionResult> CreateQr(string orderCode)
    {
        var order = await _orderService.GetOrderByCodeAsync(orderCode);
        if (order == null)
        {
            return NotFound(ApiResponse<string>.ErrorResult("Order not found"));
        }

        var bankAccount = GetConfigValue("SePay:BankAccountNumber", "SEPAY_BANK_ACCOUNT_NUMBER");
        var bankName = GetConfigValue("SePay:BankName", "SEPAY_BANK_NAME");

        if (string.IsNullOrWhiteSpace(bankAccount) || string.IsNullOrWhiteSpace(bankName))
        {
            return BadRequest(ApiResponse<string>.ErrorResult("Missing SePay bank config: SePay:BankAccountNumber hoặc SePay:BankName"));
        }

        var qrUrl = $"https://qr.sepay.vn/img?acc={WebUtility.UrlEncode(bankAccount)}&bank={WebUtility.UrlEncode(bankName)}&amount={order.TotalAmount:0}&des={WebUtility.UrlEncode(order.OrderCode)}";

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            orderCode = order.OrderCode,
            amount = order.TotalAmount,
            bankAccount,
            bankName,
            qrUrl
        }, "Tạo QR thành công"));
    }

    /// API để Frontend polling mỗi 3 giây kiểm tra trạng thái thanh toán đơn hàng.
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
                IsPaid = order.Status == OrderStatus.PREPARING
                    || order.Status == OrderStatus.SHIPPING
                    || order.Status == OrderStatus.COMPLETED
            };

            return Ok(ApiResponse<PaymentStatusResponseDto>.SuccessResult(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking payment status for order: {OrderCode}", orderCode);
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    private static string? ExtractOrderCode(SePayWebhookDto data)
    {
        if (!string.IsNullOrWhiteSpace(data.Code))
        {
            var matchFromCode = OrderCodeRegex.Match(data.Code);
            if (matchFromCode.Success)
            {
                return matchFromCode.Value.ToUpper();
            }
        }

        if (!string.IsNullOrWhiteSpace(data.Content))
        {
            var matchFromContent = OrderCodeRegex.Match(data.Content);
            if (matchFromContent.Success)
            {
                return matchFromContent.Value.ToUpper();
            }
        }

        return null;
    }

    private string? GetConfigValue(string key, string envKey)
    {
        var envValue = Environment.GetEnvironmentVariable(envKey);
        if (!string.IsNullOrWhiteSpace(envValue))
        {
            return envValue;
        }

        return _configuration[key];
    }
}
