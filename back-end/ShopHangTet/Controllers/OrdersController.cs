using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using Microsoft.AspNetCore.Authorization;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IEmailService _emailService;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(IOrderService orderService, IEmailService emailService, ILogger<OrdersController> logger)
    {
        _orderService = orderService;
        _emailService = emailService;
        _logger = logger;
    }

    /// Tạo đơn hàng B2C (Guest hoặc Member) - Compliant
    [HttpPost("b2c")]
    public async Task<IActionResult> CreateB2COrder([FromBody] CreateOrderB2CDto request)
    {
        try
        {
            _logger.LogInformation("Creating B2C order for email: {Email}", request.CustomerEmail);

            var validation = await _orderService.ValidateB2COrderAsync(request);
            if (!validation.IsValid)
            {
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Validation failed",
                    Errors = validation.Errors
                });
            }

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
                _logger.LogWarning(ex, "Email sending failed for order {OrderCode}", order.OrderCode);
            }

            var response = new ApiResponse<CreateOrderResponseDto>
            {
                Success = true,
                Message = "B2C Order created successfully",
                Data = new CreateOrderResponseDto
                {
                    OrderId = order.Id.ToString(),
                    OrderCode = order.OrderCode,
                    OrderType = order.OrderType,
                    Status = order.Status,
                    SubTotal = order.SubTotal,
                    ShippingFee = order.ShippingFee,
                    TotalAmount = order.TotalAmount,
                    CreatedAt = order.CreatedAt,
                    Items = order.Items.Select(i => new OrderItemResponseDto
                    {
                        Id = i.GiftBoxId?.ToString() ?? i.CustomBoxId?.ToString() ?? string.Empty,
                        Type = i.Type,
                        Name = i.ProductName,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        TotalPrice = i.TotalPrice
                    }).ToList()
                }
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating B2C order");
            return BadRequest(new ApiResponse<string>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    /// Tạo đơn hàng B2B (Member - nhiều địa chỉ) - Compliant
    [HttpPost("b2b")]
    [Authorize]
    public async Task<IActionResult> CreateB2BOrder([FromBody] CreateOrderB2BDto request)
    {
        try
        {
            _logger.LogInformation("Creating B2B order for user: {UserId}", request.UserId);

            var validation = await _orderService.ValidateB2BOrderAsync(request);
            if (!validation.IsValid)
            {
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "B2B Validation failed",
                    Errors = validation.Errors
                });
            }

            var order = await _orderService.PlaceB2BOrderAsync(request);

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
                _logger.LogWarning(ex, "Email sending failed for order {OrderCode}", order.OrderCode);
            }

            var response = new ApiResponse<CreateOrderResponseDto>
            {
                Success = true,
                Message = "B2B Order created successfully",
                Data = new CreateOrderResponseDto
                {
                    OrderId = order.Id.ToString(),
                    OrderCode = order.OrderCode,
                    OrderType = order.OrderType,
                    Status = order.Status,
                    SubTotal = order.SubTotal,
                    ShippingFee = order.ShippingFee,
                    TotalAmount = order.TotalAmount,
                    CreatedAt = order.CreatedAt,
                    Items = order.Items.Select(i => new OrderItemResponseDto
                    {
                        Id = i.GiftBoxId?.ToString() ?? i.CustomBoxId?.ToString() ?? string.Empty,
                        Type = i.Type,
                        Name = i.ProductName,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        TotalPrice = i.TotalPrice
                    }).ToList()
                }
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating B2B order");
            return BadRequest(new ApiResponse<string>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    [HttpGet("track")]
    public async Task<IActionResult> TrackOrder([FromQuery] string orderCode, [FromQuery] string email)
    {
        try
        {
            var tracking = await _orderService.TrackOrderAsync(orderCode, email);
            if (tracking == null)
            {
                return NotFound(new { message = "Order not found" });
            }

            return Ok(tracking);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("my-orders")]
    public IActionResult GetMyOrders([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        try
        {
            return Ok(new { orders = new List<object>(), message = "Coming soon" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "STAFF")]
    [HttpPut("{orderId}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string orderId, [FromBody] UpdateOrderStatusDto request)
    {
        try
        {
            var userRole = User.FindFirst("role")?.Value ?? "MEMBER";
            if (userRole != "STAFF")
            {
                return Forbid("Only STAFF can update order status. Admin cannot modify orders.");
            }

            var updatedBy = User.FindFirst("name")?.Value ?? User.Identity?.Name ?? "Staff";
            var order = await _orderService.UpdateStatusAsync(orderId, request.Status, updatedBy, request.Note);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = $"Order status updated to {request.Status}",
                Data = new
                {
                    id = order.Id.ToString(),
                    orderCode = order.OrderCode,
                    status = order.Status,
                    updatedAt = order.UpdatedAt
                }
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    [HttpPost("validate-mixmatch/{customBoxId}")]
    public async Task<IActionResult> ValidateMixMatchRules(string customBoxId)
    {
        try
        {
            var result = await _orderService.ValidateMixMatchRulesAsync(customBoxId);
            return Ok(new ApiResponse<MixMatchValidationResult>
            {
                Success = result.IsValid,
                Message = result.IsValid ? "Mix & Match validation passed" : "Mix & Match validation failed",
                Data = result
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    [Authorize(Roles = "STAFF")]
    [HttpPut("deliveries/{deliveryId}/status")]
    public async Task<IActionResult> UpdateDeliveryStatus(string deliveryId, [FromBody] UpdateDeliveryStatusDto request)
    {
        try
        {
            await _orderService.UpdateDeliveryStatusAsync(deliveryId, request.Status, request.FailureReason);
            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = $"Delivery status updated to {request.Status}"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    [Authorize(Roles = "STAFF")]
    [HttpPost("deliveries/{deliveryId}/reship")]
    public async Task<IActionResult> ReshipDelivery(string deliveryId)
    {
        try
        {
            var result = await _orderService.ReshipDeliveryAsync(deliveryId);
            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = "Delivery reshipped successfully",
                Data = result
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }
}
