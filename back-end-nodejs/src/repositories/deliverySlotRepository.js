import { DeliverySlot } from '../models/index.js';

/**
 * Delivery Slot Repository - Tương đương DeliverySlotRepository.cs
 */
export class DeliverySlotRepository {
  async getById(id) {
    return DeliverySlot.findById(id);
  }

  async getAll() {
    return DeliverySlot.find();
  }

  async getByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return DeliverySlot.find({
      deliveryDate: { $gte: startOfDay, $lt: endOfDay },
    });
  }

  async getAvailableSlots(startDate, endDate) {
    return DeliverySlot.find({
      deliveryDate: { $gte: startDate, $lte: endDate },
      isLocked: false,
    }).sort({ deliveryDate: 1 });
  }

  async create(slot) {
    return DeliverySlot.create(slot);
  }

  async update(id, slot) {
    const result = await DeliverySlot.findByIdAndUpdate(id, slot, { new: true });
    return !!result;
  }

  async delete(id) {
    const result = await DeliverySlot.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Atomic increment với auto-lock khi đạt max
   */
  async incrementOrderCount(slotId) {
    const slot = await this.getById(slotId);
    if (!slot) return false;

    const filter = {
      _id: slotId,
      isLocked: false,
      $expr: { $lt: ['$currentOrderCount', '$maxOrdersPerSlot'] },
    };

    const updateOps = { $inc: { currentOrderCount: 1 } };

    // Auto-lock nếu đạt max sau khi +1
    if (slot.currentOrderCount + 1 >= slot.maxOrdersPerSlot) {
      updateOps.$set = { isLocked: true };
      console.log(`⚠️ [Slot Lock] Slot ${slotId} will be locked after this order`);
    }

    const result = await DeliverySlot.updateOne(filter, updateOps);

    if (result.modifiedCount === 0) {
      console.log(`⚠️ [Slot Full] Slot ${slotId} is full or locked`);
      return false;
    }

    console.log(`✅ [Slot Incremented] Slot ${slotId}: ${slot.currentOrderCount} -> ${slot.currentOrderCount + 1}`);
    return true;
  }

  /**
   * Decrement khi hủy đơn (rollback logic)
   */
  async decrementOrderCount(slotId) {
    const result = await DeliverySlot.updateOne(
      { _id: slotId, currentOrderCount: { $gt: 0 } },
      { $inc: { currentOrderCount: -1 }, $set: { isLocked: false } }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ [Slot Decremented] Slot ${slotId} unlocked and count decreased`);
      return true;
    }
    return false;
  }

  async isSlotAvailable(slotId) {
    const slot = await this.getById(slotId);
    if (!slot) return false;
    return !slot.isLocked && slot.currentOrderCount < slot.maxOrdersPerSlot;
  }
}
