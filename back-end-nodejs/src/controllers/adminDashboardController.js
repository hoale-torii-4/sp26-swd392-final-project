import { Router } from 'express';
import { ApiResponse } from '../dtos/index.js';
import { Order, GiftBox, Collection, Item, Review } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/index.js';
import { OrderStatus, OrderType } from '../models/enums.js';

/**
 * Admin Dashboard Controller - /api/admin/dashboard
 */
export function createAdminDashboardRouter() {
  const router = Router();

  router.use(authenticate, authorize('ADMIN', 'STAFF'));

  const todayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const orderStatusBuckets = (orders) => {
    const summary = {
      PendingPayment: 0,
      Preparing: 0,
      Shipping: 0,
      DeliveryFailed: 0,
      PartiallyDelivered: 0,
      Completed: 0,
      Cancelled: 0,
    };

    orders.forEach((o) => {
      switch (o.status) {
        case OrderStatus.PAYMENT_CONFIRMING:
          summary.PendingPayment += 1;
          break;
        case OrderStatus.PREPARING:
          summary.Preparing += 1;
          break;
        case OrderStatus.SHIPPING:
          summary.Shipping += 1;
          break;
        case OrderStatus.DELIVERY_FAILED:
          summary.DeliveryFailed += 1;
          break;
        case OrderStatus.PARTIAL_DELIVERY:
          summary.PartiallyDelivered += 1;
          break;
        case OrderStatus.COMPLETED:
          summary.Completed += 1;
          break;
        case OrderStatus.CANCELLED:
          summary.Cancelled += 1;
          break;
        default:
          break;
      }
    });

    return summary;
  };

  const orderTypeBuckets = (orders) => {
    let b2cOrders = 0;
    let b2bOrders = 0;
    let b2cRevenue = 0;
    let b2bRevenue = 0;

    orders.forEach((o) => {
      if (o.orderType === OrderType.B2B) {
        b2bOrders += 1;
        b2bRevenue += o.totalAmount || 0;
      } else {
        b2cOrders += 1;
        b2cRevenue += o.totalAmount || 0;
      }
    });

    const totalOrders = b2cOrders + b2bOrders || 1;
    return {
      B2cOrders: b2cOrders,
      B2bOrders: b2bOrders,
      B2cRevenue: b2cRevenue,
      B2bRevenue: b2bRevenue,
      B2cPercent: Math.round((b2cOrders / totalOrders) * 10000) / 100,
      B2bPercent: Math.round((b2bOrders / totalOrders) * 10000) / 100,
    };
  };

  // GET /api/admin/dashboard/summary
  router.get('/summary', async (_req, res) => {
    try {
      const orders = await Order.find().lean();
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalOrders = orders.length;

      const today = todayRange();
      const ordersToday = await Order.countDocuments({ createdAt: { $gte: today.start, $lte: today.end } });

      const typeSummary = orderTypeBuckets(orders);

      return res.status(200).json({
        TotalRevenue: totalRevenue,
        RevenueGrowthPercent: 0,
        TotalOrders: totalOrders,
        OrderGrowthPercent: 0,
        OrdersToday: ordersToday,
        B2cPercent: typeSummary.B2cPercent,
        B2bPercent: typeSummary.B2bPercent,
        LastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Admin dashboard summary error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/dashboard/order-status
  router.get('/order-status', async (_req, res) => {
    try {
      const orders = await Order.find().lean();
      return res.status(200).json(orderStatusBuckets(orders));
    } catch (error) {
      console.error('Admin dashboard order-status error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/dashboard/order-type
  router.get('/order-type', async (_req, res) => {
    try {
      const orders = await Order.find().lean();
      return res.status(200).json(orderTypeBuckets(orders));
    } catch (error) {
      console.error('Admin dashboard order-type error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/dashboard/top-collections
  router.get('/top-collections', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 5;
      const orders = await Order.find({ status: OrderStatus.COMPLETED }).lean();

      const giftBoxes = await GiftBox.find().lean();
      const collections = await Collection.find().lean();
      const collectionMap = new Map(collections.map((c) => [c._id.toString(), c]));

      const stats = new Map();
      for (const order of orders) {
        for (const item of order.items || []) {
          if (!item.giftBoxId) continue;
          const giftBox = giftBoxes.find((g) => g._id.toString() === item.giftBoxId.toString());
          if (!giftBox) continue;

          const key = giftBox.collectionId;
          const entry = stats.get(key) || { orders: 0, revenue: 0 };
          entry.orders += item.quantity || 0;
          entry.revenue += item.totalPrice || 0;
          stats.set(key, entry);
        }
      }

      const totalRevenue = Array.from(stats.values()).reduce((sum, v) => sum + v.revenue, 0) || 1;
      const result = Array.from(stats.entries())
        .map(([collectionId, value], index) => {
          const collection = collectionMap.get(collectionId);
          return {
            Rank: index + 1,
            CollectionId: collectionId,
            CollectionName: collection?.name || '',
            Orders: value.orders,
            Revenue: value.revenue,
            Percent: Math.round((value.revenue / totalRevenue) * 10000) / 100,
            Thumbnail: null,
          };
        })
        .sort((a, b) => b.Revenue - a.Revenue)
        .slice(0, limit);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Admin dashboard top-collections error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/dashboard/top-giftboxes
  router.get('/top-giftboxes', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const orders = await Order.find({ status: OrderStatus.COMPLETED }).lean();
      const giftBoxes = await GiftBox.find().lean();
      const giftBoxMap = new Map(giftBoxes.map((g) => [g._id.toString(), g]));

      const stats = new Map();
      for (const order of orders) {
        for (const item of order.items || []) {
          if (!item.giftBoxId) continue;
          const key = item.giftBoxId.toString();
          const entry = stats.get(key) || { quantity: 0, revenue: 0 };
          entry.quantity += item.quantity || 0;
          entry.revenue += item.totalPrice || 0;
          stats.set(key, entry);
        }
      }

      const result = Array.from(stats.entries())
        .map(([giftBoxId, value]) => {
          const giftBox = giftBoxMap.get(giftBoxId);
          return {
            GiftBoxId: giftBoxId,
            GiftBoxName: giftBox?.name || '',
            Image: giftBox?.images?.[0] || null,
            CollectionName: giftBox?.collectionId || '',
            SoldQuantity: value.quantity,
            Revenue: value.revenue,
          };
        })
        .sort((a, b) => b.Revenue - a.Revenue)
        .slice(0, limit);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Admin dashboard top-giftboxes error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/dashboard/inventory-alert
  router.get('/inventory-alert', async (req, res) => {
    try {
      const threshold = Number(req.query.threshold) || 10;
      const items = await Item.find({ stockQuantity: { $lte: threshold } }).lean();

      const result = items.map((i) => ({
        ItemId: i._id.toString(),
        ItemName: i.name,
        Category: i.category,
        StockQuantity: i.stockQuantity,
        Threshold: threshold,
      }));

      return res.status(200).json(result);
    } catch (error) {
      console.error('Admin dashboard inventory alert error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/dashboard/export (stub)
  router.get('/export', async (_req, res) => {
    return res.status(501).json(ApiResponse.error('Export not implemented in Node.js yet'));
  });

  return router;
}
