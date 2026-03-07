import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { UserRole, UserStatus } from '../models/enums.js';
import { ApiResponse } from '../dtos/index.js';
import { authenticate } from '../middlewares/index.js';

/**
 * Auth Controller - Tương đương AuthController.cs
 * Routes: /api/auth
 */
export function createAuthRouter(jwtService, emailService) {
  const router = Router();

  // ===========================
  // 1. REGISTER
  // ===========================
  router.post('/register', async (req, res) => {
    try {
      const { Email, Password, FullName, Phone } = req.body;

      // Check email exists
      const existingUser = await User.findOne({ email: Email?.toLowerCase() });
      if (existingUser) {
        return res.status(400).json(ApiResponse.error('Email này đã được sử dụng.'));
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const passwordHash = await bcrypt.hash(Password, 10);

      const newUser = await User.create({
        email: Email?.toLowerCase(),
        fullName: FullName,
        phone: Phone || '',
        passwordHash,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        isEmailVerified: false,
        otpCode,
        otpExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });

      // Send OTP email
      let isSent = true;
      try {
        isSent = await emailService.sendOtp(newUser.email, otpCode);
      } catch (err) {
        console.warn('Failed to send OTP email:', err.message);
        isSent = false;
      }

      if (!isSent) {
        return res.status(500).json(
          ApiResponse.error('Tạo tài khoản thành công nhưng hệ thống gửi mail đang lỗi.')
        );
      }

      // Send welcome email (non-blocking)
      emailService.sendWelcomeEmail(newUser.email, newUser.fullName).catch(() => { });

      return res.status(200).json(
        ApiResponse.success(
          { UserId: newUser._id.toString() },
          'Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP.'
        )
      );
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ===========================
  // 1.5. VERIFY EMAIL
  // ===========================
  router.post('/verify-email', async (req, res) => {
    try {
      const { Email, Otp } = req.body;

      const user = await User.findOne({ email: Email?.toLowerCase() });
      if (!user) {
        return res.status(404).json(ApiResponse.error('Không tìm thấy người dùng với email này.'));
      }

      if (user.isEmailVerified) {
        return res.status(400).json(ApiResponse.error('Tài khoản này đã được xác thực trước đó.'));
      }

      if (user.otpCode !== Otp || !user.otpExpiry || user.otpExpiry < new Date()) {
        return res.status(400).json(ApiResponse.error('Mã OTP không hợp lệ hoặc đã hết hạn.'));
      }

      user.isEmailVerified = true;
      user.otpCode = null;
      user.otpExpiry = null;
      user.status = UserStatus.ACTIVE;
      await user.save();

      return res.status(200).json(
        ApiResponse.success(null, 'Xác thực email thành công! Bạn đã có thể đăng nhập.')
      );
    } catch (error) {
      console.error('VerifyEmail error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ===========================
  // 1.7. RESEND REGISTER OTP
  // ===========================
  router.post('/resend-register-otp', async (req, res) => {
    try {
      const { Email } = req.body;

      const user = await User.findOne({ email: Email?.toLowerCase() });
      if (!user) {
        return res.status(404).json(
          ApiResponse.error('Không tìm thấy tài khoản nào đăng ký với email này.')
        );
      }

      if (user.isEmailVerified) {
        return res.status(400).json(
          ApiResponse.error('Tài khoản này đã được xác thực thành công. Vui lòng đăng nhập thẳng vào hệ thống!')
        );
      }

      // Throttle: 60 second cooldown
      if (user.otpExpiry && user.otpExpiry > new Date(Date.now() + 4 * 60 * 1000)) {
        return res.status(400).json(
          ApiResponse.error('Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP mới.')
        );
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.otpCode = otpCode;
      user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();

      const isSent = await emailService.sendOtp(user.email, otpCode);
      if (!isSent) {
        return res.status(500).json(
          ApiResponse.error('Tạo mã thành công nhưng hệ thống gửi mail đang gặp sự cố. Vui lòng thử lại sau.')
        );
      }

      return res.status(200).json(
        ApiResponse.success(null, 'Đã gửi lại mã xác nhận OTP. Vui lòng kiểm tra cả hòm thư Spam (Thư rác).')
      );
    } catch (error) {
      console.error('ResendRegisterOtp error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ===========================
  // 2. LOGIN
  // ===========================
  router.post('/login', async (req, res) => {
    try {
      const { Email, Password } = req.body;

      const user = await User.findOne({ email: Email?.toLowerCase() });
      if (!user || !user.passwordHash || !(await bcrypt.compare(Password, user.passwordHash))) {
        return res.status(401).json(ApiResponse.error('Email hoặc mật khẩu không đúng.'));
      }

      // Check Verify Email
      if (!user.isEmailVerified) {
        return res.status(400).json({
          Success: false,
          Message: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để lấy mã OTP xác nhận!',
          Data: { email: user.email, isEmailVerified: false },
        });
      }

      if (user.status !== UserStatus.ACTIVE) {
        return res.status(401).json(ApiResponse.error('Tài khoản đã bị khóa.'));
      }

      const token = jwtService.generateToken(user);
      const loginResponse = createLoginResponse(user, token);

      return res.status(200).json(ApiResponse.success(loginResponse, 'Đăng nhập thành công!'));
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ===========================
  // 3. GOOGLE LOGIN
  // ===========================
  router.post('/google-login', async (req, res) => {
    try {
      const { IdToken } = req.body;

      // Dynamic import google-auth-library
      let OAuth2Client;
      try {
        const gAuth = await import('google-auth-library');
        OAuth2Client = gAuth.OAuth2Client;
      } catch {
        return res.status(500).json(ApiResponse.error('Google Auth library not available'));
      }

      const clientId = process.env.GOOGLE_CLIENT_ID || 'TAM_THOI_CHUA_CO';
      const client = new OAuth2Client(clientId);

      const ticket = await client.verifyIdToken({
        idToken: IdToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      let user = await User.findOne({ email: payload.email });

      if (!user) {
        // Auto-register
        user = await User.create({
          email: payload.email,
          fullName: payload.name || '',
          phone: null,
          passwordHash: '',
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          isEmailVerified: payload.email_verified || false,
        });
      } else if (user.status !== UserStatus.ACTIVE) {
        return res.status(401).json(ApiResponse.error('Tài khoản của bạn đã bị khóa.'));
      }

      const token = jwtService.generateToken(user);
      const loginResponse = createLoginResponse(user, token);

      return res.status(200).json(ApiResponse.success(loginResponse, 'Đăng nhập Google thành công!'));
    } catch (error) {
      console.error('Google login error:', error);
      if (error.message?.includes('Token') || error.message?.includes('token')) {
        return res.status(400).json(ApiResponse.error('Token Google không hợp lệ hoặc đã hết hạn.'));
      }
      return res.status(500).json(ApiResponse.error(`Lỗi server: ${error.message}`));
    }
  });

  // ===========================
  // 4. FORGOT PASSWORD (OTP)
  // ===========================
  router.post('/forgot-password', async (req, res) => {
    try {
      const { Email } = req.body;

      const user = await User.findOne({ email: Email?.toLowerCase() });
      if (!user) {
        // Security: don't reveal if email exists
        return res.status(200).json(
          ApiResponse.success(null, 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.')
        );
      }

      // Throttle: 60 second cooldown
      if (user.otpExpiry && user.otpExpiry > new Date(Date.now() + 4 * 60 * 1000)) {
        return res.status(400).json(
          ApiResponse.error('Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP mới.')
        );
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.otpCode = otpCode;
      user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();

      const isSent = await emailService.sendOtp(user.email, otpCode);
      if (!isSent) {
        return res.status(500).json(
          ApiResponse.error('Lỗi cấu hình gửi email. Vui lòng kiểm tra lại tài khoản SMTP.')
        );
      }

      return res.status(200).json(
        ApiResponse.success(null, 'Đã gửi mã xác nhận đến email của bạn.')
      );
    } catch (error) {
      console.error('ForgotPassword error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ===========================
  // 5. RESET PASSWORD
  // ===========================
  router.post('/reset-password', async (req, res) => {
    try {
      const { Email, Otp, NewPassword } = req.body;

      const user = await User.findOne({ email: Email?.toLowerCase() });
      if (!user || user.otpCode !== Otp || !user.otpExpiry || user.otpExpiry < new Date()) {
        return res.status(400).json(ApiResponse.error('Mã OTP không hợp lệ hoặc đã hết hạn.'));
      }

      user.passwordHash = await bcrypt.hash(NewPassword, 10);
      user.otpCode = null;
      user.otpExpiry = null;
      await user.save();

      return res.status(200).json(
        ApiResponse.success(null, 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.')
      );
    } catch (error) {
      console.error('ResetPassword error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ===========================
  // 6. CHANGE PASSWORD
  // ===========================
  router.post('/change-password', authenticate, async (req, res) => {
    try {
      const email = req.user?.email;
      if (!email) {
        return res.status(401).json(ApiResponse.error('Không tìm thấy thông tin xác thực.'));
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json(ApiResponse.error('Không tìm thấy người dùng.'));
      }

      // Block if user logged in with Google and has no password
      if (!user.passwordHash) {
        return res.status(400).json(
          ApiResponse.error(
            "Tài khoản của bạn đăng nhập bằng Google nên chưa có mật khẩu. Vui lòng sử dụng tính năng 'Quên mật khẩu' để thiết lập mật khẩu mới."
          )
        );
      }

      const { OldPassword, NewPassword } = req.body;

      const isValid = await bcrypt.compare(OldPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json(ApiResponse.error('Mật khẩu hiện tại không chính xác.'));
      }

      user.passwordHash = await bcrypt.hash(NewPassword, 10);
      await user.save();

      return res.status(200).json(ApiResponse.success(null, 'Đổi mật khẩu thành công!'));
    } catch (error) {
      console.error('ChangePassword error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ===========================
  // Helper
  // ===========================
  function createLoginResponse(user, token) {
    return {
      Token: token,
      User: {
        Id: user._id.toString(),
        Email: user.email,
        FullName: user.fullName,
        Phone: user.phone,
        Role: user.role,
        Status: user.status,
        CreatedAt: user.createdAt,
      },
      ExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  return router;
}
