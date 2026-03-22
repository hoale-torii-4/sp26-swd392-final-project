using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/admin/orders")]
public class AdminOrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ILogger<AdminOrdersController> _logger;

    public AdminOrdersController(IOrderService orderService, ILogger<AdminOrdersController> logger)
    {
        _orderService = orderService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? orderType,
        [FromQuery] string? keyword,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var result = await _orderService.GetAllOrdersAsync(status, orderType, keyword, page, pageSize);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GET /api/admin/orders");
            return StatusCode(500, new { message = "Lỗi khi tải danh sách đơn hàng.", detail = ex.Message });
        }
    }
}
