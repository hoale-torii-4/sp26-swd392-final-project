using ShopHangTet.DTOs;

namespace ShopHangTet.Services;

public interface IMixMatchCustomerService
{
    Task<string> CreateCustomBoxAsync(CreateCustomBoxDTO dto);

    Task<CustomBoxResponseDTO?> GetCustomBoxAsync(string id);
}
