import NodeCache from 'node-cache';

/**
 * OTP Service - Tương đương OtpService.cs
 * Dùng node-cache thay cho IMemoryCache
 */
export class OtpService {
  constructor() {
    // stdTTL = 300 seconds = 5 minutes
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
  }

  /**
   * Generate 6-digit OTP
   * @param {string} email
   * @returns {Promise<string>} OTP code
   */
  async generateOtp(email) {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const cacheKey = `otp_${email.toLowerCase()}`;
      this.cache.set(cacheKey, otp);
      console.log(`OTP generated for ${email}: ${otp}`);
      return otp;
    } catch (error) {
      console.error(`Failed to generate OTP for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Validate OTP
   * @param {string} email
   * @param {string} otp
   * @returns {Promise<boolean>}
   */
  async validateOtp(email, otp) {
    try {
      const cacheKey = `otp_${email.toLowerCase()}`;
      const cachedOtp = this.cache.get(cacheKey);

      if (cachedOtp === otp) {
        this.cache.del(cacheKey);
        console.log(`OTP validated successfully for ${email}`);
        return true;
      }

      console.warn(`Invalid OTP attempt for ${email}`);
      return false;
    } catch (error) {
      console.error(`Failed to validate OTP for ${email}:`, error);
      return false;
    }
  }

  /**
   * Invalidate OTP
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async invalidateOtp(email) {
    try {
      const cacheKey = `otp_${email.toLowerCase()}`;
      this.cache.del(cacheKey);
      console.log(`OTP invalidated for ${email}`);
      return true;
    } catch (error) {
      console.error(`Failed to invalidate OTP for ${email}:`, error);
      return false;
    }
  }
}
