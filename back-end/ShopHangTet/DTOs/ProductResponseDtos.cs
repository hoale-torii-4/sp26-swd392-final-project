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

    public class GiftBoxItemFlatDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? Image { get; set; }
        public int Quantity { get; set; }
    }

    public class GiftBoxFlatDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public string? Image { get; set; }
        public string Collection { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new();
        public List<GiftBoxItemFlatDto> Items { get; set; } = new();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GiftBoxDetailDto : GiftBoxFlatDto
    {
        public List<string> Images { get; set; } = new();
    }

    public class GiftBoxListDto : GiftBoxFlatDto
    {
    }
}