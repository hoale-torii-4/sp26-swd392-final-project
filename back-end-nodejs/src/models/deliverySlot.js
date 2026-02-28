import mongoose from 'mongoose';

// ========== Delivery Slot Model ==========
const deliverySlotSchema = new mongoose.Schema(
  {
    deliveryDate: { type: Date, required: true },
    timeSlot: { type: String, default: '' }, // "8AM-12PM", "1PM-5PM", "6PM-9PM"
    maxOrdersPerSlot: { type: Number, default: 50 },
    currentOrderCount: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const DeliverySlot = mongoose.model('DeliverySlot', deliverySlotSchema);
