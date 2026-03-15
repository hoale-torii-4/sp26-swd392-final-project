import { Router } from 'express';
import { ApiResponse } from '../dtos/index.js';
import { Order, GiftBox, Collection, Item, Review } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/index.js';
import { OrderStatus, OrderType } from '../models/enums.js';

/**
 * Reports Controller - /api/admin/reports
 */
export function createReportsRouter() {
  const router = Router();

  router.use(authenticate, authorize('ADMIN', 'STAFF'));

  // GET /api/admin/reports/dashboard
  router.get('/dashboard', async (_req, res) => {
    try {
      const orders = await Order.find().lean();
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalOrders = orders.length;

      const b2cOrders = orders.filter((o) => o.orderType === OrderType.B2C).length;
      const b2bOrders = orders.filter((o) => o.orderType === OrderType.B2B).length;
      const b2cPercent = totalOrders ? Math.round((b2cOrders / totalOrders) * 10000) / 100 : 0;
      const b2bPercent = totalOrders ? Math.round((b2bOrders / totalOrders) * 10000) / 100 : 0;

      const statusSummary = {
        PendingPayment: orders.filter((o) => o.status === OrderStatus.PAYMENT_CONFIRMING).length,
        Preparing: orders.filter((o) => o.status === OrderStatus.PREPARING).length,
        Shipping: orders.filter((o) => o.status === OrderStatus.SHIPPING).length,
        Completed: orders.filter((o) => o.status === OrderStatus.COMPLETED).length,
        Cancelled: orders.filter((o) => o.status === OrderStatus.CANCELLED).length,
        DeliveryFailed: orders.filter((o) => o.status === OrderStatus.DELIVERY_FAILED).length,
      };

      return res.status(200).json({
        TotalRevenue: totalRevenue,
        RevenueGrowthPercent: 0,
        TotalOrders: totalOrders,
        OrderGrowthPercent: 0,
        B2CPercent: b2cPercent,
        B2BPercent: b2bPercent,
        StatusSummary: statusSummary,
      });
    } catch (error) {
      console.error('Reports dashboard error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/reports/revenue
  router.get('/revenue', async (req, res) => {
    try {
      const { fromDate, toDate, view = 'day', orderType } = req.query;
      const query = {};
      if (orderType) query.orderType = orderType;
      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
      }

      const orders = await Order.find(query).lean();
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const chartMap = new Map();
      const formatKey = (date) => {
        const d = new Date(date);
        if (view === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      orders.forEach((o) => {
        const key = formatKey(o.createdAt);
        chartMap.set(key, (chartMap.get(key) || 0) + (o.totalAmount || 0));
      });

      const chart = Array.from(chartMap.entries()).map(([DateKey, Revenue]) => ({
        Date: DateKey,
        Revenue: Revenue,
        LastYearRevenue: 0,
      }));

      return res.status(200).json({
        TotalRevenue: totalRevenue,
        GrowthPercent: 0,
        BestDay: chart.length ? { Date: chart[0].Date, Revenue: chart[0].Revenue } : { Date: '', Revenue: 0 },
        B2CPercent: 0,
        B2BPercent: 0,
        Chart: chart,
      });
    } catch (error) {
      console.error('Reports revenue error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/reports/collections-performance
  router.get('/collections-performance', async (_req, res) => {
    try {
      const orders = await Order.find({ status: OrderStatus.COMPLETED }).lean();
      const giftBoxes = await GiftBox.find().lean();
      const collections = await Collection.find().lean();
      const collectionMap = new Map(collections.map((c) => [c._id.toString(), c]));

      const stats = new Map();
      orders.forEach((o) => {
        o.items?.forEach((it) => {
          if (!it.giftBoxId) return;
          const giftBox = giftBoxes.find((g) => g._id.toString() === it.giftBoxId.toString());
          if (!giftBox) return;
          const key = giftBox.collectionId;
          const entry = stats.get(key) || { orders: 0, revenue: 0 };
          entry.orders += it.quantity || 0;
          entry.revenue += it.totalPrice || 0;
          stats.set(key, entry);
        });
      });

      const totalRevenue = Array.from(stats.values()).reduce((sum, v) => sum + v.revenue, 0) || 1;
      const result = Array.from(stats.entries()).map(([collectionId, value], index) => {
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
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Reports collections performance error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/reports/giftbox-performance
  router.get('/giftbox-performance', async (_req, res) => {
    try {
      const orders = await Order.find({ status: OrderStatus.COMPLETED }).lean();
      const giftBoxes = await GiftBox.find().lean();
      const giftBoxMap = new Map(giftBoxes.map((g) => [g._id.toString(), g]));

      const stats = new Map();
      orders.forEach((o) => {
        o.items?.forEach((it) => {
          if (!it.giftBoxId) return;
          const key = it.giftBoxId.toString();
          const entry = stats.get(key) || { sold: 0, revenue: 0 };
          entry.sold += it.quantity || 0;
          entry.revenue += it.totalPrice || 0;
          stats.set(key, entry);
        });
      });

      const result = Array.from(stats.entries()).map(([giftBoxId, value]) => {
        const giftBox = giftBoxMap.get(giftBoxId);
        return {
          GiftBoxId: giftBoxId,
          GiftBoxName: giftBox?.name || '',
          SoldQuantity: value.sold,
          Revenue: value.revenue,
          AvgRating: 0,
          Image: giftBox?.images?.[0] || null,
          TopProduct: null,
          MarketingSuggestions: null,
        };
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Reports giftbox performance error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/reports/b2c-b2b-comparison
  router.get('/b2c-b2b-comparison', async (_req, res) => {
    try {
      const orders = await Order.find().lean();
      const b2cOrders = orders.filter((o) => o.orderType === OrderType.B2C);
      const b2bOrders = orders.filter((o) => o.orderType === OrderType.B2B);

      const b2cRevenue = b2cOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const b2bRevenue = b2bOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      const monthlyMap = new Map();
      orders.forEach((o) => {
        const date = new Date(o.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const entry = monthlyMap.get(key) || { B2COrders: 0, B2BOrders: 0 };
        if (o.orderType === OrderType.B2B) entry.B2BOrders += 1; else entry.B2COrders += 1;
        monthlyMap.set(key, entry);
      });

      const monthly = Array.from(monthlyMap.entries()).map(([Month, value]) => ({
        Month,
        B2COrders: value.B2COrders,
        B2BOrders: value.B2BOrders,
      }));

      return res.status(200).json({
        B2CRevenue: b2cRevenue,
        B2COrders: b2cOrders.length,
        B2CAvgOrderValue: b2cOrders.length ? b2cRevenue / b2cOrders.length : 0,
        B2BRevenue: b2bRevenue,
        B2BOrders: b2bOrders.length,
        TotalGiftBoxes: 0,
        MonthlyOrdersChart: monthly,
      });
    } catch (error) {
      console.error('Reports b2c-b2b error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/reports/inventory-alert
  router.get('/inventory-alert', async (req, res) => {
    try {
      const threshold = Number(req.query.threshold) || 10;
      const items = await Item.find({ stockQuantity: { $lte: threshold } }).lean();
      const result = items.map((i) => ({
        ItemId: i._id.toString(),
        ItemName: i.name,
        Stock: i.stockQuantity,
        Threshold: threshold,
      }));

      return res.status(200).json(result);
    } catch (error) {
      console.error('Reports inventory alert error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // Export endpoints (return 501 for now)
  router.get('/export/revenue', (_req, res) => res.status(501).json(ApiResponse.error('Export not implemented in Node.js yet')));
  router.get('/export/collections', (_req, res) => res.status(501).json(ApiResponse.error('Export not implemented in Node.js yet')));
  router.get('/export/giftboxes', (_req, res) => res.status(501).json(ApiResponse.error('Export not implemented in Node.js yet')));
  router.get('/export/b2c-b2b', (_req, res) => res.status(501).json(ApiResponse.error('Export not implemented in Node.js yet')));
  router.get('/export/inventory-alert', (_req, res) => res.status(501).json(ApiResponse.error('Export not implemented in Node.js yet')));

  return router;
}
