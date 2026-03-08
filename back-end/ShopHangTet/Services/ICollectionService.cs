using ShopHangTet.DTOs;

namespace ShopHangTet.Services
{
    public interface ICollectionService
    {
        Task<List<CollectionResponseDTO>> GetCollectionsAsync();
        Task<CollectionResponseDTO?> GetCollectionByIdAsync(string id);
        Task<string> CreateCollectionAsync(CollectionCreateDTO dto);
        Task UpdateCollectionAsync(string id, CollectionUpdateDTO dto);
        Task ToggleCollectionStatusAsync(string id, bool isActive);
        Task DeleteCollectionAsync(string id);
        Task ReorderCollectionsAsync(List<CollectionReorderDTO> items);
    }
}
