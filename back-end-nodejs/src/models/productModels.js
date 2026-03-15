import mongoose from 'mongoose';
import { ItemCategory } from './enums.js';

// ========== Collection Model - Bộ sưu tập quà Tết ==========
const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    coverImage: { type: String, default: null },
    pricingMultiplier: { type: Number, default: 1.35 },
    packagingFee: { type: Number, default: 150000 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Collection = mongoose.model('Collection', collectionSchema);

// ========== Tag Model - Thẻ phân loại ý nghĩa quà tặng ==========
const tagSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' }, // "Biếu sếp", "Tài lộc", "Gia đình"
    type: { type: String, default: '' }, // MEANING, RECIPIENT, OCCASION
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Tag = mongoose.model('Tag', tagSchema);

// ========== Gift Box Item (embedded) ==========
const giftBoxItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    itemPriceSnapshot: { type: Number, default: 0 },
  },
  { _id: false }
);

// ========== Gift Box Model - Hộp quà có sẵn ==========
const giftBoxSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    images: [{ type: String }],
    collectionId: { type: String, default: '' },
    tags: [{ type: String }], // Tag IDs
    items: [giftBoxItemSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const GiftBox = mongoose.model('GiftBox', giftBoxSchema);

// ========== Item Model - Thành phần Mix & Match ==========
const itemSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    category: {
      type: String,
      enum: Object.values(ItemCategory),
    },
    price: { type: Number, default: 0 },
    images: [{ type: String }],
    isAlcohol: { type: Boolean, default: false },
    stockQuantity: { type: Number, default: 0 },
    reservedQuantity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Item = mongoose.model('Item', itemSchema);

// ========== Custom Box Item (embedded) ==========
const customBoxItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
  },
  { _id: false }
);

// ========== Custom Box Model - Hộp quà Mix & Match ==========
const customBoxSchema = new mongoose.Schema(
  {
    userId: { type: String, default: '' },
    items: [customBoxItemSchema],
    totalPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CustomBox = mongoose.model('CustomBox', customBoxSchema);
