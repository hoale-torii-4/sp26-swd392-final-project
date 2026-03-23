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
            _logger.LogError(ex, "Error in GET /api/admin/reports/dashboard");
            return StatusCode(500, new { message = "Loi khi tai du lieu dashboard.", detail = ex.Message });
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
            _logger.LogError(ex, "Error in GET /api/admin/reports/revenue");
            return StatusCode(500, new { message = "Loi khi tai bao cao doanh thu.", detail = ex.Message });
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
            _logger.LogError(ex, "Error in GET /api/admin/reports/collections-performance");
            return StatusCode(500, new { message = "Loi khi tai hieu suat bo suu tap.", detail = ex.Message });
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
            _logger.LogError(ex, "Error in GET /api/admin/reports/giftbox-performance");
            return StatusCode(500, new { message = "Loi khi tai hieu suat gift box.", detail = ex.Message });
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
            _logger.LogError(ex, "Error in GET /api/admin/reports/b2c-b2b-comparison");
            return StatusCode(500, new { message = "Loi khi tai so sanh B2C/B2B.", detail = ex.Message });
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
            _logger.LogError(ex, "Error in GET /api/admin/reports/inventory-alert");
            return StatusCode(500, new { message = "Loi khi tai canh bao ton kho.", detail = ex.Message });
        }
    }

    [HttpGet("export/revenue")]
    public async Task<IActionResult> ExportRevenue([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string view = "day", [FromQuery] string? orderType = null)
    {
        try
        {
            var data = await _service.ExportRevenueAsync(fromDate, toDate, view, orderType);
            return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "revenue-report.xlsx");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GET /api/admin/reports/export/revenue");
            return StatusCode(500, new { message = "Loi khi xuat bao cao doanh thu.", detail = ex.Message });
        }
    }

    [HttpGet("export/collections")]
    public async Task<IActionResult> ExportCollections()
    {
        try
        {
            var data = await _service.ExportCollectionsAsync();
            return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "collection-report.xlsx");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GET /api/admin/reports/export/collections");
            return StatusCode(500, new { message = "Loi khi xuat bao cao bo suu tap.", detail = ex.Message });
        }
    }

    [HttpGet("export/giftboxes")]
    public async Task<IActionResult> ExportGiftBoxes()
    {
        try
        {
            var data = await _service.ExportGiftBoxesAsync();
            return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "giftbox-report.xlsx");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GET /api/admin/reports/export/giftboxes");
            return StatusCode(500, new { message = "Loi khi xuat bao cao gift box.", detail = ex.Message });
        }
    }

    [HttpGet("export/b2c-b2b")]
    public async Task<IActionResult> ExportB2cB2b()
    {
        try
        {
            var data = await _service.ExportB2cB2bAsync();
            return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "b2c-b2b-report.xlsx");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GET /api/admin/reports/export/b2c-b2b");
            return StatusCode(500, new { message = "Loi khi xuat bao cao B2C/B2B.", detail = ex.Message });
        }
    }

    [HttpGet("export/inventory-alert")]
    public async Task<IActionResult> ExportInventoryAlert([FromQuery] int threshold = 10)
    {
        try
        {
            var data = await _service.ExportInventoryAlertAsync(threshold);
            return File(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "inventory-alert.xlsx");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GET /api/admin/reports/export/inventory-alert");
            return StatusCode(500, new { message = "Loi khi xuat canh bao ton kho.", detail = ex.Message });
        }
    }
}
