using ShopHangTet.Models;

namespace ShopHangTet.DTOs;

public class MyOrderItemDto
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public OrderItemType Type { get; set; }
}

public class MyOrderResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderCode { get; set; } = string.Empty;
    public OrderType OrderType { get; set; }
    public OrderStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public int TotalItems { get; set; }
    public List<MyOrderItemDto> Items { get; set; } = new();
}
