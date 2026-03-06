using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private static readonly TimeSpan PaymentTtl = TimeSpan.FromMinutes(10);
    private readonly ShopHangTetDbContext _context;
    private readonly IOrderService _orderService;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(ShopHangTetDbContext context, IOrderService orderService, ILogger<PaymentController> logger)
    {
        _context = context;
        _orderService = orderService;
        _logger = logger;
    }

    [HttpGet("create-qr/{orderCode}")]
    public async Task<IActionResult> CreateQr(string orderCode)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(x => x.OrderCode == orderCode);
        if (order == null)
        {
            return NotFound(ApiResponse<string>.ErrorResult("Order not found"));
        }

        await TryExpireOrderAsync(order);

        if (order.Status != OrderStatus.PAYMENT_CONFIRMING)
        {
            return BadRequest(ApiResponse<string>.ErrorResult("Order is not waiting for payment"));
        }

        // Placeholder QR payload to keep FE contract stable before real gateway integration.
        var qrPayload = new
        {
            orderCode = order.OrderCode,
            amount = order.TotalAmount,
            bank = "VCB",
            content = order.OrderCode,
            qrUrl = $"https://payment.local/qr/{order.OrderCode}"
        };

        return Ok(ApiResponse<object>.SuccessResult(qrPayload, "QR created successfully"));
    }

    [HttpGet("check-status/{orderCode}")]
    public async Task<IActionResult> CheckStatus(string orderCode)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(x => x.OrderCode == orderCode);
        if (order == null)
        {
            return NotFound(ApiResponse<string>.ErrorResult("Order not found"));
        }

        await TryExpireOrderAsync(order);

        var status = new PaymentStatusDto
        {
            OrderCode = order.OrderCode,
            Status = order.Status.ToString(),
            IsPaid = order.Status == OrderStatus.PREPARING || order.Status == OrderStatus.SHIPPING || order.Status == OrderStatus.COMPLETED,
            TotalAmount = order.TotalAmount,
            UpdatedAt = order.UpdatedAt
        };

        return Ok(ApiResponse<PaymentStatusDto>.SuccessResult(status, "Payment status retrieved successfully"));
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook([FromBody] PaymentWebhookDto request)
    {
        try
        {
            var order = await _context.Orders.FirstOrDefaultAsync(x => x.OrderCode == request.OrderCode);
            if (order == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Order not found"));
            }

            await TryExpireOrderAsync(order);

            if (order.Status == OrderStatus.PAYMENT_EXPIRED)
            {
                return Ok(ApiResponse<object>.SuccessResult(new { processed = false }, "Order payment expired"));
            }

            if (!string.Equals(request.PaymentStatus, "SUCCESS", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Ignoring non-success payment webhook for {OrderCode}. Status: {PaymentStatus}", request.OrderCode, request.PaymentStatus);
                return Ok(ApiResponse<object>.SuccessResult(new { processed = false }, "Webhook ignored"));
            }

            var processed = await _orderService.ConfirmPaymentAsync(
                request.OrderCode,
                updatedBy: request.Provider ?? "PaymentWebhook",
                paymentRef: request.TransactionId
            );

            return Ok(ApiResponse<object>.SuccessResult(new { processed }, processed
                ? "Payment confirmed and order moved to PREPARING"
                : "Duplicate webhook ignored"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling payment webhook for {OrderCode}", request.OrderCode);
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    private async Task TryExpireOrderAsync(OrderModel order)
    {
        if (order.Status != OrderStatus.PAYMENT_CONFIRMING)
        {
            return;
        }

        if (DateTime.UtcNow - order.CreatedAt <= PaymentTtl)
        {
            return;
        }

        order.Status = OrderStatus.PAYMENT_EXPIRED;
        order.UpdatedAt = DateTime.UtcNow;
        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = OrderStatus.PAYMENT_EXPIRED,
            Timestamp = DateTime.UtcNow,
            UpdatedBy = "System",
            Notes = "Order expired due to payment timeout"
        });

        await _context.SaveChangesAsync();
    }
}
