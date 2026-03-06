using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Bson;
using System.Security.Claims;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IEmailService _emailService;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(
        IOrderService orderService,
        IEmailService emailService,
        ILogger<OrdersController> logger)
    {
        _orderService = orderService;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("b2c")]
    public async Task<IActionResult> CreateB2COrder([FromBody] CreateOrderB2CDto request)
    {
        var validation = await _orderService.ValidateB2COrderAsync(request);
        if (!validation.IsValid)
            return BadRequest(ApiResponse<string>.ErrorResult("Validation failed", validation.Errors));

        var order = await _orderService.PlaceB2COrderAsync(request);

        try
        {
            await _emailService.SendOrderConfirmationAsync(
                request.CustomerEmail,
                order.OrderCode,
                order.TotalAmount
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Email failed");
        }

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            orderId = order.Id.ToString(),
            orderCode = order.OrderCode,
            totalAmount = order.TotalAmount
        }));
    }

    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> CheckoutCart([FromBody] CheckoutCartB2CDto request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(ApiResponse<string>.ErrorResult("User not authenticated"));

        var order = await _orderService.CheckoutCartAsync(userId, request);

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            orderId = order.Id.ToString(),
            orderCode = order.OrderCode,
            totalAmount = order.TotalAmount
        }));
    }

    [Authorize]
    [HttpPost("b2b")]
    public async Task<IActionResult> CreateB2BOrder([FromBody] CreateOrderB2BDto request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var validation = await _orderService.ValidateB2BOrderAsync(request, userId);

        if (!validation.IsValid)
            return BadRequest(ApiResponse<string>.ErrorResult("Validation failed", validation.Errors));

        var order = await _orderService.PlaceB2BOrderAsync(request, userId);

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            orderId = order.Id.ToString(),
            orderCode = order.OrderCode,
            totalAmount = order.TotalAmount
        }));
    }

    [HttpGet("track")]
    public async Task<IActionResult> TrackOrder([FromQuery] string orderCode, [FromQuery] string email)
    {
        var result = await _orderService.TrackOrderAsync(orderCode, email);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    [Authorize]
    [HttpPut("{orderId}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string orderId, [FromBody] UpdateOrderStatusDto request)
    {
        var updatedBy = User.Identity?.Name ?? "Staff";

        var order = await _orderService.UpdateStatusAsync(orderId, request.Status, updatedBy, request.Note);

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            orderId = order.Id.ToString(),
            status = order.Status
        }));
    }

    [Authorize(Roles = "STAFF")]
    [HttpPut("deliveries/{deliveryId}/status")]
    public async Task<IActionResult> UpdateDeliveryStatus(string deliveryId, [FromBody] UpdateDeliveryStatusDto request)
    {
        await _orderService.UpdateDeliveryStatusAsync(deliveryId, request.Status, request.FailureReason);

        return Ok(ApiResponse<string>.SuccessResult("Delivery updated"));
    }

    [Authorize(Roles = "STAFF")]
    [HttpPost("deliveries/{deliveryId}/reship")]
    public async Task<IActionResult> ReshipDelivery(string deliveryId)
    {
        var result = await _orderService.ReshipDeliveryAsync(deliveryId);

        return Ok(ApiResponse<bool>.SuccessResult(result));
    }

    [HttpPost("validate-mixmatch/{customBoxId}")]
    public async Task<IActionResult> ValidateMixMatchRules(string customBoxId)
    {
        var result = await _orderService.ValidateMixMatchRulesAsync(customBoxId);

        return Ok(ApiResponse<MixMatchValidationResult>.SuccessResult(result));
    }
}