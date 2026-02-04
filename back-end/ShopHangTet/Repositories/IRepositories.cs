using ShopHangTet.Models;

namespace ShopHangTet.Repositories
{
    public interface IUserRepository
    {
        Task<UserModel?> GetByIdAsync(string id);
        Task<UserModel?> GetByEmailAsync(string email);
        Task<UserModel> CreateAsync(UserModel user);
        Task<UserModel> UpdateAsync(UserModel user);
        Task<bool> DeleteAsync(string id);
        Task<bool> ExistsAsync(string email);
        Task<List<UserModel>> GetUsersAsync(int page = 1, int limit = 10, string? search = null);
        Task<int> CountAsync();
    }

    public interface ICollectionRepository
    {
        Task<Collection?> GetByIdAsync(string id);
        Task<List<Collection>> GetAllAsync(bool activeOnly = true);
        Task<Collection> CreateAsync(Collection collection);
        Task<Collection> UpdateAsync(Collection collection);
        Task<bool> DeleteAsync(string id);
        Task<int> CountAsync();
    }

    public interface IGiftBoxRepository  
    {
        Task<GiftBox?> GetByIdAsync(string id);
        Task<List<GiftBox>> GetAllAsync(bool activeOnly = true);
        Task<List<GiftBox>> GetByCollectionAsync(string collectionId, bool activeOnly = true);
        Task<GiftBox> CreateAsync(GiftBox giftBox);
        Task<GiftBox> UpdateAsync(GiftBox giftBox);
        Task<bool> DeleteAsync(string id);
        Task<List<GiftBox>> SearchAsync(string? search, decimal? minPrice, decimal? maxPrice, string? collectionId);
    }

    public interface IItemRepository
    {
        Task<Item?> GetByIdAsync(string id);
        Task<List<Item>> GetAllAsync(bool activeOnly = true);
        Task<List<Item>> GetByCategoryAsync(string category, bool activeOnly = true);
        Task<Item> CreateAsync(Item item);
        Task<Item> UpdateAsync(Item item);
        Task<bool> DeleteAsync(string id);
        Task<bool> UpdateStockAsync(string itemId, int quantityChange);
        Task<List<Item>> UpdateStockBatchAsync(Dictionary<string, int> stockChanges);
    }

    public interface ICustomBoxRepository
    {
        Task<CustomBox?> GetByIdAsync(string id);
        Task<CustomBox> CreateAsync(CustomBox customBox);
        Task<bool> DeleteAsync(string id);
        Task<bool> ValidateCustomBoxRulesAsync(List<CustomBoxItem> items);
    }

    public interface ICartRepository
    {
        Task<Cart?> GetByUserIdAsync(string userId);
        Task<Cart?> GetBySessionIdAsync(string sessionId);
        Task<Cart> CreateAsync(Cart cart);
        Task<Cart> UpdateAsync(Cart cart);
        Task<bool> DeleteAsync(string id);
        Task<bool> ClearCartAsync(string cartId);
        Task<CartItem> AddItemAsync(string cartId, CartItem item);
        Task<bool> UpdateItemQuantityAsync(string cartId, string itemId, int quantity);
        Task<bool> RemoveItemAsync(string cartId, string itemId);
    }

    public interface IAddressRepository
    {
        Task<Address?> GetByIdAsync(string id);
        Task<List<Address>> GetByUserIdAsync(string userId);
        Task<Address> CreateAsync(Address address);
        Task<Address> UpdateAsync(Address address);
        Task<bool> DeleteAsync(string id);
        Task<bool> SetDefaultAsync(string userId, string addressId);
        Task<Address?> GetDefaultAsync(string userId);
    }

    public interface IOrderRepository
    {
        Task<OrderModel?> GetByIdAsync(string id);
        Task<OrderModel?> GetByOrderCodeAsync(string orderCode);
        Task<List<OrderModel>> GetByUserIdAsync(string userId, int page = 1, int limit = 10);
        Task<List<OrderModel>> GetByEmailAsync(string email, int page = 1, int limit = 10);
        Task<OrderModel> CreateAsync(OrderModel order);
        Task<OrderModel> UpdateAsync(OrderModel order);
        Task<bool> UpdateStatusAsync(string orderId, string status);
        Task<List<OrderModel>> GetOrdersAsync(int page = 1, int limit = 10, string? status = null, string? search = null);
        Task<string> GenerateOrderCodeAsync();
        Task<int> CountAsync();
    }

    public interface IReviewRepository
    {
        Task<Review?> GetByIdAsync(string id);
        Task<List<Review>> GetByGiftBoxIdAsync(string giftBoxId, bool approvedOnly = true);
        Task<List<Review>> GetByUserIdAsync(string userId);
        Task<Review> CreateAsync(Review review);
        Task<Review> UpdateAsync(Review review);
        Task<bool> UpdateStatusAsync(string reviewId, string status);
        Task<bool> DeleteAsync(string id);
        Task<List<Review>> GetPendingReviewsAsync(int page = 1, int limit = 10);
    }

    public interface IChatRepository
    {
        Task<ChatSession?> GetSessionByIdAsync(string id);
        Task<List<ChatSession>> GetOpenSessionsAsync();
        Task<ChatSession> CreateSessionAsync(ChatSession session);
        Task<ChatSession> UpdateSessionAsync(ChatSession session);
        Task<ChatMessage> AddMessageAsync(string sessionId, ChatMessage message);
        Task<bool> CloseSessionAsync(string sessionId);
        Task<List<ChatMessage>> GetMessagesAsync(string sessionId);
    }

    // IEmailService moved to ShopHangTet.Services namespace
}