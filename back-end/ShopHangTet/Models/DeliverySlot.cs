using MongoDB.Bson;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Models;

/// <summary>
/// Slot giao hàng theo ngày (Scheduled Delivery + Slot Locking)
/// </summary>
public class DeliverySlot
{
    [Key]
    public ObjectId Id { get; set; }
    
    public DateTime DeliveryDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty; // "8AM-12PM", "1PM-5PM", "6PM-9PM"
    
    public int MaxOrdersPerSlot { get; set; } = 50; // Giới hạn số đơn
    public int CurrentOrderCount { get; set; } = 0;
    
    public bool IsLocked { get; set; } = false; // Tự động khóa khi đạt max
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
