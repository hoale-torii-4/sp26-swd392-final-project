import mongoose from 'mongoose';

// ========== Review Model - Đánh giá sản phẩm (Member only) ==========
const reviewSchema = new mongoose.Schema(
  {
    orderId: { type: String, default: '' },
    giftBoxId: { type: String, default: '' },
    userId: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    status: { type: String, default: 'PENDING' }, // PENDING, APPROVED, HIDDEN
  },
  { timestamps: true }
);

export const Review = mongoose.model('Review', reviewSchema);

// ========== Chat Message (embedded) ==========
const chatMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, default: '' }, // BOT, STAFF, GUEST
    senderName: { type: String, default: null },
    message: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ========== Chat Session Model ==========
const chatSessionSchema = new mongoose.Schema(
  {
    email: { type: String, default: '' },
    orderCode: { type: String, default: null },
    status: { type: String, default: 'OPEN' }, // OPEN, CLOSED
    messages: [chatMessageSchema],
  },
  { timestamps: true }
);

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

// ========== System Config Model ==========
const smtpSettingsSchema = new mongoose.Schema(
  {
    host: { type: String, default: 'smtp.gmail.com' },
    port: { type: Number, default: 587 },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    from: { type: String, default: '' },
    enableSsl: { type: Boolean, default: true },
  },
  { _id: false }
);

const systemConfigSchema = new mongoose.Schema(
  {
    deliverySlotLimit: { type: Number, default: 50 },
    emailTemplate: { type: String, default: '' },
    smtpSettings: { type: smtpSettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

// ========== OTP Record Model ==========
const otpRecordSchema = new mongoose.Schema(
  {
    email: { type: String, default: '' },
    otpCode: { type: String, default: '' },
    purpose: { type: String, default: '' }, // LOGIN, REGISTER, RESET_PASSWORD
    isUsed: { type: Boolean, default: false },
    expiryTime: { type: Date },
  },
  { timestamps: true }
);

export const OtpRecord = mongoose.model('OtpRecord', otpRecordSchema);

// ========== Inventory Log Model ==========
const inventoryLogSchema = new mongoose.Schema(
  {
    orderId: { type: String, default: '' },
    itemId: { type: String, default: '' },
    quantity: { type: Number, default: 0 }, // Âm cho DEDUCT
    action: { type: String, default: 'DEDUCT' },
  },
  { timestamps: true }
);

export const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);

// ========== Order Delivery Model - B2B Multi-address ==========
const orderDeliverySchema = new mongoose.Schema(
  {
    orderId: { type: String, default: '' },
    addressId: { type: String, default: '' },
    status: { type: String, default: 'PENDING' }, // PENDING, SHIPPING, DELIVERED, FAILED
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    lastAttemptAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

export const OrderDelivery = mongoose.model('OrderDelivery', orderDeliverySchema);

// ========== Order Delivery Item Model ==========
const orderDeliveryItemSchema = new mongoose.Schema(
  {
    orderDeliveryId: { type: String, default: '' },
    orderItemId: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const OrderDeliveryItem = mongoose.model('OrderDeliveryItem', orderDeliveryItemSchema);
