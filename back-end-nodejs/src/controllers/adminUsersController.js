import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ApiResponse, PagedResponse } from '../dtos/index.js';
import { User } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/index.js';
import { UserRole } from '../models/enums.js';

/**
 * Admin Users Controller - /api/admin/users
 */
export function createAdminUsersRouter() {
  const router = Router();

  router.use(authenticate, authorize('ADMIN'));

  const roleLabel = (role) => (role === UserRole.ADMIN ? 'Admin' : role === UserRole.STAFF ? 'Staff' : 'Member');

  // GET /api/admin/users
  router.get('/', async (req, res) => {
    try {
      const { search, role, status, page = 1, pageSize = 20 } = req.query;
      const query = {};

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }
      if (role) query.role = role;
      if (status) query.status = status;

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(pageSize))
        .limit(Number(pageSize))
        .lean();

      const items = users.map((u) => ({
        Id: u._id.toString(),
        FullName: u.fullName,
        Email: u.email,
        Role: u.role,
        RoleLabel: roleLabel(u.role),
        IsActive: u.status === 'ACTIVE',
        StatusLabel: u.status === 'ACTIVE' ? 'Active' : 'Disabled',
        CreatedAt: u.createdAt,
      }));

      return res.status(200).json({
        Users: items,
        Page: Number(page),
        PageSize: Number(pageSize),
        TotalItems: total,
      });
    } catch (error) {
      console.error('Admin users list error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/users/:id
  router.get('/:id', async (req, res) => {
    try {
      const user = await User.findById(req.params.id).lean();
      if (!user) return res.status(404).json(ApiResponse.error('User not found'));

      return res.status(200).json({
        Id: user._id.toString(),
        FullName: user.fullName,
        Email: user.email,
        Role: user.role,
        RoleLabel: roleLabel(user.role),
        IsActive: user.status === 'ACTIVE',
        StatusLabel: user.status === 'ACTIVE' ? 'Active' : 'Disabled',
        CreatedAt: user.createdAt,
      });
    } catch (error) {
      console.error('Admin users detail error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // POST /api/admin/users
  router.post('/', async (req, res) => {
    try {
      const { FullName, Email, Password, Role } = req.body;
      if (!FullName || !Email || !Password || !Role) {
        return res.status(400).json(ApiResponse.error('FullName, Email, Password, Role are required'));
      }

      const existing = await User.findOne({ email: Email.toLowerCase() });
      if (existing) return res.status(400).json(ApiResponse.error('Email này đã được sử dụng.'));

      const hash = await bcrypt.hash(Password, 10);
      const created = await User.create({
        email: Email.toLowerCase(),
        fullName: FullName,
        passwordHash: hash,
        role: Role,
        status: 'ACTIVE',
        isEmailVerified: true,
      });

      return res.status(201).json({ id: created._id.toString() });
    } catch (error) {
      console.error('Admin users create error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // PUT /api/admin/users/:id
  router.put('/:id', async (req, res) => {
    try {
      const { FullName, Role, IsActive } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json(ApiResponse.error('User not found'));

      user.fullName = FullName;
      user.role = Role;
      user.status = IsActive ? 'ACTIVE' : 'INACTIVE';

      await user.save();
      return res.status(204).send();
    } catch (error) {
      console.error('Admin users update error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // PATCH /api/admin/users/:id/status
  router.patch('/:id/status', async (req, res) => {
    try {
      const { IsActive } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json(ApiResponse.error('User not found'));

      user.status = IsActive ? 'ACTIVE' : 'INACTIVE';
      await user.save();
      return res.status(204).send();
    } catch (error) {
      console.error('Admin users status error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  return router;
}
