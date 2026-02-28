import { Router } from 'express';
import { ApiResponse } from '../dtos/index.js';
import { UserRole, UserStatus } from '../models/enums.js';

/**
 * System Controller - Tương đương SystemController.cs
 * Routes: /api/system
 */
export function createSystemRouter(jwtService, otpService, emailService) {
  const router = Router();

  // ========== Health Check ==========
  router.get('/health', (_req, res) => {
    try {
      const healthStatus = {
        Status: 'Healthy',
        Timestamp: new Date().toISOString(),
        Environment: process.env.NODE_ENV || 'Unknown',
        Services: {
          JwtService: jwtService ? 'Available' : 'Not Available',
          OtpService: otpService ? 'Available' : 'Not Available',
          EmailService: emailService ? 'Available' : 'Not Available',
        },
        Database: {
          MongoDB: 'Connected',
        },
        Version: '1.0.0',
        Message: 'Shop Hàng Tết API is running successfully!',
      };

      return res.status(200).json(ApiResponse.success(healthStatus, 'System is healthy'));
    } catch (error) {
      console.error('Health check failed:', error);
      return res.status(500).json(ApiResponse.error('Health check failed', [error.message]));
    }
  });

  // ========== Test JWT Token Generation ==========
  router.post('/test-jwt', (req, res) => {
    try {
      if (!jwtService) {
        return res.status(400).json(ApiResponse.error('JWT Service not available'));
      }

      const { Email, FullName } = req.body;

      const testUser = {
        _id: 'test-user-id',
        email: Email,
        fullName: FullName || 'Test User',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
      };

      const token = jwtService.generateToken(testUser);

      return res.status(200).json(
        ApiResponse.success({ Token: token }, 'JWT token generated successfully')
      );
    } catch (error) {
      console.error('JWT test failed:', error);
      return res.status(500).json(ApiResponse.error('JWT test failed', [error.message]));
    }
  });

  // ========== Test OTP Generation ==========
  router.post('/test-otp', async (req, res) => {
    try {
      if (!otpService) {
        return res.status(400).json(ApiResponse.error('OTP Service not available'));
      }

      const { Email } = req.body;
      const otp = await otpService.generateOtp(Email);

      return res.status(200).json(
        ApiResponse.success(
          { Email, OTP: otp, ExpiryMinutes: 5 },
          'OTP generated successfully'
        )
      );
    } catch (error) {
      console.error('OTP test failed:', error);
      return res.status(500).json(ApiResponse.error('OTP test failed', [error.message]));
    }
  });

  return router;
}
