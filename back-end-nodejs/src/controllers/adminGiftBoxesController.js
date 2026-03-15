import { Router } from 'express';
import { ApiResponse, PagedResponse } from '../dtos/index.js';
import { GiftBox, Collection, Item, Tag, Order } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/index.js';
import { OrderItemType } from '../models/enums.js';

/**
 * Admin GiftBoxes Controller - /api/admin/giftboxes
 */
export function createAdminGiftBoxesRouter(productService) {
  const router = Router();

  router.use(authenticate, authorize('ADMIN', 'STAFF'));

  // GET /api/admin/giftboxes
  router.get('/', async (req, res) => {
    try {
      const { collectionId, keyword, status, page = 1, pageSize = 20 } = req.query;

      const query = {};
      if (collectionId) query.collectionId = collectionId;
      if (keyword) query.name = { $regex: keyword, $options: 'i' };
      if (status !== undefined && status !== null && status !== '') {
        query.isActive = status === 'true' || status === true;
      }

      const total = await GiftBox.countDocuments(query);
      const items = await GiftBox.find(query)
        .sort({ name: 1 })
        .skip((Number(page) - 1) * Number(pageSize))
        .limit(Number(pageSize))
        .lean();

      const collectionIds = [...new Set(items.map((i) => i.collectionId))];
      const collections = await Collection.find({ _id: { $in: collectionIds } }).lean();
      const collectionMap = new Map(collections.map((c) => [c._id.toString(), c.name]));

      const tagIds = [...new Set(items.flatMap((i) => i.tags || []))];
      const tags = await Tag.find({ _id: { $in: tagIds } }).lean();
      const tagMap = new Map(tags.map((t) => [t._id.toString(), t.name]));

      const resultItems = items.map((g) => ({
        Id: g._id.toString(),
        Name: g.name,
        Price: g.price,
        CollectionId: g.collectionId,
        CollectionName: collectionMap.get(g.collectionId) || '',
        Type: 'READY_MADE',
        Status: g.isActive,
        StatusLabel: g.isActive ? 'ĐANG BÁN' : 'TẠM ẨN',
        Thumbnail: g.images?.[0] || null,
        TagNames: (g.tags || []).map((id) => tagMap.get(id)).filter(Boolean),
        ItemCount: g.items?.length || 0,
      }));

      return res.status(200).json(
        new PagedResponse(resultItems, total, Number(page), Number(pageSize))
      );
    } catch (error) {
      console.error('Admin giftboxes list error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/giftboxes/:id
  router.get('/:id', async (req, res) => {
    try {
      const giftBox = await GiftBox.findById(req.params.id).lean();
      if (!giftBox) return res.status(404).json(ApiResponse.error('Gift box not found'));

      const collection = await Collection.findById(giftBox.collectionId).lean();
      const tagIds = giftBox.tags || [];
      const tags = await Tag.find({ _id: { $in: tagIds } }).lean();
      const tagMap = new Map(tags.map((t) => [t._id.toString(), t]));

      const itemIds = (giftBox.items || []).map((i) => i.itemId);
      const items = await Item.find({ _id: { $in: itemIds } }).lean();
      const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

      const detail = {
        Id: giftBox._id.toString(),
        Name: giftBox.name,
        Description: giftBox.description,
        Price: giftBox.price,
        CollectionId: giftBox.collectionId,
        CollectionName: collection?.name || '',
        Images: giftBox.images || [],
        Tags: (giftBox.tags || []).map((tagId) => {
          const tag = tagMap.get(tagId);
          return tag
            ? { Id: tag._id.toString(), Name: tag.name, Type: tag.type }
            : null;
        }).filter(Boolean),
        Items: (giftBox.items || []).map((i) => {
          const item = itemMap.get(i.itemId);
          return {
            ItemId: i.itemId,
            ItemName: item?.name || '',
            Category: item?.category || '',
            Price: i.itemPriceSnapshot > 0 ? i.itemPriceSnapshot : item?.price || 0,
            Quantity: i.quantity,
          };
        }),
        IsActive: giftBox.isActive,
        StatusLabel: giftBox.isActive ? 'ĐANG BÁN' : 'TẠM ẨN',
      };

      return res.status(200).json(detail);
    } catch (error) {
      console.error('Admin giftboxes detail error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // POST /api/admin/giftboxes
  router.post('/', async (req, res) => {
    try {
      const created = await productService.createGiftBox(req.body);
      return res.status(201).json(created._id.toString());
    } catch (error) {
      console.error('Admin giftboxes create error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // PUT /api/admin/giftboxes/:id
  router.put('/:id', async (req, res) => {
    try {
      // prevent update if used in orders
      const used = await Order.exists({
        items: { $elemMatch: { type: OrderItemType.READY_MADE, giftBoxId: req.params.id } },
      });
      if (used) {
        return res.status(400).json(ApiResponse.error('Cannot modify gift box used in orders'));
      }

      await productService.updateGiftBox(req.params.id, req.body);
      return res.status(204).send();
    } catch (error) {
      console.error('Admin giftboxes update error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // PATCH /api/admin/giftboxes/:id/status
  router.patch('/:id/status', async (req, res) => {
    try {
      const { IsActive } = req.body;
      const giftBox = await GiftBox.findById(req.params.id);
      if (!giftBox) return res.status(404).json(ApiResponse.error('Gift box not found'));

      giftBox.isActive = !!IsActive;
      await giftBox.save();

      return res.status(204).send();
    } catch (error) {
      console.error('Admin giftboxes toggle status error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // DELETE /api/admin/giftboxes/:id
  router.delete('/:id', async (req, res) => {
    try {
      const used = await Order.exists({
        items: { $elemMatch: { type: OrderItemType.READY_MADE, giftBoxId: req.params.id } },
      });
      if (used) {
        return res.status(400).json(ApiResponse.error('Cannot delete gift box used in orders'));
      }

      await GiftBox.deleteOne({ _id: req.params.id });
      return res.status(204).send();
    } catch (error) {
      console.error('Admin giftboxes delete error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // GET /api/admin/giftboxes/collections
  router.get('/collections', async (_req, res) => {
    try {
      const collections = await Collection.find().sort({ displayOrder: 1 }).lean();
      const dto = collections.map((c) => ({ Id: c._id.toString(), Name: c.name }));
      return res.status(200).json(dto);
    } catch (error) {
      console.error('Admin giftboxes collections error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/giftboxes/items
  router.get('/items', async (_req, res) => {
    try {
      const items = await Item.find().sort({ name: 1 }).lean();
      const dto = items.map((i) => ({
        Id: i._id.toString(),
        Name: i.name,
        Category: i.category,
        Price: i.price,
        StockQuantity: i.stockQuantity,
      }));
      return res.status(200).json(dto);
    } catch (error) {
      console.error('Admin giftboxes items error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/giftboxes/tags
  router.get('/tags', async (_req, res) => {
    try {
      const tags = await Tag.find().sort({ name: 1 }).lean();
      const dto = tags.map((t) => ({ Id: t._id.toString(), Name: t.name, Type: t.type }));
      return res.status(200).json(dto);
    } catch (error) {
      console.error('Admin giftboxes tags error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  return router;
}
