using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Text.RegularExpressions;
using System.Net;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
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

    [HttpPost("webhook")]
    public async Task<IActionResult> ReceiveWebhook([FromBody] SePayWebhookDto data)
    {
        try
        {
            var orderCode = ExtractOrderCode(data);

            if (string.IsNullOrWhiteSpace(orderCode))
                return Ok(new { success = true });

            await _orderService.ConfirmPaymentAsync(orderCode, data.TransferAmount);

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Webhook error");
            return Ok(new { success = true });
        }
    }

    [HttpGet("create-qr/{orderCode}")]
    public async Task<IActionResult> CreateQr(string orderCode)
    {
        var order = await _orderService.GetOrderByCodeAsync(orderCode);

        if (order == null)
            return NotFound();

        var bankAccount = _configuration["SePay:BankAccountNumber"];
        var bankName = _configuration["SePay:BankName"];

        var qrUrl =
            $"https://qr.sepay.vn/img?acc={WebUtility.UrlEncode(bankAccount)}&bank={WebUtility.UrlEncode(bankName)}&amount={order.TotalAmount:0}&des={WebUtility.UrlEncode(order.OrderCode)}";

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            orderCode = order.OrderCode,
            amount = order.TotalAmount,
            qrUrl
        }));
    }

    [HttpGet("check-status/{orderCode}")]
    public async Task<IActionResult> CheckPaymentStatus(string orderCode)
    {
        var order = await _orderService.GetOrderByCodeAsync(orderCode);

        if (order == null)
            return NotFound();

        return Ok(ApiResponse<PaymentStatusResponseDto>.SuccessResult(new PaymentStatusResponseDto
        {
            OrderCode = order.OrderCode,
            Status = order.Status.ToString(),
            TotalAmount = order.TotalAmount,
            IsPaid =
                order.Status == OrderStatus.PREPARING ||
                order.Status == OrderStatus.SHIPPING ||
                order.Status == OrderStatus.COMPLETED
        }));
    }

    private static string? ExtractOrderCode(SePayWebhookDto data)
    {
        if (!string.IsNullOrWhiteSpace(data.Code))
        {
            var match = OrderCodeRegex.Match(data.Code);
            if (match.Success)
                return match.Value.ToUpper();
        }

        if (!string.IsNullOrWhiteSpace(data.Content))
        {
            var match = OrderCodeRegex.Match(data.Content);
            if (match.Success)
                return match.Value.ToUpper();
        }

        return null;
    }
}