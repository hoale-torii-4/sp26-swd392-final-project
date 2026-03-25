using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Models;

/// <summary>
/// User Model - MongoDB Document for Authentication & Profile
/// </summary>
public class UserModel
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    
    [BsonElement("email")]
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;
    
    [BsonElement("fullName")]
    public string FullName { get; set; } = string.Empty;
    
    [BsonElement("phone")]
    public string? Phone { get; set; } = string.Empty;
    
    [BsonElement("bankName")]
    public string? BankName { get; set; } = string.Empty;
    
    [BsonElement("bankAccountNumber")]
    public string? BankAccountNumber { get; set; } = string.Empty;
    
    [BsonElement("role")]
    public UserRole Role { get; set; } = UserRole.MEMBER;
    
    [BsonElement("status")]
    public UserStatus Status { get; set; } = UserStatus.ACTIVE;
    
    // OTP verification
    [BsonElement("otpCode")]
    public string? OtpCode { get; set; }
    
    [BsonElement("otpExpiry")]
    public DateTime? OtpExpiry { get; set; }
    
    [BsonElement("isEmailVerified")]
    public bool IsEmailVerified { get; set; } = false;
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Address Model - MongoDB Document for User Addresses (B2B Support)
/// </summary>
public class Address
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();
    
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;
    
    [BsonElement("receiverName")]
    public string ReceiverName { get; set; } = string.Empty;
    
    [BsonElement("receiverPhone")]
    public string ReceiverPhone { get; set; } = string.Empty;
    
    [BsonElement("fullAddress")]
    public string FullAddress { get; set; } = string.Empty;
    
    [BsonElement("isDefault")]
    public bool IsDefault { get; set; } = false;
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
