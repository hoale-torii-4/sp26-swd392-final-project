using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using ShopHangTet.Data;
using System.Security.Claims;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IEmailService _emailService;
    private readonly ILogger<OrdersController> _logger;
    private readonly ShopHangTetDbContext _context;

    public OrdersController(
        IOrderService orderService,
        IEmailService emailService,
        ILogger<OrdersController> logger,
        ShopHangTetDbContext context)
    {
        _orderService = orderService;
        _emailService = emailService;
        _logger = logger;
        _context = context;
    }

    /// Tạo đơn hàng B2C (Guest hoặc Member) - Compliant
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

    /// Checkout từ cart cho user đã đăng nhập - flow chuẩn ecommerce
    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> CheckoutCart([FromBody] CheckoutCartB2CDto request)
    {
        try
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(currentUserId))
            {
                return Unauthorized(ApiResponse<string>.ErrorResult("User is not authenticated."));
            }

            var cart = await _context.Carts.FirstOrDefaultAsync(x => x.Id == request.CartId);
            if (cart == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Cart not found."));
            }

            if (cart.UserId != currentUserId)
            {
                return Forbid("You cannot checkout another user's cart.");
            }

            if (!cart.Items.Any())
            {
                return BadRequest(ApiResponse<string>.ErrorResult("Cart is empty."));
            }

            var orderRequest = new CreateOrderB2CDto
            {
                UserId = currentUserId,
                CustomerEmail = request.CustomerEmail,
                CustomerName = request.CustomerName,
                CustomerPhone = request.CustomerPhone,
                ReceiverName = request.ReceiverName,
                ReceiverPhone = request.ReceiverPhone,
                DeliveryAddress = request.DeliveryAddress,
                GreetingMessage = request.GreetingMessage,
                GreetingCardUrl = request.GreetingCardUrl,
                DeliveryDate = request.DeliveryDate,
                DeliverySlotId = request.DeliverySlotId,
                Items = cart.Items.Select(x => new OrderItemDto
                {
                    Type = x.Type,
                    GiftBoxId = x.GiftBoxId,
                    CustomBoxId = x.CustomBoxId,
                    Quantity = x.Quantity
                }).ToList()
            };

            var validation = await _orderService.ValidateB2COrderAsync(orderRequest);
            if (!validation.IsValid)
            {
                return BadRequest(ApiResponse<string>.ErrorResult("Validation failed", validation.Errors));
            }

            var order = await _orderService.PlaceB2COrderAsync(orderRequest);

            cart.Items.Clear();
            cart.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

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

            return Ok(ApiResponse<object>.SuccessResult(new
            {
                orderId = order.Id.ToString(),
                orderCode = order.OrderCode,
                status = order.Status,
                totalAmount = order.TotalAmount,
                createdAt = order.CreatedAt
            }, "Checkout completed successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during cart checkout");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Tạo đơn hàng B2B (Member - nhiều địa chỉ) - Compliant
    [HttpPost("b2b")]
    [Authorize] // B2B BẮT BUỘC đăng nhập
    public async Task<IActionResult> CreateB2BOrder([FromBody] CreateOrderB2BDto request)
    {
        try
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(currentUserId))
            {
                return Unauthorized(ApiResponse<string>.ErrorResult("User is not authenticated."));
            }

            _logger.LogInformation("Creating B2B order for user: {UserId}", currentUserId);

            // Validate request
            var validation = await _orderService.ValidateB2BOrderAsync(request, currentUserId);
            if (!validation.IsValid)
            {
                return BadRequest(new ApiResponse<string>
                {
                    Success = false,
                    Message = "B2B Validation failed",
                    Errors = validation.Errors
                });
            }

            var order = await _orderService.PlaceB2BOrderAsync(request, currentUserId);

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

    /// Lấy order theo orderCode để FE hiển thị trang success
    [HttpGet("code/{orderCode}")]
    public async Task<IActionResult> GetOrderByCode(string orderCode)
    {
        try
        {
            var order = await _context.Orders.FirstOrDefaultAsync(x => x.OrderCode == orderCode);
            if (order == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Order not found."));
            }

            return Ok(ApiResponse<object>.SuccessResult(new
            {
                id = order.Id.ToString(),
                orderCode = order.OrderCode,
                status = order.Status,
                orderType = order.OrderType,
                totalAmount = order.TotalAmount,
                createdAt = order.CreatedAt,
                deliveryDate = order.DeliveryDate,
                itemCount = order.Items.Sum(x => x.Quantity)
            }, "Order retrieved successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Lấy danh sách đơn hàng (cho authenticated user)
    [Authorize]
    [HttpGet("my-orders")]
    public async Task<IActionResult> GetMyOrders([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        try
        {
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(currentUserId) || !ObjectId.TryParse(currentUserId, out var userObjectId))
            {
                return Unauthorized(ApiResponse<string>.ErrorResult("User is not authenticated."));
            }

            var orders = await _context.Orders
                .Where(x => x.UserId == userObjectId)
                .OrderByDescending(x => x.CreatedAt)
                .Skip(Math.Max(skip, 0))
                .Take(Math.Clamp(take, 1, 100))
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResult(new
            {
                items = orders.Select(MapOrderSummary),
                count = orders.Count
            }, "Orders retrieved successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Lấy chi tiết đơn hàng cho user đã đăng nhập hoặc staff/admin
    [Authorize]
    [HttpGet("{orderId}")]
    public async Task<IActionResult> GetOrderById(string orderId)
    {
        try
        {
            if (!ObjectId.TryParse(orderId, out var orderObjectId))
            {
                return BadRequest(ApiResponse<string>.ErrorResult("Invalid order id."));
            }

            var order = await _context.Orders.FirstOrDefaultAsync(x => x.Id == orderObjectId);
            if (order == null)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Order not found."));
            }

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var isPrivileged = role == "STAFF" || role == "ADMIN";

            if (!isPrivileged && order.UserId?.ToString() != currentUserId)
            {
                return NotFound(ApiResponse<string>.ErrorResult("Order not found."));
            }

            return Ok(ApiResponse<object>.SuccessResult(new
            {
                id = order.Id.ToString(),
                orderCode = order.OrderCode,
                orderType = order.OrderType,
                status = order.Status,
                customerName = order.CustomerName,
                customerEmail = order.CustomerEmail,
                customerPhone = order.CustomerPhone,
                deliveryDate = order.DeliveryDate,
                deliverySlotId = order.DeliverySlotId?.ToString(),
                greetingMessage = order.GreetingMessage,
                greetingCardUrl = order.GreetingCardUrl,
                subTotal = order.SubTotal,
                shippingFee = order.ShippingFee,
                totalAmount = order.TotalAmount,
                createdAt = order.CreatedAt,
                updatedAt = order.UpdatedAt,
                deliveryAddress = order.DeliveryAddress,
                items = order.Items.Select(x => new
                {
                    type = x.Type,
                    productName = x.ProductName,
                    quantity = x.Quantity,
                    unitPrice = x.UnitPrice,
                    totalPrice = x.TotalPrice,
                    giftBoxId = x.GiftBoxId?.ToString(),
                    customBoxId = x.CustomBoxId?.ToString(),
                    snapshotItems = x.SnapshotItems
                }),
                statusHistory = order.StatusHistory
            }, "Order retrieved successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Cập nhật trạng thái đơn hàng - CHỈ STAFF
    [Authorize(Roles = "STAFF")]
    [HttpPut("{orderId}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string orderId, [FromBody] UpdateOrderStatusDto request)
    {
        try
        {
            //CHỈ STAFF được update status, Admin KHÔNG được
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
    
    /// Validate Mix & Match Rules - Public endpoint
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

    private static object MapOrderSummary(OrderModel order)
    {
        return new
        {
            id = order.Id.ToString(),
            orderCode = order.OrderCode,
            orderType = order.OrderType,
            status = order.Status,
            totalAmount = order.TotalAmount,
            deliveryDate = order.DeliveryDate,
            createdAt = order.CreatedAt,
            itemCount = order.Items.Sum(x => x.Quantity)
        };
    }
}