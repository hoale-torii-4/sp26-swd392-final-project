using ClosedXML.Excel;
using MongoDB.Bson;
using MongoDB.Driver;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services;

public class ReportService : IReportService
{
    private readonly ILogger<ReportService> _logger;
    private readonly IMongoCollection<OrderModel> _ordersCol;
    private readonly IMongoCollection<GiftBox> _giftBoxesCol;
    private readonly IMongoCollection<Collection> _collectionsCol;
    private readonly IMongoCollection<Review> _reviewsCol;
    private readonly IMongoCollection<Item> _itemsCol;
    private readonly IMongoCollection<BsonDocument> _orderItemsCol;

    public ReportService(ILogger<ReportService> logger, IMongoDatabase mongoDatabase)
    {
        _logger = logger;
        _ordersCol = mongoDatabase.GetCollection<OrderModel>("Orders");
        _giftBoxesCol = mongoDatabase.GetCollection<GiftBox>("GiftBoxes");
        _collectionsCol = mongoDatabase.GetCollection<Collection>("Collections");
        _reviewsCol = mongoDatabase.GetCollection<Review>("Reviews");
        _itemsCol = mongoDatabase.GetCollection<Item>("Items");
        _orderItemsCol = mongoDatabase.GetCollection<BsonDocument>("OrderItems");
    }

    public async Task<DashboardReportDTO> GetDashboardAsync()
    {
        var allOrders = await GetAllOrdersAsync();
        var now = DateTime.UtcNow;
        var recentFrom = now.AddDays(-30);
        var prevFrom = recentFrom.AddDays(-30);

        var recentOrders = allOrders.Where(o => o.CreatedAt >= recentFrom).ToList();
        var prevOrders = allOrders.Where(o => o.CreatedAt >= prevFrom && o.CreatedAt < recentFrom).ToList();
        var todayOrders = allOrders.Where(o => o.CreatedAt.Date == now.Date).ToList();

        var recentRevenue = recentOrders.Sum(o => o.TotalAmount);
        var prevRevenue = prevOrders.Sum(o => o.TotalAmount);
        var revenueGrowth = CalculateGrowth(recentRevenue, prevRevenue);
        var orderGrowth = CalculateGrowth(recentOrders.Count, prevOrders.Count);

        var b2c = recentOrders.Count(o => o.OrderType == OrderType.B2C);
        var b2b = recentOrders.Count(o => o.OrderType == OrderType.B2B);
        var total = recentOrders.Count;

        return new DashboardReportDTO
        {
            TotalRevenue = recentRevenue,
            RevenueGrowthPercent = Math.Round(revenueGrowth, 2),
            TotalOrders = recentOrders.Count,
            OrderGrowthPercent = Math.Round(orderGrowth, 2),
            TodayRevenue = todayOrders.Sum(o => o.TotalAmount),
            TodayOrders = todayOrders.Count,
            B2CPercent = total > 0 ? Math.Round((double)b2c / total * 100, 2) : 0,
            B2BPercent = total > 0 ? Math.Round((double)b2b / total * 100, 2) : 0,
            StatusSummary = new ReportStatusSummaryDTO
            {
                PendingPayment = allOrders.Count(o => o.Status == OrderStatus.PAYMENT_CONFIRMING),
                Preparing = allOrders.Count(o => o.Status == OrderStatus.PREPARING),
                Shipping = allOrders.Count(o => o.Status == OrderStatus.SHIPPING),
                Completed = allOrders.Count(o => o.Status == OrderStatus.COMPLETED),
                Cancelled = allOrders.Count(o => o.Status == OrderStatus.CANCELLED),
                DeliveryFailed = allOrders.Count(o => o.Status == OrderStatus.DELIVERY_FAILED)
            }
        };
    }

    public async Task<RevenueReportDTO> GetRevenueAsync(DateTime? fromDate, DateTime? toDate, string view, string? orderType)
    {
        var start = fromDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = (toDate ?? DateTime.UtcNow).Date.AddDays(1).AddTicks(-1);

        var allOrders = await GetAllOrdersAsync();
        var filteredOrders = ApplyOrderTypeFilter(allOrders, orderType).ToList();

        var orders = filteredOrders.Where(o => o.CreatedAt >= start && o.CreatedAt <= end).ToList();
        var totalRevenue = orders.Sum(o => o.TotalAmount);

        var prevStart = start.AddYears(-1);
        var prevEnd = end.AddYears(-1);
        var prevOrders = filteredOrders.Where(o => o.CreatedAt >= prevStart && o.CreatedAt <= prevEnd).ToList();
        var prevRevenue = prevOrders.Sum(o => o.TotalAmount);

        var chart = BuildRevenueChart(orders, prevOrders, view);
        var best = chart.OrderByDescending(c => c.Revenue).FirstOrDefault();

        var orderCount = orders.Count;
        var b2c = orders.Count(o => o.OrderType == OrderType.B2C);
        var b2b = orders.Count(o => o.OrderType == OrderType.B2B);

        return new RevenueReportDTO
        {
            TotalRevenue = totalRevenue,
            GrowthPercent = Math.Round(CalculateGrowth(totalRevenue, prevRevenue), 2),
            BestDayDate = best?.Date ?? string.Empty,
            BestDayRevenue = best?.Revenue ?? 0,
            B2CPercent = orderCount > 0 ? Math.Round((double)b2c / orderCount * 100, 2) : 0,
            B2BPercent = orderCount > 0 ? Math.Round((double)b2b / orderCount * 100, 2) : 0,
            Chart = chart
        };
    }

    public async Task<List<CollectionPerformanceItemDTO>> GetCollectionsPerformanceAsync()
    {
        var orderItems = (await GetAllOrdersAsync())
            .SelectMany(o => o.Items ?? new List<OrderItem>())
            .Where(i => i.Type == OrderItemType.READY_MADE && i.GiftBoxId.HasValue)
            .ToList();

        var giftBoxes = await _giftBoxesCol.Find(Builders<GiftBox>.Filter.Empty).ToListAsync();
        var collections = await _collectionsCol.Find(Builders<Collection>.Filter.Empty).ToListAsync();

        var giftBoxMap = giftBoxes.ToDictionary(g => g.Id, g => g);
        var stats = new Dictionary<string, (int orders, decimal revenue)>();

        foreach (var item in orderItems)
        {
            var giftBoxId = item.GiftBoxId!.Value.ToString();
            if (!giftBoxMap.TryGetValue(giftBoxId, out var giftBox))
            {
                continue;
            }

            var collectionId = giftBox.CollectionId;
            if (!stats.ContainsKey(collectionId))
            {
                stats[collectionId] = (0, 0);
            }

            var current = stats[collectionId];
            stats[collectionId] = (current.orders + item.Quantity, current.revenue + item.TotalPrice);
        }

        var totalRevenue = stats.Values.Sum(x => x.revenue);
        var ranked = stats
            .OrderByDescending(x => x.Value.revenue)
            .Select((x, index) =>
            {
                var col = collections.FirstOrDefault(c => c.Id == x.Key);
                return new CollectionPerformanceItemDTO
                {
                    Rank = index + 1,
                    CollectionId = x.Key,
                    CollectionName = col?.Name ?? "Unknown",
                    Orders = x.Value.orders,
                    Revenue = x.Value.revenue,
                    Percent = totalRevenue > 0 ? Math.Round((double)(x.Value.revenue / totalRevenue * 100), 2) : 0,
                    Thumbnail = col?.CoverImage
                };
            })
            .ToList();

        return ranked;
    }

    public async Task<List<GiftBoxPerformanceItemDTO>> GetGiftBoxPerformanceAsync()
    {
        var orderItems = (await GetAllOrdersAsync())
            .SelectMany(o => o.Items ?? new List<OrderItem>())
            .Where(i => i.Type == OrderItemType.READY_MADE && i.GiftBoxId.HasValue)
            .ToList();

        var giftBoxes = await _giftBoxesCol.Find(Builders<GiftBox>.Filter.Empty).ToListAsync();
        var reviews = await _reviewsCol.Find(Builders<Review>.Filter.Empty).ToListAsync();

        var result = giftBoxes.Select(gb =>
        {
            var soldItems = orderItems.Where(i => i.GiftBoxId!.Value.ToString() == gb.Id).ToList();
            var soldQuantity = soldItems.Sum(i => i.Quantity);
            var revenue = soldItems.Sum(i => i.TotalPrice);
            var gbReviews = reviews.Where(r => r.GiftBoxId == gb.Id).ToList();

            return new GiftBoxPerformanceItemDTO
            {
                GiftBoxId = gb.Id,
                GiftBoxName = gb.Name,
                SoldQuantity = soldQuantity,
                Revenue = revenue,
                AvgRating = gbReviews.Any() ? Math.Round(gbReviews.Average(r => r.Rating), 2) : 0,
                Image = gb.Images.FirstOrDefault(),
                TopProduct = null,
                MarketingSuggestions = soldQuantity == 0 ? "Consider promotion and bundle offers" : null
            };
        })
        .OrderByDescending(x => x.Revenue)
        .ToList();

        return result;
    }

    public async Task<B2cB2bComparisonDTO> GetB2cB2bComparisonAsync()
    {
        var allOrders = await GetAllOrdersAsync();
        var b2cOrders = allOrders.Where(o => o.OrderType == OrderType.B2C).ToList();
        var b2bOrders = allOrders.Where(o => o.OrderType == OrderType.B2B).ToList();

        var monthlyChart = BuildB2bB2cMonthlyChart(allOrders);

        return new B2cB2bComparisonDTO
        {
            B2CRevenue = b2cOrders.Sum(o => o.TotalAmount),
            B2COrders = b2cOrders.Count,
            B2CAvgOrderValue = b2cOrders.Count > 0 ? Math.Round(b2cOrders.Average(o => o.TotalAmount), 2) : 0,
            B2BRevenue = b2bOrders.Sum(o => o.TotalAmount),
            B2BOrders = b2bOrders.Count,
            TotalGiftBoxes = b2bOrders
                .SelectMany(o => o.Items ?? new List<OrderItem>())
                .Where(i => i.Type == OrderItemType.READY_MADE)
                .Sum(i => i.Quantity),
            MonthlyOrdersChart = monthlyChart
        };
    }

    public async Task<List<InventoryAlertItemDTO>> GetInventoryAlertAsync(int threshold)
    {
        var items = await _itemsCol
            .Find(i => i.StockQuantity <= threshold)
            .SortBy(i => i.StockQuantity)
            .ToListAsync();

        return items.Select(i => new InventoryAlertItemDTO
        {
            ItemId = i.Id,
            ItemName = i.Name,
            Stock = i.StockQuantity,
            Threshold = threshold
        }).ToList();
    }

    public async Task<byte[]> ExportRevenueAsync(DateTime? fromDate, DateTime? toDate, string view, string? orderType)
    {
        var data = await GetRevenueAsync(fromDate, toDate, view, orderType);

        using var workbook = new XLWorkbook();
        var wsSummary = workbook.Worksheets.Add("Summary");
        wsSummary.Cell(1, 1).Value = "Total Revenue";
        wsSummary.Cell(1, 2).Value = data.TotalRevenue;
        wsSummary.Cell(2, 1).Value = "Growth %";
        wsSummary.Cell(2, 2).Value = data.GrowthPercent;
        wsSummary.Cell(3, 1).Value = "Best Day";
        wsSummary.Cell(3, 2).Value = data.BestDayDate;
        wsSummary.Cell(4, 1).Value = "Best Day Revenue";
        wsSummary.Cell(4, 2).Value = data.BestDayRevenue;

        var wsChart = workbook.Worksheets.Add("Chart");
        wsChart.Cell(1, 1).Value = "Date";
        wsChart.Cell(1, 2).Value = "Revenue";
        wsChart.Cell(1, 3).Value = "Last Year Revenue";

        var row = 2;
        foreach (var point in data.Chart)
        {
            wsChart.Cell(row, 1).Value = point.Date;
            wsChart.Cell(row, 2).Value = point.Revenue;
            wsChart.Cell(row, 3).Value = point.LastYearRevenue;
            row++;
        }

        return SaveWorkbook(workbook);
    }

    public async Task<byte[]> ExportCollectionsAsync()
    {
        var data = await GetCollectionsPerformanceAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Collections");
        ws.Cell(1, 1).Value = "Rank";
        ws.Cell(1, 2).Value = "Collection";
        ws.Cell(1, 3).Value = "Orders";
        ws.Cell(1, 4).Value = "Revenue";
        ws.Cell(1, 5).Value = "Percent";

        var row = 2;
        foreach (var item in data)
        {
            ws.Cell(row, 1).Value = item.Rank;
            ws.Cell(row, 2).Value = item.CollectionName;
            ws.Cell(row, 3).Value = item.Orders;
            ws.Cell(row, 4).Value = item.Revenue;
            ws.Cell(row, 5).Value = item.Percent;
            row++;
        }

        return SaveWorkbook(workbook);
    }

    public async Task<byte[]> ExportGiftBoxesAsync()
    {
        var data = await GetGiftBoxPerformanceAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("GiftBoxes");
        ws.Cell(1, 1).Value = "Gift Box";
        ws.Cell(1, 2).Value = "Sold Quantity";
        ws.Cell(1, 3).Value = "Revenue";
        ws.Cell(1, 4).Value = "Avg Rating";

        var row = 2;
        foreach (var item in data)
        {
            ws.Cell(row, 1).Value = item.GiftBoxName;
            ws.Cell(row, 2).Value = item.SoldQuantity;
            ws.Cell(row, 3).Value = item.Revenue;
            ws.Cell(row, 4).Value = item.AvgRating;
            row++;
        }

        return SaveWorkbook(workbook);
    }

    public async Task<byte[]> ExportB2cB2bAsync()
    {
        var data = await GetB2cB2bComparisonAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("B2C-B2B");
        ws.Cell(1, 1).Value = "Metric";
        ws.Cell(1, 2).Value = "Value";

        ws.Cell(2, 1).Value = "B2C Revenue";
        ws.Cell(2, 2).Value = data.B2CRevenue;
        ws.Cell(3, 1).Value = "B2C Orders";
        ws.Cell(3, 2).Value = data.B2COrders;
        ws.Cell(4, 1).Value = "B2C Avg Order Value";
        ws.Cell(4, 2).Value = data.B2CAvgOrderValue;
        ws.Cell(5, 1).Value = "B2B Revenue";
        ws.Cell(5, 2).Value = data.B2BRevenue;
        ws.Cell(6, 1).Value = "B2B Orders";
        ws.Cell(6, 2).Value = data.B2BOrders;
        ws.Cell(7, 1).Value = "Total Gift Boxes";
        ws.Cell(7, 2).Value = data.TotalGiftBoxes;

        var wsChart = workbook.Worksheets.Add("Monthly");
        wsChart.Cell(1, 1).Value = "Month";
        wsChart.Cell(1, 2).Value = "B2C Orders";
        wsChart.Cell(1, 3).Value = "B2B Orders";

        var row = 2;
        foreach (var point in data.MonthlyOrdersChart)
        {
            wsChart.Cell(row, 1).Value = point.Month;
            wsChart.Cell(row, 2).Value = point.B2COrders;
            wsChart.Cell(row, 3).Value = point.B2BOrders;
            row++;
        }

        return SaveWorkbook(workbook);
    }

    public async Task<byte[]> ExportInventoryAlertAsync(int threshold)
    {
        var data = await GetInventoryAlertAsync(threshold);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("InventoryAlert");
        ws.Cell(1, 1).Value = "Item ID";
        ws.Cell(1, 2).Value = "Item Name";
        ws.Cell(1, 3).Value = "Stock";
        ws.Cell(1, 4).Value = "Threshold";

        var row = 2;
        foreach (var item in data)
        {
            ws.Cell(row, 1).Value = item.ItemId;
            ws.Cell(row, 2).Value = item.ItemName;
            ws.Cell(row, 3).Value = item.Stock;
            ws.Cell(row, 4).Value = item.Threshold;
            row++;
        }

        return SaveWorkbook(workbook);
    }

    private async Task<List<OrderModel>> GetAllOrdersAsync()
    {
        try
        {
            var orders = await _ordersCol.Find(Builders<OrderModel>.Filter.Empty).ToListAsync();
            await PopulateOrderItemsAsync(orders);
            return orders;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ReportService.GetAllOrdersAsync failed");
            return new List<OrderModel>();
        }
    }

    private async Task PopulateOrderItemsAsync(List<OrderModel> orders)
    {
        if (!orders.Any()) return;

        var missingOrders = orders.Where(o => o.Items == null || o.Items.Count == 0).ToList();
        if (!missingOrders.Any()) return;

        var orderIdSet = missingOrders.Select(o => o.Id.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var orderIdStrings = orderIdSet.ToList();
        var orderIdObjects = orderIdStrings.Where(x => ObjectId.TryParse(x, out _)).Select(ObjectId.Parse).ToList();

        var fieldCandidates = new[] { "orderId", "OrderId", "orderModelId", "OrderModelId", "order_model_id", "OrderModel_Id" };
        var orFilters = new List<FilterDefinition<BsonDocument>>();
        foreach (var field in fieldCandidates)
        {
            orFilters.Add(Builders<BsonDocument>.Filter.In(field, orderIdStrings));
            if (orderIdObjects.Count > 0)
            {
                orFilters.Add(Builders<BsonDocument>.Filter.In(field, orderIdObjects));
            }
        }

        var filter = orFilters.Count > 0 ? Builders<BsonDocument>.Filter.Or(orFilters) : Builders<BsonDocument>.Filter.Empty;
        var rawOrderItems = await _orderItemsCol.Find(filter).ToListAsync();

        if (!rawOrderItems.Any()) return;

        var itemMapByOrderId = new Dictionary<string, List<OrderItem>>(StringComparer.OrdinalIgnoreCase);

        foreach (var raw in rawOrderItems)
        {
            var linkedOrderId = TryExtractOrderId(raw, orderIdSet);
            if (linkedOrderId == null) continue;

            var mapped = MapOrderItemFromDocument(raw);
            if (mapped == null) continue;

            if (!itemMapByOrderId.TryGetValue(linkedOrderId, out var list))
            {
                list = new List<OrderItem>();
                itemMapByOrderId[linkedOrderId] = list;
            }
            list.Add(mapped);
        }

        foreach (var order in missingOrders)
        {
            if (itemMapByOrderId.TryGetValue(order.Id.ToString(), out var items) && items.Count > 0)
            {
                order.Items = items;
            }
        }
    }

    private static string? TryExtractOrderId(BsonDocument raw, HashSet<string> knownOrderIds)
    {
        var fieldCandidates = new[] { "orderId", "OrderId", "orderModelId", "OrderModelId", "order_model_id", "OrderModel_Id" };
        foreach (var field in fieldCandidates)
        {
            if (!raw.TryGetValue(field, out var value)) continue;
            
            var parsed = value.IsObjectId ? value.AsObjectId.ToString() : 
                        (value.IsString && ObjectId.TryParse(value.AsString, out var oId) ? oId.ToString() : null);
                        
            if (!string.IsNullOrWhiteSpace(parsed) && knownOrderIds.Contains(parsed))
                return parsed;
        }
        return null;
    }

    private static OrderItem? MapOrderItemFromDocument(BsonDocument raw)
    {
        var mappedId = raw.TryGetValue("_id", out var idVal) && idVal.IsObjectId ? idVal.AsObjectId : ObjectId.GenerateNewId();
        var name = ReadString(raw, "productName", "ProductName", "name", "Name") ?? string.Empty;
        var quantity = ReadInt(raw, "quantity", "Quantity");
        var unitPrice = ReadDecimal(raw, "unitPrice", "UnitPrice", "price", "Price");
        var totalPrice = ReadDecimal(raw, "totalPrice", "TotalPrice");

        if (quantity <= 0) return null;
        if (totalPrice <= 0) totalPrice = unitPrice * quantity;

        var typeStr = ReadString(raw, "type", "Type");
        var type = Enum.TryParse<OrderItemType>(typeStr, true, out var t) ? t : 
                   (raw.TryGetValue("type", out var tVal) && tVal.IsInt32 && Enum.IsDefined(typeof(OrderItemType), tVal.AsInt32) ? (OrderItemType)tVal.AsInt32 : OrderItemType.READY_MADE);

        return new OrderItem
        {
            Id = mappedId,
            ProductName = name,
            Type = type,
            Quantity = quantity,
            UnitPrice = unitPrice,
            TotalPrice = totalPrice,
            GiftBoxId = ReadObjectId(raw, "giftBoxId", "GiftBoxId"),
            CustomBoxId = ReadObjectId(raw, "customBoxId", "CustomBoxId")
        };
    }

    private static string? ReadString(BsonDocument raw, params string[] fields)
    {
        foreach (var field in fields)
        {
            if (raw.TryGetValue(field, out var value) && !value.IsBsonNull)
                return value.IsString ? value.AsString : value.ToString();
        }
        return null;
    }

    private static int ReadInt(BsonDocument raw, params string[] fields)
    {
        foreach (var field in fields)
        {
            if (raw.TryGetValue(field, out var value) && !value.IsBsonNull)
            {
                if (value.IsInt32) return value.AsInt32;
                if (value.IsInt64) return (int)value.AsInt64;
                if (value.IsDouble) return (int)value.AsDouble;
                if (int.TryParse(value.ToString(), out var parsed)) return parsed;
            }
        }
        return 0;
    }

    private static decimal ReadDecimal(BsonDocument raw, params string[] fields)
    {
        foreach (var field in fields)
        {
            if (raw.TryGetValue(field, out var value) && !value.IsBsonNull)
            {
                if (value.IsDecimal128) return (decimal)value.AsDecimal128;
                if (value.IsDouble) return (decimal)value.AsDouble;
                if (value.IsInt32) return value.AsInt32;
                if (value.IsInt64) return value.AsInt64;
                if (decimal.TryParse(value.ToString(), out var parsed)) return parsed;
            }
        }
        return 0;
    }

    private static ObjectId? ReadObjectId(BsonDocument raw, params string[] fields)
    {
        foreach (var field in fields)
        {
            if (raw.TryGetValue(field, out var value) && !value.IsBsonNull)
            {
                if (value.IsObjectId) return value.AsObjectId;
                if (value.IsString && ObjectId.TryParse(value.AsString, out var parsed)) return parsed;
            }
        }
        return null;
    }

    private static IEnumerable<OrderModel> ApplyOrderTypeFilter(IEnumerable<OrderModel> orders, string? orderType)
    {
        if (string.IsNullOrWhiteSpace(orderType) || !Enum.TryParse<OrderType>(orderType, true, out var parsed))
        {
            return orders;
        }

        return orders.Where(o => o.OrderType == parsed);
    }

    private static List<RevenueReportChartItemDTO> BuildRevenueChart(List<OrderModel> orders, List<OrderModel> prevOrders, string view)
    {
        if (string.Equals(view, "month", StringComparison.OrdinalIgnoreCase))
        {
            return orders
                .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
                .OrderBy(g => g.Key.Year)
                .ThenBy(g => g.Key.Month)
                .Select(g =>
                {
                    var currentRevenue = g.Sum(o => o.TotalAmount);
                    var lastYearRevenue = prevOrders
                        .Where(o => o.CreatedAt.Year == g.Key.Year - 1 && o.CreatedAt.Month == g.Key.Month)
                        .Sum(o => o.TotalAmount);

                    return new RevenueReportChartItemDTO
                    {
                        Date = $"{g.Key.Year}-{g.Key.Month:D2}",
                        Revenue = currentRevenue,
                        LastYearRevenue = lastYearRevenue
                    };
                })
                .ToList();
        }

        return orders
            .GroupBy(o => o.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var currentRevenue = g.Sum(o => o.TotalAmount);
                var previousDate = g.Key.AddYears(-1);
                var lastYearRevenue = prevOrders.Where(o => o.CreatedAt.Date == previousDate).Sum(o => o.TotalAmount);

                return new RevenueReportChartItemDTO
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    Revenue = currentRevenue,
                    LastYearRevenue = lastYearRevenue
                };
            })
            .ToList();
    }

    private static List<B2cB2bMonthlyDTO> BuildB2bB2cMonthlyChart(List<OrderModel> orders)
    {
        return orders
            .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
            .OrderBy(g => g.Key.Year)
            .ThenBy(g => g.Key.Month)
            .Select(g => new B2cB2bMonthlyDTO
            {
                Month = $"{g.Key.Year}-{g.Key.Month:D2}",
                B2COrders = g.Count(o => o.OrderType == OrderType.B2C),
                B2BOrders = g.Count(o => o.OrderType == OrderType.B2B)
            })
            .ToList();
    }

    private static double CalculateGrowth(decimal current, decimal previous)
    {
        if (previous <= 0)
        {
            return current <= 0 ? 0 : 100;
        }

        return (double)((current - previous) / previous * 100);
    }

    private static double CalculateGrowth(int current, int previous)
    {
        if (previous <= 0)
        {
            return current <= 0 ? 0 : 100;
        }

        return (double)(current - previous) / previous * 100;
    }

    private static byte[] SaveWorkbook(XLWorkbook workbook)
    {
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
