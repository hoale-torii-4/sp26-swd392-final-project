using ShopHangTet.DTOs;

namespace ShopHangTet.Services;

public interface IMixMatchService
{
    Task<object> GetItemsAsync(string? search, string? category, bool? isActive, int page, int pageSize);
    Task<MixMatchItemResponseDTO?> GetItemByIdAsync(string id);
    Task<string> CreateItemAsync(MixMatchCreateDTO dto);
    Task UpdateItemAsync(string id, MixMatchUpdateDTO dto);
    Task ToggleItemStatusAsync(string id, bool isActive);
    Task DeleteItemAsync(string id);
    Task<List<object>> GetCategoriesAsync();
    Task<MixMatchRuleDTO> GetRulesAsync();
    Task UpdateRulesAsync(MixMatchRuleDTO dto);
}
