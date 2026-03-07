import { Order, Item, InventoryLog } from '../models/index.js';
import { OrderStatus } from '../models/enums.js';

/**
 * Order Expiration Background Service - Tương đương OrderExpirationBackgroundService.cs
 * Tự hủy đơn hàng quá 10 phút chưa thanh toán, sử dụng setInterval
 */
export class OrderExpirationService {
    constructor() {
        this.expireAfterMs = 10 * 60 * 1000; // 10 minutes
        this.pollingIntervalMs = 1 * 60 * 1000; // 1 minute
        this.intervalId = null;
    }

    /**
     * Khởi động background job
     */
    start() {
        console.log('🕐 Order expiration service started (polling every 1 minute)');
        // Run immediately once
        this._expirePendingOrders().catch((err) =>
            console.error('Order expiration initial run failed:', err)
        );
        // Then schedule
        this.intervalId = setInterval(async () => {
            try {
                await this._expirePendingOrders();
            } catch (err) {
                console.error('Order expiration cycle failed:', err);
            }
        }, this.pollingIntervalMs);
    }

    /**
     * Dừng background job
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🕐 Order expiration service stopped');
        }
    }

    /**
     * Xử lý các đơn hàng quá hạn thanh toán
     */
    async _expirePendingOrders() {
        const cutoff = new Date(Date.now() - this.expireAfterMs);

        const expiredOrders = await Order.find({
            status: OrderStatus.PAYMENT_CONFIRMING,
            createdAt: { $lte: cutoff },
        });

        if (expiredOrders.length === 0) return;

        for (const order of expiredOrders) {
            // Release reserved inventory
            try {
                await this._releaseInventoryReservation(order);
            } catch (err) {
                console.warn(`Failed to release inventory for expired order ${order.orderCode}:`, err.message);
            }

            order.status = OrderStatus.CANCELLED;
            order.statusHistory.push({
                status: OrderStatus.CANCELLED,
                timestamp: new Date(),
                updatedBy: 'System-ExpirationService',
                notes: 'Đơn quá thời gian thanh toán 10 phút - tự động hủy và release reserve',
            });
            order.updatedAt = new Date();
            await order.save();
        }

        console.log(`🕐 Order expiration service marked ${expiredOrders.length} order(s) as expired`);
    }

    /**
     * Release reserved inventory khi hủy đơn
     */
    async _releaseInventoryReservation(order) {
        for (const orderItem of order.items) {
            if (orderItem.snapshotItems && orderItem.snapshotItems.length > 0) {
                for (const snapshot of orderItem.snapshotItems) {
                    const releaseQty = snapshot.quantity * orderItem.quantity;
                    if (releaseQty > 0) {
                        await Item.findByIdAndUpdate(snapshot.itemId, {
                            $inc: { reservedQuantity: -releaseQty },
                        });

                        await InventoryLog.create({
                            orderId: order._id.toString(),
                            itemId: snapshot.itemId,
                            quantity: releaseQty,
                            action: 'RELEASE',
                        });
                    }
                }
            }
        }
    }
}
