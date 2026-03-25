using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services
{
    public class ProductService : IProductService
    {
        private readonly ShopHangTetDbContext _context;

        public ProductService(ShopHangTetDbContext context)
        {
            _context = context;
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

        public async Task<List<Item>> GetItemsAsync(string? name = null)
        {
            var query = _context.Items.Where(x => x.IsActive);
            if (!string.IsNullOrWhiteSpace(name))
            {
                // Normalize search keyword.
                var normalizedName = name.Trim().ToLower();

                query = query.Where(x => x.Name.ToLower().Contains(normalizedName));
            }

            var items = await query.ToListAsync();
            return items.Select(x => new Item
            {
                Id = x.Id,
                Name = x.Name,
                Category = x.Category,
                Price = x.Price,
                Images = x.Images,
                IsAlcohol = x.IsAlcohol,
                StockQuantity = Math.Max(0, x.AvailableQuantity),
                ReservedQuantity = x.ReservedQuantity,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            }).ToList();
        }

        public async Task<Item?> GetItemByIdAsync(string id)
        {
            return await _context.Items
                .FirstOrDefaultAsync(x => x.Id == id && x.IsActive);
        }

        public async Task<List<GiftBoxListDto>> GetGiftBoxesAsync(string? name = null)
        {
            var query = _context.GiftBoxes.Where(x => x.IsActive);

            if (!string.IsNullOrWhiteSpace(name))
            {
                // Normalize search keyword.
                var normalizedName = name.Trim().ToLower();
                query = query.Where(x => x.Name.ToLower().Contains(normalizedName));
            }

            var giftBoxes = await query.ToListAsync();
            var collectionIds = giftBoxes.Select(x => x.CollectionId).Distinct().ToList();
            var collections = await _context.Collections
                .Where(x => collectionIds.Contains(x.Id) && x.IsActive)
                .ToDictionaryAsync(x => x.Id, x => x.Name);

            var itemIds = giftBoxes
                .SelectMany(x => x.Items)
                .Select(i => i.ItemId)
                .Distinct()
                .ToList();
            var items = await _context.Items
                .Where(x => itemIds.Contains(x.Id) && x.IsActive)
                .ToDictionaryAsync(x => x.Id, x => x);

            var tagIds = giftBoxes
                .SelectMany(x => x.Tags)
                .Distinct()
                .ToList();
            var tags = await _context.Tags
                .Where(x => tagIds.Contains(x.Id) && x.IsActive)
                .ToDictionaryAsync(x => x.Id, x => x.Name);

            return giftBoxes
                .Select(x => new GiftBoxListDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Description = x.Description,
                    Price = x.Price,
                    StockQuantity = CalculateGiftBoxAvailableStock(x, items),
                    Image = x.Images.FirstOrDefault(),
                    Collection = collections.TryGetValue(x.CollectionId, out var collectionName) ? collectionName : string.Empty,
                    Tags = x.Tags
                        .Select(tagId => tags.TryGetValue(tagId, out var tagName) ? tagName : string.Empty)
                        .Where(tagName => !string.IsNullOrWhiteSpace(tagName))
                        .ToList(),
                    Items = x.Items.Select(gi =>
                    {
                        items.TryGetValue(gi.ItemId, out var item);
                        return new GiftBoxItemFlatDto
                        {
                            Id = gi.ItemId,
                            Name = item?.Name ?? string.Empty,
                            Price = gi.ItemPriceSnapshot > 0 ? gi.ItemPriceSnapshot : item?.Price ?? 0,
                            Image = item?.Images.FirstOrDefault(),
                            Quantity = gi.Quantity
                        };
                    }).ToList(),
                    IsActive = x.IsActive,
                    CreatedAt = x.CreatedAt
                })
                .ToList();
        }

        public async Task<GiftBoxDetailDto?> GetGiftBoxDetailByIdAsync(string id)
        {
            var giftBox = await _context.GiftBoxes
                .FirstOrDefaultAsync(x => x.Id == id && x.IsActive);

            if (giftBox == null)
            {
                return null;
            }

            var itemIds = giftBox.Items.Select(i => i.ItemId).Distinct().ToList();
            var items = await _context.Items
                .Where(it => itemIds.Contains(it.Id) && it.IsActive)
                .ToDictionaryAsync(it => it.Id, it => it);

            var collection = await _context.Collections
                .FirstOrDefaultAsync(x => x.Id == giftBox.CollectionId && x.IsActive);

            var tagIds = giftBox.Tags.Distinct().ToList();
            var tags = await _context.Tags
                .Where(t => tagIds.Contains(t.Id) && t.IsActive)
                .ToDictionaryAsync(t => t.Id, t => t.Name);

            return new GiftBoxDetailDto
            {
                Id = giftBox.Id,
                Name = giftBox.Name,
                Description = giftBox.Description,
                Price = giftBox.Price,
                StockQuantity = CalculateGiftBoxAvailableStock(giftBox, items),
                Image = giftBox.Images.FirstOrDefault(),
                Images = giftBox.Images,
                Collection = collection?.Name ?? string.Empty,
                Tags = giftBox.Tags
                    .Select(tagId => tags.TryGetValue(tagId, out var tagName) ? tagName : string.Empty)
                    .Where(tagName => !string.IsNullOrWhiteSpace(tagName))
                    .ToList(),
                Items = giftBox.Items.Select(gi =>
                {
                    items.TryGetValue(gi.ItemId, out var item);
                    return new GiftBoxItemFlatDto
                    {
                        Id = gi.ItemId,
                        Name = item?.Name ?? string.Empty,
                        Price = gi.ItemPriceSnapshot > 0 ? gi.ItemPriceSnapshot : item?.Price ?? 0,
                        Image = item?.Images.FirstOrDefault(),
                        Quantity = gi.Quantity
                    };
                }).ToList(),
                IsActive = giftBox.IsActive,
                CreatedAt = giftBox.CreatedAt
            };
        }

        public async Task<List<CollectionListDto>> GetCollectionsAsync(string? name = null)
        {
            var query = _context.Collections.Where(x => x.IsActive);

            if (!string.IsNullOrWhiteSpace(name))
            {
                // Normalize search keyword.
                var normalizedName = name.Trim().ToLower();

                query = query.Where(x => x.Name.ToLower().Contains(normalizedName));
            }

            var collections = await query
                .OrderBy(x => x.DisplayOrder)
                .ToListAsync();

            var collectionIds = collections.Select(x => x.Id).ToList();
            var giftBoxes = await _context.GiftBoxes
                .Where(x => x.IsActive && collectionIds.Contains(x.CollectionId))
                .ToListAsync();

            return collections.Select(collection => new CollectionListDto
            {
                Id = collection.Id,
                Name = collection.Name,
                Description = collection.Description,
                CoverImage = collection.CoverImage,
                PricingMultiplier = collection.PricingMultiplier,
                PackagingFee = collection.PackagingFee,
                DisplayOrder = collection.DisplayOrder,
                IsActive = collection.IsActive,
                CreatedAt = collection.CreatedAt,
                GiftBoxCount = giftBoxes.Count(x => x.CollectionId == collection.Id)
            }).ToList();
        }

        public async Task<CollectionDetailDto?> GetCollectionDetailByIdAsync(string id)
        {
            var collection = await _context.Collections
                .FirstOrDefaultAsync(x => x.Id == id && x.IsActive);

            if (collection == null)
            {
                return null;
            }

            var giftBoxes = await _context.GiftBoxes
                .Where(x => x.CollectionId == id && x.IsActive)
                .Select(x => new GiftBoxListDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Description = x.Description,
                    Price = x.Price,
                    Image = x.Images.FirstOrDefault(),
                    Collection = collection.Name,
                    IsActive = x.IsActive,
                    CreatedAt = x.CreatedAt,
                    Tags = new List<string>(),
                    Items = new List<GiftBoxItemFlatDto>()
                })
                .ToListAsync();

            return new CollectionDetailDto
            {
                Id = collection.Id,
                Name = collection.Name,
                Description = collection.Description,
                CoverImage = collection.CoverImage,
                PricingMultiplier = collection.PricingMultiplier,
                PackagingFee = collection.PackagingFee,
                DisplayOrder = collection.DisplayOrder,
                IsActive = collection.IsActive,
                CreatedAt = collection.CreatedAt,
                GiftBoxes = giftBoxes
            };
        }

        // GiftBox pricing

        /// Price = (item cost * multiplier) + packaging fee.
        public async Task<decimal> CalculateGiftBoxPriceAsync(string collectionId, List<GiftBoxItem> items)
        {
            var collection = await _context.Collections.FirstOrDefaultAsync(x => x.Id == collectionId);
            if (collection == null)
                throw new InvalidOperationException("Collection not found");

            var itemIds = items.Select(x => x.ItemId).Distinct().ToList();
            var dbItems = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
            var itemMap = dbItems.ToDictionary(x => x.Id, x => x);

            decimal totalCost = 0;
            foreach (var giftBoxItem in items)
            {
                if (itemMap.TryGetValue(giftBoxItem.ItemId, out var item))
                {
                    totalCost += item.Price * giftBoxItem.Quantity;
                }
            }

            // Apply collection pricing rule.
            var price = (totalCost * collection.PricingMultiplier) + collection.PackagingFee;
            return Math.Round(price, 0); // Round to VND.
        }

        /// Create GiftBox with calculated price by default.
        public async Task<GiftBox> CreateGiftBoxAsync(CreateGiftBoxDto dto)
        {
            decimal price;
            var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
            var dbItems = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
            var itemMap = dbItems.ToDictionary(x => x.Id, x => x);

            var giftBoxItems = dto.Items.Select(i => new GiftBoxItem
            {
                ItemId = i.ItemId,
                Quantity = i.Quantity,
                ItemPriceSnapshot = itemMap.TryGetValue(i.ItemId, out var item) ? item.Price : 0
            }).ToList();

            if (dto.PriceOverride.HasValue && dto.PriceOverride.Value > 0)
            {
                price = dto.PriceOverride.Value;
            }
            else
            {
                price = await CalculateGiftBoxPriceAsync(dto.CollectionId, giftBoxItems);
            }

            var giftBox = new GiftBox
            {
                Name = dto.Name,
                Description = dto.Description,
                Price = price,
                Images = dto.Images,
                CollectionId = dto.CollectionId,
                Tags = dto.Tags,
                Items = giftBoxItems,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.GiftBoxes.Add(giftBox);
            await _context.SaveChangesAsync();

            return giftBox;
        }

        /// Recalculate price when items or collection change.
        public async Task<GiftBox> UpdateGiftBoxAsync(string id, UpdateGiftBoxDto dto)
        {
            var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == id);
            if (giftBox == null) throw new InvalidOperationException("GiftBox not found");

            if (!string.IsNullOrEmpty(dto.Name)) giftBox.Name = dto.Name;
            if (!string.IsNullOrEmpty(dto.Description)) giftBox.Description = dto.Description;
            if (dto.Images != null) giftBox.Images = dto.Images;
            if (!string.IsNullOrEmpty(dto.CollectionId)) giftBox.CollectionId = dto.CollectionId;
            if (dto.Tags != null) giftBox.Tags = dto.Tags;
            if (dto.IsActive.HasValue) giftBox.IsActive = dto.IsActive.Value;

            if (dto.Items != null)
            {
                var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
                var dbItems = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
                var itemMap = dbItems.ToDictionary(x => x.Id, x => x);

                giftBox.Items = dto.Items.Select(i => new GiftBoxItem
                {
                    ItemId = i.ItemId,
                    Quantity = i.Quantity,
                    ItemPriceSnapshot = itemMap.TryGetValue(i.ItemId, out var item) ? item.Price : 0
                }).ToList();
            }

            // Recalculate price when needed.
            if (dto.PriceOverride.HasValue && dto.PriceOverride.Value > 0)
            {
                giftBox.Price = dto.PriceOverride.Value;
            }
            else if (dto.Items != null || dto.CollectionId != null)
            {
                giftBox.Price = await CalculateGiftBoxPriceAsync(giftBox.CollectionId, giftBox.Items);
            }

            await _context.SaveChangesAsync();
            return giftBox;
        }
    }
}