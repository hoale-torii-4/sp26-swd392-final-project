using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShopHangTet.Models;
using ShopHangTet.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ShopHangTetDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(ShopHangTetDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // 1. ĐĂNG KÝ
    [HttpPost("register")]
    public async Task<IActionResult> Register(User request)
    {
        // Kiểm tra xem username đã tồn tại chưa
        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
        {
            return BadRequest("Tên tài khoản đã tồn tại.");
        }

        // Mã hóa mật khẩu (Tuyệt đối không lưu plain text)
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var newUser = new User
        {
            Username = request.Username,
            Email = request.Email,
            Password = passwordHash // Lưu hash vào trường Password
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        return Ok("Đăng ký thành công!");
    }

    // 2. ĐĂNG NHẬP
    [HttpPost("login")]
    // Changed parameter to LoginDto
    public async Task<IActionResult> Login([FromBody] LoginDto loginRequest)
    {
        // Find user by username
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == loginRequest.Username);

        // Changed loginRequest.PasswordHash to loginRequest.Password
        if (user == null || !BCrypt.Net.BCrypt.Verify(loginRequest.Password, user.Password))
        {
            return Unauthorized("Sai tài khoản hoặc mật khẩu.");
        }

        // Create JWT Token
        var token = CreateToken(user);
        return Ok(new { Token = token });
    }

    // Hàm phụ trợ tạo Token
    private string CreateToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var key = Encoding.ASCII.GetBytes(jwtSettings["SecretKey"]!);

        var claims = new List<Claim>
        {
            new Claim("id", user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email)
        };

        var creds = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(1), // Token hết hạn sau 1 ngày
            SigningCredentials = creds,
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"]
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}