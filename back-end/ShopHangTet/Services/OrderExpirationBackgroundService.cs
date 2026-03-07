using Microsoft.EntityFrameworkCore;
using ShopHangTet.Data;
using ShopHangTet.Models;

namespace ShopHangTet.Services;

public class OrderExpirationBackgroundService : BackgroundService
{
    private static readonly TimeSpan ExpireAfter = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan PollingInterval = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OrderExpirationBackgroundService> _logger;

    public OrderExpirationBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<OrderExpirationBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpirePendingOrdersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Order expiration background service failed in current cycle");
            }

            try
            {
                await Task.Delay(PollingInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task ExpirePendingOrdersAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ShopHangTetDbContext>();
        var orderService = scope.ServiceProvider.GetRequiredService<IOrderService>();

        var cutoff = DateTime.UtcNow - ExpireAfter;

        var expiredOrders = await context.Orders
            .Where(o => o.Status == OrderStatus.PAYMENT_CONFIRMING && o.CreatedAt <= cutoff)
            .ToListAsync(cancellationToken);

        if (expiredOrders.Count == 0)
        {
            return;
        }

        foreach (var order in expiredOrders)
        {
            // Release reserved inventory trước khi expire
            try
            {
                await orderService.ReleaseInventoryReservationAsync(order, "System-ExpirationService");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to release inventory for expired order {OrderCode}", order.OrderCode);
            }

            order.Status = OrderStatus.CANCELLED;
            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = OrderStatus.CANCELLED,
                Timestamp = DateTime.UtcNow,
                UpdatedBy = "System-ExpirationService",
                Notes = "Đơn quá thời gian thanh toán 10 phút - tự động hủy và release reserve"
            });
            order.UpdatedAt = DateTime.UtcNow;

        }

        await context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Order expiration service marked {Count} order(s) as expired and released inventory", expiredOrders.Count);
    }
}
