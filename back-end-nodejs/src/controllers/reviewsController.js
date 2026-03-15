import { Router } from 'express';
import { ApiResponse, PagedResponse } from '../dtos/index.js';
import { Review, GiftBox, User, Order } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/index.js';
import { OrderStatus } from '../models/enums.js';

/**
 * Reviews Controller - admin + user endpoints
 */
export function createReviewsRouter() {
  const router = Router();

  // ================= Admin endpoints =================
  router.get('/admin/reviews', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const { status, rating, giftBoxId, page = 1, pageSize = 20 } = req.query;
      const query = {};
      if (status) query.status = status;
      if (rating) query.rating = Number(rating);
      if (giftBoxId) query.giftBoxId = giftBoxId;

      const total = await Review.countDocuments(query);
      const list = await Review.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(pageSize))
        .limit(Number(pageSize))
        .lean();

      const userIds = [...new Set(list.map((r) => r.userId).filter(Boolean))];
      const giftBoxIds = [...new Set(list.map((r) => r.giftBoxId).filter(Boolean))];

      const users = await User.find({ _id: { $in: userIds } }).lean();
      const giftBoxes = await GiftBox.find({ _id: { $in: giftBoxIds } }).lean();
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));
      const giftBoxMap = new Map(giftBoxes.map((g) => [g._id.toString(), g]));

      const mapStatusLabel = (s) => (s === 'APPROVED' ? 'Approved' : s === 'HIDDEN' ? 'Hidden' : 'Pending');

      const items = list.map((r) => {
        const user = userMap.get(r.userId);
        const giftBox = giftBoxMap.get(r.giftBoxId);
        return {
          Id: r._id.toString(),
          ReviewerName: user?.fullName || '',
          ReviewerEmail: user?.email || '',
          ReviewerAvatar: null,
          GiftBoxId: r.giftBoxId,
          GiftBoxName: giftBox?.name || '',
          GiftBoxImage: giftBox?.images?.[0] || null,
          Rating: r.rating,
          Content: r.comment,
          CreatedAt: r.createdAt,
          Status: r.status,
          StatusLabel: mapStatusLabel(r.status),
        };
      });

      return res.status(200).json(new PagedResponse(items, total, Number(page), Number(pageSize)));
    } catch (error) {
      console.error('Admin reviews list error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  router.get('/admin/reviews/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const review = await Review.findById(req.params.id).lean();
      if (!review) return res.status(404).json(ApiResponse.error('Review not found'));

      const user = review.userId ? await User.findById(review.userId).lean() : null;
      const giftBox = review.giftBoxId ? await GiftBox.findById(review.giftBoxId).lean() : null;
      let orderCode = null;
      if (review.orderId) {
        const order = await Order.findById(review.orderId).lean();
        orderCode = order?.orderCode || null;
      }

      const dto = {
        Id: review._id.toString(),
        ReviewerName: user?.fullName || '',
        ReviewerEmail: user?.email || '',
        ReviewerAvatar: null,
        OrderCode: orderCode,
        GiftBoxId: review.giftBoxId,
        GiftBoxName: giftBox?.name || '',
        GiftBoxImage: giftBox?.images?.[0] || null,
        Rating: review.rating,
        Content: review.comment,
        CreatedAt: review.createdAt,
        Status: review.status,
      };

      return res.status(200).json(dto);
    } catch (error) {
      console.error('Admin review detail error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  router.patch('/admin/reviews/:id/approve', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) return res.status(404).json(ApiResponse.error('Review not found'));

      review.status = 'APPROVED';
      await review.save();
      return res.status(204).send();
    } catch (error) {
      console.error('Admin review approve error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  router.patch('/admin/reviews/:id/hide', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) return res.status(404).json(ApiResponse.error('Review not found'));

      review.status = 'HIDDEN';
      await review.save();
      return res.status(204).send();
    } catch (error) {
      console.error('Admin review hide error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ================= User-facing endpoints =================
  router.post('/reviews', authenticate, async (req, res) => {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) return res.status(401).json(ApiResponse.error('Unauthorized'));

      const { OrderId, GiftBoxId, Rating, Content } = req.body;
      if (!OrderId || !GiftBoxId) {
        return res.status(400).json(ApiResponse.error('OrderId and GiftBoxId are required'));
      }
      if (!Rating || Rating < 1 || Rating > 5) {
        return res.status(400).json(ApiResponse.error('Rating must be between 1 and 5'));
      }

      const order = await Order.findById(OrderId).lean();
      if (!order) return res.status(400).json(ApiResponse.error('Order not found'));
      if (order.status !== OrderStatus.COMPLETED) {
        return res.status(400).json(ApiResponse.error('Order must be COMPLETED to submit a review'));
      }

      const existing = await Review.findOne({ orderId: OrderId, giftBoxId: GiftBoxId, userId });
      if (existing) {
        return res.status(400).json(ApiResponse.error('User has already reviewed this gift box for the order'));
      }

      const review = await Review.create({
        orderId: OrderId,
        giftBoxId: GiftBoxId,
        userId,
        rating: Rating,
        comment: Content || '',
        status: 'PENDING',
      });

      return res.status(200).json({
        Id: review._id.toString(),
        OrderId: review.orderId,
        GiftBoxId: review.giftBoxId,
        UserId: review.userId,
        Rating: review.rating,
        Comment: review.comment,
        Status: review.status,
        CreatedAt: review.createdAt,
      });
    } catch (error) {
      console.error('Create review error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  router.get('/reviews/giftbox/:giftBoxId', async (req, res) => {
    try {
      const giftBoxId = req.params.giftBoxId;
      const list = await Review.find({ giftBoxId, status: 'APPROVED' })
        .sort({ createdAt: -1 })
        .lean();

      const userIds = [...new Set(list.map((r) => r.userId).filter(Boolean))];
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));

      const reviews = list.map((r) => {
        const user = userMap.get(r.userId);
        return {
          ReviewId: r._id.toString(),
          UserName: user?.fullName || '',
          Rating: r.rating,
          Content: r.comment,
          CreatedAt: r.createdAt,
        };
      });

      const avg = reviews.length
        ? Math.round((reviews.reduce((sum, r) => sum + r.Rating, 0) / reviews.length) * 100) / 100
        : 0;

      return res.status(200).json({
        GiftBoxId: giftBoxId,
        AverageRating: avg,
        TotalReviews: reviews.length,
        Reviews: reviews,
      });
    } catch (error) {
      console.error('Giftbox reviews error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  router.get('/user/reviews', authenticate, async (req, res) => {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) return res.status(401).json(ApiResponse.error('Unauthorized'));

      const list = await Review.find({ userId }).sort({ createdAt: -1 }).lean();
      const giftBoxIds = [...new Set(list.map((r) => r.giftBoxId).filter(Boolean))];
      const giftBoxes = await GiftBox.find({ _id: { $in: giftBoxIds } }).lean();
      const giftBoxMap = new Map(giftBoxes.map((g) => [g._id.toString(), g]));

      const items = list.map((r) => {
        const giftBox = giftBoxMap.get(r.giftBoxId);
        return {
          ReviewId: r._id.toString(),
          GiftBoxId: r.giftBoxId,
          GiftBoxName: giftBox?.name || '',
          Rating: r.rating,
          Content: r.comment,
          Status: r.status,
          CreatedAt: r.createdAt,
        };
      });

      return res.status(200).json(items);
    } catch (error) {
      console.error('User reviews error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  return router;
}
