using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
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

    // ════════════════════════════════════════════════════════════════════
    // ĐẶT HÀNG
    // ════════════════════════════════════════════════════════════════════

    /// Tạo đơn B2C — Guest hoặc Member
    [HttpPost("b2c")]
    public async Task<IActionResult> CreateB2COrder([FromBody] CreateOrderB2CDto request)
    {
        try
        {
            _logger.LogInformation("Creating B2C order for email: {Email}", request.CustomerEmail);

            var validation = await _orderService.ValidateB2COrderAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<string>.ErrorResult("Validation failed", validation.Errors));

            var order = await _orderService.PlaceB2COrderAsync(request);

            try
            {
                await _emailService.SendOrderConfirmationAsync(
                    request.CustomerEmail, order.OrderCode, order.TotalAmount);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Email sending failed for order {Code}", order.OrderCode);
            }

            return Ok(ApiResponse<CreateOrderResponseDto>.SuccessResult(
                BuildCreateOrderResponse(order), "B2C Order created successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating B2C order");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    /// Tạo đơn B2B — Member only
    [HttpPost("b2b")]
    [Authorize]
    public async Task<IActionResult> CreateB2BOrder([FromBody] CreateOrderB2BDto request)
    {
        try
        {
            _logger.LogInformation("Creating B2B order for user: {UserId}", request.UserId);

            var validation = await _orderService.ValidateB2BOrderAsync(request);
            if (!validation.IsValid)
                return BadRequest(ApiResponse<string>.ErrorResult("B2B Validation failed", validation.Errors));

            var order = await _orderService.PlaceB2BOrderAsync(request);

            try
            {
                await _emailService.SendOrderConfirmationAsync(
                    request.CustomerEmail, order.OrderCode, order.TotalAmount);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Email sending failed for order {Code}", order.OrderCode);
            }

            return Ok(ApiResponse<CreateOrderResponseDto>.SuccessResult(
                BuildCreateOrderResponse(order), "B2B Order created successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating B2B order");
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // TRA CỨU ĐƠN HÀNG
    // ════════════════════════════════════════════════════════════════════

    /// Tra cứu đơn không cần login — email + mã đơn
    [HttpGet("track")]
    public async Task<IActionResult> TrackOrder(
        [FromQuery] string orderCode, [FromQuery] string email)
    {
        try
        {
            var tracking = await _orderService.TrackOrderAsync(orderCode, email);
            if (tracking == null)
                return NotFound(ApiResponse<object>.ErrorResult("Order not found"));

            return Ok(ApiResponse<OrderTrackingResult>.SuccessResult(tracking));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
        }
    }

    /// Lấy chi tiết đơn theo mã đơn — Guest cần email, Member dùng token
    [HttpGet("detail/{orderCode}")]
    public async Task<IActionResult> GetOrderDetailByCode(
        string orderCode, [FromQuery] string? email)
    {
        try
        {
            var userId = GetUserIdFromClaims();
            var isStaffOrAdmin = IsStaffOrAdmin();

            if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(email))
                return BadRequest(ApiResponse<object>.ErrorResult(
                    "Guest cần truyền email để xem chi tiết đơn hàng."));

            var detail = await _orderService.GetOrderDetailByCodeAsync(
                orderCode, email, userId, isStaffOrAdmin);

            if (detail == null)
                return NotFound(ApiResponse<object>.ErrorResult("Order not found"));

            return Ok(ApiResponse<OrderDto>.SuccessResult(detail, "Lấy chi tiết đơn hàng thành công"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
        }
    }

    /// Lấy chi tiết đơn theo ID — Member hoặc Staff/Admin
    [Authorize]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderDetailById(string id)
    {
        try
        {
            var userId = GetUserIdFromClaims();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(ApiResponse<object>.ErrorResult("Không thể xác thực người dùng."));

            var detail = await _orderService.GetOrderDetailByIdAsync(id, userId, IsStaffOrAdmin());
            if (detail == null)
                return NotFound(ApiResponse<object>.ErrorResult("Order not found"));

            return Ok(ApiResponse<OrderDto>.SuccessResult(detail, "Lấy chi tiết đơn hàng thành công"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // MY ORDERS (Member)
    // ════════════════════════════════════════════════════════════════════

    /// Đơn hàng của tôi — Member only, có thể lọc theo trạng thái
    [Authorize]
    [HttpGet("my-orders")]
    public async Task<IActionResult> GetMyOrders(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        [FromQuery] string? status = null)
    {
        try
        {
            var userId = GetUserIdFromClaims();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<object>.ErrorResult("Không thể xác thực người dùng."));

            if (!ObjectId.TryParse(userId, out _))
                return Unauthorized(ApiResponse<object>.ErrorResult("Token không chứa user id hợp lệ."));

            var orders = await _orderService.GetMyOrdersAsync(userId, skip, take, status);
            return Ok(ApiResponse<List<MyOrderResponseDto>>.SuccessResult(
                orders, "Lấy đơn hàng thành công"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // CONFIRM RECEIVED (Customer)
    // ════════════════════════════════════════════════════════════════════

    [HttpPost("{orderCode}/confirm-received")]
    public async Task<IActionResult> ConfirmReceived(
        string orderCode, [FromQuery] string email)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(ApiResponse<object>.ErrorResult("Email là bắt buộc."));

            var ok = await _orderService.ConfirmReceivedByCustomerAsync(orderCode, email);
            if (!ok)
                return NotFound(ApiResponse<object>.ErrorResult("Order not found"));

            return Ok(ApiResponse<object>.SuccessResult(
                new { confirmed = true }, "Xác nhận đã nhận hàng thành công"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
        }
    }

    [HttpPost("deliveries/{deliveryId}/confirm-received")]
    public async Task<IActionResult> ConfirmDeliveryReceived(
        string deliveryId, [FromQuery] string email)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(ApiResponse<object>.ErrorResult("Email là bắt buộc."));

            var ok = await _orderService.ConfirmDeliveryReceivedByCustomerAsync(deliveryId, email);
            if (!ok)
                return NotFound(ApiResponse<object>.ErrorResult("Delivery not found"));

            return Ok(ApiResponse<object>.SuccessResult(
                new { confirmed = true }, "Xác nhận shipment đã giao thành công"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // STAFF — DANH SÁCH ĐƠN
    // ════════════════════════════════════════════════════════════════════

    /// GET /api/orders/staff/list?status=PREPARING&type=B2C&search=SHT&page=1&pageSize=20
    [Authorize(Roles = "STAFF")]
    [HttpGet("staff/list")]
    public async Task<IActionResult> GetStaffOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var result = await _orderService.GetStaffOrdersAsync(page, pageSize, status, type, search);
            return Ok(ApiResponse<StaffOrderListResponseDto>.SuccessResult(
                result, "Lấy danh sách đơn hàng thành công"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting staff order list");
            return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // STAFF — CẬP NHẬT TRẠNG THÁI
    // ════════════════════════════════════════════════════════════════════

    /// Cập nhật trạng thái đơn — chỉ Staff, chỉ các transition hợp lệ
    [Authorize(Roles = "STAFF")]
    [HttpPut("{orderId}/status")]
    public async Task<IActionResult> UpdateOrderStatus(
        string orderId, [FromBody] UpdateOrderStatusDto request)
    {
        try
        {
            // Guard: các trạng thái internal chỉ do hệ thống set tự động, Staff không set thủ công
            if (request.Status is OrderStatus.PARTIAL_DELIVERY
                or OrderStatus.DELIVERY_FAILED
                or OrderStatus.PAYMENT_EXPIRED_INTERNAL)
            {
                return BadRequest(ApiResponse<object>.ErrorResult(
                    $"Trạng thái '{request.Status}' được quản lý tự động bởi hệ thống, không thể set thủ công."));
            }

            var updatedBy = User.FindFirst("name")?.Value
                ?? User.Identity?.Name
                ?? "Staff";

            var order = await _orderService.UpdateStatusAsync(
                orderId, request.Status, updatedBy, request.Note);

            return Ok(ApiResponse<object>.SuccessResult(new
            {
                id = order.Id.ToString(),
                orderCode = order.OrderCode,
                status = order.Status,
                statusLabel = GetStatusLabel(order.Status),
                updatedAt = order.UpdatedAt
            }, $"Cập nhật trạng thái thành {request.Status} thành công"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // STAFF — XÁC NHẬN THANH TOÁN THỦ CÔNG
    // ════════════════════════════════════════════════════════════════════

    /// Xác nhận thanh toán thủ công — dùng khi SePay webhook không bắt được
    /// POST /api/orders/{orderId}/confirm-payment
    [Authorize(Roles = "STAFF")]
    [HttpPost("{orderId}/confirm-payment")]
    public async Task<IActionResult> StaffConfirmPayment(string orderId)
    {
        try
        {
            var staffName = User.FindFirst("name")?.Value
                ?? User.Identity?.Name
                ?? "Staff";

            var result = await _orderService.StaffConfirmPaymentAsync(orderId, staffName);

            return Ok(ApiResponse<object>.SuccessResult(
                new { confirmed = result },
                "Xác nhận thanh toán thành công - đơn đã chuyển sang Đang chuẩn bị"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error confirming payment for order {OrderId}", orderId);
            return BadRequest(ApiResponse<object>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // DELIVERY MANAGEMENT (B2B)
    // ════════════════════════════════════════════════════════════════════

    [Authorize(Roles = "STAFF")]
    [HttpPut("deliveries/{deliveryId}/status")]
    public async Task<IActionResult> UpdateDeliveryStatus(
        string deliveryId, [FromBody] UpdateDeliveryStatusDto request)
    {
        try
        {
            await _orderService.UpdateDeliveryStatusAsync(
                deliveryId, request.Status, request.FailureReason);

            return Ok(ApiResponse<string>.SuccessResult(
                string.Empty, $"Delivery status updated to {request.Status}"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    [Authorize(Roles = "STAFF")]
    [HttpPost("deliveries/{deliveryId}/reship")]
    public async Task<IActionResult> ReshipDelivery(string deliveryId)
    {
        try
        {
            var result = await _orderService.ReshipDeliveryAsync(deliveryId);
            return Ok(ApiResponse<bool>.SuccessResult(result, "Delivery reshipped successfully"));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // MIX & MATCH VALIDATION
    // ════════════════════════════════════════════════════════════════════

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
            return BadRequest(ApiResponse<string>.ErrorResult(ex.Message));
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════

    private bool IsStaffOrAdmin()
    {
        var role = User.FindFirst("role")?.Value ?? User.FindFirstValue(ClaimTypes.Role) ?? "";
        return string.Equals(role, "STAFF", StringComparison.OrdinalIgnoreCase)
            || string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase);
    }

    /// Lấy userId từ nhiều claim khác nhau để tương thích với các cách issue token
    private string? GetUserIdFromClaims()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirst("Id")?.Value
            ?? User.FindFirst("id")?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    }

    private static string GetStatusLabel(OrderStatus status) => status switch
    {
        OrderStatus.PAYMENT_CONFIRMING       => "Đang xác nhận thanh toán",
        OrderStatus.PREPARING                => "Đang chuẩn bị",
        OrderStatus.SHIPPING                 => "Đang được giao",
        OrderStatus.PARTIAL_DELIVERY         => "Đang được giao",
        OrderStatus.DELIVERY_FAILED          => "Đang được giao",
        OrderStatus.PAYMENT_EXPIRED_INTERNAL => "Đang xác nhận thanh toán",
        OrderStatus.COMPLETED                => "Hoàn thành",
        OrderStatus.CANCELLED                => "Đã hủy",
        _ => status.ToString()
    };

    private static CreateOrderResponseDto BuildCreateOrderResponse(OrderModel order) => new()
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
    };
}