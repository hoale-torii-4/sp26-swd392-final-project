using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Text.RegularExpressions;
using System.Net;
using System.Text.Json;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private static readonly TimeSpan PaymentWindow = TimeSpan.FromMinutes(10);
    private static readonly Regex OrderCodeRegex =
        new(@"\bSHT\d{3,10}\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly IOrderService _orderService;
    private readonly ILogger<PaymentController> _logger;
    private readonly IConfiguration _configuration;

    public PaymentController(
        IOrderService orderService,
        ILogger<PaymentController> logger,
        IConfiguration configuration)
    {
        _orderService = orderService;
        _logger = logger;
        _configuration = configuration;
    }

    // ════════════════════════════════════════════════════════════════════
    // SEPAY WEBHOOK
    // ════════════════════════════════════════════════════════════════════

    [HttpPost("webhook")]
    [HttpPost("/hooks/sepay-payment")]
    public async Task<IActionResult> ReceiveWebhook([FromBody] SePayWebhookDto data)
    {
        var configuredToken = GetConfigValue("SePay:WebhookToken", "SEPAY_WEBHOOK_TOKEN");
        if (!string.IsNullOrEmpty(configuredToken))
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            var receivedToken = authHeader.StartsWith("Apikey ", StringComparison.OrdinalIgnoreCase)
                ? authHeader[7..]
                : authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                    ? authHeader[7..]
                    : authHeader;

            if (!string.Equals(receivedToken.Trim(), configuredToken, StringComparison.Ordinal))
            {
                _logger.LogWarning("SePay webhook rejected: invalid token from IP {IP}",
                    HttpContext.Connection.RemoteIpAddress);
                return Ok(new { success = true, status = 200 });
            }
        }

        try
        {
            _logger.LogInformation(
                "SePay webhook received: Type={Type}, Amount={Amount}, Content={Content}",
                data.TransferType, data.TransferAmount, data.Content);

            if (!string.Equals(data.TransferType, "in", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Skipping non-incoming transfer: {Type}", data.TransferType);
                return Ok(new { success = true, status = 200 });
            }

            var orderCode = ExtractOrderCode(data);
            if (string.IsNullOrWhiteSpace(orderCode))
            {
                _logger.LogWarning("No order code found in transfer content: {Content}", data.Content);
                return Ok(new { success = true, status = 200 });
            }

            _logger.LogInformation("Found order code: {Code}, Amount: {Amount}",
                orderCode, data.TransferAmount);

            var rawWebhookData = JsonSerializer.Serialize(data);
            var result = await _orderService.ConfirmPaymentAsync(
                orderCode,
                data.TransferAmount,
                data.ReferenceCode,
                data.Gateway,
                rawWebhookData);

            if (result)
                _logger.LogInformation("Payment confirmed for order: {Code}", orderCode);
            else
                _logger.LogWarning("Payment confirmation failed for order: {Code}", orderCode);

            return Ok(new { success = true, status = 200 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SePay webhook");
            return Ok(new { success = true, status = 200 });
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // TẠO QR
    // ════════════════════════════════════════════════════════════════════

    /// Tạo QR SePay cho đơn hàng — trả về URL ảnh QR và thông tin bank
    [HttpGet("create-qr/{orderCode}")]
    public async Task<IActionResult> CreateQr(string orderCode)
    {
        var order = await _orderService.GetOrderByCodeAsync(orderCode);
        if (order == null)
            return NotFound(ApiResponse<string>.ErrorResult("Order not found"));

        if (order.Status != OrderStatus.PAYMENT_CONFIRMING)
            return BadRequest(ApiResponse<string>.ErrorResult(
                "Đơn hàng không ở trạng thái chờ thanh toán"));

        var bankAccount = GetConfigValue("SePay:BankAccountNumber", "SEPAY_BANK_ACCOUNT_NUMBER");
        var bankName = GetConfigValue("SePay:BankName", "SEPAY_BANK_NAME");

        if (string.IsNullOrWhiteSpace(bankAccount) || string.IsNullOrWhiteSpace(bankName))
            return BadRequest(ApiResponse<string>.ErrorResult(
                "Thiếu cấu hình SePay: SePay:BankAccountNumber hoặc SePay:BankName"));

        var qrUrl =
            $"https://qr.sepay.vn/img?acc={WebUtility.UrlEncode(bankAccount)}" +
            $"&bank={WebUtility.UrlEncode(bankName)}" +
            $"&amount={order.TotalAmount:0}" +
            $"&des={WebUtility.UrlEncode(order.OrderCode)}";

        var elapsed = DateTime.UtcNow - order.CreatedAt;
        var secondsRemaining = Math.Max(0, (int)(PaymentWindow - elapsed).TotalSeconds);

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            orderCode = order.OrderCode,
            amount = order.TotalAmount,
            bankAccount,
            bankName,
            qrUrl,
            secondsRemaining  // Frontend dùng để hiển thị countdown
        }, "Tạo QR thành công"));
    }

    // ════════════════════════════════════════════════════════════════════
    // POLLING TRẠNG THÁI THANH TOÁN
    // ════════════════════════════════════════════════════════════════════

    /// Frontend polling mỗi 3-5 giây để kiểm tra SePay đã xác nhận chưa
    /// GET /api/payment/check-status/{orderCode}
    [HttpGet("check-status/{orderCode}")]
    public async Task<IActionResult> CheckPaymentStatus(string orderCode)
    {
        try
        {
            var order = await _orderService.GetOrderByCodeAsync(orderCode);
            if (order == null)
                return NotFound(ApiResponse<string>.ErrorResult("Order not found"));

            var elapsed = DateTime.UtcNow - order.CreatedAt;
            var secondsRemaining = order.Status == OrderStatus.PAYMENT_CONFIRMING
                ? Math.Max(0, (int)(PaymentWindow - elapsed).TotalSeconds)
                : 0;

            var response = new PaymentStatusResponseDto
            {
                OrderCode = order.OrderCode,
                Status = order.Status.ToString(),
                StatusLabel = GetStatusLabel(order.Status),
                TotalAmount = order.TotalAmount,
                IsPaid = order.Status is OrderStatus.PREPARING
                    or OrderStatus.SHIPPING
                    or OrderStatus.COMPLETED,
                SecondsRemaining = secondsRemaining
            };

            return Ok(ApiResponse<PaymentStatusResponseDto>.SuccessResult(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking payment status for order: {Code}", orderCode);
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════

    private static string? ExtractOrderCode(SePayWebhookDto data)
    {
        if (!string.IsNullOrWhiteSpace(data.Code))
        {
            var m = OrderCodeRegex.Match(data.Code);
            if (m.Success) return m.Value.ToUpper();
        }

        if (!string.IsNullOrWhiteSpace(data.Content))
        {
            var m = OrderCodeRegex.Match(data.Content);
            if (m.Success) return m.Value.ToUpper();
        }

        return null;
    }

    private string? GetConfigValue(string key, string envKey)
    {
        var envValue = Environment.GetEnvironmentVariable(envKey);
        if (!string.IsNullOrWhiteSpace(envValue)) return envValue;
        return _configuration[key];
    }

    private static string GetStatusLabel(OrderStatus status) => status switch
    {
        OrderStatus.PAYMENT_CONFIRMING => "Đang xác nhận thanh toán",
        OrderStatus.PREPARING => "Đang chuẩn bị",
        OrderStatus.SHIPPING => "Đang được giao",
        OrderStatus.PARTIAL_DELIVERY => "Đang được giao",
        OrderStatus.DELIVERY_FAILED => "Đang được giao",
        OrderStatus.PAYMENT_EXPIRED_INTERNAL => "Đang xác nhận thanh toán",
        OrderStatus.COMPLETED => "Hoàn thành",
        OrderStatus.CANCELLED => "Đã hủy",
        _ => status.ToString()
    };
}
