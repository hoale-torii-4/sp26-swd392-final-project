using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.Models;
using ShopHangTet.DTOs;
using ShopHangTet.Services; 

namespace ShopHangTet.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ShopHangTetDbContext _context;
        private readonly IJwtService _jwtService;

        public AuthController(ShopHangTetDbContext context, IJwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        // ===========================
        // 1. REGISTER
        // ===========================
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest("Email này đã được sử dụng.");
            }

            var newUser = new UserModel
            {
                Email = request.Email,
                FullName = request.FullName,
                Phone = request.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = UserRole.MEMBER,
                Status = UserStatus.ACTIVE,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsEmailVerified = false
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Đăng ký thành công!", UserId = newUser.Id });
        }

        // ===========================
        // 2. LOGIN
        // ===========================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized("Email hoặc mật khẩu không đúng.");
            }

            if (user.Status != UserStatus.ACTIVE)
            {
                return Unauthorized("Tài khoản đã bị khóa.");
            }
            //Use jwt service to generate token
            var token = _jwtService.GenerateToken(user);

            return Ok(new { Token = token });
        }
    }
}