import { Router } from 'express';
import { ApiResponse, PagedResponse } from '../dtos/index.js';
import { Item, CustomBox, SystemConfig } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/index.js';

/**
 * Mix & Match Controller - admin + customer endpoints
 */
export function createMixMatchRouter() {
  const router = Router();

  const getStockStatus = (qty) => {
    if (qty === 0) return { status: 'OUT_OF_STOCK', label: 'Out of stock' };
    if (qty <= 20) return { status: 'LOW_STOCK', label: 'Low stock' };
    return { status: 'IN_STOCK', label: 'In stock' };
  };

  // ================= Admin endpoints =================
  router.get('/admin/mix-match/items', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const { search, category, isActive, page = 1, pageSize = 20 } = req.query;
      const query = {};

      if (search) query.name = { $regex: search, $options: 'i' };
      if (category) query.category = category;
      if (isActive !== undefined && isActive !== null && isActive !== '') {
        query.isActive = isActive === 'true' || isActive === true;
      }

      const total = await Item.countDocuments(query);
      const items = await Item.find(query)
        .sort({ name: 1 })
        .skip((Number(page) - 1) * Number(pageSize))
        .limit(Number(pageSize))
        .lean();

      const data = items.map((i) => {
        const statusInfo = getStockStatus(i.stockQuantity);
        return {
          Id: i._id.toString(),
          Name: i.name,
          Image: i.images?.[0] || 'item-default.jpg',
          Category: i.category,
          CategoryLabel: i.category,
          Price: i.price,
          IsAlcohol: i.isAlcohol,
          StockQuantity: i.stockQuantity,
          StockStatus: statusInfo.status,
          StockStatusLabel: statusInfo.label,
          IsActive: i.isActive,
          StatusLabel: i.isActive ? 'Active' : 'Disabled',
        };
      });

      return res.status(200).json(new PagedResponse(data, total, Number(page), Number(pageSize)));
    } catch (error) {
      console.error('MixMatch admin list error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  router.get('/admin/mix-match/items/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const item = await Item.findById(req.params.id).lean();
      if (!item) return res.status(404).json(ApiResponse.error('Item not found'));

      const statusInfo = getStockStatus(item.stockQuantity);
      return res.status(200).json({
        Id: item._id.toString(),
        Name: item.name,
        Image: item.images?.[0] || 'item-default.jpg',
        Category: item.category,
        CategoryLabel: item.category,
        Price: item.price,
        IsAlcohol: item.isAlcohol,
        StockQuantity: item.stockQuantity,
        StockStatus: statusInfo.status,
        StockStatusLabel: statusInfo.label,
        IsActive: item.isActive,
        StatusLabel: item.isActive ? 'Active' : 'Disabled',
      });
    } catch (error) {
      console.error('MixMatch admin detail error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  router.post('/admin/mix-match/items', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const { Name, Price, Category, Image, Description, IsAlcohol, IsActive } = req.body;
      const item = await Item.create({
        name: Name,
        price: Price || 0,
        category: Category,
        images: Image ? [Image] : [],
        isAlcohol: !!IsAlcohol,
        stockQuantity: 0,
        isActive: IsActive !== undefined ? IsActive : true,
      });

      return res.status(201).json(item._id.toString());
    } catch (error) {
      console.error('MixMatch admin create error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  router.put('/admin/mix-match/items/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const { Name, Price, Category, Image, IsAlcohol, IsActive } = req.body;
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json(ApiResponse.error('Item not found'));

      item.name = Name;
      item.price = Price || 0;
      item.category = Category;
      item.isAlcohol = !!IsAlcohol;
      item.isActive = IsActive !== undefined ? IsActive : true;
      if (Image) item.images = [Image];

      await item.save();
      return res.status(204).send();
    } catch (error) {
      console.error('MixMatch admin update error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  router.patch('/admin/mix-match/items/:id/status', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const { IsActive } = req.body;
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json(ApiResponse.error('Item not found'));

      item.isActive = !!IsActive;
      await item.save();
      return res.status(204).send();
    } catch (error) {
      console.error('MixMatch admin toggle status error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  router.delete('/admin/mix-match/items/:id', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const itemId = req.params.id;
      const usedInGiftBox = await Item.exists({ _id: itemId, isActive: { $in: [true, false] } });
      if (!usedInGiftBox) {
        return res.status(404).json(ApiResponse.error('Item not found'));
      }

      // Hard delete with checks in services is omitted for brevity; follow C# behavior by preventing delete if referenced
      const usedInCustom = await CustomBox.exists({ 'items.itemId': itemId });
      if (usedInCustom) {
        return res.status(400).json(ApiResponse.error('Cannot delete item because it is used in existing gift boxes or orders'));
      }

      await Item.deleteOne({ _id: itemId });
      return res.status(204).send();
    } catch (error) {
      console.error('MixMatch admin delete error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  router.get('/admin/mix-match/categories', authenticate, authorize('ADMIN', 'STAFF'), async (_req, res) => {
    return res.status(200).json([
      { value: 'NUT', label: 'Hạt' },
      { value: 'FOOD', label: 'Snack' },
      { value: 'DRINK', label: 'Trà' },
      { value: 'ALCOHOL', label: 'Rượu' },
    ]);
  });

  router.get('/admin/mix-match/rules', authenticate, authorize('ADMIN', 'STAFF'), async (_req, res) => {
    try {
      const cfg = await SystemConfig.findById('MIX_MATCH_RULE');
      if (!cfg || !cfg.emailTemplate) return res.status(200).json({ MinItems: 4, MaxItems: 6, MinDrink: 1, MinSnack: 2, MaxSavory: 2 });

      try {
        const rules = JSON.parse(cfg.emailTemplate);
        return res.status(200).json(rules || { MinItems: 4, MaxItems: 6, MinDrink: 1, MinSnack: 2, MaxSavory: 2 });
      } catch {
        return res.status(200).json({ MinItems: 4, MaxItems: 6, MinDrink: 1, MinSnack: 2, MaxSavory: 2 });
      }
    } catch (error) {
      console.error('MixMatch rules error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  router.put('/admin/mix-match/rules', authenticate, authorize('ADMIN', 'STAFF'), async (req, res) => {
    try {
      const json = JSON.stringify(req.body || {});
      const existing = await SystemConfig.findById('MIX_MATCH_RULE');
      if (existing) {
        existing.emailTemplate = json;
        await existing.save();
      } else {
        await SystemConfig.create({
          _id: 'MIX_MATCH_RULE',
          emailTemplate: json,
          deliverySlotLimit: 50,
        });
      }
      return res.status(204).send();
    } catch (error) {
      console.error('MixMatch rules update error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ================= Customer endpoints =================
  router.post('/mix-match/custom-box', authenticate, async (req, res) => {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) return res.status(401).json(ApiResponse.error('Unauthorized'));

      const { Items } = req.body;
      if (!Items || !Array.isArray(Items) || Items.length === 0) {
        return res.status(400).json(ApiResponse.error('Items are required'));
      }

      const totalItems = Items.reduce((sum, i) => sum + (i.Quantity || 0), 0);
      if (totalItems < 4 || totalItems > 6) {
        return res.status(400).json(ApiResponse.error('Custom box must contain between 4 and 6 items.'));
      }

      const itemIds = [...new Set(Items.map((i) => i.ItemId))];
      const items = await Item.find({ _id: { $in: itemIds } }).lean();
      if (items.length !== itemIds.length) {
        return res.status(400).json(ApiResponse.error('One or more selected items were not found.'));
      }

      const itemMap = new Map(items.map((i) => [i._id.toString(), i]));
      const customBoxItems = Items.map((i) => ({ itemId: i.ItemId, quantity: i.Quantity }));

      let totalPrice = 0;
      for (const it of customBoxItems) {
        const item = itemMap.get(it.itemId);
        totalPrice += (item?.price || 0) * it.quantity;
      }

      const customBox = await CustomBox.create({
        userId,
        items: customBoxItems,
        totalPrice,
      });

      return res.status(201).json(customBox._id.toString());
    } catch (error) {
      console.error('MixMatch create custom box error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  router.get('/mix-match/custom-box/:id', async (req, res) => {
    try {
      const box = await CustomBox.findById(req.params.id).lean();
      if (!box) return res.status(404).json(ApiResponse.error('Not found'));

      const itemIds = box.items.map((i) => i.itemId);
      const items = await Item.find({ _id: { $in: itemIds } }).lean();
      const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

      const response = {
        Id: box._id.toString(),
        TotalItems: box.items.reduce((sum, i) => sum + i.quantity, 0),
        TotalPrice: box.totalPrice,
        Items: box.items.map((i) => {
          const item = itemMap.get(i.itemId);
          return {
            ItemId: i.itemId,
            Name: item?.name || '',
            Price: item?.price || 0,
            Quantity: i.quantity,
            Subtotal: (item?.price || 0) * i.quantity,
          };
        }),
        CreatedAt: box.createdAt,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('MixMatch get custom box error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  router.get('/mix-match/custom-box/me', authenticate, async (req, res) => {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) return res.status(401).json(ApiResponse.error('Unauthorized'));

      const box = await CustomBox.findOne({ userId }).sort({ createdAt: -1 }).lean();
      if (!box) return res.status(404).json(ApiResponse.error('Not found'));

      const itemIds = box.items.map((i) => i.itemId);
      const items = await Item.find({ _id: { $in: itemIds } }).lean();
      const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

      const response = {
        Id: box._id.toString(),
        TotalItems: box.items.reduce((sum, i) => sum + i.quantity, 0),
        TotalPrice: box.totalPrice,
        Items: box.items.map((i) => {
          const item = itemMap.get(i.itemId);
          return {
            ItemId: i.itemId,
            Name: item?.name || '',
            Price: item?.price || 0,
            Quantity: i.quantity,
            Subtotal: (item?.price || 0) * i.quantity,
          };
        }),
        CreatedAt: box.createdAt,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('MixMatch my custom box error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  router.get('/mix-match/custom-box/me/all', authenticate, async (req, res) => {
    try {
      const userId = req.user?.sub || req.user?.id;
      if (!userId) return res.status(401).json(ApiResponse.error('Unauthorized'));

      const boxes = await CustomBox.find({ userId }).sort({ createdAt: -1 }).lean();
      const responses = [];

      for (const box of boxes) {
        const itemIds = box.items.map((i) => i.itemId);
        const items = await Item.find({ _id: { $in: itemIds } }).lean();
        const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

        responses.push({
          Id: box._id.toString(),
          TotalItems: box.items.reduce((sum, i) => sum + i.quantity, 0),
          TotalPrice: box.totalPrice,
          Items: box.items.map((i) => {
            const item = itemMap.get(i.itemId);
            return {
              ItemId: i.itemId,
              Name: item?.name || '',
              Price: item?.price || 0,
              Quantity: i.quantity,
              Subtotal: (item?.price || 0) * i.quantity,
            };
          }),
          CreatedAt: box.createdAt,
        });
      }

      return res.status(200).json(responses);
    } catch (error) {
      console.error('MixMatch my custom boxes error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  return router;
}
