using MongoDB.Bson;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Models;

public class User
{
    [Key]
    public ObjectId Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}