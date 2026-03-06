using ShopHangTet.Repositories;
using ShopHangTet.Models;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using MongoDB.Bson;
using MongoDB.Driver;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;

namespace ShopHangTet.Services
{
    /// OrderService - Quản lý tạo và xử lý đơn hàng
    public class OrderService : IOrderService
    {
        private static readonly TimeSpan PaymentConfirmationWindow = TimeSpan.FromMinutes(30);

        private readonly ShopHangTetDbContext _context;
        private readonly IDeliverySlotRepository _slotRepo;
        private readonly ILogger<OrderService> _logger;
        private readonly IMongoCollection<OrderModel> _orderCollection;

        public OrderService(
            ShopHangTetDbContext context,
            IDeliverySlotRepository slotRepo,
            ILogger<OrderService> logger,
            IMongoDatabase mongoDatabase)
        {
            _context = context;
            _slotRepo = slotRepo;
            _logger = logger;
            _orderCollection = mongoDatabase.GetCollection<OrderModel>("Orders");
        }

        // =====================================================
        // ORDER TRACKING
        // =====================================================

        public async Task<OrderTrackingResult?> TrackOrderAsync(string orderCode, string email)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(x => x.OrderCode == orderCode && x.CustomerEmail == email);

            if (order == null) return null;

            return new OrderTrackingResult
            {
                OrderCode = order.OrderCode,
                Status = order.Status.ToString(),
                CreatedAt = order.CreatedAt,
                DeliveryDate = order.DeliveryDate,
                TotalAmount = order.TotalAmount,
                StatusHistory = order.StatusHistory.Select(x => new OrderStatusHistoryDto
                {
                    Status = x.Status,
                    ChangedAt = x.Timestamp,
                    Note = x.Notes,
                    ChangedBy = x.UpdatedBy
                }).ToList()
            };
        }

        // =====================================================
        // PAYMENT CONFIRMATION (WEBHOOK SAFE)
        // =====================================================

        public async Task<bool> ConfirmPaymentAsync(string orderCode, decimal amountPaid)
        {
            var filter = Builders<OrderModel>.Filter.And(
                Builders<OrderModel>.Filter.Eq(x => x.OrderCode, orderCode),
                Builders<OrderModel>.Filter.Eq(x => x.Status, OrderStatus.PAYMENT_CONFIRMING)
            );

            var order = await _context.Orders.FirstOrDefaultAsync(x => x.OrderCode == orderCode);

            if (order == null)
            {
                _logger.LogWarning("ConfirmPayment: Order {OrderCode} not found", orderCode);
                return false;
            }

            if (order.Status != OrderStatus.PAYMENT_CONFIRMING)
            {
                _logger.LogWarning("ConfirmPayment ignored. Status = {Status}", order.Status);
                return false;
            }

            if (DateTime.UtcNow - order.CreatedAt > PaymentConfirmationWindow)
            {
                _logger.LogWarning("Payment window expired for {OrderCode}", orderCode);
                return false;
            }

            if (amountPaid < order.TotalAmount)
            {
                _logger.LogWarning("Payment amount mismatch for {OrderCode}", orderCode);
                return false;
            }

            await DeductReservedInventoryAsync(order, "SePay-Webhook");

            order.Status = OrderStatus.PREPARING;
            order.UpdatedAt = DateTime.UtcNow;

            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = OrderStatus.PREPARING,
                Timestamp = DateTime.UtcNow,
                UpdatedBy = "SePay-Webhook",
                Notes = $"Payment confirmed: {amountPaid:N0} VND"
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation("Payment confirmed for order {OrderCode}", orderCode);

            return true;
        }

        // =====================================================
        // UPDATE STATUS
        // =====================================================

        public async Task<OrderModel> UpdateStatusAsync(
            string orderId,
            OrderStatus status,
            string updatedBy,
            string? notes = null)
        {
            var orderObjectId = ObjectId.Parse(orderId);

            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == orderObjectId);

            if (order == null)
                throw new InvalidOperationException("Order not found");

            if (!IsValidStatusTransition(order.Status, status))
                throw new InvalidOperationException("Invalid order status transition");

            if (status == OrderStatus.PREPARING && order.Status != OrderStatus.PREPARING)
            {
                await DeductReservedInventoryAsync(order, updatedBy);
            }

            if (status == OrderStatus.CANCELLED)
            {
                if (order.Status == OrderStatus.PAYMENT_CONFIRMING)
                    await ReleaseInventoryReservationAsync(order, updatedBy);
                else
                    await RestockOrderInventoryAsync(order, updatedBy);
            }

            order.Status = status;
            order.UpdatedAt = DateTime.UtcNow;

            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = status,
                Timestamp = DateTime.UtcNow,
                UpdatedBy = updatedBy,
                Notes = notes ?? ""
            });

            await _context.SaveChangesAsync();

            return order;
        }

        // =====================================================
        // INVENTORY
        // =====================================================

        private async Task ReserveInventoryAsync(OrderModel order, string updatedBy)
        {
            var itemQuantities = new Dictionary<string, int>();

            foreach (var orderItem in order.Items)
            {
                if (orderItem.Type == OrderItemType.READY_MADE)
                {
                    var giftBox = await _context.GiftBoxes
                        .FirstOrDefaultAsync(x => x.Id == orderItem.GiftBoxId.ToString());

                    if (giftBox == null) continue;

                    foreach (var g in giftBox.Items)
                    {
                        var qty = g.Quantity * orderItem.Quantity;

                        if (itemQuantities.ContainsKey(g.ItemId))
                            itemQuantities[g.ItemId] += qty;
                        else
                            itemQuantities[g.ItemId] = qty;
                    }
                }
            }

            var itemIds = itemQuantities.Keys.ToList();

            var items = await _context.Items
                .Where(x => itemIds.Contains(x.Id))
                .ToListAsync();

            foreach (var item in items)
            {
                var required = itemQuantities[item.Id];

                if (item.AvailableQuantity < required)
                    throw new InvalidOperationException($"Insufficient stock for {item.Name}");

                item.ReservedQuantity += required;

                _context.InventoryLogs.Add(new InventoryLog
                {
                    OrderId = order.Id.ToString(),
                    ItemId = item.Id,
                    Quantity = -required,
                    Action = "RESERVE",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        private async Task DeductReservedInventoryAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
            {
                if (orderItem.Type == OrderItemType.READY_MADE)
                {
                    var giftBox = await _context.GiftBoxes
                        .FirstOrDefaultAsync(x => x.Id == orderItem.GiftBoxId.ToString());

                    if (giftBox == null) continue;

                    foreach (var item in giftBox.Items)
                    {
                        await DeductItemStockAsync(
                            item.ItemId,
                            item.Quantity * orderItem.Quantity,
                            order.Id.ToString(),
                            updatedBy);
                    }
                }
            }
        }

        private async Task DeductItemStockAsync(
            string itemId,
            int quantity,
            string orderId,
            string updatedBy)
        {
            var item = await _context.Items.FirstOrDefaultAsync(x => x.Id == itemId);

            if (item == null)
                throw new InvalidOperationException($"Item not found {itemId}");

            if (item.StockQuantity < quantity)
                throw new InvalidOperationException($"Stock insufficient for {item.Name}");

            item.StockQuantity -= quantity;
            item.ReservedQuantity = Math.Max(0, item.ReservedQuantity - quantity);

            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId,
                ItemId = itemId,
                Quantity = -quantity,
                Action = "DEDUCT",
                CreatedAt = DateTime.UtcNow
            });
        }

        public async Task ReleaseInventoryReservationAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
            {
                if (orderItem.Type != OrderItemType.READY_MADE) continue;

                var giftBox = await _context.GiftBoxes
                    .FirstOrDefaultAsync(x => x.Id == orderItem.GiftBoxId.ToString());

                if (giftBox == null) continue;

                foreach (var item in giftBox.Items)
                {
                    var dbItem = await _context.Items.FirstOrDefaultAsync(x => x.Id == item.ItemId);

                    if (dbItem == null) continue;

                    var quantity = item.Quantity * orderItem.Quantity;

                    dbItem.ReservedQuantity =
                        Math.Max(0, dbItem.ReservedQuantity - quantity);
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task RestockOrderInventoryAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
            {
                if (orderItem.Type != OrderItemType.READY_MADE) continue;

                var giftBox = await _context.GiftBoxes
                    .FirstOrDefaultAsync(x => x.Id == orderItem.GiftBoxId.ToString());

                if (giftBox == null) continue;

                foreach (var item in giftBox.Items)
                {
                    var dbItem = await _context.Items.FirstOrDefaultAsync(x => x.Id == item.ItemId);

                    if (dbItem == null) continue;

                    var quantity = item.Quantity * orderItem.Quantity;

                    dbItem.StockQuantity += quantity;

                    _context.InventoryLogs.Add(new InventoryLog
                    {
                        OrderId = order.Id.ToString(),
                        ItemId = item.ItemId,
                        Quantity = quantity,
                        Action = "RESTOCK",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        // =====================================================
        // UTILITIES
        // =====================================================

        private string GenerateOrderCode()
        {
            var datePart = DateTime.UtcNow.ToString("yyMMdd");
            var randomPart = RandomNumberGenerator.GetInt32(1000, 9999);

            return $"SHT{datePart}{randomPart}";
        }

        private static bool IsValidEmail(string email)
        {
            var validator = new EmailAddressAttribute();
            return validator.IsValid(email);
        }

        private bool IsValidStatusTransition(OrderStatus current, OrderStatus next)
        {
            return (current == OrderStatus.PAYMENT_CONFIRMING && next == OrderStatus.PREPARING)
                || (current == OrderStatus.PAYMENT_CONFIRMING && next == OrderStatus.CANCELLED)
                || (current == OrderStatus.PREPARING && next == OrderStatus.SHIPPING)
                || (current == OrderStatus.SHIPPING && next == OrderStatus.COMPLETED)
                || (current == OrderStatus.SHIPPING && next == OrderStatus.CANCELLED);
        }
    }
}