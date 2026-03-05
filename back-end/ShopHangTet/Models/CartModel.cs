using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ShopHangTet.Models
{
    /// Cart Model - Giỏ hàng (Guest & Member)
    public class Cart
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("userId")]
        public string? UserId { get; set; } // Nullable for Guest

        [BsonElement("sessionId")]
        public string? SessionId { get; set; } // For Guest checkout

        [BsonElement("items")]
        public List<CartItem> Items { get; set; } = new();

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CartItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        public string CartId { get; set; } = string.Empty;

        [BsonElement("userId")]
        public string? UserId { get; set; } 

        [BsonElement("sessionId")]
        public string? SessionId { get; set; }

        [BsonElement("type")]
        public OrderItemType Type { get; set; } = OrderItemType.READY_MADE; // READY_MADE, MIX_MATCH

        [BsonElement("giftBoxId")]
        public string? GiftBoxId { get; set; }

        [BsonElement("customBoxId")]
        public string? CustomBoxId { get; set; }

        [BsonElement("quantity")]
        public int Quantity { get; set; }

        [BsonElement("unitPrice")]
        public decimal UnitPrice { get; set; }

        [BsonElement("addedAt")]
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}