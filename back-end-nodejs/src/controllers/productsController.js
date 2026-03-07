import { Router } from 'express';
import { ApiResponse } from '../dtos/index.js';
import { authenticate, authorize } from '../middlewares/index.js';

/**
 * Products Controller - Tương đương ProductsController.cs
 * Routes: /api/products
 */
export function createProductsRouter(productService) {
  const router = Router();

  // ========== GET /api/products/items ==========
  router.get('/items', async (req, res) => {
    try {
      const items = await productService.getItems(req.query.name);
      return res.status(200).json(items);
    } catch (error) {
      console.error('GetItems error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ========== GET /api/products/gift-boxes ==========
  router.get('/gift-boxes', async (req, res) => {
    try {
      const giftBoxes = await productService.getGiftBoxes(req.query.name);
      return res.status(200).json(giftBoxes);
    } catch (error) {
      console.error('GetGiftBoxes error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ========== GET /api/products/collections ==========
  router.get('/collections', async (req, res) => {
    try {
      const collections = await productService.getCollections(req.query.name);
      return res.status(200).json(collections);
    } catch (error) {
      console.error('GetCollections error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ========== GET /api/products/items/:id ==========
  router.get('/items/:id', async (req, res) => {
    try {
      const item = await productService.getItemById(req.params.id);
      if (!item) return res.status(404).json(ApiResponse.error('Item not found'));
      return res.status(200).json(item);
    } catch (error) {
      console.error('GetItemById error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ========== GET /api/products/gift-boxes/:id ==========
  router.get('/gift-boxes/:id', async (req, res) => {
    try {
      const giftBox = await productService.getGiftBoxDetailById(req.params.id);
      if (!giftBox) return res.status(404).json(ApiResponse.error('GiftBox not found'));
      return res.status(200).json(giftBox);
    } catch (error) {
      console.error('GetGiftBoxById error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ========== GET /api/products/collections/:id ==========
  router.get('/collections/:id', async (req, res) => {
    try {
      const collection = await productService.getCollectionDetailById(req.params.id);
      if (!collection) return res.status(404).json(ApiResponse.error('Collection not found'));
      return res.status(200).json(collection);
    } catch (error) {
      console.error('GetCollectionById error:', error);
      return res.status(500).json(ApiResponse.error('Internal server error'));
    }
  });

  // ========== POST /api/products/gift-boxes (ADMIN) ==========
  router.post('/gift-boxes', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
      const giftBox = await productService.createGiftBox(req.body);
      return res.status(200).json(
        ApiResponse.success(
          {
            id: giftBox._id.toString(),
            name: giftBox.name,
            price: giftBox.price,
            collectionId: giftBox.collectionId,
          },
          'GiftBox created with auto-calculated price'
        )
      );
    } catch (error) {
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ========== PUT /api/products/gift-boxes/:id (ADMIN) ==========
  router.put('/gift-boxes/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
      const giftBox = await productService.updateGiftBox(req.params.id, req.body);
      return res.status(200).json(
        ApiResponse.success(
          {
            id: giftBox._id.toString(),
            name: giftBox.name,
            price: giftBox.price,
            collectionId: giftBox.collectionId,
          },
          'GiftBox updated'
        )
      );
    } catch (error) {
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  // ========== POST /api/products/gift-boxes/calculate-price (ADMIN) ==========
  router.post('/gift-boxes/calculate-price', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
      const { CollectionId, Items } = req.body;

      const items = (Items || []).map((i) => ({
        itemId: i.ItemId,
        quantity: i.Quantity,
      }));

      const price = await productService.calculateGiftBoxPrice(CollectionId, items);
      return res.status(200).json(
        ApiResponse.success(
          {
            collectionId: CollectionId,
            calculatedPrice: price,
          },
          'Price calculated from collection pricing rule'
        )
      );
    } catch (error) {
      return res.status(400).json(ApiResponse.error(error.message));
    }
  });

  return router;
}
