import { Router } from 'express';
import { ApiResponse } from '../dtos/index.js';

/**
 * Cart Controller - Tương đương CartController.cs
 * Routes: /api/cart
 */
export function createCartRouter(cartService) {
    const router = Router();

    /**
     * Lấy userId từ JWT token hoặc sessionId từ header
     */
    function getUserOrSession(req) {
        const userId = req.user?.sub || req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || null;
        return { userId, sessionId };
    }

    function isValidIdentity(userId, sessionId) {
        return !!(userId || sessionId);
    }

    // ========== GET /api/cart ==========
    router.get('/', async (req, res) => {
        try {
            const { userId, sessionId } = getUserOrSession(req);

            if (!isValidIdentity(userId, sessionId)) {
                return res.status(400).json(ApiResponse.error('Cần Token hoặc X-Session-Id'));
            }

            const result = await cartService.getCart(userId, sessionId);
            return result.Success ? res.status(200).json(result) : res.status(400).json(result);
        } catch (error) {
            console.error('GetCart error:', error);
            return res.status(500).json(ApiResponse.error('Internal server error'));
        }
    });

    // ========== POST /api/cart/add ==========
    router.post('/add', async (req, res) => {
        try {
            const { userId, sessionId } = getUserOrSession(req);

            if (!isValidIdentity(userId, sessionId)) {
                return res.status(400).json(ApiResponse.error('Cần Token hoặc X-Session-Id'));
            }

            const result = await cartService.addToCart(userId, sessionId, req.body);
            return result.Success ? res.status(200).json(result) : res.status(400).json(result);
        } catch (error) {
            console.error('AddToCart error:', error);
            return res.status(500).json(ApiResponse.error('Internal server error'));
        }
    });

    // ========== PUT /api/cart/update/:itemId ==========
    router.put('/update/:itemId', async (req, res) => {
        try {
            const { userId, sessionId } = getUserOrSession(req);

            if (!isValidIdentity(userId, sessionId)) {
                return res.status(400).json(ApiResponse.error('Cần Token hoặc X-Session-Id'));
            }

            const result = await cartService.updateCartItem(userId, sessionId, req.params.itemId, req.body);
            return result.Success ? res.status(200).json(result) : res.status(400).json(result);
        } catch (error) {
            console.error('UpdateCartItem error:', error);
            return res.status(500).json(ApiResponse.error('Internal server error'));
        }
    });

    // ========== DELETE /api/cart/remove/:itemId ==========
    router.delete('/remove/:itemId', async (req, res) => {
        try {
            const { userId, sessionId } = getUserOrSession(req);

            if (!isValidIdentity(userId, sessionId)) {
                return res.status(400).json(ApiResponse.error('Cần Token hoặc X-Session-Id'));
            }

            const result = await cartService.removeFromCart(userId, sessionId, req.params.itemId);
            return result.Success ? res.status(200).json(result) : res.status(400).json(result);
        } catch (error) {
            console.error('RemoveFromCart error:', error);
            return res.status(500).json(ApiResponse.error('Internal server error'));
        }
    });

    // ========== DELETE /api/cart/clear ==========
    router.delete('/clear', async (req, res) => {
        try {
            const { userId, sessionId } = getUserOrSession(req);

            if (!isValidIdentity(userId, sessionId)) {
                return res.status(400).json(ApiResponse.error('Cần Token hoặc X-Session-Id'));
            }

            const result = await cartService.clearCart(userId, sessionId);
            return result.Success ? res.status(200).json(result) : res.status(400).json(result);
        } catch (error) {
            console.error('ClearCart error:', error);
            return res.status(500).json(ApiResponse.error('Internal server error'));
        }
    });

    return router;
}
