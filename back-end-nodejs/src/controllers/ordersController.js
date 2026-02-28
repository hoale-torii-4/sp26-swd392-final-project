import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/index.js';
import { ApiResponse } from '../dtos/index.js';

/**
 * Orders Controller - Tương đương OrdersController.cs
 * Routes: /api/orders
 */
export function createOrdersRouter(orderService, emailService) {
  const router = Router();

  // ========== Tạo đơn hàng B2C (Guest hoặc Member) ==========
  router.post('/b2c', async (req, res) => {
    try {
      console.log(`Creating B2C order for email: ${req.body.CustomerEmail}`);

      // Validate
      const validation = await orderService.validateB2COrder(req.body);
      if (!validation.IsValid) {
        return res.status(400).json(
          ApiResponse.error('Validation failed', validation.Errors)
        );
      }

      // Create order
      const order = await orderService.placeB2COrder(req.body);

      // Send confirmation email (non-blocking)
      try {
        await emailService.sendOrderConfirmation(
          req.body.CustomerEmail,
          order.orderCode,
          order.totalAmount
        );
      } catch (ex) {
        console.warn(`Email sending failed for order ${order.orderCode}:`, ex.message);
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            orderId: order._id.toString(),
            orderCode: order.orderCode,
            orderType: order.orderType,
            status: order.status,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
          },
          'B2C Order created successfully'
        )
      );
    } catch (error) {
      console.error('Error creating B2C order:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ========== Tạo đơn hàng B2B (Member - nhiều địa chỉ) ==========
  router.post('/b2b', authenticate, async (req, res) => {
    try {
      console.log(`Creating B2B order for user: ${req.body.UserId}`);

      const validation = await orderService.validateB2BOrder(req.body);
      if (!validation.IsValid) {
        return res.status(400).json(
          ApiResponse.error('B2B Validation failed', validation.Errors)
        );
      }

      const order = await orderService.placeB2BOrder(req.body);

      try {
        await emailService.sendOrderConfirmation(
          req.body.CustomerEmail,
          order.orderCode,
          order.totalAmount
        );
      } catch (ex) {
        console.warn(`Email sending failed for order ${order.orderCode}:`, ex.message);
      }

      return res.status(200).json(
        ApiResponse.success(
          {
            orderId: order._id.toString(),
            orderCode: order.orderCode,
            orderType: order.orderType,
            status: order.status,
            totalAmount: order.totalAmount,
            deliveryAddressCount: req.body.DeliveryAllocations?.length || 0,
            createdAt: order.createdAt,
          },
          'B2B Order created successfully'
        )
      );
    } catch (error) {
      console.error('Error creating B2B order:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ========== Track đơn hàng cho guest ==========
  router.get('/track', async (req, res) => {
    try {
      const { orderCode, email } = req.query;
      const tracking = await orderService.trackOrder(orderCode, email);
      if (!tracking) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.status(200).json(tracking);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  // ========== Lấy danh sách đơn hàng (cho authenticated user) ==========
  router.get('/my-orders', async (_req, res) => {
    try {
      // TODO: Implement GetOrdersByUserAsync
      return res.status(200).json({ orders: [], message: 'Coming soon' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });

  // ========== Cập nhật trạng thái đơn hàng - CHỈ STAFF ==========
  router.put('/:orderId/status', authenticate, authorize('STAFF'), async (req, res) => {
    try {
      const { orderId } = req.params;
      const { Status, Note } = req.body;

      // CHỈ STAFF được update status
      const userRole = req.user?.role || 'MEMBER';
      if (userRole !== 'STAFF') {
        return res.status(403).json({
          Success: false,
          Message: 'Only STAFF can update order status. Admin cannot modify orders.',
        });
      }

      const updatedBy = req.user?.name || 'Staff';
      const order = await orderService.updateStatus(orderId, Status, updatedBy, Note);

      return res.status(200).json(
        ApiResponse.success(
          {
            id: order._id.toString(),
            orderCode: order.orderCode,
            status: order.status,
            updatedAt: order.updatedAt,
          },
          `Order status updated to ${Status}`
        )
      );
    } catch (error) {
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ========== Validate Mix & Match Rules ==========
  router.post('/validate-mixmatch/:customBoxId', async (req, res) => {
    try {
      const { customBoxId } = req.params;
      const result = await orderService.validateMixMatchRules(customBoxId);

      return res.status(200).json(
        new ApiResponse(
          result.IsValid,
          result.IsValid ? 'Mix & Match validation passed' : 'Mix & Match validation failed',
          result
        )
      );
    } catch (error) {
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  return router;
}
