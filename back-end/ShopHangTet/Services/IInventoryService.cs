using ShopHangTet.DTOs;

namespace ShopHangTet.Services
{
    public interface IInventoryService
    {
        Task<PagedResult<InventoryItemResponseDTO>> GetInventoryAsync(string? search, string? category, string? stockStatus, int page, int pageSize);
        Task<InventoryItemDetailDTO?> GetItemDetailAsync(string itemId);
        Task<PagedResult<InventoryLogDTO>> GetInventoryLogsAsync(string? search, string? changeType, string? source, DateTime? date, int page, int pageSize);
        Task AdjustInventoryAsync(InventoryAdjustRequestDTO dto);
        Task<InventorySummaryDTO> GetInventorySummaryAsync();
        Task<string> CreateItemAsync(InventoryCreateRequestDTO dto);
    }
}
