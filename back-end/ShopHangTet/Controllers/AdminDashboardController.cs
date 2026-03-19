using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;
using ShopHangTet.DTOs;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = "ADMIN")]
public class AdminDashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public AdminDashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var dto = await _dashboardService.GetDashboardSummaryAsync();
        return Ok(dto);
    }

    [HttpGet("order-status")]
    public async Task<IActionResult> GetOrderStatus()
    {
        var dto = await _dashboardService.GetOrderStatusSummaryAsync();
        return Ok(dto);
    }

    [HttpGet("order-type")]
    public async Task<IActionResult> GetOrderType()
    {
        var dto = await _dashboardService.GetOrderTypeSummaryAsync();
        return Ok(dto);
    }

    [HttpGet("top-collections")]
    public async Task<IActionResult> GetTopCollections([FromQuery] int limit = 5)
    {
        var dto = await _dashboardService.GetTopCollectionsAsync(limit);
        return Ok(dto);
    }

    [HttpGet("top-giftboxes")]
    public async Task<IActionResult> GetTopGiftBoxes([FromQuery] int limit = 10)
    {
        var dto = await _dashboardService.GetTopGiftBoxesAsync(limit);
        return Ok(dto);
    }

    [HttpGet("inventory-alert")]
    public async Task<IActionResult> GetInventoryAlert([FromQuery] int threshold = 10)
    {
        var dto = await _dashboardService.GetInventoryAlertAsync(threshold);
        return Ok(dto);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var from = fromDate ?? DateTime.UtcNow.AddMonths(-1);
        var to = toDate ?? DateTime.UtcNow;
        var bytes = await _dashboardService.ExportDashboardReportAsync(from, to);
        var fileName = $"dashboard-report-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}
