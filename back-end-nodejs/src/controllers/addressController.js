import { Router } from 'express';
import { Address } from '../models/index.js';
import { ApiResponse } from '../dtos/index.js';
import { authenticate } from '../middlewares/index.js';

/**
 * Address Controller - Tương đương AddressController.cs
 * Routes: /api/address
 */
export function createAddressRouter() {
  const router = Router();

  // All routes require auth
  router.use(authenticate);

  function getUserId(req) {
    return req.user?.sub || req.user?.id || req.user?.userId || null;
  }

  // GET /api/address
  router.get('/', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Không xác định được người dùng.'));
      }

      const addresses = await Address.find({ userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();

      return res.status(200).json({ Success: true, Data: addresses });
    } catch (error) {
      console.error('Get addresses error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // POST /api/address
  router.post('/', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Không xác định được người dùng.'));
      }

      const { ReceiverName, ReceiverPhone, FullAddress, IsDefault } = req.body;

      if (!ReceiverName || !FullAddress) {
        return res
          .status(400)
          .json(ApiResponse.error('Tên người nhận và địa chỉ không được để trống.'));
      }

      if (IsDefault) {
        await Address.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } });
      }

      const address = await Address.create({
        userId,
        receiverName: ReceiverName?.trim(),
        receiverPhone: ReceiverPhone?.trim() || '',
        fullAddress: FullAddress?.trim(),
        isDefault: !!IsDefault,
      });

      return res.status(200).json({ Success: true, Data: address });
    } catch (error) {
      console.error('Add address error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // PUT /api/address/:id
  router.put('/:id', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Không xác định được người dùng.'));
      }

      const { ReceiverName, ReceiverPhone, FullAddress, IsDefault } = req.body;
      const address = await Address.findOne({ _id: req.params.id, userId });

      if (!address) {
        return res.status(404).json(ApiResponse.error('Không tìm thấy địa chỉ.'));
      }

      if (IsDefault) {
        await Address.updateMany({ userId, isDefault: true, _id: { $ne: address._id } }, { $set: { isDefault: false } });
      }

      if (ReceiverName !== undefined) address.receiverName = ReceiverName?.trim() || '';
      if (ReceiverPhone !== undefined) address.receiverPhone = ReceiverPhone?.trim() || '';
      if (FullAddress !== undefined) address.fullAddress = FullAddress?.trim() || '';
      if (IsDefault !== undefined) address.isDefault = !!IsDefault;

      await address.save();
      return res.status(200).json({ Success: true, Data: address });
    } catch (error) {
      console.error('Update address error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // DELETE /api/address/:id
  router.delete('/:id', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Không xác định được người dùng.'));
      }

      const address = await Address.findOne({ _id: req.params.id, userId });
      if (!address) {
        return res.status(404).json(ApiResponse.error('Không tìm thấy địa chỉ.'));
      }

      await Address.deleteOne({ _id: address._id });
      return res.status(200).json({ Success: true, Message: 'Đã xoá địa chỉ.' });
    } catch (error) {
      console.error('Delete address error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // PATCH /api/address/:id/set-default
  router.patch('/:id/set-default', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json(ApiResponse.error('Không xác định được người dùng.'));
      }

      const addresses = await Address.find({ userId });
      const target = addresses.find((a) => a._id.toString() === req.params.id);
      if (!target) {
        return res.status(404).json(ApiResponse.error('Không tìm thấy địa chỉ.'));
      }

      await Address.updateMany({ userId }, { $set: { isDefault: false } });
      target.isDefault = true;
      await target.save();

      return res.status(200).json({ Success: true, Data: target });
    } catch (error) {
      console.error('Set default address error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  return router;
}
