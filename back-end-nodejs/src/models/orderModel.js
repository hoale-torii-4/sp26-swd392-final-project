import mongoose from 'mongoose';
import { OrderStatus, OrderType, OrderItemType } from './enums.js';

// ========== Order Item Snapshot (embedded) ==========
const orderItemSnapshotItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, default: '' },
    itemName: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
  },
  { _id: false }
);

// ========== Order Item (embedded) ==========
const orderItemSchema = new mongoose.Schema(
  {
    productName: { type: String, default: '' },
    type: {
      type: String,
      enum: Object.values(OrderItemType),
      default: OrderItemType.READY_MADE,
    },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    snapshotItems: [orderItemSnapshotItemSchema],
    giftBoxId: { type: mongoose.Schema.Types.ObjectId, default: null },
    customBoxId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { _id: false }
);

// ========== Delivery Address (embedded) ==========
const deliveryAddressSchema = new mongoose.Schema(
  {
    addressId: { type: String, default: null },
    recipientName: { type: String, default: '' },
    recipientPhone: { type: String, default: '' },
    addressLine: { type: String, default: '' },
    ward: { type: String, default: '' },
    district: { type: String, default: '' },
    city: { type: String, default: '' },
    notes: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    greetingMessage: { type: String, default: '' },
    hideInvoice: { type: Boolean, default: false },
  },
  { _id: false }
);

// ========== Order Status History (embedded) ==========
const orderStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

// ========== Order Model ==========
const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, default: '' },
    orderType: {
      type: String,
      enum: Object.values(OrderType),
      default: OrderType.B2C,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, default: null },
    customerName: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    items: [orderItemSchema],
    // CHỈ dùng cho B2C
    deliveryAddress: { type: deliveryAddressSchema, default: null },
    deliveryDate: { type: Date },
    deliverySlotId: { type: mongoose.Schema.Types.ObjectId, default: null },
    greetingMessage: { type: String, default: null },
    greetingCardUrl: { type: String, default: null },
    subTotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PAYMENT_CONFIRMING,
    },
    statusHistory: [orderStatusHistorySchema],
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
