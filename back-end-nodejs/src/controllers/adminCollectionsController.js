import { Router } from 'express';
import { ApiResponse, PagedResponse } from '../dtos/index.js';
import { Collection, GiftBox } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/index.js';

/**
 * Admin Collections Controller - /api/admin/collections
 */
export function createAdminCollectionsRouter() {
  const router = Router();

  router.use(authenticate, authorize('ADMIN', 'STAFF'));

  // GET /api/admin/collections
  router.get('/', async (_req, res) => {
    try {
      const collections = await Collection.find().sort({ displayOrder: 1 }).lean();
      const giftBoxes = await GiftBox.find().lean();

      const groupMap = new Map();
      giftBoxes.forEach((g) => {
        const entry = groupMap.get(g.collectionId) || { count: 0, thumbnail: null };
        entry.count += 1;
        if (!entry.thumbnail && g.images?.length) {
          entry.thumbnail = g.images[0];
        }
        groupMap.set(g.collectionId, entry);
      });

      const result = collections.map((c) => {
        const group = groupMap.get(c._id.toString()) || { count: 0, thumbnail: null };
        return {
          Id: c._id.toString(),
          Name: c.name,
          Description: c.description,
          DisplayOrder: c.displayOrder,
          IsActive: c.isActive,
          StatusLabel: c.isActive ? 'Published' : 'Unpublished',
          GiftBoxCount: group.count,
          Thumbnail: group.thumbnail,
        };
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Admin collections list error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/collections/:id
  router.get('/:id', async (req, res) => {
    try {
      const collection = await Collection.findById(req.params.id).lean();
      if (!collection) return res.status(404).json(ApiResponse.error('Collection not found'));

      const giftBoxCount = await GiftBox.countDocuments({ collectionId: collection._id.toString() });
      const thumbnail = await GiftBox.findOne({ collectionId: collection._id.toString(), images: { $exists: true, $ne: [] } })
        .select({ images: 1 })
        .lean();

      const dto = {
        Id: collection._id.toString(),
        Name: collection.name,
        Description: collection.description,
        DisplayOrder: collection.displayOrder,
        IsActive: collection.isActive,
        StatusLabel: collection.isActive ? 'Published' : 'Unpublished',
        GiftBoxCount: giftBoxCount,
        Thumbnail: thumbnail?.images?.[0] || null,
      };

      return res.status(200).json(dto);
    } catch (error) {
      console.error('Admin collections detail error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // POST /api/admin/collections
  router.post('/', async (req, res) => {
    try {
      const { Name, Description, DisplayOrder, IsActive } = req.body;
      const created = await Collection.create({
        name: Name,
        description: Description || '',
        displayOrder: DisplayOrder || 0,
        isActive: IsActive !== undefined ? IsActive : true,
      });

      return res.status(201).json(created._id.toString());
    } catch (error) {
      console.error('Admin collections create error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // PUT /api/admin/collections/:id
  router.put('/:id', async (req, res) => {
    try {
      const { Name, Description, DisplayOrder, IsActive } = req.body;
      const collection = await Collection.findById(req.params.id);
      if (!collection) return res.status(404).json(ApiResponse.error('Collection not found'));

      collection.name = Name;
      collection.description = Description || '';
      collection.displayOrder = DisplayOrder || 0;
      collection.isActive = !!IsActive;
      await collection.save();

      return res.status(204).send();
    } catch (error) {
      console.error('Admin collections update error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // PATCH /api/admin/collections/:id/status
  router.patch('/:id/status', async (req, res) => {
    try {
      const { IsActive } = req.body;
      const collection = await Collection.findById(req.params.id);
      if (!collection) return res.status(404).json(ApiResponse.error('Collection not found'));

      collection.isActive = !!IsActive;
      await collection.save();

      return res.status(204).send();
    } catch (error) {
      console.error('Admin collections toggle status error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // DELETE /api/admin/collections/:id
  router.delete('/:id', async (req, res) => {
    try {
      const hasGiftBoxes = await GiftBox.exists({ collectionId: req.params.id });
      if (hasGiftBoxes) {
        return res.status(400).json(ApiResponse.error('Cannot delete collection containing gift boxes'));
      }

      await Collection.deleteOne({ _id: req.params.id });
      return res.status(204).send();
    } catch (error) {
      console.error('Admin collections delete error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // PATCH /api/admin/collections/reorder
  router.patch('/reorder', async (req, res) => {
    try {
      const items = req.body || [];
      if (!Array.isArray(items) || items.length === 0) return res.status(204).send();

      const ids = items.map((i) => i.Id);
      const collections = await Collection.find({ _id: { $in: ids } });
      const map = new Map(items.map((i) => [i.Id, i.DisplayOrder]));

      for (const c of collections) {
        const order = map.get(c._id.toString());
        if (order !== undefined) c.displayOrder = order;
      }

      await Promise.all(collections.map((c) => c.save()));
      return res.status(204).send();
    } catch (error) {
      console.error('Admin collections reorder error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  return router;
}
