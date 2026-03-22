using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services;

public class ReportService : IReportService
{
    private readonly ILogger<ReportService> _logger;
    private readonly IMongoCollection<OrderModel> _ordersCol;
    private readonly IMongoCollection<ReportOrderItemDoc> _orderItemsCol;
    private readonly IMongoCollection<ReportGiftBoxDoc> _giftBoxesCol;
    private readonly IMongoCollection<ReportCollectionDoc> _collectionsCol;
    private readonly IMongoCollection<ReportReviewDoc> _reviewsCol;
    private readonly IMongoCollection<BsonDocument> _itemsCol;

    public ReportService(ILogger<ReportService> logger, IMongoDatabase mongoDatabase)
    {
        _logger = logger;
        _ordersCol = mongoDatabase.GetCollection<OrderModel>("Orders");
        _orderItemsCol = mongoDatabase.GetCollection<ReportOrderItemDoc>("OrderItems");
        _giftBoxesCol = mongoDatabase.GetCollection<ReportGiftBoxDoc>("GiftBoxes");
        _collectionsCol = mongoDatabase.GetCollection<ReportCollectionDoc>("Collections");
        _reviewsCol = mongoDatabase.GetCollection<ReportReviewDoc>("Reviews");
        _itemsCol = mongoDatabase.GetCollection<BsonDocument>("Items");
    }

    // ---- Lightweight DTOs for raw Mongo reads ----
    // OrderItems in MongoDB use PascalCase (written by EF), GiftBoxId is stored as string
    public class ReportOrderItemDoc
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;
        public int Type { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }

        [BsonRepresentation(BsonType.String)]
        public string? GiftBoxId { get; set; }

        [BsonRepresentation(BsonType.String)]
        public string? CustomBoxId { get; set; }
    }
    public class ReportGiftBoxDoc
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("collectionId")]
        public string CollectionId { get; set; } = string.Empty;

        [BsonElement("images")]
        public List<string>? Images { get; set; }
    }

    public class ReportCollectionDoc
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("coverImage")]
        public string? CoverImage { get; set; }
    }


    // ---- Report methods ----

    public async Task<DashboardReportDTO> GetDashboardAsync()
    {
        var now = DateTime.UtcNow;
        var recentFrom = now.AddDays(-30);
        var prevFrom = recentFrom.AddDays(-30);

        var allOrders = await GetAllOrdersAsync();
        var recentOrders = allOrders.Where(o => o.CreatedAt >= recentFrom).ToList();
        var prevOrders = allOrders.Where(o => o.CreatedAt >= prevFrom && o.CreatedAt < recentFrom).ToList();

            var recentRevenue = recentOrders.Sum(o => o.TotalAmount);
            var prevRevenue = prevOrders.Sum(o => o.TotalAmount);

        double revenueGrowth = prevRevenue <= 0 ? (recentRevenue <= 0 ? 0 : 100.0) : (double)((recentRevenue - prevRevenue) / prevRevenue * 100);

        var recentOrderCount = recentOrders.Count;
        var prevOrderCount = prevOrders.Count;
        double orderGrowth = prevOrderCount <= 0 ? (recentOrderCount <= 0 ? 0 : 100.0) : (double)((recentOrderCount - prevOrderCount) / (double)prevOrderCount * 100);

            var b2c = recentOrders.Count(o => o.OrderType == OrderType.B2C);
            var b2b = recentOrders.Count(o => o.OrderType == OrderType.B2B);
            var b2cPercent = recentOrders.Any() ? (double)b2c / recentOrders.Count * 100 : 0.0;
            var b2bPercent = recentOrders.Any() ? (double)b2b / recentOrders.Count * 100 : 0.0;

        var statusSummary = new ReportStatusSummaryDTO
        {
            PendingPayment = allOrders.Count(o => o.Status == OrderStatus.PAYMENT_CONFIRMING),
            Preparing = allOrders.Count(o => o.Status == OrderStatus.PREPARING),
            Shipping = allOrders.Count(o => o.Status == OrderStatus.SHIPPING),
            Completed = allOrders.Count(o => o.Status == OrderStatus.COMPLETED),
            Cancelled = allOrders.Count(o => o.Status == OrderStatus.CANCELLED),
            DeliveryFailed = allOrders.Count(o => o.Status == OrderStatus.DELIVERY_FAILED)
        };

            return new DashboardReportDTO
            {
                TotalRevenue = recentRevenue,
                RevenueGrowthPercent = Math.Round(revenueGrowth, 2),
                TotalOrders = recentOrderCount,
                OrderGrowthPercent = Math.Round(orderGrowth, 2),
                TodayRevenue = todayRevenue,
                TodayOrders = todayOrderCount,
                B2CPercent = Math.Round(b2cPercent, 2),
                B2BPercent = Math.Round(b2bPercent, 2),
                StatusSummary = statusSummary
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ReportService.GetDashboardAsync failed");
            return new DashboardReportDTO();
        }
    }

    public async Task<RevenueReportDTO> GetRevenueAsync(DateTime? fromDate, DateTime? toDate, string view, string? orderType)
    {
        try
        {
            var start = fromDate ?? DateTime.UtcNow.AddMonths(-1);
            var end = (toDate ?? DateTime.UtcNow).Date.AddDays(1).AddTicks(-1);

        var allOrders = await GetAllOrdersAsync();

        IEnumerable<OrderModel> filteredOrders = allOrders;
        if (!string.IsNullOrWhiteSpace(orderType) && Enum.TryParse<OrderType>(orderType, true, out var ot))
        {
            filteredOrders = filteredOrders.Where(o => o.OrderType == ot);
        }

        var orders = filteredOrders.Where(o => o.CreatedAt >= start && o.CreatedAt <= end).ToList();
        var totalRevenue = orders.Sum(o => o.TotalAmount);

        var prevStart = start.AddYears(-1);
        var prevEnd = end.AddYears(-1);
        var prevOrders = filteredOrders.Where(o => o.CreatedAt >= prevStart && o.CreatedAt <= prevEnd).ToList();
        var prevRevenue = prevOrders.Sum(o => o.TotalAmount);
        double growth = prevRevenue <= 0 ? (totalRevenue <= 0 ? 0 : 100.0) : (double)((totalRevenue - prevRevenue) / prevRevenue * 100);

            var chart = new List<RevenueReportChartItemDTO>();
            if (view == "month")
            {
                var grouped = orders.GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
                    .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Revenue = g.Sum(o => o.TotalAmount) })
                    .OrderBy(x => x.Year).ThenBy(x => x.Month).ToList();

                foreach (var g in grouped)
                {
                    var lastYearRev = prevOrders.Where(o => o.CreatedAt.Year == g.Year - 1 && o.CreatedAt.Month == g.Month).Sum(o => o.TotalAmount);
                    chart.Add(new RevenueReportChartItemDTO { Date = $"{g.Year}-{g.Month:D2}", Revenue = g.Revenue, LastYearRevenue = lastYearRev });
                }
            }
            else
            {
                var grouped = orders.GroupBy(o => o.CreatedAt.Date).Select(g => new { Date = g.Key, Revenue = g.Sum(o => o.TotalAmount) }).OrderBy(x => x.Date).ToList();
                foreach (var g in grouped)
                {
                    var lastYearDate = g.Date.AddYears(-1);
                    var lastYearRev = prevOrders.Where(o => o.CreatedAt.Date == lastYearDate).Sum(o => o.TotalAmount);
                    chart.Add(new RevenueReportChartItemDTO { Date = g.Date.ToString("yyyy-MM-dd"), Revenue = g.Revenue, LastYearRevenue = lastYearRev });
                }
            }

        var best = chart.OrderByDescending(c => c.Revenue).FirstOrDefault();

            var b2cPercent = orders.Any() ? (double)orders.Count(o => o.OrderType == OrderType.B2C) / orders.Count * 100 : 0.0;
            var b2bPercent = orders.Any() ? (double)orders.Count(o => o.OrderType == OrderType.B2B) / orders.Count * 100 : 0.0;

        return new RevenueReportDTO
        {
            TotalRevenue = totalRevenue,
            GrowthPercent = Math.Round(growth, 2),
            BestDayDate = best?.Date ?? string.Empty,
            BestDayRevenue = best?.Revenue ?? 0m,
            B2CPercent = Math.Round(b2cPercent, 2),
            B2BPercent = Math.Round(b2bPercent, 2),
            Chart = chart
        };
    }

    public async Task<List<CollectionPerformanceItemDTO>> GetCollectionsPerformanceAsync()
    {
        var orderItems = await GetAllOrderItemsAsync();
        var giftBoxes = await _giftBoxesCol.Find(Builders<ReportGiftBoxDoc>.Filter.Empty).ToListAsync();
        var collections = await _collectionsCol.Find(Builders<ReportCollectionDoc>.Filter.Empty).ToListAsync();

            var colStats = new Dictionary<string, (int orders, decimal revenue)>();

        foreach (var item in orderItems)
        {
            if (string.IsNullOrEmpty(item.GiftBoxId)) continue;
            var gid = item.GiftBoxId;
            if (string.IsNullOrEmpty(gid)) continue;
            var gb = giftBoxes.FirstOrDefault(g => g.Id == gid);
            if (gb == null) continue;
            var cid = gb.CollectionId;
            if (string.IsNullOrEmpty(cid)) continue;
            if (!colStats.ContainsKey(cid)) colStats[cid] = (0, 0m);
            colStats[cid] = (colStats[cid].orders + 1, colStats[cid].revenue + item.TotalPrice);
        }

            var totalRevenue = colStats.Values.Sum(x => x.revenue);

        var list = colStats.Select(kv =>
        {
            var c = collections.FirstOrDefault(col => col.Id == kv.Key);
            return new CollectionPerformanceItemDTO
            {
                CollectionId = kv.Key,
                CollectionName = c?.Name ?? string.Empty,
                Orders = kv.Value.orders,
                Revenue = kv.Value.revenue,
                Percent = totalRevenue > 0 ? (double)(kv.Value.revenue / totalRevenue * 100) : 0,
                Thumbnail = c?.CoverImage
            };
        }).OrderByDescending(x => x.Revenue).Select((x, idx) => { x.Rank = idx + 1; return x; }).ToList();

        return list;
    }

    public async Task<List<GiftBoxPerformanceItemDTO>> GetGiftBoxPerformanceAsync()
    {
        var orderItems = await GetAllOrderItemsAsync();
        var giftBoxes = await _giftBoxesCol.Find(Builders<ReportGiftBoxDoc>.Filter.Empty).ToListAsync();

        List<ReportReviewDoc> reviews;
        try
        {
            reviews = await _reviewsCol.Find(Builders<ReportReviewDoc>.Filter.Eq(r => r.Status, "APPROVED")).ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load Reviews from MongoDB.");
            reviews = new List<ReportReviewDoc>();
        }

        var dict = new Dictionary<string, (string name, string? image, int sold, decimal revenue, List<int> ratings)>();
        foreach (var g in giftBoxes)
            dict[g.Id] = (g.Name, g.Images?.FirstOrDefault(), 0, 0m, new List<int>());

        foreach (var it in orderItems)
        {
            if (string.IsNullOrEmpty(it.GiftBoxId)) continue;
            var gid = it.GiftBoxId;
            if (!dict.ContainsKey(gid)) continue;
            var entry = dict[gid];
            entry.sold += it.Quantity;
            entry.revenue += it.TotalPrice;
            dict[gid] = entry;
        }

            foreach (var r in reviews)
            {
                if (dict.ContainsKey(r.GiftBoxId)) dict[r.GiftBoxId].ratings.Add(r.Rating);
            }

        return dict.Select(kv => new GiftBoxPerformanceItemDTO
        {
            GiftBoxId = kv.Key,
            GiftBoxName = kv.Value.name,
            SoldQuantity = kv.Value.sold,
            Revenue = kv.Value.revenue,
            AvgRating = kv.Value.ratings.Any() ? Math.Round(kv.Value.ratings.Average(), 2) : 0.0,
            Image = kv.Value.image,
            TopProduct = null,
            MarketingSuggestions = null
        }).OrderByDescending(x => x.Revenue).ToList();
    }

    public async Task<B2cB2bComparisonDTO> GetB2cB2bComparisonAsync()
    {
        var now = DateTime.UtcNow;
        var oneYearAgo = now.AddYears(-1);
        var allOrders = await GetAllOrdersAsync();
        var orders = allOrders.Where(o => o.CreatedAt >= oneYearAgo).ToList();

            var b2cOrders = orders.Where(o => o.OrderType == OrderType.B2C).ToList();
            var b2bOrders = orders.Where(o => o.OrderType == OrderType.B2B).ToList();

        var b2cRev = b2cOrders.Sum(o => o.TotalAmount);
        var b2bRev = b2bOrders.Sum(o => o.TotalAmount);
        var b2cAvg = b2cOrders.Any() ? b2cRev / b2cOrders.Count : 0m;

        // Count gift boxes from OrderItems collection
        var orderItems = await GetAllOrderItemsAsync();
        var totalGiftBoxes = orderItems.Where(i => !string.IsNullOrEmpty(i.GiftBoxId)).Sum(i => i.Quantity);

        var chart = new List<B2cB2bMonthlyDTO>();
        var start = new DateTime(now.Year, now.Month, 1).AddMonths(-11);
        for (int i = 0; i < 12; i++)
        {
            var mStart = start.AddMonths(i);
            var mEnd = mStart.AddMonths(1);
            var mOrders = orders.Where(o => o.CreatedAt >= mStart && o.CreatedAt < mEnd).ToList();
            chart.Add(new B2cB2bMonthlyDTO
            {
                Month = mStart.ToString("yyyy-MM"),
                B2COrders = mOrders.Count(o => o.OrderType == OrderType.B2C),
                B2BOrders = mOrders.Count(o => o.OrderType == OrderType.B2B)
            });
        }

            return new B2cB2bComparisonDTO
            {
                B2CRevenue = b2cRev,
                B2COrders = b2cOrders.Count,
                B2CAvgOrderValue = Math.Round(b2cAvg, 2),
                B2BRevenue = b2bRev,
                B2BOrders = b2bOrders.Count,
                TotalGiftBoxes = totalGiftBoxes,
                MonthlyOrdersChart = chart
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ReportService.GetB2cB2bComparisonAsync failed");
            return new B2cB2bComparisonDTO();
        }
    }

    public async Task<List<InventoryAlertItemDTO>> GetInventoryAlertAsync(int threshold)
    {
        try
        {
            var filter = Builders<BsonDocument>.Filter.Lte("stockQuantity", threshold);
            var items = await _itemsCol.Find(filter).ToListAsync();
            return items.Select(i => new InventoryAlertItemDTO
            {
                ItemId = i["_id"].ToString()!,
                ItemName = i.GetValue("name", "").AsString,
                Stock = i.GetValue("stockQuantity", 0).AsInt32,
                Threshold = threshold
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load Items for inventory alert.");
            return new List<InventoryAlertItemDTO>();
        }
    }

    // ===== Excel export methods (unchanged logic, use new data sources) =====

    public async Task<byte[]> ExportRevenueAsync(DateTime? fromDate, DateTime? toDate, string view, string? orderType)
    {
        var dto = await GetRevenueAsync(fromDate, toDate, view, orderType);
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Revenue");
        ws.Cell(1, 1).Value = "Total Revenue"; ws.Cell(1, 2).Value = dto.TotalRevenue;
        ws.Cell(2, 1).Value = "GrowthPercent"; ws.Cell(2, 2).Value = dto.GrowthPercent;
        ws.Cell(4, 1).Value = "Date"; ws.Cell(4, 2).Value = "Revenue"; ws.Cell(4, 3).Value = "LastYearRevenue";
        var r = 5;
        foreach (var c in dto.Chart)
        {
            ws.Cell(r, 1).Value = c.Date;
            ws.Cell(r, 2).Value = c.Revenue;
            ws.Cell(r, 3).Value = c.LastYearRevenue;
            r++;
        }
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> ExportCollectionsAsync()
    {
        var list = await GetCollectionsPerformanceAsync();
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Collections");
        ws.Cell(1, 1).Value = "Rank"; ws.Cell(1, 2).Value = "CollectionId"; ws.Cell(1, 3).Value = "CollectionName"; ws.Cell(1, 4).Value = "Orders"; ws.Cell(1, 5).Value = "Revenue"; ws.Cell(1, 6).Value = "%";
        var r = 2;
        foreach (var i in list)
        {
            ws.Cell(r, 1).Value = i.Rank;
            ws.Cell(r, 2).Value = i.CollectionId;
            ws.Cell(r, 3).Value = i.CollectionName;
            ws.Cell(r, 4).Value = i.Orders;
            ws.Cell(r, 5).Value = i.Revenue;
            ws.Cell(r, 6).Value = i.Percent;
            r++;
        }
        using var ms = new MemoryStream(); wb.SaveAs(ms); return ms.ToArray();
    }

    public async Task<byte[]> ExportGiftBoxesAsync()
    {
        var list = await GetGiftBoxPerformanceAsync();
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("GiftBoxes");
        ws.Cell(1, 1).Value = "GiftBoxId"; ws.Cell(1, 2).Value = "GiftBoxName"; ws.Cell(1, 3).Value = "SoldQuantity"; ws.Cell(1, 4).Value = "Revenue"; ws.Cell(1, 5).Value = "AvgRating";
        var r = 2;
        foreach (var i in list)
        {
            ws.Cell(r, 1).Value = i.GiftBoxId; ws.Cell(r, 2).Value = i.GiftBoxName; ws.Cell(r, 3).Value = i.SoldQuantity; ws.Cell(r, 4).Value = i.Revenue; ws.Cell(r, 5).Value = i.AvgRating; r++;
        }
        using var ms = new MemoryStream(); wb.SaveAs(ms); return ms.ToArray();
    }

    public async Task<byte[]> ExportB2cB2bAsync()
    {
        var dto = await GetB2cB2bComparisonAsync();
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("B2C_B2B");
        ws.Cell(1, 1).Value = "B2CRevenue"; ws.Cell(1, 2).Value = dto.B2CRevenue; ws.Cell(2, 1).Value = "B2COrders"; ws.Cell(2, 2).Value = dto.B2COrders; ws.Cell(3, 1).Value = "B2CAvgOrderValue"; ws.Cell(3, 2).Value = dto.B2CAvgOrderValue;
        ws.Cell(5, 1).Value = "Month"; ws.Cell(5, 2).Value = "B2COrders"; ws.Cell(5, 3).Value = "B2BOrders";
        var r = 6;
        foreach (var m in dto.MonthlyOrdersChart) { ws.Cell(r, 1).Value = m.Month; ws.Cell(r, 2).Value = m.B2COrders; ws.Cell(r, 3).Value = m.B2BOrders; r++; }
        using var ms = new MemoryStream(); wb.SaveAs(ms); return ms.ToArray();
    }

    public async Task<byte[]> ExportInventoryAlertAsync(int threshold)
    {
        var list = await GetInventoryAlertAsync(threshold);
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("InventoryAlert");
        ws.Cell(1, 1).Value = "ItemId"; ws.Cell(1, 2).Value = "ItemName"; ws.Cell(1, 3).Value = "Stock"; ws.Cell(1, 4).Value = "Threshold";
        var r = 2; foreach (var i in list) { ws.Cell(r, 1).Value = i.ItemId; ws.Cell(r, 2).Value = i.ItemName; ws.Cell(r, 3).Value = i.Stock; ws.Cell(r, 4).Value = i.Threshold; r++; }
        using var ms = new MemoryStream(); wb.SaveAs(ms); return ms.ToArray();
    }
}
