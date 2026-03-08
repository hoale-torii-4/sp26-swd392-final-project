using ShopHangTet.DTOs;

namespace ShopHangTet.Services;

public interface IReportService
{
    Task<DashboardReportDTO> GetDashboardAsync();

    Task<RevenueReportDTO> GetRevenueAsync(DateTime? fromDate, DateTime? toDate, string view, string? orderType);

    Task<List<CollectionPerformanceItemDTO>> GetCollectionsPerformanceAsync();

    Task<List<GiftBoxPerformanceItemDTO>> GetGiftBoxPerformanceAsync();

    Task<B2cB2bComparisonDTO> GetB2cB2bComparisonAsync();

    Task<List<InventoryAlertItemDTO>> GetInventoryAlertAsync(int threshold);

    // Export methods returning byte[] (xlsx)
    Task<byte[]> ExportRevenueAsync(DateTime? fromDate, DateTime? toDate, string view, string? orderType);
    Task<byte[]> ExportCollectionsAsync();
    Task<byte[]> ExportGiftBoxesAsync();
    Task<byte[]> ExportB2cB2bAsync();
    Task<byte[]> ExportInventoryAlertAsync(int threshold);
}
