using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ShopHangTet.Models
{
    public class Review
    {
        [BsonId] [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderId")] public string OrderId { get; set; } = string.Empty;
        [BsonElement("giftBoxId")] public string GiftBoxId { get; set; } = string.Empty;
        [BsonElement("userId")] public string UserId { get; set; } = string.Empty;
        [BsonElement("rating")] public int Rating { get; set; }
        [BsonElement("comment")] public string Comment { get; set; } = string.Empty;
        [BsonElement("status")] public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, HIDDEN
        [BsonElement("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ChatSession
    {
        [BsonId] [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("email")] public string Email { get; set; } = string.Empty;
        [BsonElement("orderCode")] public string? OrderCode { get; set; }
        [BsonElement("status")] public string Status { get; set; } = "OPEN"; // OPEN, CLOSED
        [BsonElement("messages")] public List<ChatMessage> Messages { get; set; } = new();
        [BsonElement("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [BsonElement("updatedAt")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ChatMessage
    {
        [BsonId] [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("sender")] public string Sender { get; set; } = string.Empty; // BOT, STAFF, GUEST
        [BsonElement("senderName")] public string? SenderName { get; set; }
        [BsonElement("message")] public string Message { get; set; } = string.Empty;
        [BsonElement("timestamp")] public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class SystemConfig
    {
        [BsonId] [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("emailTemplate")] public string EmailTemplate { get; set; } = string.Empty;
        [BsonElement("smtpSettings")] public SmtpSettings SmtpSettings { get; set; } = new();
        [BsonElement("updatedAt")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class SmtpSettings
    {
        [BsonElement("host")] public string Host { get; set; } = "smtp.gmail.com";
        [BsonElement("port")] public int Port { get; set; } = 587;
        [BsonElement("username")] public string Username { get; set; } = string.Empty;
        [BsonElement("password")] public string Password { get; set; } = string.Empty;
        [BsonElement("from")] public string From { get; set; } = string.Empty;
        [BsonElement("enableSsl")] public bool EnableSsl { get; set; } = true;
    }

    public class OtpRecord
    {
        [BsonId] [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("email")] public string Email { get; set; } = string.Empty;
        [BsonElement("otpCode")] public string OtpCode { get; set; } = string.Empty;
        [BsonElement("purpose")] public string Purpose { get; set; } = string.Empty; // LOGIN, REGISTER, RESET_PASSWORD
        [BsonElement("isUsed")] public bool IsUsed { get; set; } = false;
        [BsonElement("expiryTime")] public DateTime ExpiryTime { get; set; }
        [BsonElement("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class InventoryLog
    {
        [BsonId] [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderId")] public string OrderId { get; set; } = string.Empty;
        [BsonElement("itemId")] public string ItemId { get; set; } = string.Empty;
        [BsonElement("quantity")] public int Quantity { get; set; }
        [BsonElement("action")] public string Action { get; set; } = "RESERVE"; // RESERVE, DEDUCT, RELEASE, RESTOCK
        [BsonElement("itemName")] public string? ItemName { get; set; }
        [BsonElement("sku")] public string? Sku { get; set; }
        [BsonElement("changeType")] public string? ChangeType { get; set; }
        [BsonElement("quantityChange")] public int? QuantityChange { get; set; }
        [BsonElement("previousStock")] public int? PreviousStock { get; set; }
        [BsonElement("newStock")] public int? NewStock { get; set; }
        [BsonElement("source")] public string? Source { get; set; }
        [BsonElement("reason")] public string? Reason { get; set; }
        [BsonElement("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// B2B Delivery — mỗi địa chỉ là 1 shipment, có ngày giao riêng
    public class OrderDelivery
    {
        [BsonId] [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderId")] public string OrderId { get; set; } = string.Empty;
        [BsonElement("addressId")] public string AddressId { get; set; } = string.Empty;

        /// Ngày giao riêng cho shipment này (B2B mỗi địa chỉ có thể khác nhau)
        [BsonElement("deliveryDate")] public DateTime DeliveryDate { get; set; }

        [BsonElement("status")] public string Status { get; set; } = "PENDING"; // PENDING, SHIPPING, DELIVERED, FAILED, CANCELLED
        [BsonElement("retryCount")] public int RetryCount { get; set; } = 0;
        [BsonElement("maxRetries")] public int MaxRetries { get; set; } = 3;
        [BsonElement("lastAttemptAt")] public DateTime? LastAttemptAt { get; set; }
        [BsonElement("failureReason")] public string? FailureReason { get; set; }
        [BsonElement("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class OrderDeliveryItem
    {
        [BsonId] [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("orderDeliveryId")] public string OrderDeliveryId { get; set; } = string.Empty;
        [BsonElement("orderItemId")] public string OrderItemId { get; set; } = string.Empty;
        [BsonElement("quantity")] public int Quantity { get; set; }
        [BsonElement("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
