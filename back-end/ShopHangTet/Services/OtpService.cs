using Microsoft.Extensions.Caching.Memory;

namespace ShopHangTet.Services
{
    public class OtpService : IOtpService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<OtpService> _logger;
        private readonly TimeSpan _otpExpiry = TimeSpan.FromMinutes(5);

        public OtpService(IMemoryCache cache, ILogger<OtpService> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        public async Task<string> GenerateOtpAsync(string email)
        {
            try
            {
                var emailKey = email.ToLower();
                var cooldownKey = $"otp_cooldown_{emailKey}";
                var cacheKey = $"otp_{emailKey}";

                // Check cooldown
                // If the cooldown key still exists in RAM
                if (_cache.TryGetValue(cooldownKey, out _))
                {
                    throw new InvalidOperationException("Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP.");
                }

                // 2. Generate 6-digit OTP
                var random = new Random();
                var otp = random.Next(100000, 999999).ToString();

                // 3. Store OTP in cache with 5-minute expiry
                _cache.Set(cacheKey, otp, _otpExpiry);

                // 4. Cooldown setup
                _cache.Set(cooldownKey, true, TimeSpan.FromSeconds(60));

                _logger.LogInformation($"OTP generated for {email}: {otp}");

                return await Task.FromResult(otp);
            }
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to generate OTP for {email}");
                throw;
            }
        }

        public async Task<bool> ValidateOtpAsync(string email, string otp)
        {
            try
            {
                var cacheKey = $"otp_{email.ToLower()}";
                
                if (_cache.TryGetValue(cacheKey, out string? cachedOtp))
                {
                    var isValid = cachedOtp == otp;
                    
                    if (isValid)
                    {
                        // Remove OTP from cache after successful validation
                        _cache.Remove(cacheKey);
                        _logger.LogInformation($"OTP validated successfully for {email}");
                    }
                    else
                    {
                        _logger.LogWarning($"Invalid OTP attempt for {email}");
                    }
                    
                    return await Task.FromResult(isValid);
                }

                _logger.LogWarning($"OTP not found or expired for {email}");
                return await Task.FromResult(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to validate OTP for {email}");
                return false;
            }
        }

        public async Task<bool> InvalidateOtpAsync(string email)
        {
            try
            {
                var cacheKey = $"otp_{email.ToLower()}";
                _cache.Remove(cacheKey);
                _logger.LogInformation($"OTP invalidated for {email}");
                return await Task.FromResult(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to invalidate OTP for {email}");
                return false;
            }
        }
    }
}
