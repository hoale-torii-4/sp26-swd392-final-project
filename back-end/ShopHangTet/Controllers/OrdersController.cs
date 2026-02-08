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

    /// Tạo đơn hàng mới B2C (Guest hoặc Member)
    [HttpPost("b2c")]
    public async Task<IActionResult> CreateB2COrder([FromBody] CreateOrderDto request)
    {
        try
        {
            // Validate request
            var validation = await _orderService.ValidateB2COrderAsync(request);
            if (!validation.IsValid)
            {
                return BadRequest(new { errors = validation.Errors });
            }

            // Place order
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

            return Ok(new { 
                success = true,
                orderId = order.Id.ToString(),
                orderCode = order.OrderCode,
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

    /// Tạo đơn hàng mới B2B (Member - nhiều địa chỉ)
    [HttpPost("b2b")]
    public async Task<IActionResult> CreateB2BOrder([FromBody] CreateOrderDto request)
    {
        try
        {
            // Validate request
            var validation = await _orderService.ValidateB2BOrderAsync(request);
            if (!validation.IsValid)
            {
                return BadRequest(new { errors = validation.Errors });
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

            return Ok(new {
                success = true,
                orderId = order.Id.ToString(),
                orderCode = order.OrderCode,
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

    /// Cập nhật trạng thái đơn hàng (Chỉ STAFF)
    [Authorize(Roles = "STAFF")]
    [HttpPut("{orderId}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string orderId, [FromBody] UpdateOrderStatusDto request)
    {
        try
        {
            // Lấy role từ JWT (giả sử có claim)
            var userRole = User.FindFirst("role")?.Value ?? "MEMBER";
            if (userRole != "STAFF")
            {
                return Forbid("Only STAFF can update order status");
            }

            var order = await _orderService.UpdateStatusAsync(orderId, request.Status, User.Identity?.Name ?? "System", request.Note);
            return Ok(new { success = true, order });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}