using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    /// Interface cho OrderService - quản lý đơn hàng B2C và B2B
    public interface IOrderService
    {
        // === Order Placement (B2C/B2B separated) ===
        Task<OrderModel> PlaceB2COrderAsync(CreateOrderDto dto);
        Task<OrderModel> PlaceB2BOrderAsync(CreateOrderDto dto);
        
        // === Order Validation ===
        Task<OrderValidationResult> ValidateB2COrderAsync(CreateOrderDto dto);
        Task<OrderValidationResult> ValidateB2BOrderAsync(CreateOrderDto dto);
        
        // === Order Tracking ===
        Task<OrderTrackingResult?> TrackOrderAsync(string orderCode, string email);

        // === Status & Inventory ===
        Task<OrderModel> UpdateStatusAsync(string orderId, OrderStatus status, string updatedBy, string? notes = null);
    }

    /// DTO tạo đơn hàng (dùng trong OrderService)
    public class CreateOrderDto
    {
        public string? UserId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        
        public List<OrderItemRequestDto> Items { get; set; } = new();
        public List<DeliveryAddressRequestDto> DeliveryAddresses { get; set; } = new();
        
        public DateTime DeliveryDate { get; set; }
        public string? DeliverySlotId { get; set; }
        public string? GreetingMessage { get; set; }
        public string? GreetingCardUrl { get; set; }
    }

    public class OrderItemRequestDto
    {
        public OrderItemType Type { get; set; } = OrderItemType.READY_MADE;
        public string? GiftBoxId { get; set; }
        public string? CustomBoxId { get; set; }
        public int Quantity { get; set; }
    }

    public class DeliveryAddressRequestDto
    {
        public string? AddressId { get; set; }
        public string RecipientName { get; set; } = string.Empty;
        public string RecipientPhone { get; set; } = string.Empty;
        public string AddressLine { get; set; } = string.Empty;
        public string Ward { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string GreetingMessage { get; set; } = string.Empty;
        public bool HideInvoice { get; set; }
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
