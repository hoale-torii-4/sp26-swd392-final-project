using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    /// Interface cho OrderService - quản lý đơn hàng B2C và B2B
    public interface IOrderService
    {
        // ===Compliant Methods - Tách riêng B2C và B2B ===
        Task<OrderModel> PlaceB2COrderAsync(CreateOrderB2CDto dto);
        Task<OrderModel> PlaceB2BOrderAsync(CreateOrderB2BDto dto);
        
        // === Order Validation ===
        Task<OrderValidationResult> ValidateB2COrderAsync(CreateOrderB2CDto dto);
        Task<OrderValidationResult> ValidateB2BOrderAsync(CreateOrderB2BDto dto);
        
        // ===Mix & Match Validation ===
        Task<MixMatchValidationResult> ValidateMixMatchRulesAsync(string customBoxId);
        
        // === Order Tracking ===
        Task<OrderTrackingResult?> TrackOrderAsync(string orderCode, string email);
        Task<OrderDto?> GetOrderDetailByCodeAsync(string orderCode, string? email, string? requesterUserId, bool isStaffOrAdmin);
        Task<OrderDto?> GetOrderDetailByIdAsync(string orderId, string requesterUserId, bool isStaffOrAdmin);
        Task<bool> ConfirmReceivedByCustomerAsync(string orderCode, string email);
        Task<bool> ConfirmDeliveryReceivedByCustomerAsync(string deliveryId, string email);

        // === My Orders ===
        Task<List<MyOrderResponseDto>> GetMyOrdersAsync(string userId, int skip, int take);

        // === Status & Inventory ===
        Task<OrderModel> UpdateStatusAsync(string orderId, OrderStatus status, string updatedBy, string? notes = null);

        // === SePay Payment ===
        /// Xác nhận thanh toán từ SePay webhook - cập nhật trạng thái và trừ kho
        Task<bool> ConfirmPaymentAsync(
            string orderCode,
            decimal amountPaid,
            string paymentMethod = "SePay",
            string? transactionReference = null,
            DateTime? paymentDate = null,
            string? gateway = null);
        /// Lấy đơn hàng theo mã đơn (cho frontend polling)
        Task<OrderModel?> GetOrderByCodeAsync(string orderCode);

        // === Inventory ===
        /// Restock inventory khi cancel/expire
        Task ReleaseInventoryReservationAsync(OrderModel order, string updatedBy);

        // === Delivery Management ===
        /// Aggregate delivery statuses thành order status (B2B)
        Task<OrderStatus> AggregateDeliveryStatusAsync(string orderId);
        /// Cập nhật delivery status và tự aggregate order status
        Task UpdateDeliveryStatusAsync(string deliveryId, string status, string? failureReason = null);
        /// Reship — thử giao lại delivery đã fail
        Task<bool> ReshipDeliveryAsync(string deliveryId);

        // === Admin Orders ===
        /// Lấy danh sách tất cả đơn hàng cho Admin (có phân trang, lọc)
        Task<AdminOrderListResult> GetAllOrdersAsync(string? status, string? orderType, string? keyword, int page, int pageSize);
    }

    public class OrderValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class OrderTrackingResult
    {
        public string OrderCode { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public decimal TotalAmount { get; set; }
        public List<OrderItemResponseDto> Items { get; set; } = new();
        public List<OrderStatusHistoryDto> StatusHistory { get; set; } = new();
    }

    public class AdminOrderListResult
    {
        public List<AdminOrderListItem> Data { get; set; } = new();
        public int TotalItems { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class AdminOrderListItem
    {
        public string Id { get; set; } = string.Empty;
        public string OrderCode { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string OrderType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public int TotalItems { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? BankName { get; set; }
        public string? BankAccountNumber { get; set; }
    }

}