using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ShopHangTet.Models
{
    /// Collection Model - Bộ sưu tập quà Tết
    public class Collection
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("description")]
        public string Description { get; set; } = string.Empty;

        [BsonElement("coverImage")]
        public string? CoverImage { get; set; } // Ảnh đại diện collection

        [BsonElement("pricingMultiplier")]
        public decimal PricingMultiplier { get; set; } = 1.35m; // Hệ số nhân giá (default: thường)

        [BsonElement("packagingFee")]
        public decimal PackagingFee { get; set; } = 150000m; // Phí đóng gói (default: thường)

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("displayOrder")]
        public int DisplayOrder { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// Tag Model - Thẻ phân loại ý nghĩa quà tặng
    public class Tag
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty; // "Biếu sếp", "Tài lộc", "Gia đình"

        [BsonElement("type")]
        public string Type { get; set; } = string.Empty; // MEANING, RECIPIENT, OCCASION

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// Gift Box Model - Hộp quà có sẵn
    public class GiftBox
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("description")]
        public string Description { get; set; } = string.Empty;

        [BsonElement("price")]
        public decimal Price { get; set; }

        [BsonElement("images")]
        public List<string> Images { get; set; } = new();

        [BsonElement("collectionId")]
        public string CollectionId { get; set; } = string.Empty;

        [BsonElement("tags")]
        public List<string> Tags { get; set; } = new(); // Tag IDs

        [BsonElement("items")]
        public List<GiftBoxItem> Items { get; set; } = new();

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class GiftBoxItem
    {
        [BsonElement("itemId")]
        public string ItemId { get; set; } = string.Empty;

        [BsonElement("quantity")]
        public int Quantity { get; set; }

        [BsonElement("itemPriceSnapshot")]
        public decimal ItemPriceSnapshot { get; set; }
    }

    /// Item Model - Thành phần Mix & Match
    public class Item
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("category")]
        public ItemCategory Category { get; set; } // Enum: DRINK, FOOD, NUT, ALCOHOL

        [BsonElement("price")]
        public decimal Price { get; set; }

        [BsonElement("images")]
        public List<string> Images { get; set; } = new();

        [BsonElement("isAlcohol")]
        public bool IsAlcohol { get; set; } = false;

        [BsonElement("stockQuantity")]
        public int StockQuantity { get; set; }

        [BsonElement("reservedQuantity")]
        public int ReservedQuantity { get; set; } = 0;

        /// Available = StockQuantity - ReservedQuantity
        public int AvailableQuantity => StockQuantity - ReservedQuantity;

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    /// Custom Box Model - Hộp quà Mix & Match
    public class CustomBox
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("items")]
        public List<CustomBoxItem> Items { get; set; } = new();

        [BsonElement("totalPrice")]
        public decimal TotalPrice { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CustomBoxItem
    {
        [BsonElement("itemId")]
        public string ItemId { get; set; } = string.Empty;

        [BsonElement("quantity")]
        public int Quantity { get; set; }
    }
}