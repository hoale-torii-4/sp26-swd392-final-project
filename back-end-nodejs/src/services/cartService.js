import { Cart, GiftBox } from '../models/index.js';
import { OrderItemType } from '../models/enums.js';

/**
 * Cart Service - Tương đương CartService.cs
 */
export class CartService {
    /**
     * Lấy giỏ hàng theo userId hoặc sessionId
     */
    async getCart(userId, sessionId) {
        const cart = await this._findCart(userId, sessionId);

        if (!cart) {
            return {
                Success: true,
                Data: {
                    Id: null,
                    UserId: userId,
                    SessionId: sessionId,
                    Items: [],
                    TotalAmount: 0,
                    TotalItems: 0,
                },
            };
        }

        return {
            Success: true,
            Data: await this._mapToDto(cart),
        };
    }

    /**
     * Thêm sản phẩm vào giỏ hàng
     */
    async addToCart(userId, sessionId, dto) {
        if (!userId && !sessionId) {
            return { Success: false, Message: 'Không xác định được người dùng!' };
        }

        let cart = await this._findCart(userId, sessionId);

        if (!cart) {
            cart = await Cart.create({
                userId: userId || null,
                sessionId: sessionId || null,
                items: [],
            });
        }

        let unitPrice = 0;

        if (dto.Type === OrderItemType.READY_MADE && dto.GiftBoxId) {
            const giftBox = await GiftBox.findById(dto.GiftBoxId);
            if (!giftBox) {
                return { Success: false, Message: 'Không tìm thấy hộp quà!' };
            }
            unitPrice = giftBox.price;
        }

        // Check if item already exists in cart
        const existingItem = cart.items.find((i) => {
            if (i.type !== dto.Type) return false;
            if (dto.Type === OrderItemType.READY_MADE) return i.giftBoxId === dto.GiftBoxId;
            if (dto.Type === OrderItemType.MIX_MATCH) return i.customBoxId === dto.CustomBoxId;
            return false;
        });

        if (existingItem) {
            existingItem.quantity += dto.Quantity;
            existingItem.unitPrice = unitPrice;
        } else {
            cart.items.push({
                type: dto.Type,
                giftBoxId: dto.GiftBoxId || null,
                customBoxId: dto.CustomBoxId || null,
                quantity: dto.Quantity,
                unitPrice,
                addedAt: new Date(),
            });
        }

        await cart.save();

        return {
            Success: true,
            Message: 'Đã thêm vào giỏ hàng',
            Data: await this._mapToDto(cart),
        };
    }

    /**
     * Cập nhật số lượng sản phẩm trong giỏ
     */
    async updateCartItem(userId, sessionId, cartItemId, dto) {
        const cart = await this._findCart(userId, sessionId);
        if (!cart) {
            return { Success: false, Message: 'Giỏ hàng trống!' };
        }

        const item = cart.items.id(cartItemId);
        if (!item) {
            return { Success: false, Message: 'Không tìm thấy sản phẩm!' };
        }

        item.quantity = dto.Quantity;
        await cart.save();

        return {
            Success: true,
            Message: 'Đã cập nhật số lượng',
            Data: await this._mapToDto(cart),
        };
    }

    /**
     * Xóa sản phẩm khỏi giỏ
     */
    async removeFromCart(userId, sessionId, cartItemId) {
        const cart = await this._findCart(userId, sessionId);
        if (!cart) {
            return { Success: false, Message: 'Giỏ hàng trống!' };
        }

        const item = cart.items.id(cartItemId);
        if (!item) {
            return { Success: false, Message: 'Không tìm thấy item để xóa!' };
        }

        item.deleteOne();
        await cart.save();

        return { Success: true, Message: 'Đã xóa sản phẩm', Data: true };
    }

    /**
     * Xóa toàn bộ giỏ hàng
     */
    async clearCart(userId, sessionId) {
        const cart = await this._findCart(userId, sessionId);
        if (!cart) {
            return { Success: false, Message: 'Giỏ hàng trống!' };
        }

        cart.items = [];
        await cart.save();

        return { Success: true, Message: 'Đã làm sạch giỏ hàng', Data: true };
    }

    // ========== Private Helpers ==========

    async _findCart(userId, sessionId) {
        if (!userId && !sessionId) return null;

        const query = {};
        if (userId) {
            query.userId = userId;
        } else {
            query.sessionId = sessionId;
        }

        return Cart.findOne(query);
    }

    async _mapToDto(cart) {
        const items = [];

        for (const item of cart.items) {
            let name = 'Sản phẩm không xác định';

            if (item.type === OrderItemType.READY_MADE && item.giftBoxId) {
                const giftBox = await GiftBox.findById(item.giftBoxId);
                if (giftBox) name = giftBox.name;
            } else if (item.type === OrderItemType.MIX_MATCH) {
                name = 'Hộp quà tự chọn (Mix & Match)';
            }

            items.push({
                Id: item._id.toString(),
                Type: item.type,
                GiftBoxId: item.giftBoxId,
                CustomBoxId: item.customBoxId,
                Quantity: item.quantity,
                UnitPrice: item.unitPrice,
                Name: name,
            });
        }

        return {
            Id: cart._id.toString(),
            UserId: cart.userId,
            SessionId: cart.sessionId,
            Items: items,
            TotalAmount: cart.items.reduce((sum, i) => i.quantity * i.unitPrice, 0),
            TotalItems: cart.items.reduce((sum, i) => sum + i.quantity, 0),
        };
    }
}
