using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ShopHangTet.Models
{
    /// Review Model - Đánh giá sản phẩm (Member only)
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

    /// Chat Session Model - Hỗ trợ khách hàng
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

    /// System Config Model - Cấu hình hệ thống
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

    /// OTP Storage Model - For email verification
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

    /// Inventory Log Model - Ghi nhận RESERVE / DEDUCT / RELEASE
    public class InventoryLog
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderId")]
        public string OrderId { get; set; } = string.Empty; // FK to Order

        [BsonElement("itemId")]
        public string ItemId { get; set; } = string.Empty; // FK to Item

        [BsonElement("quantity")]
        public int Quantity { get; set; } // Số lượng (âm cho DEDUCT/RESERVE)

        [BsonElement("action")]
        public string Action { get; set; } = "RESERVE"; // RESERVE, DEDUCT, RELEASE, RESTOCK

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// Order Delivery Model - B2B Multi-address
    public class OrderDelivery
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderId")]
        public string OrderId { get; set; } = string.Empty; // FK to Order

        [BsonElement("addressId")]
        public string AddressId { get; set; } = string.Empty; // FK to Address

        [BsonElement("status")]
        public string Status { get; set; } = "PENDING"; // PENDING, SHIPPING, DELIVERED, FAILED

        [BsonElement("retryCount")]
        public int RetryCount { get; set; } = 0; // Số lần giao lại

        [BsonElement("maxRetries")]
        public int MaxRetries { get; set; } = 3; // Số lần giao lại tối đa

        [BsonElement("lastAttemptAt")]
        public DateTime? LastAttemptAt { get; set; }

        [BsonElement("failureReason")]
        public string? FailureReason { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// Order Delivery Item Model - Phân bổ OrderItem theo địa chỉ (B2B)
    public class OrderDeliveryItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderDeliveryId")]
        public string OrderDeliveryId { get; set; } = string.Empty; // FK to OrderDelivery

        [BsonElement("orderItemId")]
        public string OrderItemId { get; set; } = string.Empty; // FK to OrderItem

        [BsonElement("quantity")]
        public int Quantity { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}