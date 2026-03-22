using Microsoft.AspNetCore.Mvc;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/admin/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(IReportService service, ILogger<ReportsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        try
        {
            var res = await _service.GetDashboardAsync();
            return Ok(res);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reports/Dashboard failed");
            return StatusCode(500, new { error = "Failed to load dashboard report" });
        }
    }

    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string view = "day", [FromQuery] string? orderType = null)
    {
        try
        {
            var res = await _service.GetRevenueAsync(fromDate, toDate, view, orderType);
            return Ok(res);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reports/Revenue failed");
            return StatusCode(500, new { error = "Failed to load revenue report" });
        }
    }

    [HttpGet("collections-performance")]
    public async Task<IActionResult> CollectionsPerformance()
    {
        try
        {
            var res = await _service.GetCollectionsPerformanceAsync();
            return Ok(res);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reports/CollectionsPerformance failed");
            return StatusCode(500, new { error = "Failed to load collection report" });
        }
    }

    [HttpGet("giftbox-performance")]
    public async Task<IActionResult> GiftBoxPerformance()
    {
        try
        {
            var res = await _service.GetGiftBoxPerformanceAsync();
            return Ok(res);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reports/GiftBoxPerformance failed");
            return StatusCode(500, new { error = "Failed to load giftbox report" });
        }
    }

    [HttpGet("b2c-b2b-comparison")]
    public async Task<IActionResult> B2cB2bComparison()
    {
        try
        {
            var res = await _service.GetB2cB2bComparisonAsync();
            return Ok(res);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reports/B2cB2bComparison failed");
            return StatusCode(500, new { error = "Failed to load B2C/B2B comparison" });
        }
    }

    [HttpGet("inventory-alert")]
    public async Task<IActionResult> InventoryAlert([FromQuery] int threshold = 10)
    {
        try
        {
            var res = await _service.GetInventoryAlertAsync(threshold);
            return Ok(res);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reports/InventoryAlert failed");
            return StatusCode(500, new { error = "Failed to load inventory alerts" });
        }
    }

    // ===== Excel export endpoints =====
    [HttpGet("export/revenue")]
    public async Task<IActionResult> ExportRevenue([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string view = "day", [FromQuery] string? orderType = null)
    {
        var data = await _service.ExportRevenueAsync(fromDate, toDate, view, orderType);
        return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "revenue-report.xlsx");
    }

    [HttpGet("export/collections")]
    public async Task<IActionResult> ExportCollections()
    {
        var data = await _service.ExportCollectionsAsync();
        return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "collection-report.xlsx");
    }

    [HttpGet("export/giftboxes")]
    public async Task<IActionResult> ExportGiftBoxes()
    {
        var data = await _service.ExportGiftBoxesAsync();
        return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "giftbox-report.xlsx");
    }

    [HttpGet("export/b2c-b2b")]
    public async Task<IActionResult> ExportB2cB2b()
    {
        var data = await _service.ExportB2cB2bAsync();
        return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "b2c-b2b-report.xlsx");
    }

    [HttpGet("export/inventory-alert")]
    public async Task<IActionResult> ExportInventoryAlert([FromQuery] int threshold = 10)
    {
        var data = await _service.ExportInventoryAlertAsync(threshold);
        return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "inventory-alert.xlsx");
    }
}
