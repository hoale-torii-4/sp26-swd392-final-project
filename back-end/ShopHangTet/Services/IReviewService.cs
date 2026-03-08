using ShopHangTet.DTOs;

namespace ShopHangTet.Services;

public interface IReviewService
{
    Task<ReviewListResponseDTO> GetReviewsAsync(string? status, int? rating, string? giftBoxId, int page, int pageSize);

    Task<ReviewDetailDTO?> GetReviewDetailAsync(string id);

    Task ApproveReviewAsync(string id);

    Task HideReviewAsync(string id);

    // User-facing review APIs
    Task<ReviewDto> CreateReviewAsync(CreateReviewDTO dto, string userId);

    Task<GiftBoxReviewsResponseDTO> GetGiftBoxReviewsAsync(string giftBoxId);

    Task<List<UserReviewDTO>> GetUserReviewsAsync(string userId);
}
