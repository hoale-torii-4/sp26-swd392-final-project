using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services;

public class ReviewService : IReviewService
{
    private readonly ShopHangTetDbContext _context;

    public ReviewService(ShopHangTetDbContext context)
    {
        _context = context;
    }

    public async Task<ReviewDto> CreateReviewAsync(CreateReviewDTO dto, string userId)
    {
        if (dto == null) throw new ArgumentNullException(nameof(dto));
        if (string.IsNullOrWhiteSpace(userId)) throw new InvalidOperationException("UserId is required");

        // Validate rating
        if (dto.Rating < 1 || dto.Rating > 5) throw new InvalidOperationException("Rating must be between 1 and 5");

        // Verify order exists and is COMPLETED
        var order = (OrderModel?)null;
        if (!string.IsNullOrWhiteSpace(dto.OrderId))
        {
            try
            {
                var objId = MongoDB.Bson.ObjectId.Parse(dto.OrderId);
                order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == objId);
            }
            catch
            {
                // ignore parse errors
            }
        }

        if (order == null) throw new InvalidOperationException("Order not found");
        if (order.Status != OrderStatus.COMPLETED) throw new InvalidOperationException("Order must be COMPLETED to submit a review");

        // Check duplicate: same user, same order, same giftbox
        var existing = await _context.Reviews.FirstOrDefaultAsync(r => r.OrderId == dto.OrderId && r.GiftBoxId == dto.GiftBoxId && r.UserId == userId);
        if (existing != null) throw new InvalidOperationException("User has already reviewed this gift box for the order");

        var review = new Review
        {
            OrderId = dto.OrderId,
            GiftBoxId = dto.GiftBoxId,
            UserId = userId,
            Rating = dto.Rating,
            Comment = dto.Content ?? string.Empty,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow
        };

        await _context.Reviews.AddAsync(review);
        await _context.SaveChangesAsync();

        return new ReviewDto
        {
            Id = review.Id,
            OrderId = review.OrderId,
            GiftBoxId = review.GiftBoxId,
            UserId = review.UserId,
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            CreatedAt = review.CreatedAt
        };
    }

    public async Task<GiftBoxReviewsResponseDTO> GetGiftBoxReviewsAsync(string giftBoxId)
    {
        var query = _context.Reviews.AsQueryable().Where(r => r.GiftBoxId == giftBoxId && r.Status == "APPROVED");
        var list = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();

        var userIds = list.Select(r => r.UserId).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        var users = await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);

        var items = list.Select(r =>
        {
            users.TryGetValue(r.UserId, out var user);
            return new GiftBoxReviewItemDTO
            {
                ReviewId = r.Id,
                UserName = user?.FullName ?? string.Empty,
                Rating = r.Rating,
                Content = r.Comment,
                CreatedAt = r.CreatedAt
            };
        }).ToList();

        var average = items.Any() ? Math.Round(items.Average(i => i.Rating), 2) : 0.0;

        return new GiftBoxReviewsResponseDTO
        {
            GiftBoxId = giftBoxId,
            AverageRating = average,
            TotalReviews = items.Count,
            Reviews = items
        };
    }

    public async Task<List<UserReviewDTO>> GetUserReviewsAsync(string userId)
    {
        var query = _context.Reviews.AsQueryable().Where(r => r.UserId == userId);
        var list = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();

        var giftBoxIds = list.Select(r => r.GiftBoxId).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        var giftBoxes = await _context.GiftBoxes.Where(g => giftBoxIds.Contains(g.Id)).ToDictionaryAsync(g => g.Id);

        var items = list.Select(r =>
        {
            giftBoxes.TryGetValue(r.GiftBoxId, out var gb);
            return new UserReviewDTO
            {
                ReviewId = r.Id,
                GiftBoxId = r.GiftBoxId,
                GiftBoxName = gb?.Name ?? string.Empty,
                Rating = r.Rating,
                Content = r.Comment,
                Status = r.Status,
                CreatedAt = r.CreatedAt
            };
        }).ToList();

        return items;
    }

    private static string MapStatusLabel(string status)
    {
        return status switch
        {
            "APPROVED" => "Approved",
            "HIDDEN" => "Hidden",
            _ => "Pending"
        };
    }

    public async Task<ReviewListResponseDTO> GetReviewsAsync(string? status, int? rating, string? giftBoxId, int page, int pageSize)
    {
        var query = _context.Reviews.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        if (rating.HasValue)
            query = query.Where(r => r.Rating == rating.Value);

        if (!string.IsNullOrWhiteSpace(giftBoxId))
            query = query.Where(r => r.GiftBoxId == giftBoxId);

        var total = await query.CountAsync();

        var list = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var userIds = list.Select(r => r.UserId).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        var giftBoxIds = list.Select(r => r.GiftBoxId).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();

        var users = await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id);
        var giftBoxes = await _context.GiftBoxes.Where(g => giftBoxIds.Contains(g.Id)).ToDictionaryAsync(g => g.Id);

        var items = list.Select(r =>
        {
            users.TryGetValue(r.UserId, out var user);
            giftBoxes.TryGetValue(r.GiftBoxId, out var gb);

            return new ReviewListItemDTO
            {
                Id = r.Id,
                ReviewerName = user?.FullName ?? string.Empty,
                ReviewerEmail = user?.Email ?? string.Empty,
                ReviewerAvatar = null,
                GiftBoxId = r.GiftBoxId,
                GiftBoxName = gb?.Name ?? string.Empty,
                GiftBoxImage = (gb?.Images != null && gb.Images.Any()) ? gb.Images.FirstOrDefault() : null,
                Rating = r.Rating,
                Content = r.Comment,
                CreatedAt = r.CreatedAt,
                Status = r.Status,
                StatusLabel = MapStatusLabel(r.Status)
            };
        }).ToList();

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);

        return new ReviewListResponseDTO
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = total,
            TotalPages = totalPages
        };
    }

    public async Task<ReviewDetailDTO?> GetReviewDetailAsync(string id)
    {
        var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null) return null;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == review.UserId);
        var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(g => g.Id == review.GiftBoxId);

        string? orderCode = null;
        if (!string.IsNullOrWhiteSpace(review.OrderId))
        {
            try
            {
                var objId = ObjectId.Parse(review.OrderId);
                var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == objId);
                orderCode = order?.OrderCode;
            }
            catch
            {
                // ignore parse errors
            }
        }

        return new ReviewDetailDTO
        {
            Id = review.Id,
            ReviewerName = user?.FullName ?? string.Empty,
            ReviewerEmail = user?.Email ?? string.Empty,
            ReviewerAvatar = null,
            OrderCode = orderCode,
            GiftBoxId = review.GiftBoxId,
            GiftBoxName = giftBox?.Name ?? string.Empty,
            GiftBoxImage = (giftBox?.Images != null && giftBox.Images.Any()) ? giftBox.Images.FirstOrDefault() : null,
            Rating = review.Rating,
            Content = review.Comment,
            CreatedAt = review.CreatedAt,
            Status = review.Status
        };
    }

    public async Task ApproveReviewAsync(string id)
    {
        var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null) throw new InvalidOperationException("Review not found");
        review.Status = "APPROVED";
        _context.Reviews.Update(review);
        await _context.SaveChangesAsync();
    }

    public async Task HideReviewAsync(string id)
    {
        var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null) throw new InvalidOperationException("Review not found");
        review.Status = "HIDDEN";
        _context.Reviews.Update(review);
        await _context.SaveChangesAsync();
    }
}
