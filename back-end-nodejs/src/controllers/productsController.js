import { Router } from 'express';
import { Item, GiftBox, Collection } from '../models/index.js';

/**
 * Products Controller - Tương đương ProductsController.cs
 * Routes: /api/products
 */
export function createProductsRouter() {
  const router = Router();

  // GET /api/products/items
  router.get('/items', async (_req, res) => {
    try {
      const items = await Item.find({ isActive: true });
      return res.status(200).json(items);
    } catch (error) {
      console.error('GetItems error:', error);
      return res.status(500).json({ Message: 'Internal server error' });
    }
  });

  // GET /api/products/gift-boxes
  router.get('/gift-boxes', async (_req, res) => {
    try {
      const giftBoxes = await GiftBox.find({ isActive: true });
      return res.status(200).json(giftBoxes);
    } catch (error) {
      console.error('GetGiftBoxes error:', error);
      return res.status(500).json({ Message: 'Internal server error' });
    }
  });

  // GET /api/products/collections
  router.get('/collections', async (_req, res) => {
    try {
      const collections = await Collection.find({ isActive: true });
      return res.status(200).json(collections);
    } catch (error) {
      console.error('GetCollections error:', error);
      return res.status(500).json({ Message: 'Internal server error' });
    }
  });

  return router;
}
