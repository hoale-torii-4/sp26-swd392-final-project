using MongoDB.Bson;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Models;

/// <summary>
/// Ngày giao hàng (Scheduled Delivery)
/// </summary>
public class DeliverySlot
{
    [Key]
    public ObjectId Id { get; set; }
    
    public DateTime DeliveryDate { get; set; }
    
    public int MaxOrdersPerDay { get; set; } = 100; // Giới hạn số đơn trong ngày
    public int CurrentOrderCount { get; set; } = 0;
    
    public bool IsLocked { get; set; } = false; // Tự động khóa khi đạt max
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
