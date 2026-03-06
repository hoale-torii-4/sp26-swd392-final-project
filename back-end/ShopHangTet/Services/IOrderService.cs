using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    /// Interface cho OrderService - quản lý đơn hàng B2C và B2B
    public interface IOrderService
    {
        // === Compliant Methods - Tách riêng B2C và B2B ===
        Task<OrderModel> PlaceB2COrderAsync(CreateOrderB2CDto dto);
        Task<OrderModel> PlaceB2BOrderAsync(CreateOrderB2BDto dto, string userId);

        // === Order Validation ===
        Task<OrderValidationResult> ValidateB2COrderAsync(CreateOrderB2CDto dto);
        Task<OrderValidationResult> ValidateB2BOrderAsync(CreateOrderB2BDto dto, string userId);

        // === Mix & Match Validation ===
        Task<MixMatchValidationResult> ValidateMixMatchRulesAsync(string customBoxId);

        // === Order Tracking ===
        Task<OrderTrackingResult?> TrackOrderAsync(string orderCode, string email);

        // === Status & Inventory ===
        Task<OrderModel> UpdateStatusAsync(string orderId, OrderStatus status, string updatedBy, string? notes = null);

        // === SePay Payment ===
        Task<bool> ConfirmPaymentAsync(string orderCode, decimal amountPaid);

        // === Order lookup ===
        Task<OrderModel?> GetOrderByCodeAsync(string orderCode);

        // === Inventory Reservation ===
        Task ReleaseInventoryReservationAsync(OrderModel order, string updatedBy);

        // === Delivery Management ===
        Task<OrderStatus> AggregateDeliveryStatusAsync(string orderId);
        Task UpdateDeliveryStatusAsync(string deliveryId, string status, string? failureReason = null);
        Task<bool> ReshipDeliveryAsync(string deliveryId);
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
        public List<OrderStatusHistoryDto> StatusHistory { get; set; } = new();
    }
}