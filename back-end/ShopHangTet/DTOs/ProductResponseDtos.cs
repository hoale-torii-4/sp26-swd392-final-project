using ShopHangTet.Models;

namespace ShopHangTet.DTOs
{
    public class CollectionSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? CoverImage { get; set; }
    }

    public class TagSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    public class CollectionListDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? CoverImage { get; set; }
        public decimal PricingMultiplier { get; set; }
        public decimal PackagingFee { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int GiftBoxCount { get; set; }
    }

    public class CollectionDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? CoverImage { get; set; }
        public decimal PricingMultiplier { get; set; }
        public decimal PackagingFee { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<GiftBoxListDto> GiftBoxes { get; set; } = new();
    }

    public class GiftBoxListDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? Image { get; set; }
        public string CollectionId { get; set; } = string.Empty;
        public string CollectionName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GiftBoxDetailItemDto
    {
        public string ItemId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal PriceSnapshot { get; set; }
        public List<string> Images { get; set; } = new();
    }

    public class GiftBoxDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public List<string> Images { get; set; } = new();
        public CollectionSummaryDto? Collection { get; set; }
        public List<TagSummaryDto> Tags { get; set; } = new();
        public List<GiftBoxDetailItemDto> Items { get; set; } = new();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}