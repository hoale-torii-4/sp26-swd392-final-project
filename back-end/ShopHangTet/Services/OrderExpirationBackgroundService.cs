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
            order.Status = OrderStatus.PAYMENT_EXPIRED_INTERNAL;
            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = OrderStatus.PAYMENT_EXPIRED_INTERNAL,
                Timestamp = DateTime.UtcNow,
                UpdatedBy = "System-ExpirationService",
                Notes = "Đơn hết hạn thanh toán sau 10 phút - internal"
            });
            order.UpdatedAt = DateTime.UtcNow;

            if (order.DeliverySlotId.HasValue)
            {
                var slot = await context.DeliverySlots
                    .FirstOrDefaultAsync(x => x.Id == order.DeliverySlotId.Value, cancellationToken);

                if (slot != null && slot.CurrentOrderCount > 0)
                {
                    slot.CurrentOrderCount--;
                    if (slot.CurrentOrderCount < slot.MaxOrdersPerSlot)
                    {
                        slot.IsLocked = false;
                    }
                }
            }
        }

        await context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Order expiration service marked {Count} order(s) as expired", expiredOrders.Count);
    }
}
