import mongoose from 'mongoose';
import { Order, GiftBox, CustomBox, Item, Address, InventoryLog, OrderDelivery, OrderDeliveryItem } from '../models/index.js';
import { OrderStatus, OrderType, OrderItemType, ItemCategory } from '../models/enums.js';

/**
 * Order Service - Tương đương OrderService.cs
 */
export class OrderService {
  constructor(deliverySlotRepository) {
    this.slotRepo = deliverySlotRepository;
  }

  // ========== Order Tracking ==========
  async trackOrder(orderCode, email) {
    const order = await Order.findOne({ orderCode, customerEmail: email });
    if (!order) return null;

    return {
      OrderCode: order.orderCode,
      Status: order.status,
      CreatedAt: order.createdAt,
      DeliveryDate: order.deliveryDate,
      TotalAmount: order.totalAmount,
      StatusHistory: (order.statusHistory || []).map((h) => ({
        Status: h.status,
        ChangedAt: h.timestamp,
        Note: h.notes,
        ChangedBy: h.updatedBy,
      })),
    };
  }

  // ========== My Orders ==========
  async getMyOrders(userId, skip = 0, take = 20) {
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(take))
      .lean();

    return orders.map((o) => ({
      OrderId: o._id.toString(),
      OrderCode: o.orderCode,
      OrderType: o.orderType,
      Status: o.status,
      SubTotal: o.subTotal,
      ShippingFee: o.shippingFee,
      TotalAmount: o.totalAmount,
      CreatedAt: o.createdAt,
      Items: (o.items || []).map((i) => ({
        Id: i.giftBoxId?.toString() || i.customBoxId?.toString() || '',
        Type: i.type,
        Name: i.productName,
        Quantity: i.quantity,
        UnitPrice: i.unitPrice,
        TotalPrice: i.totalPrice,
      })),
    }));
  }

  // ========== Update Status ==========
  async updateStatus(orderId, status, updatedBy, notes = '') {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');

    if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.PAYMENT_CONFIRMING && order.status !== OrderStatus.PAYMENT_EXPIRED_INTERNAL) {
      status = OrderStatus.REFUNDING;
      notes = notes ? `${notes} [Chuyển tự động sang REFUNDING do đơn đã thanh toán]` : '[Chuyển tự động sang REFUNDING do đơn đã thanh toán]';
    }

    if (!this._isValidStatusTransition(order.status, status)) {
      throw new Error('Invalid order status transition');
    }

    // Inventory deduction only when transitioning to PREPARING
    if (status === OrderStatus.PREPARING && order.status !== OrderStatus.PREPARING) {
      await this._applyInventoryOnPreparing(order, updatedBy);
    }

    // Release reserved inventory when cancelling or refunding
    if (status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDING) {
      await this.releaseInventoryReservation(order, updatedBy);
    }

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy,
      notes: notes || '',
    });
    order.updatedAt = new Date();

    await order.save();
    return order;
  }

  // ========== Get Order By Code ==========
  async getOrderByCode(orderCode) {
    return Order.findOne({ orderCode });
  }

  // ========== Confirm Payment (SePay Webhook) ==========
  async confirmPayment(orderCode, amount) {
    const order = await Order.findOne({ orderCode: orderCode.toUpperCase() });
    if (!order) return false;

    // Only confirm if order is in PAYMENT_CONFIRMING status
    if (order.status !== OrderStatus.PAYMENT_CONFIRMING) return false;

    // Check if amount matches
    if (amount < order.totalAmount) return false;

    // Reserve inventory
    await this._reserveInventory(order);

    // Update status to PREPARING
    order.status = OrderStatus.PREPARING;
    order.statusHistory.push({
      status: OrderStatus.PREPARING,
      timestamp: new Date(),
      updatedBy: 'System-SePay',
      notes: `Thanh toán xác nhận: ${amount.toLocaleString('vi-VN')} VNĐ`,
    });
    order.updatedAt = new Date();

    await order.save();
    return true;
  }

  // ========== Delivery Management ==========
  async updateDeliveryStatus(deliveryId, status, failureReason = null) {
    const delivery = await OrderDelivery.findById(deliveryId);
    if (!delivery) throw new Error('Delivery not found');

    delivery.status = status;
    delivery.lastAttemptAt = new Date();

    if (status === 'FAILED' && failureReason) {
      delivery.failureReason = failureReason;
    }

    await delivery.save();

    // Auto-aggregate order status from deliveries
    await this._aggregateOrderStatusFromDeliveries(delivery.orderId);
  }

  async reshipDelivery(deliveryId) {
    const delivery = await OrderDelivery.findById(deliveryId);
    if (!delivery) throw new Error('Delivery not found');
    if (delivery.status !== 'FAILED') throw new Error('Only failed deliveries can be reshipped');
    if (delivery.retryCount >= delivery.maxRetries) throw new Error('Maximum retries reached');

    delivery.status = 'SHIPPING';
    delivery.retryCount += 1;
    delivery.lastAttemptAt = new Date();
    delivery.failureReason = null;
    await delivery.save();

    return true;
  }

  // ========== Release Inventory Reservation ==========
  async releaseInventoryReservation(order, updatedBy = 'System') {
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

  // ========== Place B2C Order ==========
  async placeB2COrder(dto) {
    const validation = await this.validateB2COrder(dto);
    if (!validation.IsValid) {
      throw new Error(validation.Errors.join('; '));
    }

    console.log(`Creating B2C order for ${dto.CustomerEmail}`);

    if (!(await this._tryReserveSlot(dto.DeliverySlotId))) {
      throw new Error('Delivery slot is not available');
    }

    try {
      const orderItems = await this._buildOrderItems(dto.Items);
      const totalQuantity = orderItems.reduce((sum, i) => sum + i.quantity, 0);
      const subTotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
      const shippingFee = 30000; // B2C flat rate

      const order = new Order({
        orderCode: this._generateOrderCode(),
        orderType: OrderType.B2C,
        userId: dto.UserId ? new mongoose.Types.ObjectId(dto.UserId) : null,
        customerName: dto.CustomerName,
        customerEmail: dto.CustomerEmail,
        customerPhone: dto.CustomerPhone,
        items: orderItems,
        deliveryAddress: {
          recipientName: dto.ReceiverName,
          recipientPhone: dto.ReceiverPhone,
          addressLine: dto.DeliveryAddress,
          ward: '',
          district: '',
          city: '',
          notes: '',
          quantity: totalQuantity,
          greetingMessage: dto.GreetingMessage || '',
          hideInvoice: false,
        },
        deliveryDate: dto.DeliveryDate,
        deliverySlotId: dto.DeliverySlotId ? new mongoose.Types.ObjectId(dto.DeliverySlotId) : null,
        greetingMessage: dto.GreetingMessage || null,
        greetingCardUrl: dto.GreetingCardUrl || null,
        subTotal,
        shippingFee,
        totalAmount: subTotal + shippingFee,
        status: OrderStatus.PAYMENT_CONFIRMING,
        statusHistory: [
          {
            status: OrderStatus.PAYMENT_CONFIRMING,
            timestamp: new Date(),
            updatedBy: 'System',
            notes: 'Đơn hàng được tạo - Đang xác nhận thanh toán',
          },
        ],
      });

      await order.save();
      console.log(`B2C Order created: ${order.orderCode}`);
      return order;
    } catch (error) {
      await this._rollbackSlot(dto.DeliverySlotId);
      throw error;
    }
  }

  // ========== Place B2B Order ==========
  async placeB2BOrder(dto) {
    const validation = await this.validateB2BOrder(dto);
    if (!validation.IsValid) {
      throw new Error(validation.Errors.join('; '));
    }

    console.log(`Creating B2B order for user ${dto.UserId}`);

    if (!(await this._tryReserveSlot(dto.DeliverySlotId))) {
      throw new Error('Delivery slot is not available');
    }

    try {
      const orderItems = await this._buildOrderItems(dto.Items);

      // Validate addresses belong to user
      const addressIds = dto.DeliveryAllocations.map((a) => a.AddressId);
      const addresses = await Address.find({
        _id: { $in: addressIds },
        userId: dto.UserId,
      });

      if (addresses.length !== addressIds.length) {
        throw new Error('Một hoặc nhiều địa chỉ không hợp lệ');
      }

      const subTotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
      const shippingFee = addresses.length * 25000; // B2B per address

      const order = new Order({
        orderCode: this._generateOrderCode(),
        orderType: OrderType.B2B,
        userId: new mongoose.Types.ObjectId(dto.UserId),
        customerName: dto.CustomerName,
        customerEmail: dto.CustomerEmail,
        customerPhone: dto.CustomerPhone,
        items: orderItems,
        deliveryAddress: null, // B2B KHÔNG có single DeliveryAddress
        deliveryDate: dto.DeliveryDate,
        deliverySlotId: dto.DeliverySlotId ? new mongoose.Types.ObjectId(dto.DeliverySlotId) : null,
        greetingMessage: dto.GreetingMessage || null,
        greetingCardUrl: dto.GreetingCardUrl || null,
        subTotal,
        shippingFee,
        totalAmount: subTotal + shippingFee,
        status: OrderStatus.PAYMENT_CONFIRMING,
        statusHistory: [
          {
            status: OrderStatus.PAYMENT_CONFIRMING,
            timestamp: new Date(),
            updatedBy: 'System',
            notes: 'Đơn hàng B2B được tạo - Đang xác nhận thanh toán',
          },
        ],
      });

      await order.save();

      // B2B: Create OrderDelivery and OrderDeliveryItem
      for (const allocation of dto.DeliveryAllocations) {
        const orderDelivery = await OrderDelivery.create({
          orderId: order._id.toString(),
          addressId: allocation.AddressId,
          status: 'PENDING',
        });

        for (const itemAllocation of allocation.ItemAllocations) {
          if (itemAllocation.OrderItemIndex < 0 || itemAllocation.OrderItemIndex >= orderItems.length) {
            throw new Error(`Invalid OrderItemIndex: ${itemAllocation.OrderItemIndex}`);
          }

          const orderItem = orderItems[itemAllocation.OrderItemIndex];
          const orderItemId =
            orderItem.giftBoxId?.toString() || orderItem.customBoxId?.toString() || '';

          await OrderDeliveryItem.create({
            orderDeliveryId: orderDelivery._id.toString(),
            orderItemId,
            quantity: itemAllocation.Quantity,
          });
        }
      }

      console.log(`B2B Order created: ${order.orderCode}`);
      return order;
    } catch (error) {
      await this._rollbackSlot(dto.DeliverySlotId);
      throw error;
    }
  }

  // ========== Mix & Match Validation ==========
  async validateMixMatchRules(customBoxId) {
    const result = { IsValid: true, Errors: [], DrinkCount: 0, FoodCount: 0, NutCount: 0, AlcoholCount: 0 };

    const customBox = await CustomBox.findById(customBoxId);
    if (!customBox) {
      result.IsValid = false;
      result.Errors.push('CustomBox không tồn tại');
      return result;
    }

    if (!customBox.items || customBox.items.length === 0) {
      result.IsValid = false;
      result.Errors.push('Hộp quà phải có ít nhất 1 sản phẩm');
      return result;
    }

    const itemIds = customBox.items.map((i) => i.itemId);
    const items = await Item.find({ _id: { $in: itemIds } });
    const itemMap = {};
    items.forEach((i) => (itemMap[i._id.toString()] = i));

    customBox.items.forEach((cbi) => {
      const item = itemMap[cbi.itemId];
      if (!item) return;
      switch (item.category) {
        case ItemCategory.DRINK: result.DrinkCount++; break;
        case ItemCategory.FOOD: result.FoodCount++; break;
        case ItemCategory.NUT: result.NutCount++; break;
        case ItemCategory.ALCOHOL: result.AlcoholCount++; break;
      }
    });

    // Rules: ≥1 DRINK, 2-4 FOOD, ≤1 ALCOHOL
    if (result.DrinkCount < 1) {
      result.Errors.push('Mix & Match phải có ít nhất 1 đồ uống');
      result.IsValid = false;
    }
    if (result.FoodCount < 2) {
      result.Errors.push('Mix & Match phải có ít nhất 2 món ăn');
      result.IsValid = false;
    } else if (result.FoodCount > 4) {
      result.Errors.push('Mix & Match không được có quá 4 món ăn');
      result.IsValid = false;
    }
    if (result.AlcoholCount > 1) {
      result.Errors.push('Mix & Match không được có quá 1 rượu');
      result.IsValid = false;
    }

    result.MeetsRules = result.DrinkCount >= 1 && result.FoodCount >= 2 && result.FoodCount <= 4 && result.AlcoholCount <= 1;
    return result;
  }

  // ========== Validation ==========
  async validateB2COrder(dto) {
    const result = { IsValid: true, Errors: [] };

    if (!dto.CustomerName) result.Errors.push('Customer name is required');
    if (!dto.CustomerEmail || !this._isValidEmail(dto.CustomerEmail))
      result.Errors.push('Valid email is required');
    if (!dto.Items || dto.Items.length === 0)
      result.Errors.push('At least one item is required');

    // Validate Mix & Match items
    for (const item of (dto.Items || []).filter((x) => x.Type === OrderItemType.MIX_MATCH)) {
      if (item.CustomBoxId) {
        const validation = await this.validateMixMatchRules(item.CustomBoxId);
        if (!validation.IsValid) {
          result.Errors.push(...validation.Errors);
        }
      }
    }

    result.IsValid = result.Errors.length === 0;
    return result;
  }

  async validateB2BOrder(dto) {
    const result = { IsValid: true, Errors: [] };

    if (!dto.UserId) result.Errors.push('B2B requires login - UserId is required');
    if (!dto.DeliveryAllocations || dto.DeliveryAllocations.length === 0)
      result.Errors.push('At least one delivery address is required for B2B');

    for (const item of (dto.Items || []).filter((x) => x.Type === OrderItemType.MIX_MATCH)) {
      if (item.CustomBoxId) {
        const validation = await this.validateMixMatchRules(item.CustomBoxId);
        if (!validation.IsValid) {
          result.Errors.push(...validation.Errors);
        }
      }
    }

    result.IsValid = result.Errors.length === 0;
    return result;
  }

  // ========== Private Helpers ==========
  _generateOrderCode() {
    const now = new Date();
    const timestamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SHT${timestamp}${random}`;
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  _isValidStatusTransition(current, next) {
    const validTransitions = {
      [OrderStatus.PAYMENT_CONFIRMING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.PAYMENT_EXPIRED_INTERNAL],
      [OrderStatus.PREPARING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED, OrderStatus.REFUNDING],
      [OrderStatus.SHIPPING]: [OrderStatus.COMPLETED, OrderStatus.PARTIAL_DELIVERY, OrderStatus.DELIVERY_FAILED, OrderStatus.CANCELLED, OrderStatus.REFUNDING],
      [OrderStatus.PARTIAL_DELIVERY]: [OrderStatus.COMPLETED, OrderStatus.SHIPPING, OrderStatus.CANCELLED, OrderStatus.REFUNDING],
      [OrderStatus.DELIVERY_FAILED]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED, OrderStatus.REFUNDING],
      [OrderStatus.REFUNDING]: [OrderStatus.REFUNDED],
    };
    return validTransitions[current]?.includes(next) || false;
  }

  async _tryReserveSlot(slotId) {
    if (!slotId) return true;
    if (!(await this.slotRepo.isSlotAvailable(slotId))) return false;
    return this.slotRepo.incrementOrderCount(slotId);
  }

  async _rollbackSlot(slotId) {
    if (!slotId) return;
    await this.slotRepo.decrementOrderCount(slotId);
  }

  async _buildOrderItems(items) {
    const result = [];

    for (const dto of items) {
      if (dto.Type === OrderItemType.READY_MADE) {
        const giftBoxId = dto.Id || dto.GiftBoxId;
        if (!giftBoxId) throw new Error('GiftBoxId is required');

        const giftBox = await GiftBox.findById(giftBoxId);
        if (!giftBox) throw new Error('GiftBox not found');

        result.push({
          type: OrderItemType.READY_MADE,
          productName: giftBox.name,
          giftBoxId: new mongoose.Types.ObjectId(giftBoxId),
          quantity: dto.Quantity,
          unitPrice: giftBox.price,
          totalPrice: giftBox.price * dto.Quantity,
          snapshotItems: await this._buildGiftBoxSnapshot(giftBox),
        });
      } else if (dto.Type === OrderItemType.MIX_MATCH) {
        const customBoxId = dto.Id || dto.CustomBoxId;
        if (!customBoxId) throw new Error('CustomBoxId is required');

        const customBox = await CustomBox.findById(customBoxId);
        if (!customBox) throw new Error('CustomBox not found');

        // Validate Mix & Match rules
        const validation = await this.validateMixMatchRules(customBoxId);
        if (!validation.IsValid) {
          throw new Error(`Mix & Match validation failed: ${validation.Errors.join(', ')}`);
        }

        result.push({
          type: OrderItemType.MIX_MATCH,
          productName: 'Custom Mix & Match Box',
          customBoxId: new mongoose.Types.ObjectId(customBoxId),
          quantity: dto.Quantity,
          unitPrice: customBox.totalPrice,
          totalPrice: customBox.totalPrice * dto.Quantity,
          snapshotItems: await this._buildCustomBoxSnapshot(customBox),
        });
      }
    }

    return result;
  }

  async _buildGiftBoxSnapshot(giftBox) {
    const itemIds = giftBox.items.map((i) => i.itemId);
    if (!itemIds.length) return [];

    const items = await Item.find({ _id: { $in: itemIds } });
    const itemMap = {};
    items.forEach((i) => (itemMap[i._id.toString()] = i));

    return giftBox.items.map((gi) => {
      const item = itemMap[gi.itemId];
      return {
        itemId: gi.itemId,
        itemName: item?.name || '',
        quantity: gi.quantity,
        unitPrice: item?.price || 0,
      };
    });
  }

  async _buildCustomBoxSnapshot(customBox) {
    const itemIds = customBox.items.map((i) => i.itemId);
    if (!itemIds.length) return [];

    const items = await Item.find({ _id: { $in: itemIds } });
    const itemMap = {};
    items.forEach((i) => (itemMap[i._id.toString()] = i));

    return customBox.items.map((ci) => {
      const item = itemMap[ci.itemId];
      return {
        itemId: ci.itemId,
        itemName: item?.name || '',
        quantity: ci.quantity,
        unitPrice: item?.price || 0,
      };
    });
  }

  async _applyInventoryOnPreparing(order, updatedBy) {
    for (const orderItem of order.items) {
      if (orderItem.type === OrderItemType.READY_MADE) {
        if (!orderItem.giftBoxId) continue;
        const giftBox = await GiftBox.findById(orderItem.giftBoxId);
        if (!giftBox) continue;

        for (const giftBoxItem of giftBox.items) {
          const quantity = giftBoxItem.quantity * orderItem.quantity;
          await this._deductItemStock(giftBoxItem.itemId, quantity, order._id.toString());
        }
      } else if (orderItem.type === OrderItemType.MIX_MATCH) {
        if (!orderItem.customBoxId) continue;
        const customBox = await CustomBox.findById(orderItem.customBoxId);
        if (!customBox) continue;

        for (const customItem of customBox.items) {
          const quantity = customItem.quantity * orderItem.quantity;
          await this._deductItemStock(customItem.itemId, quantity, order._id.toString());
        }
      }
    }
  }

  async _deductItemStock(itemId, quantity, orderId) {
    if (quantity <= 0) return;

    await Item.findByIdAndUpdate(itemId, {
      $inc: { stockQuantity: -quantity },
    });

    await InventoryLog.create({
      orderId,
      itemId,
      quantity: -quantity, // Âm cho DEDUCT
      action: 'DEDUCT',
    });
  }

  async _reserveInventory(order) {
    for (const orderItem of order.items) {
      if (orderItem.snapshotItems && orderItem.snapshotItems.length > 0) {
        for (const snapshot of orderItem.snapshotItems) {
          const reserveQty = snapshot.quantity * orderItem.quantity;
          if (reserveQty > 0) {
            await Item.findByIdAndUpdate(snapshot.itemId, {
              $inc: { reservedQuantity: reserveQty },
            });

            await InventoryLog.create({
              orderId: order._id.toString(),
              itemId: snapshot.itemId,
              quantity: reserveQty,
              action: 'RESERVE',
            });
          }
        }
      }
    }
  }

  async _aggregateOrderStatusFromDeliveries(orderId) {
    const deliveries = await OrderDelivery.find({ orderId });
    if (deliveries.length === 0) return;

    const allDelivered = deliveries.every((d) => d.status === 'DELIVERED');
    const allFailed = deliveries.every((d) => d.status === 'FAILED');
    const someDelivered = deliveries.some((d) => d.status === 'DELIVERED');
    const someFailed = deliveries.some((d) => d.status === 'FAILED');

    const order = await Order.findById(orderId);
    if (!order) return;

    let newStatus = null;
    if (allDelivered) {
      newStatus = OrderStatus.COMPLETED;
    } else if (allFailed) {
      newStatus = OrderStatus.DELIVERY_FAILED;
    } else if (someDelivered && someFailed) {
      newStatus = OrderStatus.PARTIAL_DELIVERY;
    }

    if (newStatus && order.status !== newStatus) {
      order.status = newStatus;
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        updatedBy: 'System-DeliveryAggregation',
        notes: `Auto-aggregated from delivery statuses`,
      });
      order.updatedAt = new Date();
      await order.save();
    }
  }
}
