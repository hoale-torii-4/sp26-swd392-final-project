using ShopHangTet.DTOs;

namespace ShopHangTet.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDTO> GetDashboardSummaryAsync();
    Task<OrderStatusSummaryDTO> GetOrderStatusSummaryAsync();
    Task<OrderTypeSummaryDTO> GetOrderTypeSummaryAsync();
    Task<List<TopCollectionDTO>> GetTopCollectionsAsync(int limit = 5);
    Task<List<TopGiftBoxDTO>> GetTopGiftBoxesAsync(int limit = 10);
    Task<List<InventoryAlertDTO>> GetInventoryAlertAsync(int threshold = 10);
    Task<byte[]> ExportDashboardReportAsync(DateTime fromDate, DateTime toDate);
}
