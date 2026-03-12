using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.Models;
using System.Security.Claims;

namespace ShopHangTet.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AddressController : ControllerBase
{
    private readonly ShopHangTetDbContext _context;

    public AddressController(ShopHangTetDbContext context)
    {
        _context = context;
    }

    // GET /api/Address — Lấy tất cả địa chỉ của user đang đăng nhập
    [HttpGet]
    public async Task<IActionResult> GetMyAddresses()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("id");

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { message = "Không xác định được người dùng." });

        var addresses = await _context.Addresses
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(new { Success = true, Data = addresses });
    }

    // POST /api/Address — Thêm địa chỉ mới
    [HttpPost]
    public async Task<IActionResult> AddAddress([FromBody] AddressCreateDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("id");

        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { message = "Không xác định được người dùng." });

        if (string.IsNullOrWhiteSpace(dto.ReceiverName) || string.IsNullOrWhiteSpace(dto.FullAddress))
            return BadRequest(new { message = "Tên người nhận và địa chỉ không được để trống." });

        // If marked as default, unset other defaults
        if (dto.IsDefault)
        {
            var existing = await _context.Addresses.Where(a => a.UserId == userId && a.IsDefault).ToListAsync();
            foreach (var e in existing) e.IsDefault = false;
        }

        var address = new Address
        {
            UserId = userId,
            ReceiverName = dto.ReceiverName.Trim(),
            ReceiverPhone = dto.ReceiverPhone?.Trim() ?? string.Empty,
            FullAddress = dto.FullAddress.Trim(),
            IsDefault = dto.IsDefault,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Addresses.Add(address);
        await _context.SaveChangesAsync();

        return Ok(new { Success = true, Data = address });
    }

    // PUT /api/Address/{id} — Cập nhật địa chỉ
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAddress(string id, [FromBody] AddressCreateDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("id");

        var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (address == null) return NotFound(new { message = "Không tìm thấy địa chỉ." });

        if (dto.IsDefault)
        {
            var existing = await _context.Addresses.Where(a => a.UserId == userId && a.IsDefault && a.Id != id).ToListAsync();
            foreach (var e in existing) e.IsDefault = false;
        }

        address.ReceiverName = dto.ReceiverName?.Trim() ?? address.ReceiverName;
        address.ReceiverPhone = dto.ReceiverPhone?.Trim() ?? address.ReceiverPhone;
        address.FullAddress = dto.FullAddress?.Trim() ?? address.FullAddress;
        address.IsDefault = dto.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(new { Success = true, Data = address });
    }

    // DELETE /api/Address/{id} — Xoá địa chỉ
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAddress(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("id");

        var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (address == null) return NotFound(new { message = "Không tìm thấy địa chỉ." });

        _context.Addresses.Remove(address);
        await _context.SaveChangesAsync();
        return Ok(new { Success = true, Message = "Đã xoá địa chỉ." });
    }

    // PATCH /api/Address/{id}/set-default
    [HttpPatch("{id}/set-default")]
    public async Task<IActionResult> SetDefault(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("id");

        var all = await _context.Addresses.Where(a => a.UserId == userId).ToListAsync();
        var target = all.FirstOrDefault(a => a.Id == id);
        if (target == null) return NotFound(new { message = "Không tìm thấy địa chỉ." });

        foreach (var a in all) a.IsDefault = a.Id == id;
        await _context.SaveChangesAsync();

        return Ok(new { Success = true, Data = target });
    }
}

public class AddressCreateDto
{
    public string ReceiverName { get; set; } = string.Empty;
    public string? ReceiverPhone { get; set; }
    public string FullAddress { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
}
