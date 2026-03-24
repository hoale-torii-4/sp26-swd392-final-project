using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using MongoDB.Bson;
using System.Globalization;
using System.Text;

namespace ShopHangTet.Services
{
    public class GiftBoxService : IGiftBoxService
    {
        private readonly ShopHangTetDbContext _context;

        public GiftBoxService(ShopHangTetDbContext context)
        {
            _context = context;
        }

        private static string NormalizeSearch(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var normalized = value.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();
            foreach (var ch in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(ch);
                if (category != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(ch == 'đ' ? 'd' : ch == 'Đ' ? 'D' : ch);
                }
            }
            return builder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        }

        private static int CalculateGiftBoxAvailableStock(GiftBox giftBox, Dictionary<string, Item> itemMap)
        {
            if (giftBox.Items == null || giftBox.Items.Count == 0)
            {
                return 0;
            }

            var minAvailable = int.MaxValue;

            foreach (var giftItem in giftBox.Items)
            {
                if (giftItem.Quantity <= 0)
                {
                    continue;
                }

                if (!itemMap.TryGetValue(giftItem.ItemId, out var item))
                {
                    return 0;
                }

                var available = Math.Max(0, item.AvailableQuantity / giftItem.Quantity);
                minAvailable = Math.Min(minAvailable, available);
            }

            return minAvailable == int.MaxValue ? 0 : minAvailable;
        }

        public async Task<PagedResult<GiftBoxListResponseDTO>> GetGiftBoxesAsync(string? collectionId, string? keyword, bool? status, int page, int pageSize)
        {
            var query = _context.GiftBoxes.AsQueryable();

            if (!string.IsNullOrWhiteSpace(collectionId))
                query = query.Where(g => g.CollectionId == collectionId);

            var normalizedKeyword = NormalizeSearch(keyword ?? string.Empty);

            if (status.HasValue)
                query = query.Where(g => g.IsActive == status.Value);

            var items = await query
                .OrderBy(g => g.Name)
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(normalizedKeyword))
            {
                items = items.Where(g => NormalizeSearch(g.Name).Contains(normalizedKeyword)).ToList();
            }

            var total = items.Count;

            items = items
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            // Load related collections and tags for the page
            var collectionIds = items.Select(i => i.CollectionId).Distinct().ToList();
            var collections = await _context.Collections.Where(c => collectionIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Name);

            var allTagIds = items.SelectMany(i => i.Tags ?? new List<string>()).Distinct().ToList();
            var tags = await _context.Tags.Where(t => allTagIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => t.Name);

            var itemIds = items
                .SelectMany(g => g.Items ?? new List<GiftBoxItem>())
                .Select(x => x.ItemId)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();
            var itemMap = itemIds.Any()
                ? await _context.Items.Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id, i => i)
                : new Dictionary<string, Item>();

            var resultItems = items.Select(g => new GiftBoxListResponseDTO
            {
                Id = g.Id,
                Name = g.Name,
                Price = g.Price,
                StockQuantity = CalculateGiftBoxAvailableStock(g, itemMap),
                CollectionId = g.CollectionId,
                CollectionName = collections.ContainsKey(g.CollectionId) ? collections[g.CollectionId] : string.Empty,
                Type = "READY_MADE",
                Status = g.IsActive,
                StatusLabel = g.IsActive ? "ĐANG BÁN" : "TẠM ẨN",
                Thumbnail = g.Images != null && g.Images.Count > 0 ? g.Images.FirstOrDefault() : null,
                TagNames = (g.Tags ?? new List<string>()).Where(id => tags.ContainsKey(id)).Select(id => tags[id]).ToList(),
                ItemCount = g.Items?.Count ?? 0
            }).ToList();

            var totalPages = (int)Math.Ceiling(total / (double)pageSize);

            return new PagedResult<GiftBoxListResponseDTO>
            {
                Data = resultItems,
                TotalItems = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages
            };
        }

        public async Task<GiftBoxDetailResponseDTO?> GetGiftBoxByIdAsync(string id)
        {
            var g = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == id);
            if (g == null) return null;

            var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Id == g!.CollectionId);
            var tagIds = g.Tags ?? new List<string>();
            var tagEntities = tagIds.Any()
                ? await _context.Tags.Where(t => tagIds.Contains(t.Id)).ToListAsync()
                : new List<Tag>();

            var itemIds = (g.Items ?? new List<GiftBoxItem>()).Select(i => i.ItemId).Distinct().ToList();
            var itemEntities = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id, i => i);

            var detail = new GiftBoxDetailResponseDTO
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                Price = g.Price,
                CollectionId = g.CollectionId,
                CollectionName = collection?.Name ?? string.Empty,
                Images = g.Images ?? new List<string>(),
                Tags = tagEntities.Select(t => new TagReferenceDto { Id = t.Id, Name = t.Name, Type = t.Type }).ToList(),
                Items = (g.Items ?? new List<GiftBoxItem>()).Select(i => new GiftBoxItemDetailDto
                {
                    ItemId = i.ItemId,
                    ItemName = itemEntities.ContainsKey(i.ItemId) ? itemEntities[i.ItemId].Name : string.Empty,
                    Category = itemEntities.ContainsKey(i.ItemId) ? itemEntities[i.ItemId].Category.ToString() : string.Empty,
                    Price = itemEntities.ContainsKey(i.ItemId) ? itemEntities[i.ItemId].Price : i.ItemPriceSnapshot,
                    Quantity = i.Quantity
                }).ToList(),
                IsActive = g.IsActive,
                StatusLabel = g.IsActive ? "ĐANG BÁN" : "TẠM ẨN"
            };

            return detail;
        }

        public async Task<string> CreateGiftBoxAsync(GiftBoxCreateDTO dto)
        {
            var collectionExists = await _context.Collections.AnyAsync(c => c.Id == dto.CollectionId);
            if (!collectionExists) throw new InvalidOperationException("Collection not found");

            var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
            var items = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToListAsync();
            if (items.Count != itemIds.Count) throw new InvalidOperationException("One or more items not found");

            var itemDict = items.ToDictionary(i => i.Id, i => i);

            var giftBox = new GiftBox
            {
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                CollectionId = dto.CollectionId,
                Images = dto.Images ?? new List<string>(),
                Tags = dto.TagIds ?? new List<string>(),
                IsActive = dto.IsActive,
                Items = dto.Items.Select(x => new GiftBoxItem
                {
                    ItemId = x.ItemId,
                    Quantity = x.Quantity,
                    ItemPriceSnapshot = itemDict.ContainsKey(x.ItemId) ? itemDict[x.ItemId].Price : 0m
                }).ToList()
            };

            await _context.GiftBoxes.AddAsync(giftBox);
            await _context.SaveChangesAsync();

            return giftBox.Id;
        }

        public async Task UpdateGiftBoxAsync(string id, GiftBoxUpdateDTO dto)
        {
            var usedInOrders = false;
            if (ObjectId.TryParse(id, out var parsedId))
            {
                usedInOrders = await _context.OrderItems.AnyAsync(o => o.GiftBoxId != null && o.GiftBoxId == parsedId);
            }
            else
            {
                usedInOrders = await _context.OrderItems.AnyAsync(o => o.GiftBoxId != null && o.GiftBoxId.ToString() == id);
            }
            if (usedInOrders) throw new InvalidOperationException("Cannot modify gift box used in orders");

            var entity = await _context.GiftBoxes.FirstOrDefaultAsync(g => g.Id == id);
            if (entity == null) throw new InvalidOperationException("Gift box not found");

            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.Price = dto.Price;
            entity.CollectionId = dto.CollectionId;
            if (dto.Images != null) entity.Images = dto.Images;
            if (dto.TagIds != null) entity.Tags = dto.TagIds;

            if (dto.Items != null)
            {
                var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
                var items = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id, i => i);
                entity.Items = dto.Items.Select(x => new GiftBoxItem
                {
                    ItemId = x.ItemId,
                    Quantity = x.Quantity,
                    ItemPriceSnapshot = items.ContainsKey(x.ItemId) ? items[x.ItemId].Price : 0m
                }).ToList();
            }

            entity.IsActive = dto.IsActive;

            _context.GiftBoxes.Update(entity);
            await _context.SaveChangesAsync();
        }

        public async Task ToggleGiftBoxStatusAsync(string id, bool isActive)
        {
            var entity = await _context.GiftBoxes.FirstOrDefaultAsync(g => g.Id == id);
            if (entity == null) throw new InvalidOperationException("Gift box not found");

            entity.IsActive = isActive;
            _context.GiftBoxes.Update(entity);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteGiftBoxAsync(string id)
        {
            var usedInOrders = false;
            if (ObjectId.TryParse(id, out var parsedDeleteId))
            {
                usedInOrders = await _context.OrderItems.AnyAsync(o => o.GiftBoxId != null && o.GiftBoxId == parsedDeleteId);
            }
            else
            {
                usedInOrders = await _context.OrderItems.AnyAsync(o => o.GiftBoxId != null && o.GiftBoxId.ToString() == id);
            }
            if (usedInOrders) throw new InvalidOperationException("Cannot delete gift box used in orders");

            var entity = await _context.GiftBoxes.FirstOrDefaultAsync(g => g.Id == id);
            if (entity == null) return;

            _context.GiftBoxes.Remove(entity);
            await _context.SaveChangesAsync();
        }

        public async Task<List<SimpleCollectionDTO>> GetCollectionsAsync()
        {
            return await _context.Collections
                .OrderBy(c => c.DisplayOrder)
                .Select(c => new SimpleCollectionDTO { Id = c.Id, Name = c.Name })
                .ToListAsync();
        }

        public async Task<List<SimpleItemDTO>> GetItemsAsync()
        {
            return await _context.Items
                .OrderBy(i => i.Name)
                .Select(i => new SimpleItemDTO { Id = i.Id, Name = i.Name, Category = i.Category.ToString(), Price = i.Price, StockQuantity = i.StockQuantity - i.ReservedQuantity })
                .ToListAsync();
        }

        public async Task<List<SimpleTagDTO>> GetTagsAsync()
        {
            return await _context.Tags
                .OrderBy(t => t.Name)
                .Select(t => new SimpleTagDTO { Id = t.Id, Name = t.Name, Type = t.Type })
                .ToListAsync();
        }
    }
}
