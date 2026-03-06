using Microsoft.AspNetCore.Mvc;
using ShopHangTet.DTOs;
using ShopHangTet.Services;

namespace ShopHangTet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public class SystemController : ControllerBase
    {
        private readonly ILogger<SystemController> _logger;
        private readonly IJwtService? _jwtService;
        private readonly IOtpService? _otpService;
        private readonly IEmailService? _emailService;
        private readonly IWebHostEnvironment _environment;

        public SystemController(
            ILogger<SystemController> logger,
            IWebHostEnvironment environment,
            IJwtService? jwtService = null,
            IOtpService? otpService = null,
            IEmailService? emailService = null)
        {
            _logger = logger;
            _environment = environment;
            _jwtService = jwtService;
            _otpService = otpService;
            _emailService = emailService;
        }

        /// Health Check API - Kiểm tra trạng thái hệ thống
        [HttpGet("health")]
        public IActionResult Get()
        {
            try
            {
                var healthStatus = new
                {
                    Status = "Healthy",
                    Timestamp = DateTime.UtcNow,
                    Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown",
                    Services = new
                    {
                        JwtService = _jwtService != null ? "Available" : "Not Available",
                        OtpService = _otpService != null ? "Available" : "Not Available",
                        EmailService = _emailService != null ? "Available" : "Not Available"
                    },
                    Database = new
                    {
                        MongoDB = "Connected"
                    },
                    Version = "1.0.0",
                    Message = "Shop Hàng Tết API is running successfully!"
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "System is healthy",
                    Data = healthStatus,
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed");

                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Health check failed",
                    Errors = new List<string> { ex.Message },
                    Timestamp = DateTime.UtcNow
                });
            }
        }

        /// Test JWT Token Generation
        [HttpPost("test-jwt")]
        public IActionResult TestJwt([FromBody] TestJwtRequest request)
        {
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            try
            {
                if (_jwtService == null)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "JWT Service not available"
                    });
                }

                var testUser = new Models.UserModel
                {
                    Id = "test-user-id",
                    Email = request.Email,
                    FullName = request.FullName ?? "Test User",
                    Role = Models.UserRole.MEMBER,
                    Status = Models.UserStatus.ACTIVE
                };

                var token = _jwtService.GenerateToken(testUser);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "JWT token generated successfully",
                    Data = new { Token = token },
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "JWT test failed");

                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "JWT test failed",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        /// Test OTP Generation
        [HttpPost("test-otp")]
        public async Task<IActionResult> TestOtp([FromBody] TestOtpRequest request)
        {
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            try
            {
                if (_otpService == null)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "OTP Service not available"
                    });
                }

                var otp = await _otpService.GenerateOtpAsync(request.Email);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "OTP generated successfully",
                    Data = new { Email = request.Email, OTP = otp, ExpiryMinutes = 5 },
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OTP test failed for email: {Email}", request.Email);

                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "OTP test failed",
                    Errors = new List<string> { ex.Message }
                });
            }
        }
    }

    // Request DTOs for test endpoints
    public class TestJwtRequest
    {
        public string Email { get; set; } = "";
        public string? FullName { get; set; }
    }

    public class TestOtpRequest
    {
        public string Email { get; set; } = "";
    }
}