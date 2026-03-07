import { Router } from 'express';
import { ApiResponse, validateCreateOrderB2CDto, validateCreateOrderB2BDto } from '../dtos/index.js';
import { authenticate, authorize } from '../middlewares/index.js';

/**
 * Orders Controller - Tương đương OrdersController.cs
 * Routes: /api/orders
 */
export function createOrdersRouter(orderService, emailService) {
  const router = Router();

  // ========== POST /api/orders/b2c ==========
  router.post('/b2c', async (req, res) => {
    try {
      const errors = validateCreateOrderB2CDto(req.body);
      if (errors.length > 0) {
        return res.status(400).json(ApiResponse.error('Validation failed', errors));
      }

      const order = await orderService.placeB2COrder(req.body);

      // Gửi email xác nhận (non-blocking)
      emailService.sendOrderConfirmation(order.customerEmail, order).catch(() => { });

      return res.status(200).json(
        ApiResponse.success({
          OrderCode: order.orderCode,
          TotalAmount: order.totalAmount,
          Status: order.status,
          Message: 'Đơn hàng B2C tạo thành công.',
        })
      );
    } catch (error) {
      console.error('PlaceB2COrder error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ========== POST /api/orders/b2b ==========
  router.post('/b2b', authenticate, async (req, res) => {
    try {
      req.body.UserId = req.user.sub;

      const errors = validateCreateOrderB2BDto(req.body);
      if (errors.length > 0) {
        return res.status(400).json(ApiResponse.error('Validation failed', errors));
      }

      const order = await orderService.placeB2BOrder(req.body);

      // Gửi email xác nhận (non-blocking)
      emailService.sendOrderConfirmation(order.customerEmail, order).catch(() => { });

      return res.status(200).json(
        ApiResponse.success({
          OrderCode: order.orderCode,
          TotalAmount: order.totalAmount,
          Status: order.status,
          Message: 'Đơn hàng B2B tạo thành công.',
        })
      );
    } catch (error) {
      console.error('PlaceB2BOrder error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ========== GET /api/orders/track ==========
  router.get('/track', async (req, res) => {
    try {
      const { orderCode, email } = req.query;
      if (!orderCode || !email) {
        return res.status(400).json(ApiResponse.error('orderCode and email are required'));
      }

      const result = await orderService.trackOrder(orderCode, email);
      if (!result) {
        return res.status(404).json(ApiResponse.error('Không tìm thấy đơn hàng.'));
      }

      return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
      console.error('TrackOrder error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ========== PUT /api/orders/:id/status (STAFF/ADMIN) ==========
  router.put('/:id/status', authenticate, authorize('STAFF', 'ADMIN'), async (req, res) => {
    try {
      const { Status, Notes } = req.body;
      const updatedBy = req.user.email || req.user.name || 'Staff';

      const order = await orderService.updateStatus(req.params.id, Status, updatedBy, Notes);

      // Gửi email thông báo (non-blocking)
      emailService.sendOrderStatusUpdate(order.customerEmail, order).catch(() => { });

      return res.status(200).json(
        ApiResponse.success({
          OrderCode: order.orderCode,
          Status: order.status,
          Message: 'Cập nhật trạng thái đơn hàng thành công.',
        })
      );
    } catch (error) {
      console.error('UpdateStatus error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ========== POST /api/orders/validate-mix-match ==========
  router.post('/validate-mix-match', async (req, res) => {
    try {
      const { customBoxId } = req.body;
      if (!customBoxId) {
        return res.status(400).json(ApiResponse.error('customBoxId is required'));
      }

      const result = await orderService.validateMixMatchRules(customBoxId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('ValidateMixMatch error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ========== PUT /api/orders/deliveries/:deliveryId/status (STAFF) ==========
  router.put(
    '/deliveries/:deliveryId/status',
    authenticate,
    authorize('STAFF', 'ADMIN'),
    async (req, res) => {
      try {
        const { Status, FailureReason } = req.body;
        await orderService.updateDeliveryStatus(req.params.deliveryId, Status, FailureReason);

        return res.status(200).json(
          ApiResponse.success(null, 'Cập nhật trạng thái delivery thành công.')
        );
      } catch (error) {
        console.error('UpdateDeliveryStatus error:', error);
        return res.status(400).json(ApiResponse.error(error.message));
      }
    }
  );

  // ========== POST /api/orders/deliveries/:deliveryId/reship (STAFF) ==========
  router.post(
    '/deliveries/:deliveryId/reship',
    authenticate,
    authorize('STAFF', 'ADMIN'),
    async (req, res) => {
      try {
        await orderService.reshipDelivery(req.params.deliveryId);

        return res.status(200).json(
          ApiResponse.success(null, 'Đã giao lại delivery thành công.')
        );
      } catch (error) {
        console.error('ReshipDelivery error:', error);
        return res.status(400).json(ApiResponse.error(error.message));
      }
    }
  );

  return router;
}
