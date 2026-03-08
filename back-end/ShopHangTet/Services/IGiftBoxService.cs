using ShopHangTet.DTOs;

namespace ShopHangTet.Services
{
    public interface IGiftBoxService
    {
        Task<PagedResult<GiftBoxListResponseDTO>> GetGiftBoxesAsync(string? collectionId, string? keyword, bool? status, int page, int pageSize);
        Task<GiftBoxDetailResponseDTO?> GetGiftBoxByIdAsync(string id);
        Task<string> CreateGiftBoxAsync(GiftBoxCreateDTO dto);
        Task UpdateGiftBoxAsync(string id, GiftBoxUpdateDTO dto);
        Task ToggleGiftBoxStatusAsync(string id, bool isActive);
        Task DeleteGiftBoxAsync(string id);
        Task<List<SimpleCollectionDTO>> GetCollectionsAsync();
        Task<List<SimpleItemDTO>> GetItemsAsync();
        Task<List<SimpleTagDTO>> GetTagsAsync();
    }
}
