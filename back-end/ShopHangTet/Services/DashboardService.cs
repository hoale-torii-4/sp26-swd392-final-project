using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;

namespace ShopHangTet.Services;

public class DashboardService : IDashboardService
{
    private readonly ShopHangTetDbContext _context;

    public DashboardService(ShopHangTetDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDTO> GetDashboardSummaryAsync()
    {
        var orders = await _context.Orders.ToListAsync();

        var totalRevenue = orders.Sum(o => o.TotalAmount);
        var totalOrders = orders.Count;

        var today = DateTime.UtcNow.Date;
        var ordersToday = orders.Count(o => o.CreatedAt.Date == today);

        var b2cCount = orders.Count(o => o.OrderType == OrderType.B2C);
        var b2bCount = orders.Count(o => o.OrderType == OrderType.B2B);

        double b2cPercent = totalOrders == 0 ? 0 : Math.Round((double)b2cCount / totalOrders * 100, 2);
        double b2bPercent = totalOrders == 0 ? 0 : Math.Round((double)b2bCount / totalOrders * 100, 2);

        // Growth: compare last 7 days vs previous 7 days
        var now = DateTime.UtcNow;
        var periodDays = 7;
        var currentStart = now.Date.AddDays(-periodDays + 1);
        var prevStart = currentStart.AddDays(-periodDays);

        var currentPeriodRevenue = orders.Where(o => o.CreatedAt >= currentStart).Sum(o => o.TotalAmount);
        var prevPeriodRevenue = orders.Where(o => o.CreatedAt >= prevStart && o.CreatedAt < currentStart).Sum(o => o.TotalAmount);

        double revenueGrowth = 0;
        if (prevPeriodRevenue == 0)
            revenueGrowth = currentPeriodRevenue == 0 ? 0 : 100;
        else
            revenueGrowth = Math.Round((double)((currentPeriodRevenue - prevPeriodRevenue) / prevPeriodRevenue * 100), 2);

        var currentPeriodOrders = orders.Count(o => o.CreatedAt >= currentStart);
        var prevPeriodOrders = orders.Count(o => o.CreatedAt >= prevStart && o.CreatedAt < currentStart);

        double orderGrowth = 0;
        if (prevPeriodOrders == 0)
            orderGrowth = currentPeriodOrders == 0 ? 0 : 100;
        else
            orderGrowth = Math.Round((double)((currentPeriodOrders - prevPeriodOrders) / (double)prevPeriodOrders * 100), 2);

        return new DashboardSummaryDTO
        {
            TotalRevenue = totalRevenue,
            RevenueGrowthPercent = revenueGrowth,
            TotalOrders = totalOrders,
            OrderGrowthPercent = orderGrowth,
            OrdersToday = ordersToday,
            B2cPercent = b2cPercent,
            B2bPercent = b2bPercent,
            LastUpdated = DateTime.UtcNow
        };
    }

    public async Task<OrderStatusSummaryDTO> GetOrderStatusSummaryAsync()
    {
        var orders = await _context.Orders.ToListAsync();

        return new OrderStatusSummaryDTO
        {
            PendingPayment = orders.Count(o => o.Status == OrderStatus.PAYMENT_CONFIRMING),
            Preparing = orders.Count(o => o.Status == OrderStatus.PREPARING),
            Shipping = orders.Count(o => o.Status == OrderStatus.SHIPPING),
            DeliveryFailed = orders.Count(o => o.Status == OrderStatus.DELIVERY_FAILED),
            PartiallyDelivered = orders.Count(o => o.Status == OrderStatus.PARTIAL_DELIVERY),
            Completed = orders.Count(o => o.Status == OrderStatus.COMPLETED),
            Cancelled = orders.Count(o => o.Status == OrderStatus.CANCELLED)
        };
    }

    public async Task<OrderTypeSummaryDTO> GetOrderTypeSummaryAsync()
    {
        var orders = await _context.Orders.ToListAsync();

        var b2cOrders = orders.Count(o => o.OrderType == OrderType.B2C);
        var b2bOrders = orders.Count(o => o.OrderType == OrderType.B2B);

        var b2cRevenue = orders.Where(o => o.OrderType == OrderType.B2C).Sum(o => o.TotalAmount);
        var b2bRevenue = orders.Where(o => o.OrderType == OrderType.B2B).Sum(o => o.TotalAmount);

        var total = b2cOrders + b2bOrders;
        double b2cPercent = total == 0 ? 0 : Math.Round((double)b2cOrders / total * 100, 2);
        double b2bPercent = total == 0 ? 0 : Math.Round((double)b2bOrders / total * 100, 2);

        return new OrderTypeSummaryDTO
        {
            B2cOrders = b2cOrders,
            B2bOrders = b2bOrders,
            B2cRevenue = b2cRevenue,
            B2bRevenue = b2bRevenue,
            B2cPercent = b2cPercent,
            B2bPercent = b2bPercent
        };
    }

    public async Task<List<TopCollectionDTO>> GetTopCollectionsAsync(int limit = 5)
    {
        var orders = await _context.Orders.ToListAsync();
        var giftBoxes = await _context.GiftBoxes.ToListAsync();
        var collections = await _context.Collections.ToListAsync();

        var totalRevenue = orders.Sum(o => o.TotalAmount);

        // Map collectionId -> aggregator
        var map = new Dictionary<string, (decimal revenue, HashSet<string> orderIds)>();

        foreach (var order in orders)
        {
            foreach (var item in order.Items)
            {
                if (item.GiftBoxId == null) continue;
                var gbId = item.GiftBoxId.ToString();
                var gb = giftBoxes.FirstOrDefault(g => g.Id == gbId);
                if (gb == null) continue;
                var cid = gb.CollectionId ?? string.Empty;
                if (!map.ContainsKey(cid)) map[cid] = (0m, new HashSet<string>());
                var entry = map[cid];
                entry.revenue += item.TotalPrice;
                entry.orderIds.Add(order.Id.ToString());
                map[cid] = entry;
            }
        }

        var results = map.Select(kv => new TopCollectionDTO
        {
            CollectionId = kv.Key,
            CollectionName = collections.FirstOrDefault(c => c.Id == kv.Key)?.Name ?? string.Empty,
            Thumbnail = collections.FirstOrDefault(c => c.Id == kv.Key)?.CoverImage,
            Orders = kv.Value.orderIds.Count,
            Revenue = kv.Value.revenue,
            Percent = totalRevenue == 0 ? 0 : Math.Round((double)(kv.Value.revenue / totalRevenue * 100), 2)
        })
        .OrderByDescending(x => x.Revenue)
        .Take(limit)
        .ToList();

        return results;
    }

    public async Task<List<TopGiftBoxDTO>> GetTopGiftBoxesAsync(int limit = 10)
    {
        var orders = await _context.Orders.ToListAsync();
        var giftBoxes = await _context.GiftBoxes.ToListAsync();
        var collections = await _context.Collections.ToListAsync();

        var map = new Dictionary<string, (int qty, decimal revenue)>();

        foreach (var order in orders)
        {
            foreach (var item in order.Items)
            {
                if (item.GiftBoxId == null) continue;
                var gbId = item.GiftBoxId.ToString();
                if (!map.ContainsKey(gbId)) map[gbId] = (0, 0m);
                var entry = map[gbId];
                entry.qty += item.Quantity;
                entry.revenue += item.TotalPrice;
                map[gbId] = entry;
            }
        }

        var results = map.Select(kv =>
        {
            var gb = giftBoxes.FirstOrDefault(g => g.Id == kv.Key);
            var coll = collections.FirstOrDefault(c => c.Id == gb?.CollectionId);
            return new TopGiftBoxDTO
            {
                GiftBoxId = kv.Key,
                GiftBoxName = gb?.Name ?? string.Empty,
                Image = gb?.Images?.FirstOrDefault(),
                CollectionName = coll?.Name ?? string.Empty,
                SoldQuantity = kv.Value.qty,
                Revenue = kv.Value.revenue
            };
        })
        .OrderByDescending(x => x.Revenue)
        .Take(limit)
        .ToList();

        return results;
    }

    public async Task<List<InventoryAlertDTO>> GetInventoryAlertAsync(int threshold = 10)
    {
        var items = await _context.Items.ToListAsync();

        var alerts = items
            .Where(i => i.StockQuantity < threshold)
            .Select(i => new InventoryAlertDTO
            {
                ItemId = i.Id,
                ItemName = i.Name,
                Category = i.Category.ToString(),
                StockQuantity = i.StockQuantity,
                Threshold = threshold
            })
            .OrderBy(i => i.StockQuantity)
            .ToList();

        return alerts;
    }

    public async Task<byte[]> ExportDashboardReportAsync(DateTime fromDate, DateTime toDate)
    {
        // Gather data
        var summary = await GetDashboardSummaryAsync();
        var status = await GetOrderStatusSummaryAsync();
        var types = await GetOrderTypeSummaryAsync();
        var topCollections = await GetTopCollectionsAsync(50);
        var topGiftBoxes = await GetTopGiftBoxesAsync(100);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Summary");
        ws.Cell(1, 1).Value = "Metric";
        ws.Cell(1, 2).Value = "Value";
        ws.Cell(2, 1).Value = "Total Revenue";
        ws.Cell(2, 2).Value = summary.TotalRevenue;
        ws.Cell(3, 1).Value = "Total Orders";
        ws.Cell(3, 2).Value = summary.TotalOrders;
        ws.Cell(4, 1).Value = "Orders Today";
        ws.Cell(4, 2).Value = summary.OrdersToday;
        ws.Cell(5, 1).Value = "B2C %";
        ws.Cell(5, 2).Value = summary.B2cPercent;
        ws.Cell(6, 1).Value = "B2B %";
        ws.Cell(6, 2).Value = summary.B2bPercent;

        var wsStatus = wb.Worksheets.Add("Order Status");
        wsStatus.Cell(1, 1).Value = "Status";
        wsStatus.Cell(1, 2).Value = "Count";
        wsStatus.Cell(2, 1).Value = "PendingPayment";
        wsStatus.Cell(2, 2).Value = status.PendingPayment;
        wsStatus.Cell(3, 1).Value = "Preparing";
        wsStatus.Cell(3, 2).Value = status.Preparing;
        wsStatus.Cell(4, 1).Value = "Shipping";
        wsStatus.Cell(4, 2).Value = status.Shipping;
        wsStatus.Cell(5, 1).Value = "DeliveryFailed";
        wsStatus.Cell(5, 2).Value = status.DeliveryFailed;
        wsStatus.Cell(6, 1).Value = "PartiallyDelivered";
        wsStatus.Cell(6, 2).Value = status.PartiallyDelivered;
        wsStatus.Cell(7, 1).Value = "Completed";
        wsStatus.Cell(7, 2).Value = status.Completed;
        wsStatus.Cell(8, 1).Value = "Cancelled";
        wsStatus.Cell(8, 2).Value = status.Cancelled;

        var wsColl = wb.Worksheets.Add("Top Collections");
        wsColl.Cell(1, 1).Value = "Collection";
        wsColl.Cell(1, 2).Value = "Orders";
        wsColl.Cell(1, 3).Value = "Revenue";
        wsColl.Cell(1, 4).Value = "% of Revenue";
        for (int i = 0; i < topCollections.Count; i++)
        {
            var r = topCollections[i];
            wsColl.Cell(i + 2, 1).Value = r.CollectionName;
            wsColl.Cell(i + 2, 2).Value = r.Orders;
            wsColl.Cell(i + 2, 3).Value = r.Revenue;
            wsColl.Cell(i + 2, 4).Value = r.Percent;
        }

        var wsGb = wb.Worksheets.Add("Top GiftBoxes");
        wsGb.Cell(1, 1).Value = "GiftBox";
        wsGb.Cell(1, 2).Value = "Collection";
        wsGb.Cell(1, 3).Value = "SoldQty";
        wsGb.Cell(1, 4).Value = "Revenue";
        for (int i = 0; i < topGiftBoxes.Count; i++)
        {
            var r = topGiftBoxes[i];
            wsGb.Cell(i + 2, 1).Value = r.GiftBoxName;
            wsGb.Cell(i + 2, 2).Value = r.CollectionName;
            wsGb.Cell(i + 2, 3).Value = r.SoldQuantity;
            wsGb.Cell(i + 2, 4).Value = r.Revenue;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
