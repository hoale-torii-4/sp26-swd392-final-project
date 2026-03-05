using ShopHangTet.Models;

namespace ShopHangTet.DTOs
{
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
        public string? MainImage { get; set; }
        public List<string> Images { get; set; } = new();
        public string CollectionId { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GiftBoxDetailItemDto
    {
        public string ItemId { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public Item? Item { get; set; }
    }

    public class GiftBoxDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? MainImage { get; set; }
        public List<string> Images { get; set; } = new();
        public string CollectionId { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
        public List<GiftBoxDetailItemDto> Items { get; set; } = new();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}