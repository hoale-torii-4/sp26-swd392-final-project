using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    public interface IOrderService
    {
        // ── Đặt hàng ────────────────────────────────────────────────────────
        Task<OrderModel> PlaceB2COrderAsync(CreateOrderB2CDto dto);
        Task<OrderModel> PlaceB2BOrderAsync(CreateOrderB2BDto dto);

        // ── Validation ───────────────────────────────────────────────────────
        Task<OrderValidationResult> ValidateB2COrderAsync(CreateOrderB2CDto dto);
        Task<OrderValidationResult> ValidateB2BOrderAsync(CreateOrderB2BDto dto);
        Task<MixMatchValidationResult> ValidateMixMatchRulesAsync(string customBoxId);

        // ── Tra cứu đơn ─────────────────────────────────────────────────────
        Task<OrderTrackingResult?> TrackOrderAsync(string orderCode, string email);
        Task<OrderDto?> GetOrderDetailByCodeAsync(string orderCode, string? email, string? requesterUserId, bool isStaffOrAdmin);
        Task<OrderDto?> GetOrderDetailByIdAsync(string orderId, string requesterUserId, bool isStaffOrAdmin);
        Task<bool> ConfirmReceivedByCustomerAsync(string orderCode, string email);
        Task<bool> ConfirmDeliveryReceivedByCustomerAsync(string deliveryId, string email);

        // ── My Orders (Member) ───────────────────────────────────────────────
        /// <param name="statusFilter">null = tất cả, hoặc tên enum VD: "PREPARING"</param>
        Task<List<MyOrderResponseDto>> GetMyOrdersAsync(string userId, int skip, int take, string? statusFilter = null);

        // ── Staff Order List ─────────────────────────────────────────────────
        /// Lấy danh sách đơn cho Staff dashboard với filter và phân trang
        Task<StaffOrderListResponseDto> GetStaffOrdersAsync(
            int page, int pageSize,
            string? statusFilter,
            string? typeFilter,
            string? search);

        // ── Cập nhật trạng thái ──────────────────────────────────────────────
        Task<OrderModel> UpdateStatusAsync(string orderId, OrderStatus status, string updatedBy, string? notes = null);

        // ── Thanh toán ───────────────────────────────────────────────────────
        /// Xác nhận thanh toán từ SePay webhook (tự động)
        Task<bool> ConfirmPaymentAsync(
            string orderCode,
            decimal amountPaid,
            string? transactionReference = null,
            string? paymentGateway = null,
            string? rawWebhookData = null);

        /// Xác nhận thanh toán thủ công bởi Staff
        Task<bool> StaffConfirmPaymentAsync(string orderId, string staffName);

        /// Lấy đơn theo mã (cho frontend polling check-status)
        Task<OrderModel?> GetOrderByCodeAsync(string orderCode);

        // ── Inventory ────────────────────────────────────────────────────────
        /// Release reserved inventory khi cancel / expire
        Task ReleaseInventoryReservationAsync(OrderModel order, string updatedBy);

        // ── Delivery (B2B) ───────────────────────────────────────────────────
        Task<OrderStatus> AggregateDeliveryStatusAsync(string orderId);
        Task UpdateDeliveryStatusAsync(string deliveryId, string status, string? failureReason = null);
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
        public string StatusLabel { get; set; } = string.Empty;
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
    }
}