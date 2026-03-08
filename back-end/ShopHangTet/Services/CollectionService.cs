using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    public class CollectionService : ICollectionService
    {
        private readonly ShopHangTetDbContext _context;

        public CollectionService(ShopHangTetDbContext context)
        {
            _context = context;
        }

        public async Task<List<CollectionResponseDTO>> GetCollectionsAsync()
        {
            var collections = await _context.Collections
                .OrderBy(c => c.DisplayOrder)
                .ToListAsync();

            var giftBoxes = await _context.GiftBoxes.ToListAsync();

            var gbGroups = giftBoxes
                .GroupBy(g => g.CollectionId)
                .ToDictionary(g => g.Key, g => new
                {
                    Count = g.Count(),
                    Thumbnail = g.Where(x => x.Images != null && x.Images.Count > 0)
                                 .Select(x => x.Images.FirstOrDefault())
                                 .FirstOrDefault()
                });

            var result = collections.Select(c => new CollectionResponseDTO
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                DisplayOrder = c.DisplayOrder,
                IsActive = c.IsActive,
                StatusLabel = c.IsActive ? "Published" : "Unpublished",
                GiftBoxCount = gbGroups.ContainsKey(c.Id) ? gbGroups[c.Id].Count : 0,
                Thumbnail = gbGroups.ContainsKey(c.Id) ? gbGroups[c.Id].Thumbnail : null
            }).ToList();

            return result;
        }

        public async Task<CollectionResponseDTO?> GetCollectionByIdAsync(string id)
        {
            var c = await _context.Collections.FirstOrDefaultAsync(x => x.Id == id);
            if (c == null) return null;

            var giftBoxCount = await _context.GiftBoxes.CountAsync(g => g.CollectionId == id);
            var thumbnail = await _context.GiftBoxes
                .Where(g => g.CollectionId == id && g.Images != null && g.Images.Count > 0)
                .Select(g => g.Images.FirstOrDefault())
                .FirstOrDefaultAsync();

            return new CollectionResponseDTO
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                DisplayOrder = c.DisplayOrder,
                IsActive = c.IsActive,
                StatusLabel = c.IsActive ? "Published" : "Unpublished",
                GiftBoxCount = giftBoxCount,
                Thumbnail = thumbnail
            };
        }

        public async Task<string> CreateCollectionAsync(CollectionCreateDTO dto)
        {
            var entity = new Collection
            {
                Name = dto.Name,
                Description = dto.Description,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive
            };

            await _context.Collections.AddAsync(entity);
            await _context.SaveChangesAsync();

            return entity.Id;
        }

        public async Task UpdateCollectionAsync(string id, CollectionUpdateDTO dto)
        {
            var entity = await _context.Collections.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) throw new InvalidOperationException("Collection not found");

            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.DisplayOrder = dto.DisplayOrder;
            entity.IsActive = dto.IsActive;

            _context.Collections.Update(entity);
            await _context.SaveChangesAsync();
        }

        public async Task ToggleCollectionStatusAsync(string id, bool isActive)
        {
            var entity = await _context.Collections.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) throw new InvalidOperationException("Collection not found");

            entity.IsActive = isActive;
            _context.Collections.Update(entity);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteCollectionAsync(string id)
        {
            var hasBoxes = await _context.GiftBoxes.AnyAsync(x => x.CollectionId == id);
            if (hasBoxes)
            {
                throw new InvalidOperationException("Cannot delete collection containing gift boxes");
            }

            var entity = await _context.Collections.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return;

            _context.Collections.Remove(entity);
            await _context.SaveChangesAsync();
        }

        public async Task ReorderCollectionsAsync(List<CollectionReorderDTO> items)
        {
            if (items == null || items.Count == 0) return;

            var ids = items.Select(i => i.Id).ToList();
            var collections = await _context.Collections.Where(c => ids.Contains(c.Id)).ToListAsync();

            foreach (var it in items)
            {
                var c = collections.FirstOrDefault(x => x.Id == it.Id);
                if (c != null)
                {
                    c.DisplayOrder = it.DisplayOrder;
                }
            }

            _context.Collections.UpdateRange(collections);
            await _context.SaveChangesAsync();
        }
    }
}
