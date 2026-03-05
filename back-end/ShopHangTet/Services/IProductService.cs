using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    public interface IProductService
    {
        Task<List<Item>> GetItemsAsync(string? name = null);
        Task<Item?> GetItemByIdAsync(string id);
        Task<List<GiftBoxListDto>> GetGiftBoxesAsync(string? name = null);
        Task<GiftBoxDetailDto?> GetGiftBoxDetailByIdAsync(string id);
        Task<List<CollectionListDto>> GetCollectionsAsync(string? name = null);
        Task<CollectionDetailDto?> GetCollectionDetailByIdAsync(string id);

        // === GiftBox Pricing ===
        /// Tính giá GiftBox tự động từ item costs + collection pricing rule
        Task<decimal> CalculateGiftBoxPriceAsync(string collectionId, List<GiftBoxItem> items);

        // === GiftBox CRUD ===
        /// Tạo GiftBox mới — tự tính Price từ collection rule
        Task<GiftBox> CreateGiftBoxAsync(CreateGiftBoxDto dto);
        /// Cập nhật GiftBox — tự tính lại Price nếu items thay đổi
        Task<GiftBox> UpdateGiftBoxAsync(string id, UpdateGiftBoxDto dto);
    }
}