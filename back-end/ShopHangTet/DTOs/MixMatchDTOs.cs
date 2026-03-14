using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.DTOs
{
    public class MixMatchItemResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string CategoryLabel { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsAlcohol { get; set; }
        public int StockQuantity { get; set; }
        public string StockStatus { get; set; } = string.Empty;
        public string StockStatusLabel { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
    }

    public class MixMatchCreateDTO
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public decimal Price { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        public string? Image { get; set; }

        public bool IsAlcohol { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class MixMatchUpdateDTO
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public decimal Price { get; set; }

        [Required]
        public string Category { get; set; } = string.Empty;

        public string? Image { get; set; }

        public bool IsAlcohol { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class MixMatchRuleDTO
    {
        public int MinItems { get; set; } = 4;
        public int MaxItems { get; set; } = 6;
    }

    public class CreateCustomBoxDTO
    {
        [Required]
        public List<CustomBoxItemDTO> Items { get; set; } = new();
    }

    public class CustomBoxItemDTO
    {
        [Required]
        public string ItemId { get; set; } = string.Empty;

        [Range(1, 6)]
        public int Quantity { get; set; }
    }

    public class CustomBoxItemResponseDTO
    {
        public string ItemId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public decimal Subtotal { get; set; }
    }

    public class CustomBoxResponseDTO
    {
        public string Id { get; set; } = string.Empty;
        public List<CustomBoxItemResponseDTO> Items { get; set; } = new();
        public int TotalItems { get; set; }
        public decimal TotalPrice { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
