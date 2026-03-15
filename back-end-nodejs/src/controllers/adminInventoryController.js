import { Router } from 'express';
import { ApiResponse, PagedResponse } from '../dtos/index.js';
import { Item, InventoryLog } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/index.js';

/**
 * Admin Inventory Controller - /api/admin/inventory
 */
export function createAdminInventoryRouter() {
  const router = Router();

  router.use(authenticate, authorize('ADMIN', 'STAFF'));

  const getStockStatus = (qty) => {
    if (qty > 20) return { status: 'IN_STOCK', label: 'In stock' };
    if (qty >= 1) return { status: 'LOW_STOCK', label: 'Low stock' };
    return { status: 'OUT_OF_STOCK', label: 'Out of stock' };
  };

  // GET /api/admin/inventory
  router.get('/', async (req, res) => {
    try {
      const { search, category, stockStatus, page = 1, pageSize = 20 } = req.query;
      const query = {};

      if (search) query.name = { $regex: search, $options: 'i' };
      if (category) query.category = category;

      const total = await Item.countDocuments(query);
      const items = await Item.find(query)
        .sort({ name: 1 })
        .skip((Number(page) - 1) * Number(pageSize))
        .limit(Number(pageSize))
        .lean();

      const itemIds = items.map((i) => i._id.toString());
      const lastLogsList = await InventoryLog.find({ itemId: { $in: itemIds } })
        .sort({ createdAt: -1 })
        .select({ itemId: 1, createdAt: 1 })
        .lean();

      const lastLogsMap = new Map();
      for (const log of lastLogsList) {
        if (!lastLogsMap.has(log.itemId)) lastLogsMap.set(log.itemId, log.createdAt);
      }

      const data = items
        .map((i) => {
          const statusInfo = getStockStatus(i.stockQuantity);
          if (stockStatus && stockStatus !== statusInfo.status) return null;

          return {
            Id: i._id.toString(),
            Name: i.name,
            Sku: i._id.toString(),
            Category: i.category,
            CategoryLabel: i.category,
            Price: i.price,
            StockQuantity: i.stockQuantity,
            StockStatus: statusInfo.status,
            StockStatusLabel: statusInfo.label,
            IsAlcohol: i.isAlcohol,
            LastUpdated: lastLogsMap.get(i._id.toString()) || null,
          };
        })
        .filter(Boolean);

      return res.status(200).json(new PagedResponse(data, total, Number(page), Number(pageSize)));
    } catch (error) {
      console.error('Admin inventory list error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/inventory/items/:id
  router.get('/items/:id', async (req, res) => {
    try {
      const item = await Item.findById(req.params.id).lean();
      if (!item) return res.status(404).json(ApiResponse.error('Item not found'));

      const statusInfo = getStockStatus(item.stockQuantity);
      const logs = await InventoryLog.find({ itemId: req.params.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const detail = {
        Id: item._id.toString(),
        Name: item.name,
        Sku: item._id.toString(),
        Category: item.category,
        CategoryLabel: item.category,
        Price: item.price,
        StockQuantity: item.stockQuantity,
        StockStatus: statusInfo.status,
        StockStatusLabel: statusInfo.label,
        IsAlcohol: item.isAlcohol,
        RecentLogs: logs.map((l) => ({
          Id: l._id.toString(),
          ItemId: l.itemId,
          ItemName: l.itemName || item.name,
          Sku: l.sku || item._id.toString(),
          ChangeType: l.changeType || l.action || '',
          ChangeTypeLabel: l.changeType || l.action || '',
          QuantityChange: l.quantityChange ?? l.quantity,
          PreviousStock: l.previousStock ?? 0,
          NewStock: l.newStock ?? item.stockQuantity,
          Source: l.source || '',
          Reason: l.reason || null,
          CreatedAt: l.createdAt,
        })),
      };

      return res.status(200).json(detail);
    } catch (error) {
      console.error('Admin inventory item detail error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // GET /api/admin/inventory/logs
  router.get('/logs', async (req, res) => {
    try {
      const { search, changeType, source, date, page = 1, pageSize = 20 } = req.query;
      const query = {};

      if (search) {
        query.$or = [
          { itemName: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
        ];
      }
      if (changeType) query.changeType = changeType;
      if (source) query.source = source;
      if (date) {
        const from = new Date(date);
        const to = new Date(from);
        to.setDate(to.getDate() + 1);
        query.createdAt = { $gte: from, $lt: to };
      }

      const total = await InventoryLog.countDocuments(query);
      const logs = await InventoryLog.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(pageSize))
        .limit(Number(pageSize))
        .lean();

      const itemIds = [...new Set(logs.map((l) => l.itemId))];
      const items = await Item.find({ _id: { $in: itemIds } }).lean();
      const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

      const data = logs.map((l) => {
        const item = itemMap.get(l.itemId);
        return {
          Id: l._id.toString(),
          ItemId: l.itemId,
          ItemName: l.itemName || item?.name || '',
          Sku: l.sku || l.itemId,
          ChangeType: l.changeType || l.action || '',
          ChangeTypeLabel: l.changeType || l.action || '',
          QuantityChange: l.quantityChange ?? l.quantity,
          PreviousStock: l.previousStock ?? 0,
          NewStock: l.newStock ?? 0,
          Source: l.source || '',
          Reason: l.reason || null,
          CreatedAt: l.createdAt,
        };
      });

      return res.status(200).json(new PagedResponse(data, total, Number(page), Number(pageSize)));
    } catch (error) {
      console.error('Admin inventory logs error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // POST /api/admin/inventory/adjust
  router.post('/adjust', async (req, res) => {
    try {
      const { ItemId, AdjustType, Quantity, Reason } = req.body;
      const item = await Item.findById(ItemId);
      if (!item) return res.status(404).json(ApiResponse.error('Item not found'));

      const previous = item.stockQuantity;
      const type = AdjustType?.toUpperCase();
      let qtyChange = Number(Quantity) || 0;

      if (type === 'INCREASE') {
        item.stockQuantity = previous + qtyChange;
      } else if (type === 'DECREASE') {
        const newStock = previous - qtyChange;
        if (newStock < 0) return res.status(400).json(ApiResponse.error('Resulting stock cannot be negative'));
        item.stockQuantity = newStock;
        qtyChange = -qtyChange;
      } else {
        return res.status(400).json(ApiResponse.error('Invalid AdjustType'));
      }

      await item.save();

      await InventoryLog.create({
        orderId: '',
        itemId: item._id.toString(),
        quantity: qtyChange,
        action: type,
        itemName: item.name,
        sku: item._id.toString(),
        changeType: type,
        quantityChange: qtyChange,
        previousStock: previous,
        newStock: item.stockQuantity,
        source: 'Admin',
        reason: Reason || null,
      });

      return res.status(204).send();
    } catch (error) {
      console.error('Admin inventory adjust error:', error);
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // GET /api/admin/inventory/summary
  router.get('/summary', async (_req, res) => {
    try {
      const total = await Item.countDocuments();
      const inStock = await Item.countDocuments({ stockQuantity: { $gt: 20 } });
      const lowStock = await Item.countDocuments({ stockQuantity: { $gte: 1, $lte: 20 } });
      const outOfStock = await Item.countDocuments({ stockQuantity: 0 });

      return res.status(200).json({
        TotalItems: total,
        InStock: inStock,
        LowStock: lowStock,
        OutOfStock: outOfStock,
      });
    } catch (error) {
      console.error('Admin inventory summary error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  return router;
}
