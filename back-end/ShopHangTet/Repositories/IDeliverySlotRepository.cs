using ShopHangTet.Models;

namespace ShopHangTet.Interfaces;

public interface IDeliverySlotRepository
{
    Task<DeliverySlot?> GetByIdAsync(string id);
    Task<IEnumerable<DeliverySlot>> GetAllAsync();
    Task<IEnumerable<DeliverySlot>> GetByDateAsync(DateTime date);
    Task<IEnumerable<DeliverySlot>> GetAvailableSlotsAsync(DateTime startDate, DateTime endDate);

    Task<DeliverySlot> CreateAsync(DeliverySlot slot);
    Task<bool> UpdateAsync(string id, DeliverySlot slot);
    Task<bool> DeleteAsync(string id);

    Task<bool> IncrementOrderCountAsync(string slotId);
    Task<bool> DecrementOrderCountAsync(string slotId);
    Task<bool> IsSlotAvailableAsync(string slotId);
}