using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using ShopHangTet.Models;

namespace ShopHangTet.DTOs
{
    // ========== CORE DTOs ==========
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public static ApiResponse<T> SuccessResult(T data, string message = "")
        {
            return new ApiResponse<T> { Success = true, Message = message, Data = data };
        }

        public static ApiResponse<T> ErrorResult(string message, List<string>? errors = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Errors = errors ?? new List<string>()
            };
        }
    }

    public class PagedResponse<T>
    {
        public List<T> Data { get; set; } = new List<T>();
        public int TotalItems { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class PaginationRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? OrderBy { get; set; }
        public string? SortDirection { get; set; } = "asc";
    }

    // ========== USER DTOs ==========
    public class RegisterDto
    {
        [Required] [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required] [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string FullName { get; set; } = string.Empty;

        [Phone]
        public string? Phone { get; set; }
    }

    public class UpdateProfileDto
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Phone]
        public string? Phone { get; set; }
    }

    public class GoogleLoginDto
    {
        [Required]
        public string IdToken { get; set; } = string.Empty;
    }

    public class LoginDto
    {
        [Required] [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public UserResponseDto User { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
    }

    public class UserDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public UserRole Role { get; set; }
        public UserStatus Status { get; set; }
    }

    public class UserResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public UserRole Role { get; set; }
        public UserStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class OtpVerifyDto
    {
        [Required] [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Otp { get; set; } = string.Empty;
    }

    public class ForgotPasswordDto
    {
        [Required] [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordDto
    {
        [Required] [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Otp { get; set; } = string.Empty;

        [Required] [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ChangePasswordDto
    {
        [Required]
        public string OldPassword { get; set; } = string.Empty;

        [Required] [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ResendOtpDto
    {
        public string Email { get; set; } = string.Empty;
    }

    // ========== COLLECTION DTOs ==========
    public class CollectionDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? CoverImage { get; set; }
        public decimal PricingMultiplier { get; set; }
        public decimal PackagingFee { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CollectionResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public int GiftBoxCount { get; set; }
        public string? Thumbnail { get; set; }
    }

    public class CollectionCreateDTO
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CollectionUpdateDTO
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
    }

    public class CollectionReorderDTO
    {
        [Required] public string Id { get; set; } = string.Empty;
        [Required] public int DisplayOrder { get; set; }
    }

    // ========== GIFT BOX DTOs ==========
    public class GiftBoxDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public List<string> Images { get; set; } = new();
        public string CollectionId { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
        public List<GiftBoxItemDto> Items { get; set; } = new();
        public bool IsActive { get; set; } = true;
    }

    public class GiftBoxItemDto
    {
        public string ItemId { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal ItemPrice { get; set; }
    }

    // ========== ITEM DTOs (Mix & Match) ==========
    public class ItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // DRINK, FOOD, NUT, ALCOHOL, SAVORY
        public decimal Price { get; set; }
        public bool IsAlcohol { get; set; }
        public int StockQuantity { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CustomBoxItemDto
    {
        [Required]
        public string ItemId { get; set; } = string.Empty;

        [Required] [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        public decimal? Price { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public bool IsAlcohol { get; set; }
    }

    public class CustomBoxDto
    {
        public string Id { get; set; } = string.Empty;
        public List<CustomBoxItemDto> Items { get; set; } = new();
        public decimal TotalPrice { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateCustomBoxDto
    {
        [Required] [MinLength(1, ErrorMessage = "Ít nhất 1 item được yêu cầu")]
        public List<CustomBoxItemDto> Items { get; set; } = new();

        public string? GreetingMessage { get; set; }
        public string? CanvaCardLink { get; set; }
        public bool HideInvoice { get; set; }
    }

    public class CreateCustomBoxItemDTO
    {
        [Required]
        public string ItemId { get; set; } = string.Empty;

        [Required] [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    public class CreateCustomBoxDTO
    {
        [Required] [MinLength(1)]
        public List<CreateCustomBoxItemDTO> Items { get; set; } = new();
    }

    public class CustomBoxItemResponseDTO
    {
        public string ItemId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public decimal Subtotal { get; set; }
    }

    public class CustomBoxResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public int TotalItems { get; set; }
        public decimal TotalPrice { get; set; }
        public List<CustomBoxItemResponseDTO> Items { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }

    // ========== MIX & MATCH RULES DTOs ==========
    /// Rules hiện tại (đã bỏ rule Chivas):
    /// - Tổng 4-6 món
    /// - Ít nhất 1 đồ uống (Trà hoặc Rượu) — DRINK hoặc ALCOHOL
    /// - Ít nhất 2 snack (NUT hoặc FOOD)
    /// - Đặc sản mặn (SAVORY) tối đa 2
    public class MixMatchRulesDto
    {
        public int MinTotalItems { get; set; } = 4;
        public int MaxTotalItems { get; set; } = 6;
        public int MinBeverageItems { get; set; } = 1;  // DRINK + ALCOHOL >= 1
        public int MinSnackItems { get; set; } = 2;     // NUT + FOOD >= 2
        public int MaxSavoryItems { get; set; } = 2;    // SAVORY <= 2
    }

    // ========== MIX & MATCH DTOs (Admin) ==========
    public class MixMatchItemResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string CategoryLabel { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsAlcohol { get; set; }
        public int StockQuantity { get; set; }
        public string StockStatus { get; set; } = string.Empty;
        public string StockStatusLabel { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
    }

    public class MixMatchCreateDTO
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty; // DRINK|FOOD|NUT|ALCOHOL|SAVORY

        public string? Image { get; set; }
        public string? Description { get; set; }
        public bool IsAlcohol { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class MixMatchUpdateDTO
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        public string? Image { get; set; }
        public string? Description { get; set; }
        public bool IsAlcohol { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class MixMatchRuleDTO
    {
        public int MinItems { get; set; } = 4;
        public int MaxItems { get; set; } = 6;
        public int MinDrink { get; set; } = 1;
        public int MinSnack { get; set; } = 2;
        public int MaxSavory { get; set; } = 2;
    }

    // ========== INTERNAL USER (Admin) DTOs ==========
    public class InternalUserResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string RoleLabel { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class InternalUserListResponseDTO
    {
        public List<InternalUserResponseDTO> Users { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
    }

    public class CreateInternalUserDTO
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required] [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required] [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = string.Empty; // ADMIN | STAFF
    }

    public class UpdateInternalUserDTO
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
    }

    public class ToggleUserStatusDTO
    {
        public bool IsActive { get; set; }
    }

    public class ValidationResultDto
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
        public string? Message { get; set; }
    }

    // ========== ADDRESS DTOs ==========
    public class AddressDto
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string ReceiverName { get; set; } = string.Empty;
        public string ReceiverPhone { get; set; } = string.Empty;
        public string FullAddress { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateAddressDto
    {
        [Required]
        public string ReceiverName { get; set; } = string.Empty;

        [Required] [Phone]
        public string ReceiverPhone { get; set; } = string.Empty;

        [Required]
        public string FullAddress { get; set; } = string.Empty;

        public bool IsDefault { get; set; }
    }

    public class UpdateAddressDto
    {
        public string? ReceiverName { get; set; }
        public string? ReceiverPhone { get; set; }
        public string? FullAddress { get; set; }
        public bool? IsDefault { get; set; }
    }

    // ========== ORDER DTOs ==========
    public class OrderItemDto
    {
        [Required]
        public OrderItemType Type { get; set; }

        /// GiftBoxId nếu READY_MADE, CustomBoxId nếu MIX_MATCH
        public string? Id { get; set; }

        [Obsolete("Use Id instead")]
        public string? GiftBoxId { get; set; }
        [Obsolete("Use Id instead")]
        public string? CustomBoxId { get; set; }

        [Required] [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    /// DTO đặt hàng B2C — 1 địa chỉ, Guest hoặc Member
    public class CreateOrderB2CDto
    {
        public string? UserId { get; set; }

        [Required] [EmailAddress]
        public string CustomerEmail { get; set; } = string.Empty;

        [Required]
        public string CustomerName { get; set; } = string.Empty;

        [Required] [Phone]
        public string CustomerPhone { get; set; } = string.Empty;

        [Required] [MinLength(1)]
        public List<OrderItemDto> Items { get; set; } = new();

        [Required]
        public string ReceiverName { get; set; } = string.Empty;

        [Required] [Phone]
        public string ReceiverPhone { get; set; } = string.Empty;

        [Required]
        public string DeliveryAddress { get; set; } = string.Empty;

        public string? GreetingMessage { get; set; }
        public string? GreetingCardUrl { get; set; }

        /// Ngày giao hàng — chỉ cần chọn ngày, không cần slot giờ
        [Required]
        public DateTime DeliveryDate { get; set; }
    }

    /// DTO đặt hàng B2B — nhiều địa chỉ, Member only
    public class CreateOrderB2BDto
    {
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required] [EmailAddress]
        public string CustomerEmail { get; set; } = string.Empty;

        [Required]
        public string CustomerName { get; set; } = string.Empty;

        [Required] [Phone]
        public string CustomerPhone { get; set; } = string.Empty;

        [Required] [MinLength(1)]
        public List<OrderItemDto> Items { get; set; } = new();

        /// Phân bổ giao hàng theo địa chỉ — tối thiểu 1 địa chỉ
        [Required] [MinLength(1)]
        public List<B2BDeliveryAllocationDto> DeliveryAllocations { get; set; } = new();

        public string? GreetingMessage { get; set; }
        public string? GreetingCardUrl { get; set; }
    }

    /// Phân bổ giao hàng cho 1 địa chỉ trong B2B
    /// Mỗi địa chỉ có ngày giao riêng và danh sách sản phẩm riêng
    public class B2BDeliveryAllocationDto
    {
        [Required]
        public string AddressId { get; set; } = string.Empty;

        /// Ngày giao riêng cho địa chỉ này (mỗi địa chỉ có thể khác nhau)
        [Required]
        public DateTime DeliveryDate { get; set; }

        [Required] [MinLength(1)]
        public List<OrderItemAllocationDto> ItemAllocations { get; set; } = new();

        public string? GreetingMessage { get; set; }
        public bool HideInvoice { get; set; }
    }

    /// Phân bổ số lượng sản phẩm cho 1 địa chỉ
    /// Dùng ItemId (GiftBoxId hoặc CustomBoxId) thay vì index để tránh map nhầm
    public class OrderItemAllocationDto
    {
        /// GiftBoxId nếu READY_MADE, CustomBoxId nếu MIX_MATCH — phải khớp với Items trong CreateOrderB2BDto
        [Required]
        public string ItemId { get; set; } = string.Empty;

        [Required]
        public OrderItemType ItemType { get; set; }

        [Required] [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    public class OrderTrackingDto
    {
        [Required] [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string OrderCode { get; set; } = string.Empty;
    }

    public class UpdateOrderStatusDto
    {
        [Required]
        public OrderStatus Status { get; set; }

        public string? Note { get; set; }
    }

    // ========== MIX & MATCH VALIDATION RESULT ==========
    /// Kết quả validate Mix & Match (đã bỏ rule Chivas)
    public class MixMatchValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
        public int TotalItemCount { get; set; }
        public int DrinkCount { get; set; }
        public int FoodCount { get; set; }
        public int NutCount { get; set; }
        public int SnackCount { get; set; }   // NUT + FOOD
        public int SavoryCount { get; set; }  // SAVORY category
        public int AlcoholCount { get; set; }

        public bool MeetsRules =>
            TotalItemCount >= 4
            && TotalItemCount <= 6
            && (DrinkCount + AlcoholCount) >= 1
            && SnackCount >= 2
            && SavoryCount <= 2;
    }

    // ========== ORDER RESPONSE DTOs ==========
    public class OrderDto
    {
        public string Id { get; set; } = string.Empty;
        public string OrderCode { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public OrderType OrderType { get; set; }
        public OrderStatus Status { get; set; }
        public decimal TotalAmount { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? GreetingMessage { get; set; }
        public string? GreetingCardUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemResponseDto> Items { get; set; } = new();
        public List<DeliveryAddressResponseDto> DeliveryAddresses { get; set; } = new();
        public List<DeliveryShipmentResponseDto> DeliveryShipments { get; set; } = new();
    }

    public class OrderItemResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public OrderItemType Type { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
    }

    public class CreateOrderResponseDto
    {
        public string OrderId { get; set; } = string.Empty;
        public string OrderCode { get; set; } = string.Empty;
        public OrderType OrderType { get; set; }
        public OrderStatus Status { get; set; }
        public decimal SubTotal { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemResponseDto> Items { get; set; } = new();
    }

    public class DeliveryAddressResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string ReceiverName { get; set; } = string.Empty;
        public string ReceiverPhone { get; set; } = string.Empty;
        public string FullAddress { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? GreetingMessage { get; set; }
        public bool HideInvoice { get; set; }
    }

    public class DeliveryShipmentResponseDto
    {
        public string DeliveryId { get; set; } = string.Empty;
        public string AddressId { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int RetryCount { get; set; }
        public int MaxRetries { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public DateTime? LastAttemptAt { get; set; }
        public string? FailureReason { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<DeliveryShipmentItemResponseDto> Items { get; set; } = new();
    }

    public class DeliveryShipmentItemResponseDto
    {
        public string OrderItemId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public OrderItemType Type { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
    }

    public class OrderStatusHistoryDto
    {
        public OrderStatus Status { get; set; }
        public DateTime ChangedAt { get; set; }
        public string? Note { get; set; }
        public string? ChangedBy { get; set; }
    }

    // ========== STAFF ORDER LIST DTOs ==========
    public class StaffOrderListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string OrderCode { get; set; } = string.Empty;
        public OrderType OrderType { get; set; }
        public OrderStatus Status { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public int TotalItems { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DeliveryDate { get; set; }
    }

    public class StaffOrderListResponseDto
    {
        public List<StaffOrderListItemDto> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }

    // ========== CART DTOs ==========
    public class CartDto
    {
        public string Id { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? SessionId { get; set; }
        public List<CartItemDto> Items { get; set; } = new();
        public decimal TotalAmount { get; set; }
        public int TotalItems { get; set; }
    }

    public class CartItemDto
    {
        public string Id { get; set; } = string.Empty;
        public OrderItemType Type { get; set; }
        public string ProductId { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string? Name { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsActive { get; set; } = true;
        public string? StatusLabel { get; set; }
    }

    public class AddToCartDto
    {
        [Required]
        public OrderItemType Type { get; set; }

        public string? Id { get; set; }

        [Obsolete("Use Id instead")]
        public string? GiftBoxId { get; set; }
        [Obsolete("Use Id instead")]
        public string? CustomBoxId { get; set; }

        [Required] [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    public class AddToCartBatchDto
    {
        [Required] [MinLength(1)]
        public List<AddToCartDto> Items { get; set; } = new();
    }

    public class UpdateCartItemDto
    {
        [Required] [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    // ========== REVIEW DTOs ==========
    public class ReviewDto
    {
        public string Id { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string GiftBoxId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    // ========== DASHBOARD DTOs ==========
    public class DashboardSummaryDTO
    {
        public decimal TotalRevenue { get; set; }
        public double RevenueGrowthPercent { get; set; }
        public int TotalOrders { get; set; }
        public double OrderGrowthPercent { get; set; }
        public int OrdersToday { get; set; }
        public double B2cPercent { get; set; }
        public double B2bPercent { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class OrderStatusSummaryDTO
    {
        public int PendingPayment { get; set; }
        public int Preparing { get; set; }
        public int Shipping { get; set; }
        public int DeliveryFailed { get; set; }
        public int PartiallyDelivered { get; set; }
        public int Completed { get; set; }
        public int Cancelled { get; set; }
    }

    public class OrderTypeSummaryDTO
    {
        public int B2cOrders { get; set; }
        public int B2bOrders { get; set; }
        public decimal B2cRevenue { get; set; }
        public decimal B2bRevenue { get; set; }
        public double B2cPercent { get; set; }
        public double B2bPercent { get; set; }
    }

    public class TopCollectionDTO
    {
        public string CollectionId { get; set; } = string.Empty;
        public string CollectionName { get; set; } = string.Empty;
        public string? Thumbnail { get; set; }
        public int Orders { get; set; }
        public decimal Revenue { get; set; }
        public double Percent { get; set; }
    }

    public class TopGiftBoxDTO
    {
        public string GiftBoxId { get; set; } = string.Empty;
        public string GiftBoxName { get; set; } = string.Empty;
        public string? Image { get; set; }
        public string CollectionName { get; set; } = string.Empty;
        public int SoldQuantity { get; set; }
        public decimal Revenue { get; set; }
    }

    public class InventoryAlertDTO
    {
        public string ItemId { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int StockQuantity { get; set; }
        public int Threshold { get; set; }
    }

    public class CreateReviewDto
    {
        [Required] public string OrderId { get; set; } = string.Empty;
        [Required] public string GiftBoxId { get; set; } = string.Empty;
        [Required] [Range(1, 5)] public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
    }

    public class CreateReviewDTO
    {
        [Required] public string OrderId { get; set; } = string.Empty;
        [Required] public string GiftBoxId { get; set; } = string.Empty;
        [Required] [Range(1, 5)] public int Rating { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    public class GiftBoxReviewItemDTO
    {
        public string ReviewId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class GiftBoxReviewsResponseDTO
    {
        public string GiftBoxId { get; set; } = string.Empty;
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public List<GiftBoxReviewItemDTO> Reviews { get; set; } = new();
    }

    public class UserReviewDTO
    {
        public string ReviewId { get; set; } = string.Empty;
        public string GiftBoxId { get; set; } = string.Empty;
        public string GiftBoxName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class UpdateReviewStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty; // APPROVED | HIDDEN
    }

    public class ReviewListItemDTO
    {
        public string Id { get; set; } = string.Empty;
        public string ReviewerName { get; set; } = string.Empty;
        public string ReviewerEmail { get; set; } = string.Empty;
        public string? ReviewerAvatar { get; set; }
        public string GiftBoxId { get; set; } = string.Empty;
        public string GiftBoxName { get; set; } = string.Empty;
        public string? GiftBoxImage { get; set; }
        public int Rating { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string StatusLabel { get; set; } = string.Empty;
    }

    public class ReviewDetailDTO
    {
        public string Id { get; set; } = string.Empty;
        public string ReviewerName { get; set; } = string.Empty;
        public string ReviewerEmail { get; set; } = string.Empty;
        public string? ReviewerAvatar { get; set; }
        public string? OrderCode { get; set; }
        public string GiftBoxId { get; set; } = string.Empty;
        public string GiftBoxName { get; set; } = string.Empty;
        public string? GiftBoxImage { get; set; }
        public int Rating { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class ReviewListResponseDTO
    {
        public List<ReviewListItemDTO> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }

    // ========== CHAT DTOs ==========
    public class ChatSessionDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? OrderCode { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<ChatMessageDto> Messages { get; set; } = new();
    }

    public class ChatMessageDto
    {
        public string Id { get; set; } = string.Empty;
        public string Sender { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class StartChatDto
    {
        [Required] [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? OrderCode { get; set; }
    }

    public class SendMessageDto
    {
        [Required]
        public string Message { get; set; } = string.Empty;
    }

    public class PriceBreakdownDto
    {
        public decimal SubTotal { get; set; }
        public decimal Discount { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal Total { get; set; }
    }

    // ========== SEPAY WEBHOOK DTOs ==========
    public class SePayWebhookDto
    {
        [JsonPropertyName("id")] public int Id { get; set; }
        [JsonPropertyName("gateway")] public string Gateway { get; set; } = string.Empty;
        [JsonPropertyName("transactionDate")] public string TransactionDate { get; set; } = string.Empty;
        [JsonPropertyName("accountNumber")] public string AccountNumber { get; set; } = string.Empty;
        [JsonPropertyName("code")] public string? Code { get; set; }

        /// Nội dung chuyển khoản — chứa mã đơn hàng (VD: "SHT2602261234")
        [JsonPropertyName("content")] public string? Content { get; set; }

        [JsonPropertyName("transferAmount")] public decimal TransferAmount { get; set; }
        [JsonPropertyName("accumulated")] public decimal Accumulated { get; set; }
        [JsonPropertyName("subAccount")] public string? SubAccount { get; set; }
        [JsonPropertyName("referenceCode")] public string? ReferenceCode { get; set; }

        /// "in" = tiền vào, "out" = tiền ra
        [JsonPropertyName("transferType")] public string TransferType { get; set; } = string.Empty;

        [JsonPropertyName("description")] public string? Description { get; set; }
    }

    public class PaymentStatusResponseDto
    {
        public string OrderCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public bool IsPaid { get; set; }
        public int SecondsRemaining { get; set; }  // Số giây còn lại trong cửa sổ 10 phút
    }

    // ========== GIFTBOX ADMIN DTOs ==========
    public class CreateGiftBoxDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal? PriceOverride { get; set; }
        public List<string> Images { get; set; } = new();

        [Required]
        public string CollectionId { get; set; } = string.Empty;

        public List<string> Tags { get; set; } = new();

        [Required] [MinLength(1)]
        public List<GiftBoxItemDto> Items { get; set; } = new();
    }

    public class UpdateGiftBoxDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public decimal? PriceOverride { get; set; }
        public List<string>? Images { get; set; }
        public string? CollectionId { get; set; }
        public List<string>? Tags { get; set; }
        public List<GiftBoxItemDto>? Items { get; set; }
        public bool? IsActive { get; set; }
    }

    public class CalculateGiftBoxPriceDto
    {
        [Required]
        public string CollectionId { get; set; } = string.Empty;

        [Required] [MinLength(1)]
        public List<GiftBoxItemDto> Items { get; set; } = new();
    }

    public class UpdateDeliveryStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty; // SHIPPING, DELIVERED, FAILED

        public string? FailureReason { get; set; }
    }

    public class PagedResult<T>
    {
        public List<T> Data { get; set; } = new List<T>();
        public int TotalItems { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class GiftBoxListResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string CollectionId { get; set; } = string.Empty;
        public string CollectionName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool Status { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public string? Thumbnail { get; set; }
        public List<string> TagNames { get; set; } = new();
        public int ItemCount { get; set; }
    }

    public class GiftBoxDetailResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string CollectionId { get; set; } = string.Empty;
        public string CollectionName { get; set; } = string.Empty;
        public List<string> Images { get; set; } = new();
        public List<TagReferenceDto> Tags { get; set; } = new();
        public List<GiftBoxItemDetailDto> Items { get; set; } = new();
        public bool IsActive { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
    }

    public class TagReferenceDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    public class GiftBoxItemDetailDto
    {
        public string ItemId { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
    }

    public class GiftBoxCreateDTO
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }

        [Required]
        public string CollectionId { get; set; } = string.Empty;

        public List<string> Images { get; set; } = new();
        public List<string> TagIds { get; set; } = new();

        [Required] [MinLength(1)]
        public List<CustomBoxItemDto> Items { get; set; } = new();

        public bool IsActive { get; set; } = true;
    }

    public class GiftBoxUpdateDTO
    {
        [Required] public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }

        [Required] public string CollectionId { get; set; } = string.Empty;

        public List<string>? Images { get; set; }
        public List<string>? TagIds { get; set; }
        public List<CustomBoxItemDto>? Items { get; set; }
        public bool IsActive { get; set; }
    }

    public class GiftBoxStatusDTO
    {
        public bool IsActive { get; set; }
    }

    public class SimpleCollectionDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }

    public class SimpleItemDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
    }

    public class SimpleTagDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    // ========== INVENTORY DTOs ==========
    public class InventoryItemResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string CategoryLabel { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public string StockStatus { get; set; } = string.Empty;
        public string StockStatusLabel { get; set; } = string.Empty;
        public bool IsAlcohol { get; set; }
        public DateTime? LastUpdated { get; set; }
    }

    public class InventoryItemDetailDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string CategoryLabel { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public string StockStatus { get; set; } = string.Empty;
        public string StockStatusLabel { get; set; } = string.Empty;
        public bool IsAlcohol { get; set; }
        public List<InventoryLogDTO> RecentLogs { get; set; } = new();
    }

    public class InventoryLogDTO
    {
        public string Id { get; set; } = string.Empty;
        public string ItemId { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string ChangeType { get; set; } = string.Empty;
        public string ChangeTypeLabel { get; set; } = string.Empty;
        public int QuantityChange { get; set; }
        public int PreviousStock { get; set; }
        public int NewStock { get; set; }
        public string Source { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class InventoryAdjustRequestDTO
    {
        [Required] public string ItemId { get; set; } = string.Empty;
        [Required] public string AdjustType { get; set; } = string.Empty; // INCREASE | DECREASE
        [Required] [Range(1, int.MaxValue)] public int Quantity { get; set; }
        public string? Reason { get; set; }
    }

    public class InventorySummaryDTO
    {
        public int TotalItems { get; set; }
        public int InStock { get; set; }
        public int LowStock { get; set; }
        public int OutOfStock { get; set; }
    }

    // ========== REPORT DTOs ==========
    public class DashboardReportDTO
    {
        public decimal TotalRevenue { get; set; }
        public double RevenueGrowthPercent { get; set; }
        public int TotalOrders { get; set; }
        public double OrderGrowthPercent { get; set; }
        public double B2CPercent { get; set; }
        public double B2BPercent { get; set; }
        public ReportStatusSummaryDTO StatusSummary { get; set; } = new();
    }

    public class ReportStatusSummaryDTO
    {
        public int PendingPayment { get; set; }
        public int Preparing { get; set; }
        public int Shipping { get; set; }
        public int Completed { get; set; }
        public int Cancelled { get; set; }
        public int DeliveryFailed { get; set; }
    }

    public class RevenueReportChartItemDTO
    {
        public string Date { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
        public decimal LastYearRevenue { get; set; }
    }

    public class RevenueReportDTO
    {
        public decimal TotalRevenue { get; set; }
        public double GrowthPercent { get; set; }
        public (string Date, decimal Revenue) BestDay { get; set; }
        public double B2CPercent { get; set; }
        public double B2BPercent { get; set; }
        public List<RevenueReportChartItemDTO> Chart { get; set; } = new();
    }

    public class CollectionPerformanceItemDTO
    {
        public int Rank { get; set; }
        public string CollectionId { get; set; } = string.Empty;
        public string CollectionName { get; set; } = string.Empty;
        public int Orders { get; set; }
        public decimal Revenue { get; set; }
        public double Percent { get; set; }
        public string? Thumbnail { get; set; }
    }

    public class GiftBoxPerformanceItemDTO
    {
        public string GiftBoxId { get; set; } = string.Empty;
        public string GiftBoxName { get; set; } = string.Empty;
        public int SoldQuantity { get; set; }
        public decimal Revenue { get; set; }
        public double AvgRating { get; set; }
        public string? Image { get; set; }
        public string? TopProduct { get; set; }
        public string? MarketingSuggestions { get; set; }
    }

    public class B2cB2bComparisonDTO
    {
        public decimal B2CRevenue { get; set; }
        public int B2COrders { get; set; }
        public decimal B2CAvgOrderValue { get; set; }
        public decimal B2BRevenue { get; set; }
        public int B2BOrders { get; set; }
        public int TotalGiftBoxes { get; set; }
        public List<B2cB2bMonthlyDTO> MonthlyOrdersChart { get; set; } = new();
    }

    public class B2cB2bMonthlyDTO
    {
        public string Month { get; set; } = string.Empty;
        public int B2COrders { get; set; }
        public int B2BOrders { get; set; }
    }

    public class InventoryAlertItemDTO
    {
        public string ItemId { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public int Stock { get; set; }
        public int Threshold { get; set; }
    }
}
