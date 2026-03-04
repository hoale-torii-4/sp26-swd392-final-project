using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.Models;
using ShopHangTet.DTOs;
using ShopHangTet.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ShopHangTet.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ShopHangTetDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IConfiguration _configuration; //IConfig to let  Google Login reads ClientId
        private readonly IEmailService _emailService;

        public AuthController(ShopHangTetDbContext context, IJwtService jwtService, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _jwtService = jwtService;
            _configuration = configuration;
            _emailService = emailService;
        }

        // ===========================
        // 1. REGISTER
        // ===========================
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Email này đã được sử dụng."));
            }

            string otpCode = new Random().Next(100000, 999999).ToString();

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
                IsEmailVerified = false,
                OtpCode = otpCode,
                OtpExpiry = DateTime.UtcNow.AddMinutes(5)
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            bool isSent = await _emailService.SendOtpAsync(newUser.Email, otpCode);

            if (!isSent)
            {
                return StatusCode(500, ApiResponse<object>.ErrorResult("Tạo tài khoản thành công nhưng hệ thống gửi mail đang lỗi."));
            }

            _ = _emailService.SendWelcomeEmailAsync(newUser.Email, newUser.FullName);
            return Ok(ApiResponse<object>.SuccessResult(new { UserId = newUser.Id }, "Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP."));
        }
        // ===========================
        // 1.5. VERIFY EMAIL
        // ===========================
        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] OtpVerifyDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                return NotFound(ApiResponse<object>.ErrorResult("Không tìm thấy người dùng với email này."));
            }

            if (user.IsEmailVerified)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Tài khoản này đã được xác thực trước đó."));
            }

            if (user.OtpCode != request.Otp || user.OtpExpiry < DateTime.UtcNow)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Mã OTP không hợp lệ hoặc đã hết hạn."));
            }

            user.IsEmailVerified = true;
            user.OtpCode = null;   
            user.OtpExpiry = null; 
            user.Status = UserStatus.ACTIVE;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResult(null, "Xác thực email thành công! Bạn đã có thể đăng nhập."));
        }

        // ===========================
        // 2. LOGIN
        // ===========================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized(ApiResponse<object>.ErrorResult("Email hoặc mật khẩu không đúng."));
            }

            // Check Verify Email
            if (!user.IsEmailVerified)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Tài khoản chưa được xác thực. Vui lòng kiểm tra email để lấy mã OTP xác nhận!",
                    Data = new { email = user.Email, isEmailVerified = false } // Trả về data để Front-end biết nhảy trang
                });
            }

            if (user.Status != UserStatus.ACTIVE)
            {
                return Unauthorized(ApiResponse<object>.ErrorResult("Tài khoản đã bị khóa."));
            }

            // Create token
            var token = _jwtService.GenerateToken(user);

            // Encapsulate response in LoginResponseDto format (Profile)
            var loginResponse = CreateLoginResponse(user, token);

            return Ok(ApiResponse<LoginResponseDto>.SuccessResult(loginResponse, "Đăng nhập thành công!"));
        }

        // ===========================
        // 3. GOOGLE LOGIN
        // ===========================
        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto request)
        {
            try
            {
                var clientId = _configuration["GoogleAuth:ClientId"] ?? "TAM_THOI_CHUA_CO";

                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    // Tạm tắt Audience để test với token của Playground
                    // Audience = new List<string>() { clientId } 
                };

                // Verify Google Token
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);

                // Find user by Gmail
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);

                if (user == null)
                {
                    // Auto-register if not exist
                    user = new UserModel
                    {
                        Email = payload.Email,
                        FullName = payload.Name,
                        Phone = null,
                        PasswordHash = "",
                        Role = UserRole.MEMBER,
                        Status = UserStatus.ACTIVE,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        IsEmailVerified = payload.EmailVerified
                    };

                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }
                else if (user.Status != UserStatus.ACTIVE)
                {
                    return Unauthorized(ApiResponse<object>.ErrorResult("Tài khoản của bạn đã bị khóa."));
                }

                // Local token generation
                var token = _jwtService.GenerateToken(user);

                // Encapsulate response in LoginResponseDto format
                var loginResponse = CreateLoginResponse(user, token);

                return Ok(ApiResponse<LoginResponseDto>.SuccessResult(loginResponse, "Đăng nhập Google thành công!"));
            }
            catch (InvalidJwtException)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Token Google không hợp lệ hoặc đã hết hạn."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.ErrorResult($"Lỗi server: {ex.Message}"));
            }
        }

        // ===========================
        // Helper response encapsulation
        // ===========================
        private LoginResponseDto CreateLoginResponse(UserModel user, string token)
        {
            var userResponse = new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Phone = user.Phone,
                Role = user.Role,
                Status = user.Status,
                CreatedAt = user.CreatedAt
            };

            return new LoginResponseDto
            {
                Token = token,
                User = userResponse,
                ExpiresAt = DateTime.UtcNow.AddDays(7) // Match the JWT expiration in JwtService
            };
        }
        // ===========================
        // 4. FORGOT PASSWORD (QUÊN MẬT KHẨU - GỬI OTP)
        // ===========================
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                return Ok(ApiResponse<object>.SuccessResult(null, "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi."));
            }

            // 6 random digits OTP generation
            string otpCode = new Random().Next(100000, 999999).ToString();

            // Save OTP and expired after 5 minutes in database
            user.OtpCode = otpCode;
            user.OtpExpiry = DateTime.UtcNow.AddMinutes(5);
            await _context.SaveChangesAsync();

            bool isSent = await _emailService.SendOtpAsync(user.Email, otpCode);

            if (!isSent)
            {
                return StatusCode(500, ApiResponse<object>.ErrorResult("Lỗi cấu hình gửi email. Vui lòng kiểm tra lại tài khoản SMTP."));
            }

            return Ok(ApiResponse<object>.SuccessResult(null, "Đã gửi mã xác nhận đến email của bạn."));
        }
        // 5. RESET PASSWORD
        // ===========================
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            // Check if user exists and OTP is valid
            if (user == null || user.OtpCode != request.Otp || user.OtpExpiry < DateTime.UtcNow)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Mã OTP không hợp lệ hoặc đã hết hạn."));
            }

            // Hashing new password and save to database
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            // Clear OTP fields after successful password reset
            user.OtpCode = null;
            user.OtpExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResult(null, "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."));
        }
        // ===========================
        // 6. CHANGE PASSWORD
        // ===========================
        [Authorize] // Need token
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto request)
        {
            // Claim email from token
            var email = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(email))
            {
                return Unauthorized(ApiResponse<object>.ErrorResult("Không tìm thấy thông tin xác thực."));
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                return NotFound(ApiResponse<object>.ErrorResult("Không tìm thấy người dùng."));
            }

            // Block if user logged in with Google and has no hashpassword
            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Tài khoản của bạn đăng nhập bằng Google nên chưa có mật khẩu. Vui lòng sử dụng tính năng 'Quên mật khẩu' để thiết lập mật khẩu mới."));
            }

            // Check old password
            if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Mật khẩu hiện tại không chính xác."));
            }

            // Save and hashing new password to database
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResult(null, "Đổi mật khẩu thành công!"));
        }
    }
}