using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace ShopHangTet.Services;

public class InternalUserService
{
    private readonly ShopHangTetDbContext _context;

    public InternalUserService(ShopHangTetDbContext context)
    {
        _context = context;
    }

    private static string RoleLabel(UserRole role)
    {
        return role switch
        {
            UserRole.ADMIN => "Admin",
            UserRole.STAFF => "Staff",
            _ => role.ToString()
        };
    }

    private static string StatusLabel(bool isActive)
    {
        return isActive ? "Đang hoạt động" : "Bị vô hiệu";
    }

    // Simple PBKDF2 password hashing. Stored format: iterations.salt.hash (base64)
    private static string HashPassword(string password)
    {
        var iterations = 10000;
        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[16];
        rng.GetBytes(salt);
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(32);
        return $"{iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private static string NormalizeSearch(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var ch in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(ch == 'đ' ? 'd' : ch == 'Đ' ? 'D' : ch);
            }
        }
        return builder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    public async Task<InternalUserListResponseDTO> GetInternalUsersAsync(string? search, string? role, string? status, int page, int pageSize)
    {
        var query = _context.Users.AsQueryable();

        // Only internal accounts
        query = query.Where(u => u.Role == UserRole.ADMIN || u.Role == UserRole.STAFF);

        var normalizedSearch = NormalizeSearch(search ?? string.Empty);

        if (!string.IsNullOrWhiteSpace(role))
        {
            if (Enum.TryParse<UserRole>(role, out var r))
            {
                query = query.Where(u => u.Role == r);
            }
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status.Equals("active", StringComparison.OrdinalIgnoreCase))
                query = query.Where(u => u.Status == UserStatus.ACTIVE);
            else if (status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
                query = query.Where(u => u.Status != UserStatus.ACTIVE);
        }

        var users = await query
            .OrderBy(u => u.FullName)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            users = users.Where(u => NormalizeSearch(u.FullName).Contains(normalizedSearch)
                || NormalizeSearch(u.Email).Contains(normalizedSearch))
                .ToList();
        }

        var total = users.Count;

        users = users
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var dtoList = users.Select(u => new InternalUserResponseDTO
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            Role = u.Role.ToString(),
            RoleLabel = RoleLabel(u.Role),
            IsActive = u.Status == UserStatus.ACTIVE,
            StatusLabel = StatusLabel(u.Status == UserStatus.ACTIVE),
            CreatedAt = u.CreatedAt
        }).ToList();

        return new InternalUserListResponseDTO
        {
            Users = dtoList,
            Page = page,
            PageSize = pageSize,
            TotalItems = total
        };
    }

    public async Task<InternalUserResponseDTO?> GetInternalUserByIdAsync(string id)
    {
        var u = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && (x.Role == UserRole.ADMIN || x.Role == UserRole.STAFF));
        if (u == null) return null;

        return new InternalUserResponseDTO
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            Role = u.Role.ToString(),
            RoleLabel = RoleLabel(u.Role),
            IsActive = u.Status == UserStatus.ACTIVE,
            StatusLabel = StatusLabel(u.Status == UserStatus.ACTIVE),
            CreatedAt = u.CreatedAt
        };
    }

    public async Task<string> CreateInternalUserAsync(CreateInternalUserDTO dto)
    {
        // Validate role
        if (!Enum.TryParse<UserRole>(dto.Role, out var role) || (role != UserRole.ADMIN && role != UserRole.STAFF))
            throw new InvalidOperationException("Role must be ADMIN or STAFF");

        // Unique email
        var exists = await _context.Users.AnyAsync(u => u.Email == dto.Email);
        if (exists) throw new InvalidOperationException("Email already in use");

        var user = new UserModel
        {
            FullName = dto.FullName,
            Email = dto.Email,
            PasswordHash = HashPassword(dto.Password),
            Role = role,
            Status = UserStatus.ACTIVE,
            IsEmailVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
        return user.Id;
    }

    public async Task UpdateInternalUserAsync(string id, UpdateInternalUserDTO dto)
    {
        var u = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && (x.Role == UserRole.ADMIN || x.Role == UserRole.STAFF));
        if (u == null) throw new InvalidOperationException("User not found");

        if (!Enum.TryParse<UserRole>(dto.Role, out var role) || (role != UserRole.ADMIN && role != UserRole.STAFF))
            throw new InvalidOperationException("Role must be ADMIN or STAFF");

        u.FullName = dto.FullName;
        u.Role = role;
        u.Status = dto.IsActive ? UserStatus.ACTIVE : UserStatus.DISABLED;
        u.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(u);
        await _context.SaveChangesAsync();
    }

    public async Task ToggleUserStatusAsync(string id, bool isActive)
    {
        var u = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && (x.Role == UserRole.ADMIN || x.Role == UserRole.STAFF));
        if (u == null) throw new InvalidOperationException("User not found");

        u.Status = isActive ? UserStatus.ACTIVE : UserStatus.DISABLED;
        u.UpdatedAt = DateTime.UtcNow;
        _context.Users.Update(u);
        await _context.SaveChangesAsync();
    }
}
