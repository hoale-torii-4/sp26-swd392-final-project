import jwt from 'jsonwebtoken';

/**
 * JWT Service - Tương đương JwtService.cs
 */
export class JwtService {
  constructor() {
    this.secretKey =
      process.env.JWT_SECRET_KEY || 'ShopHangTet_DefaultSecretKey_2024_MongoDB_VerySecureKey123456789';
    this.issuer = process.env.JWT_ISSUER || 'ShopHangTet';
    this.audience = process.env.JWT_AUDIENCE || 'ShopHangTet.Client';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Tạo JWT token cho user
   * @param {Object} user - UserModel document
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      sub: user._id?.toString() || user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      status: user.status,
    };

    return jwt.sign(payload, this.secretKey, {
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.expiresIn,
    });
  }

  /**
   * Validate và decode JWT token
   * @param {string} token
   * @returns {string|null} userId hoặc null nếu invalid
   */
  validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        issuer: this.issuer,
        audience: this.audience,
      });
      return decoded.sub;
    } catch {
      return null;
    }
  }

  /**
   * Lấy expiration time của token
   * @param {string} token
   * @returns {Date}
   */
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded?.exp ? new Date(decoded.exp * 1000) : new Date(0);
    } catch {
      return new Date(0);
    }
  }
}
