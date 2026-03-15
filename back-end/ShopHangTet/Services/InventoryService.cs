using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using System.Globalization;
using System.Text;

namespace ShopHangTet.Services
{
    public class InventoryService : IInventoryService
    {
        private readonly ShopHangTetDbContext _context;

        public InventoryService(ShopHangTetDbContext context)
        {
            _context = context;
        }

        private static (string status, string label) GetStockStatus(int qty)
        {
            if (qty > 20) return ("IN_STOCK", "In stock");
            if (qty >= 1) return ("LOW_STOCK", "Low stock");
            return ("OUT_OF_STOCK", "Out of stock");
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

        public async Task<PagedResult<InventoryItemResponseDTO>> GetInventoryAsync(string? search, string? category, string? stockStatus, int page, int pageSize)
        {
            var query = _context.Items.AsQueryable();

            var normalizedSearch = NormalizeSearch(search ?? string.Empty);

            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(i => i.Category.ToString() == category);

            var items = await query
                .OrderBy(i => i.Name)
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                items = items.Where(i => NormalizeSearch(i.Name).Contains(normalizedSearch)).ToList();
            }

            var total = items.Count;

            items = items
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            // Load last updated times. Mongo EF provider can't translate GroupBy+Max; fetch and group in-memory.
            var itemIds = items.Select(i => i.Id).ToList();
            var lastLogsList = await _context.InventoryLogs
                .Where(l => itemIds.Contains(l.ItemId))
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new { l.ItemId, l.CreatedAt })
                .ToListAsync();

            var lastLogs = lastLogsList
                .GroupBy(x => x.ItemId)
                .ToDictionary(g => g.Key, g => g.First().CreatedAt);

            var result = items.Select(i =>
            {
                var (status, label) = GetStockStatus(i.StockQuantity);
                if (!string.IsNullOrWhiteSpace(stockStatus) && stockStatus != status) return null;

                return new InventoryItemResponseDTO
                {
                    Id = i.Id,
                    Name = i.Name,
                    Sku = i.Id, // no SKU field in model; use Id as fallback
                    Category = i.Category.ToString(),
                    CategoryLabel = i.Category.ToString(),
                    Price = i.Price,
                    StockQuantity = i.StockQuantity,
                    StockStatus = status,
                    StockStatusLabel = label,
                    IsAlcohol = i.IsAlcohol,
                    LastUpdated = lastLogs.ContainsKey(i.Id) ? lastLogs[i.Id] : (DateTime?)null
                };
            }).OfType<InventoryItemResponseDTO>().ToList();

            var totalPages = (int)Math.Ceiling(total / (double)pageSize);

            return new PagedResult<InventoryItemResponseDTO>
            {
                Data = result,
                TotalItems = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages
            };
        }

        public async Task<InventoryItemDetailDTO?> GetItemDetailAsync(string itemId)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == itemId);
            if (item == null) return null;

            var (status, label) = GetStockStatus(item.StockQuantity);

            var recentLogs = await _context.InventoryLogs
                .Where(l => l.ItemId == itemId)
                .OrderByDescending(l => l.CreatedAt)
                .Take(5)
                .ToListAsync();

            var detail = new InventoryItemDetailDTO
            {
                Id = item.Id,
                Name = item.Name,
                Sku = item.Id,
                Category = item.Category.ToString(),
                CategoryLabel = item.Category.ToString(),
                Price = item.Price,
                StockQuantity = item.StockQuantity,
                StockStatus = status,
                StockStatusLabel = label,
                IsAlcohol = item.IsAlcohol,
                RecentLogs = recentLogs.Select(l => new InventoryLogDTO
                {
                    Id = l.Id,
                    ItemId = l.ItemId,
                    ItemName = l.ItemName ?? item.Name,
                    Sku = l.Sku ?? item.Id,
                    ChangeType = l.ChangeType ?? l.Action ?? string.Empty,
                    ChangeTypeLabel = l.ChangeType ?? l.Action ?? string.Empty,
                    QuantityChange = l.QuantityChange ?? l.Quantity,
                    PreviousStock = l.PreviousStock ?? 0,
                    NewStock = l.NewStock ?? (item.StockQuantity),
                    Source = l.Source ?? string.Empty,
                    Reason = l.Reason,
                    CreatedAt = l.CreatedAt
                }).ToList()
            };

            return detail;
        }

        public async Task<PagedResult<InventoryLogDTO>> GetInventoryLogsAsync(string? search, string? changeType, string? source, DateTime? date, int page, int pageSize)
        {
            var query = _context.InventoryLogs.AsQueryable();

            var normalizedSearch = NormalizeSearch(search ?? string.Empty);

            if (!string.IsNullOrWhiteSpace(changeType))
                query = query.Where(l => (l.ChangeType ?? l.Action ?? string.Empty) == changeType);

            if (!string.IsNullOrWhiteSpace(source))
                query = query.Where(l => l.Source == source);

            if (date.HasValue)
            {
                var from = date.Value.Date;
                var to = from.AddDays(1);
                query = query.Where(l => l.CreatedAt >= from && l.CreatedAt < to);
            }

            var logs = await query
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                logs = logs.Where(l => NormalizeSearch(l.ItemName ?? string.Empty).Contains(normalizedSearch)
                    || NormalizeSearch(l.Sku ?? string.Empty).Contains(normalizedSearch))
                    .ToList();
            }

            var total = logs.Count;

            logs = logs
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            // Load item names for any logs missing itemName
            var itemIds = logs.Select(l => l.ItemId).Distinct().ToList();
            var items = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id, i => i);

            var result = logs.Select(l => new InventoryLogDTO
            {
                Id = l.Id,
                ItemId = l.ItemId,
                ItemName = l.ItemName ?? (items.ContainsKey(l.ItemId) ? items[l.ItemId].Name : string.Empty),
                Sku = l.Sku ?? l.ItemId,
                ChangeType = l.ChangeType ?? l.Action ?? string.Empty,
                ChangeTypeLabel = l.ChangeType ?? l.Action ?? string.Empty,
                QuantityChange = l.QuantityChange ?? l.Quantity,
                PreviousStock = l.PreviousStock ?? 0,
                NewStock = l.NewStock ?? 0,
                Source = l.Source ?? string.Empty,
                Reason = l.Reason,
                CreatedAt = l.CreatedAt
            }).ToList();

            var totalPages = (int)Math.Ceiling(total / (double)pageSize);

            return new PagedResult<InventoryLogDTO>
            {
                Data = result,
                TotalItems = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages
            };
        }

        public async Task AdjustInventoryAsync(InventoryAdjustRequestDTO dto)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == dto.ItemId);
            if (item == null) throw new InvalidOperationException("Item not found");

            var previous = item.StockQuantity;
            int newStock;
            var changeType = dto.AdjustType?.ToUpperInvariant();
            int qtyChange = dto.Quantity;

            if (changeType == "INCREASE")
            {
                newStock = previous + qtyChange;
                item.StockQuantity = newStock;
            }
            else if (changeType == "DECREASE")
            {
                newStock = previous - qtyChange;
                if (newStock < 0) throw new InvalidOperationException("Resulting stock cannot be negative");
                item.StockQuantity = newStock;
                qtyChange = -qtyChange; // record negative change
            }
            else
            {
                throw new InvalidOperationException("Invalid AdjustType");
            }

            _context.Items.Update(item);

            var log = new InventoryLog
            {
                OrderId = string.Empty,
                ItemId = item.Id,
                Quantity = qtyChange,
                Action = changeType,
                ItemName = item.Name,
                Sku = item.Id,
                ChangeType = changeType,
                QuantityChange = qtyChange,
                PreviousStock = previous,
                NewStock = item.StockQuantity,
                Source = "Admin",
                Reason = dto.Reason,
                CreatedAt = DateTime.UtcNow
            };

            _context.InventoryLogs.Add(log);

            await _context.SaveChangesAsync();
        }

        public async Task<InventorySummaryDTO> GetInventorySummaryAsync()
        {
            var total = await _context.Items.CountAsync();
            var inStock = await _context.Items.CountAsync(i => i.StockQuantity > 20);
            var lowStock = await _context.Items.CountAsync(i => i.StockQuantity >= 1 && i.StockQuantity <= 20);
            var outStock = await _context.Items.CountAsync(i => i.StockQuantity == 0);

            return new InventorySummaryDTO
            {
                TotalItems = total,
                InStock = inStock,
                LowStock = lowStock,
                OutOfStock = outStock
            };
        }
    }
}
