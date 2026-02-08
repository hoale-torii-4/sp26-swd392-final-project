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

    /// Tạo đơn hàng B2C (Guest hoặc Member) - SWD Compliant
    [HttpPost("b2c")]
    public async Task<IActionResult> CreateB2COrder([FromBody] CreateOrderB2CDto request)
    {
        try
        {
            _logger.LogInformation("Creating B2C order for email: {Email}", request.CustomerEmail);

            // Validate order
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

            // Create order
            var order = await _orderService.PlaceB2COrderAsync(request);

            // Send confirmation email
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

            var response = new ApiResponse<object>
            {
                Success = true,
                Message = "B2C Order created successfully",
                Data = new {
                    orderId = order.Id.ToString(),
                    orderCode = order.OrderCode,
                    orderType = order.OrderType,
                    status = order.Status,
                    totalAmount = order.TotalAmount,
                    createdAt = order.CreatedAt
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

    /// Tạo đơn hàng B2B (Member - nhiều địa chỉ) - SWD Compliant
    [HttpPost("b2b")]
    [Authorize] // B2B BẮT BUỘC đăng nhập theo SWD
    public async Task<IActionResult> CreateB2BOrder([FromBody] CreateOrderB2BDto request)
    {
        try
        {
            _logger.LogInformation("Creating B2B order for user: {UserId}", request.UserId);

            // Validate request
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

            var response = new ApiResponse<object>
            {
                Success = true,
                Message = "B2B Order created successfully",
                Data = new {
                    orderId = order.Id.ToString(),
                    orderCode = order.OrderCode,
                    orderType = order.OrderType,
                    status = order.Status,
                    totalAmount = order.TotalAmount,
                    deliveryAddressCount = request.DeliveryAllocations.Count,
                    createdAt = order.CreatedAt
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
                message = "Order placed successfully"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new {
                success = false,
                message = ex.Message
            });
        }
    }

    /// Track đơn hàng cho guest (không cần đăng nhập)
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

    /// Lấy danh sách đơn hàng (cho authenticated user)
    [HttpGet("my-orders")]
    // [Authorize] // Uncomment khi implement authentication
    public async Task<IActionResult> GetMyOrders([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        try
        {
            // TODO: Implement GetOrdersByUserAsync in OrderService
            // For now, return empty list
            return Ok(new { orders = new List<object>(), message = "Coming soon" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// Cập nhật trạng thái đơn hàng - CHỈ STAFF theo SWD
    [Authorize(Roles = "STAFF")]
    [HttpPut("{orderId}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string orderId, [FromBody] UpdateOrderStatusDto request)
    {
        try
        {
            // SWD: CHỈ STAFF được update status, Admin KHÔNG được
            var userRole = User.FindFirst("role")?.Value ?? "MEMBER";
            if (userRole != "STAFF")
            {
                return Forbid("Only STAFF can update order status. Admin cannot modify orders per SWD requirements.");
            }

            var updatedBy = User.FindFirst("name")?.Value ?? User.Identity?.Name ?? "Staff";
            var order = await _orderService.UpdateStatusAsync(orderId, request.Status, updatedBy, request.Note);
            
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = $"Order status updated to {request.Status}",
                Data = new {
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
    
    /// Validate Mix & Match Rules - Public endpoint theo SWD
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
}