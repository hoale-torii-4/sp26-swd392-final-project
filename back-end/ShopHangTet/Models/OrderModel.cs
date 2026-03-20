using MongoDB.Bson;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Models;

/// Đơn hàng (Hỗ trợ Guest & Authenticated, Multi-address)
public class OrderModel
{
    [Key]
    public ObjectId Id { get; set; }

    // Order Code for tracking
    public string OrderCode { get; set; } = string.Empty;

    // Order type: B2C or B2B
    public OrderType OrderType { get; set; } = OrderType.B2C;

    // Thông tin khách hàng
    public ObjectId? UserId { get; set; } // Null nếu Guest checkout
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;

    // Danh sách sản phẩm (READY_MADE hoặc MIX_MATCH)
    public List<OrderItem> Items { get; set; } = new();

    // CHỈ dùng cho B2C
    public DeliveryAddress? DeliveryAddress { get; set; }

    // Scheduled delivery
    public DateTime DeliveryDate { get; set; }
    public string? GreetingMessage { get; set; }
    public string? GreetingCardUrl { get; set; }

    // Pricing
    public decimal SubTotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal TotalAmount { get; set; }

    // Order status
    public OrderStatus Status { get; set; } = OrderStatus.PAYMENT_CONFIRMING;

    // ── Inventory & Payment Guard ───────────────────────────────────────────
    public bool IsInventoryDeducted { get; set; } = false;

    public string? PaymentMethod { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? TransactionReference { get; set; }
    // Tracking
    public List<OrderStatusHistory> StatusHistory { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class OrderItem
{
    [Key]
    public ObjectId Id { get; set; } = ObjectId.GenerateNewId();

    public string ProductName { get; set; } = string.Empty;
    public OrderItemType Type { get; set; } = OrderItemType.READY_MADE; // READY_MADE | MIX_MATCH
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public List<OrderItemSnapshotItem> SnapshotItems { get; set; } = new();

    // READY_MADE -> GiftBoxId, MIX_MATCH -> CustomBoxId
    public ObjectId? GiftBoxId { get; set; }
    public ObjectId? CustomBoxId { get; set; }
}

public class OrderItemSnapshotItem
{
    public string ItemId { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class DeliveryAddress
{
    public string? AddressId { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public int Quantity { get; set; }

    // Gifting options per address
    public string GreetingMessage { get; set; } = string.Empty;
    public bool HideInvoice { get; set; } = false;
}

public class OrderStatusHistory
{
    public OrderStatus Status { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string UpdatedBy { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}