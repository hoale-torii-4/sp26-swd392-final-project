import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { UserRole, UserStatus } from '../models/enums.js';

/**
 * Auth Controller - Tương đương AuthController.cs
 * Routes: /api/auth
 */
export function createAuthRouter(jwtService) {
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
        return res.status(400).json({ Message: 'Email này đã được sử dụng.' });
      }

      const passwordHash = await bcrypt.hash(Password, 10);

      const newUser = await User.create({
        email: Email?.toLowerCase(),
        fullName: FullName,
        phone: Phone || '',
        passwordHash,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        isEmailVerified: false,
      });

      return res.status(200).json({
        Message: 'Đăng ký thành công!',
        UserId: newUser._id.toString(),
      });
    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({ Message: 'Internal server error' });
    }
  });

  // ===========================
  // 2. LOGIN
  // ===========================
  router.post('/login', async (req, res) => {
    try {
      const { Email, Password } = req.body;

      const user = await User.findOne({ email: Email?.toLowerCase() });
      if (!user) {
        return res.status(401).json({ Message: 'Email hoặc mật khẩu không đúng.' });
      }

      const isPasswordValid = await bcrypt.compare(Password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ Message: 'Email hoặc mật khẩu không đúng.' });
      }

      if (user.status !== UserStatus.ACTIVE) {
        return res.status(401).json({ Message: 'Tài khoản đã bị khóa.' });
      }

      const token = jwtService.generateToken(user);

      return res.status(200).json({ Token: token });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ Message: 'Internal server error' });
    }
  });

  return router;
}
