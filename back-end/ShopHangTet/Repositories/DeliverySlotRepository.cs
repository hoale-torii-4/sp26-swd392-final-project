using MongoDB.Bson;
using MongoDB.Driver;
using ShopHangTet.Models;

namespace ShopHangTet.Repositories;

public class DeliverySlotRepository : IDeliverySlotRepository
{
    private readonly IMongoCollection<DeliverySlot> _collection;

    public DeliverySlotRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<DeliverySlot>("DeliverySlots");
    }

    public async Task<DeliverySlot?> GetByIdAsync(string id)
    {
        var filter = Builders<DeliverySlot>.Filter.Eq(x => x.Id, ObjectId.Parse(id));
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<DeliverySlot>> GetAllAsync()
    {
        return await _collection.Find(_ => true).ToListAsync();
    }

    public async Task<IEnumerable<DeliverySlot>> GetByDateAsync(DateTime date)
    {
        var startOfDay = date.Date;
        var endOfDay = startOfDay.AddDays(1);
        
        var filter = Builders<DeliverySlot>.Filter.And(
            Builders<DeliverySlot>.Filter.Gte(x => x.DeliveryDate, startOfDay),
            Builders<DeliverySlot>.Filter.Lt(x => x.DeliveryDate, endOfDay)
        );
        
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<IEnumerable<DeliverySlot>> GetAvailableSlotsAsync(DateTime startDate, DateTime endDate)
    {
        var filter = Builders<DeliverySlot>.Filter.And(
            Builders<DeliverySlot>.Filter.Gte(x => x.DeliveryDate, startDate),
            Builders<DeliverySlot>.Filter.Lte(x => x.DeliveryDate, endDate),
            Builders<DeliverySlot>.Filter.Eq(x => x.IsLocked, false)
        );
        
        return await _collection.Find(filter).SortBy(x => x.DeliveryDate).ToListAsync();
    }

    public async Task<DeliverySlot> CreateAsync(DeliverySlot slot)
    {
        await _collection.InsertOneAsync(slot);
        return slot;
    }

    public async Task<bool> UpdateAsync(string id, DeliverySlot slot)
    {
        var filter = Builders<DeliverySlot>.Filter.Eq(x => x.Id, ObjectId.Parse(id));
        var result = await _collection.ReplaceOneAsync(filter, slot);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var filter = Builders<DeliverySlot>.Filter.Eq(x => x.Id, ObjectId.Parse(id));
        var result = await _collection.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }

    /// <summary>
    /// ✅ Atomic increment với auto-lock khi đạt max
    /// QUAN TRỌNG: Tránh race condition
    /// </summary>
    public async Task<bool> IncrementOrderCountAsync(string slotId)
    {
        var filter = Builders<DeliverySlot>.Filter.And(
            Builders<DeliverySlot>.Filter.Eq(x => x.Id, ObjectId.Parse(slotId)),
            Builders<DeliverySlot>.Filter.Eq(x => x.IsLocked, false),
            // ⚠️ QUAN TRỌNG: Chỉ increment nếu chưa đạt max
            Builders<DeliverySlot>.Filter.Where(x => x.CurrentOrderCount < x.MaxOrdersPerSlot)
        );
        
        var update = Builders<DeliverySlot>.Update
            .Inc(x => x.CurrentOrderCount, 1);
        
        // Nếu sau khi +1 mà == max thì auto-lock
        var updateWithLock = Builders<DeliverySlot>.Update.Combine(
            update,
            Builders<DeliverySlot>.Update.Set(x => x.IsLocked, true)
        );
        
        // Fetch slot để check điều kiện lock
        var slot = await GetByIdAsync(slotId);
        if (slot == null) return false;
        
        UpdateDefinition<DeliverySlot> finalUpdate;
        if (slot.CurrentOrderCount + 1 >= slot.MaxOrdersPerSlot)
        {
            finalUpdate = updateWithLock;
            Console.WriteLine($"🔒 [Slot Lock] Slot {slotId} will be locked after this order");
        }
        else
        {
            finalUpdate = update;
        }
        
        var result = await _collection.UpdateOneAsync(filter, finalUpdate);
        
        if (result.ModifiedCount == 0)
        {
            Console.WriteLine($"❌ [Slot Full] Slot {slotId} is full or locked");
            return false;
        }
        
        Console.WriteLine($"✅ [Slot Incremented] Slot {slotId}: {slot.CurrentOrderCount} -> {slot.CurrentOrderCount + 1}");
        return true;
    }

    /// <summary>
    /// ✅ Decrement khi hủy đơn (rollback logic)
    /// </summary>
    public async Task<bool> DecrementOrderCountAsync(string slotId)
    {
        var filter = Builders<DeliverySlot>.Filter.And(
            Builders<DeliverySlot>.Filter.Eq(x => x.Id, ObjectId.Parse(slotId)),
            Builders<DeliverySlot>.Filter.Gt(x => x.CurrentOrderCount, 0) // Không cho âm
        );
        
        var update = Builders<DeliverySlot>.Update
            .Inc(x => x.CurrentOrderCount, -1)
            .Set(x => x.IsLocked, false); // Unlock khi decrement
        
        var result = await _collection.UpdateOneAsync(filter, update);
        
        if (result.ModifiedCount > 0)
        {
            Console.WriteLine($"🔓 [Slot Decremented] Slot {slotId} unlocked and count decreased");
            return true;
        }
        
        return false;
    }

    public async Task<bool> IsSlotAvailableAsync(string slotId)
    {
        var slot = await GetByIdAsync(slotId);
        if (slot == null) return false;
        
        return !slot.IsLocked && slot.CurrentOrderCount < slot.MaxOrdersPerSlot;
    }
}
