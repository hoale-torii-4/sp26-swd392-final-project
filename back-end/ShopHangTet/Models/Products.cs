using MongoDB.Bson;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Models;

public class Product
{
    [Key]
    public ObjectId Id { get; set; } // MongoDB dùng ObjectId
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Meaning { get; set; } = string.Empty;
    public bool IsComponent { get; set; }
}