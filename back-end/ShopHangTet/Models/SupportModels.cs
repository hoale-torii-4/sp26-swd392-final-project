using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ShopHangTet.Models
{
    /// <summary>
    /// Review Model - Đánh giá sản phẩm (Member only)
    /// </summary>
    public class Review
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderId")]
        public string OrderId { get; set; } = string.Empty;

        [BsonElement("giftBoxId")]
        public string GiftBoxId { get; set; } = string.Empty;

        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("rating")]
        public int Rating { get; set; } // 1-5

        [BsonElement("comment")]
        public string Comment { get; set; } = string.Empty;

        [BsonElement("status")]
        public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, HIDDEN

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Chat Session Model - Hỗ trợ khách hàng
    /// </summary>
    public class ChatSession
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("orderCode")]
        public string? OrderCode { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "OPEN"; // OPEN, CLOSED

        [BsonElement("messages")]
        public List<ChatMessage> Messages { get; set; } = new();

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ChatMessage
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("sender")]
        public string Sender { get; set; } = string.Empty; // BOT, STAFF, GUEST

        [BsonElement("senderName")]
        public string? SenderName { get; set; }

        [BsonElement("message")]
        public string Message { get; set; } = string.Empty;

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// System Config Model - Cấu hình hệ thống
    /// </summary>
    public class SystemConfig
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("deliverySlotLimit")]
        public int DeliverySlotLimit { get; set; } = 50;

        [BsonElement("emailTemplate")]
        public string EmailTemplate { get; set; } = string.Empty;

        [BsonElement("smtpSettings")]
        public SmtpSettings SmtpSettings { get; set; } = new();

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class SmtpSettings
    {
        [BsonElement("host")]
        public string Host { get; set; } = "smtp.gmail.com";

        [BsonElement("port")]
        public int Port { get; set; } = 587;

        [BsonElement("username")]
        public string Username { get; set; } = string.Empty;

        [BsonElement("password")]
        public string Password { get; set; } = string.Empty;

        [BsonElement("from")]
        public string From { get; set; } = string.Empty;

        [BsonElement("enableSsl")]
        public bool EnableSsl { get; set; } = true;
    }

    /// <summary>
    /// OTP Storage Model - For email verification
    /// </summary>
    public class OtpRecord
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("otpCode")]
        public string OtpCode { get; set; } = string.Empty;

        [BsonElement("purpose")]
        public string Purpose { get; set; } = string.Empty; // LOGIN, REGISTER, RESET_PASSWORD

        [BsonElement("isUsed")]
        public bool IsUsed { get; set; } = false;

        [BsonElement("expiryTime")]
        public DateTime ExpiryTime { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Order Delivery - Theo dõi giao hàng từng địa chỉ
    /// </summary>
    public class OrderDelivery
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderId")]
        public string OrderId { get; set; } = string.Empty;

        [BsonElement("addressIndex")]
        public int AddressIndex { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "PENDING"; // PENDING, SHIPPED, DELIVERED

        [BsonElement("shippedAt")]
        public DateTime? ShippedAt { get; set; }

        [BsonElement("deliveredAt")]
        public DateTime? DeliveredAt { get; set; }

        [BsonElement("trackingNumber")]
        public string? TrackingNumber { get; set; }

        [BsonElement("notes")]
        public string Notes { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Order Delivery Item - Sản phẩm theo từng địa chỉ giao hàng (B2B)
    /// </summary>
    public class OrderDeliveryItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderDeliveryId")]
        public string OrderDeliveryId { get; set; } = string.Empty;

        [BsonElement("orderItemId")]
        public string OrderItemId { get; set; } = string.Empty;

        [BsonElement("quantity")]
        public int Quantity { get; set; }
    }

    /// <summary>
    /// Inventory Log - Lịch sử thay đổi tồn kho
    /// </summary>
    public class InventoryLog
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("productId")]
        public string ProductId { get; set; } = string.Empty;

        [BsonElement("productType")]
        public string ProductType { get; set; } = string.Empty; // ITEM, GIFTBOX

        [BsonElement("changeType")]
        public string ChangeType { get; set; } = string.Empty; // ORDER, RESTOCK, ADJUSTMENT

        [BsonElement("quantity")]
        public int Quantity { get; set; }

        [BsonElement("previousStock")]
        public int PreviousStock { get; set; }

        [BsonElement("newStock")]
        public int NewStock { get; set; }

        [BsonElement("orderId")]
        public string? OrderId { get; set; }

        [BsonElement("updatedBy")]
        public string UpdatedBy { get; set; } = string.Empty;

        [BsonElement("notes")]
        public string Notes { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}