using MongoDB.Bson;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Models;

public class Order
{
    [Key]
    public ObjectId Id { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime OrderDate { get; set; }
    public List<Product> Products { get; set; } = new();
}