import mongoose from 'mongoose';
import { OrderItemType } from './enums.js';

// ========== Cart Item (embedded) ==========
const cartItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(OrderItemType),
      default: OrderItemType.READY_MADE,
    },
    giftBoxId: { type: String, default: null },
    customBoxId: { type: String, default: null },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ========== Cart Model ==========
const cartSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null },
    sessionId: { type: String, default: null },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

export const Cart = mongoose.model('Cart', cartSchema);
