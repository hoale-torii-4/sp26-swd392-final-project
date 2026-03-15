using ShopHangTet.DTOs;

namespace ShopHangTet.Services;

public interface IMixMatchCustomerService
{
    Task<string> CreateCustomBoxAsync(string userId, CreateCustomBoxDTO dto);

    Task<CustomBoxResponseDTO?> GetCustomBoxAsync(string id);

    Task<CustomBoxResponseDTO?> GetCustomBoxByUserAsync(string userId);

    Task<List<CustomBoxResponseDTO>> GetCustomBoxesByUserAsync(string userId);
}
