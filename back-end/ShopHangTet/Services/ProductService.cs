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

        public async Task<List<Item>> GetItemsAsync(string? name = null)
        {
            var query = _context.Items.Where(x => x.IsActive);

            if (!string.IsNullOrWhiteSpace(name))
            {
                var normalizedName = name.Trim();
                query = query.Where(x => x.Name.Contains(normalizedName));
            }

            return await query.ToListAsync();
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
                var normalizedName = name.Trim();
                query = query.Where(x => x.Name.Contains(normalizedName));
            }

            return await query
                .Select(x => new GiftBoxListDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Description = x.Description,
                    Price = x.Price,
                    MainImage = x.Images.FirstOrDefault(),
                    Images = x.Images,
                    CollectionId = x.CollectionId,
                    Tags = x.Tags,
                    IsActive = x.IsActive,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();
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
                .ToListAsync();

            return new GiftBoxDetailDto
            {
                Id = giftBox.Id,
                Name = giftBox.Name,
                Description = giftBox.Description,
                Price = giftBox.Price,
                MainImage = giftBox.Images.FirstOrDefault(),
                Images = giftBox.Images,
                CollectionId = giftBox.CollectionId,
                Tags = giftBox.Tags,
                Items = giftBox.Items.Select(gi => new GiftBoxDetailItemDto
                {
                    ItemId = gi.ItemId,
                    Quantity = gi.Quantity,
                    Item = items.FirstOrDefault(it => it.Id == gi.ItemId)
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
                var normalizedName = name.Trim();
                query = query.Where(x => x.Name.Contains(normalizedName));
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
                    MainImage = x.Images.FirstOrDefault(),
                    Images = x.Images,
                    CollectionId = x.CollectionId,
                    Tags = x.Tags,
                    IsActive = x.IsActive,
                    CreatedAt = x.CreatedAt
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

        // === GiftBox Pricing ===

        /// Tính giá GiftBox tự động: (sum item cost × multiplier) + packagingFee
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

            // price = (sum cost × multiplier) + packagingFee
            var price = (totalCost * collection.PricingMultiplier) + collection.PackagingFee;
            return Math.Round(price, 0); // Làm tròn VND
        }

        /// Tạo GiftBox mới — Price tự tính từ collection pricing rule
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

        /// Cập nhật GiftBox — Price tự tính lại nếu items thay đổi
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

            // Recalculate price nếu có PriceOverride hoặc items thay đổi
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