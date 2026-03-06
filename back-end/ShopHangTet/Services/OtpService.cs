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
            var emailKey = email.ToLower();
            var cooldownKey = $"otp_cooldown_{emailKey}";
            var cacheKey = $"otp_{emailKey}";

            if (_cache.TryGetValue(cooldownKey, out _))
            {
                throw new InvalidOperationException("Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP.");
            }

            var random = new Random();
            var otp = random.Next(100000, 999999).ToString();

            _cache.Set(cacheKey, otp, _otpExpiry);
            _cache.Set(cooldownKey, true, TimeSpan.FromSeconds(60));

            _logger.LogInformation($"OTP generated for {email}: {otp}");

            return await Task.FromResult(otp);
        }

        public async Task<bool> ValidateOtpAsync(string email, string otp)
        {
            var cacheKey = $"otp_{email.ToLower()}";

            if (_cache.TryGetValue(cacheKey, out string? cachedOtp))
            {
                var isValid = cachedOtp == otp;

                if (isValid)
                {
                    _cache.Remove(cacheKey);
                }

                return await Task.FromResult(isValid);
            }

            return await Task.FromResult(false);
        }

        public async Task<bool> InvalidateOtpAsync(string email)
        {
            var cacheKey = $"otp_{email.ToLower()}";
            _cache.Remove(cacheKey);

            return await Task.FromResult(true);
        }
    }
}