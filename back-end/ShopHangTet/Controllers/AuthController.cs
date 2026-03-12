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
        // 1.5. VERIFY EMAIL (account created and saved to db immediately, if user cannot receive otp, go to API 1.7)
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
            user.OtpCode = default;
            user.OtpExpiry = default; 
            user.Status = UserStatus.ACTIVE;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResult(null!, "Xác thực email thành công! Bạn đã có thể đăng nhập."));
        }
        // ===========================
        // 1.7. RESEND REGISTER OTP (When there is a user's email exist in db didn't receive the otp and need to resend during registration)
        // ONLY FOR UNVERIFIED EMAIL (isEmailVerified = false)
        // ===========================
        [HttpPost("resend-register-otp")]
        public async Task<IActionResult> ResendRegisterOtp([FromBody] ResendOtpDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                return NotFound(ApiResponse<object>.ErrorResult("Không tìm thấy tài khoản nào đăng ký với email này."));
            }

            if (user.IsEmailVerified)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Tài khoản này đã được xác thực thành công. Vui lòng đăng nhập thẳng vào hệ thống!"));
            }

            if (user.OtpExpiry.HasValue && user.OtpExpiry.Value > DateTime.UtcNow.AddMinutes(4))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP mới."));
            }

            // 1. Generate new OTP code with 6 random digits
            string otpCode = new Random().Next(100000, 999999).ToString();

            // 2. Save OTP and expired after 5 minutes in database
            user.OtpCode = otpCode;
            user.OtpExpiry = DateTime.UtcNow.AddMinutes(5);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // 3. Brevo email sending
            bool isSent = await _emailService.SendOtpAsync(user.Email, otpCode);

            if (!isSent)
            {
                return StatusCode(500, ApiResponse<object>.ErrorResult("Tạo mã thành công nhưng hệ thống gửi mail đang gặp sự cố. Vui lòng thử lại sau."));
            }

            return Ok(ApiResponse<object>.SuccessResult(null!, "Đã gửi lại mã xác nhận OTP. Vui lòng kiểm tra cả hòm thư Spam (Thư rác)."));
        }
        // ===========================
        // 2. LOGIN
        // ===========================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || string.IsNullOrEmpty(user.PasswordHash))
            {
                return Unauthorized(ApiResponse<object>.ErrorResult("Email hoặc mật khẩu không đúng."));
            }

            bool isPasswordValid = false;
            try
            {
                if (user.PasswordHash.StartsWith("$2")) // BCrypt format
                {
                    isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
                }
                else if (user.PasswordHash.Contains(".")) // PBKDF2 format from InternalUserService
                {
                    isPasswordValid = VerifyPbkdf2(request.Password, user.PasswordHash);
                }
            }
            catch
            {
                isPasswordValid = false;
            }

            if (!isPasswordValid)
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
                    Audience = new List<string>() { clientId }
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
        // UPDATE PROFILE (Name, Phone only)
        // ===========================
        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(ApiResponse<object>.ErrorResult("Không thể xác thực người dùng."));
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(ApiResponse<object>.ErrorResult("Không tìm thấy người dùng."));
            }

            user.FullName = request.FullName;
            user.Phone = request.Phone;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            var updatedUserDto = new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Phone = user.Phone,
                Role = user.Role,
                Status = user.Status,
                CreatedAt = user.CreatedAt
            };

            return Ok(ApiResponse<UserResponseDto>.SuccessResult(updatedUserDto, "Cập nhật thông tin thành công!"));
        }

        // ===========================
        // 4. FORGOT PASSWORD (OTP)
        // ===========================
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                return Ok(ApiResponse<object>.SuccessResult(null!, "Nếu email tồn tại trong hệ thống, mã OTP đã được gửi."));
            }

            // If otpexpiry > 4 minutes, it means user just requested OTP and need to wait until 5 minutes to request again. This is to prevent spamming OTP request.
            if (user.OtpExpiry.HasValue && user.OtpExpiry.Value > DateTime.UtcNow.AddMinutes(4))
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP mới."));
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

            return Ok(ApiResponse<object>.SuccessResult(null!, "Đã gửi mã xác nhận đến email của bạn."));
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
            user.OtpCode = default;
            user.OtpExpiry = default;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResult(null!, "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."));
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
            bool isOldPasswordValid = false;
            try
            {
                if (user.PasswordHash.StartsWith("$2"))
                {
                    isOldPasswordValid = BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash);
                }
                else if (user.PasswordHash.Contains("."))
                {
                    isOldPasswordValid = VerifyPbkdf2(request.OldPassword, user.PasswordHash);
                }
            }
            catch { isOldPasswordValid = false; }

            if (!isOldPasswordValid)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Mật khẩu hiện tại không chính xác."));
            }

            // Save and hashing new password to database
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResult(null!, "Đổi mật khẩu thành công!"));
        }

        private static bool VerifyPbkdf2(string password, string storedHash)
        {
            var parts = storedHash.Split('.');
            if (parts.Length != 3) return false;
            
            var iterations = int.Parse(parts[0]);
            var salt = Convert.FromBase64String(parts[1]);
            var hash = Convert.FromBase64String(parts[2]);
            
            using var pbkdf2 = new System.Security.Cryptography.Rfc2898DeriveBytes(password, salt, iterations, System.Security.Cryptography.HashAlgorithmName.SHA256);
            var computedHash = pbkdf2.GetBytes(32);
            
            return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(hash, computedHash);
        }
    }
}