using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography;

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
                // Generate 6-digit OTP
                var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();

                // Store in cache with expiry
                var cacheKey = $"otp_{email.ToLower()}";
                _cache.Set(cacheKey, otp, _otpExpiry);

                _logger.LogInformation($"OTP generated for {email}: {otp}");
                
                return await Task.FromResult(otp);
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
