using ShopHangTet.Repositories;
using ShopHangTet.Models;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using MongoDB.Bson;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Services
{
    /// OrderService - Quản lý tạo và xử lý đơn hàng
    public class OrderService : IOrderService
    {
        private static readonly TimeSpan PaymentConfirmationWindow = TimeSpan.FromMinutes(10);

        private readonly ShopHangTetDbContext _context;
        private readonly IDeliverySlotRepository _slotRepo;
        private readonly ILogger<OrderService> _logger;

        public OrderService(
            ShopHangTetDbContext context,
            IDeliverySlotRepository slotRepo,
            ILogger<OrderService> logger)
        {
            _context = context;
            _slotRepo = slotRepo;
            _logger = logger;
        }

        /// Tra cứu đơn hàng (cho Guest)
        public async Task<OrderTrackingResult?> TrackOrderAsync(string orderCode, string email)
        {
            _logger.LogInformation($"Tracking order {orderCode} for {email}");
            var order = await _context.Orders
                .FirstOrDefaultAsync(x => x.OrderCode == orderCode && x.CustomerEmail == email);

            if (order == null)
            {
                return null;
            }

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

        /// Cập nhật trạng thái đơn hàng và trừ kho khi chuyển sang PREPARING
        public async Task<OrderModel> UpdateStatusAsync(string orderId, Models.OrderStatus status, string updatedBy, string? notes = null)
        {
            var orderObjectId = ObjectId.Parse(orderId);
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderObjectId);

            if (order == null)
            {
                throw new InvalidOperationException("Order not found");
            }

            if (!IsValidStatusTransition(order.Status, status))
            {
                throw new InvalidOperationException("Invalid order status transition");
            }

            // Inventory deduction only when transitioning to PREPARING
            if (status == Models.OrderStatus.PREPARING && order.Status != Models.OrderStatus.PREPARING)
            {
                await DeductReservedInventoryAsync(order, updatedBy);
            }

            // Cancel flow:
            // - PAYMENT_CONFIRMING: release reservation
            // - PREPARING/SHIPPING/PARTIAL/FAILED: restock deducted inventory
            if (status == Models.OrderStatus.CANCELLED)
            {
                if (order.Status == Models.OrderStatus.PAYMENT_CONFIRMING
                    || order.Status == Models.OrderStatus.PAYMENT_EXPIRED_INTERNAL)
                {
                    await ReleaseInventoryReservationAsync(order, updatedBy);
                }
                else
                {
                    await RestockOrderInventoryAsync(order, updatedBy);
                }
            }

            order.Status = status;
            order.StatusHistory.Add(new Models.OrderStatusHistory
            {
                Status = status,
                Timestamp = DateTime.UtcNow,
                UpdatedBy = updatedBy,
                Notes = notes ?? string.Empty
            });
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return order;
        }

        /// Xác nhận thanh toán từ SePay webhook
        public async Task<bool> ConfirmPaymentAsync(string orderCode, decimal amountPaid)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.OrderCode == orderCode);

            // Kiểm tra đơn tồn tại, đang chờ thanh toán, và đúng số tiền
            if (order == null)
            {
                _logger.LogWarning("ConfirmPayment: Order {OrderCode} not found", orderCode);
                return false;
            }

            if (order.Status != OrderStatus.PAYMENT_CONFIRMING)
            {
                _logger.LogWarning("ConfirmPayment: Order {OrderCode} is not in PAYMENT_CONFIRMING status (current: {Status})",
                    orderCode, order.Status);
                return false;
            }

            var orderAge = DateTime.UtcNow - order.CreatedAt;
            if (orderAge > PaymentConfirmationWindow)
            {
                _logger.LogWarning("ConfirmPayment: Order {OrderCode} exceeded payment window ({Minutes} minutes). CreatedAt={CreatedAt}",
                    orderCode, PaymentConfirmationWindow.TotalMinutes, order.CreatedAt);
                return false;
            }

            if (amountPaid < order.TotalAmount)
            {
                _logger.LogWarning("ConfirmPayment: Insufficient amount for {OrderCode}. Expected: {Expected}, Received: {Received}",
                    orderCode, order.TotalAmount, amountPaid);
                return false;
            }

            // 1. Chuyển kho từ Reserved sang Deducted (xác nhận trừ)
            await DeductReservedInventoryAsync(order, "SePay-Webhook");

            // 2. Cập nhật trạng thái sang PREPARING
            order.Status = OrderStatus.PREPARING;
            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = OrderStatus.PREPARING,
                Timestamp = DateTime.UtcNow,
                UpdatedBy = "SePay-Webhook",
                Notes = $"Thanh toán xác nhận tự động qua SePay. Số tiền: {amountPaid:N0} VND"
            });
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("ConfirmPayment: Order {OrderCode} confirmed. Amount: {Amount}", orderCode, amountPaid);
            return true;
        }

        /// Lấy đơn hàng theo mã đơn (cho frontend polling check-status)
        public async Task<OrderModel?> GetOrderByCodeAsync(string orderCode)
        {
            return await _context.Orders
                .FirstOrDefaultAsync(o => o.OrderCode == orderCode);
        }

        private string GenerateOrderCode()
        {
            var timestamp = DateTime.UtcNow.ToString("yyMMdd");
            var random = new Random().Next(1000, 9999);
            return $"SHT{timestamp}{random}";
        }

        /// Reserve inventory khi tạo đơn hàng — tăng ReservedQuantity, chưa trừ StockQuantity
        private async Task ReserveInventoryAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
            {
                if (orderItem.Type == OrderItemType.READY_MADE)
                {
                    if (orderItem.GiftBoxId == null) continue;
                    var giftBoxId = orderItem.GiftBoxId.Value.ToString();
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == giftBoxId);
                    if (giftBox == null) continue;

                    foreach (var giftBoxItem in giftBox.Items)
                    {
                        var quantity = giftBoxItem.Quantity * orderItem.Quantity;
                        await ReserveItemStockAsync(giftBoxItem.ItemId, quantity, order.Id.ToString(), updatedBy);
                    }
                }
                else if (orderItem.Type == OrderItemType.MIX_MATCH)
                {
                    if (orderItem.CustomBoxId == null) continue;
                    var customBoxId = orderItem.CustomBoxId.Value.ToString();
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == customBoxId);
                    if (customBox == null) continue;

                    foreach (var customItem in customBox.Items)
                    {
                        var quantity = customItem.Quantity * orderItem.Quantity;
                        await ReserveItemStockAsync(customItem.ItemId, quantity, order.Id.ToString(), updatedBy);
                    }
                }
            }
        }

        /// Chuyển từ Reserved sang Deducted khi thanh toán xác nhận / chuyển sang PREPARING
        private async Task DeductReservedInventoryAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
            {
                if (orderItem.Type == OrderItemType.READY_MADE)
                {
                    if (orderItem.GiftBoxId == null) continue;
                    var giftBoxId = orderItem.GiftBoxId.Value.ToString();
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == giftBoxId);
                    if (giftBox == null) continue;

                    foreach (var giftBoxItem in giftBox.Items)
                    {
                        var quantity = giftBoxItem.Quantity * orderItem.Quantity;
                        await DeductItemStockAsync(giftBoxItem.ItemId, quantity, order.Id.ToString(), updatedBy);
                    }
                }
                else if (orderItem.Type == OrderItemType.MIX_MATCH)
                {
                    if (orderItem.CustomBoxId == null) continue;
                    var customBoxId = orderItem.CustomBoxId.Value.ToString();
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == customBoxId);
                    if (customBox == null) continue;

                    foreach (var customItem in customBox.Items)
                    {
                        var quantity = customItem.Quantity * orderItem.Quantity;
                        await DeductItemStockAsync(customItem.ItemId, quantity, order.Id.ToString(), updatedBy);
                    }
                }
            }
        }

        /// Release inventory khi đơn hàng bị cancel hoặc hết hạn thanh toán
        public async Task ReleaseInventoryReservationAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
            {
                if (orderItem.Type == OrderItemType.READY_MADE)
                {
                    if (orderItem.GiftBoxId == null) continue;
                    var giftBoxId = orderItem.GiftBoxId.Value.ToString();
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == giftBoxId);
                    if (giftBox == null) continue;

                    foreach (var giftBoxItem in giftBox.Items)
                    {
                        var quantity = giftBoxItem.Quantity * orderItem.Quantity;
                        await ReleaseItemStockAsync(giftBoxItem.ItemId, quantity, order.Id.ToString(), updatedBy);
                    }
                }
                else if (orderItem.Type == OrderItemType.MIX_MATCH)
                {
                    if (orderItem.CustomBoxId == null) continue;
                    var customBoxId = orderItem.CustomBoxId.Value.ToString();
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == customBoxId);
                    if (customBox == null) continue;

                    foreach (var customItem in customBox.Items)
                    {
                        var quantity = customItem.Quantity * orderItem.Quantity;
                        await ReleaseItemStockAsync(customItem.ItemId, quantity, order.Id.ToString(), updatedBy);
                    }
                }
            }
        }

        /// Aggregate delivery statuses thành order status (B2B)
        public async Task<OrderStatus> AggregateDeliveryStatusAsync(string orderId)
        {
            var deliveries = await _context.OrderDeliveries
                .Where(d => d.OrderId == orderId)
                .ToListAsync();

            if (!deliveries.Any()) return OrderStatus.SHIPPING;

            var allCancelled = deliveries.All(d => d.Status == "CANCELLED");
            var allDelivered = deliveries.All(d => d.Status == "DELIVERED");
            var anyFailed = deliveries.Any(d => d.Status == "FAILED");
            var anyDelivered = deliveries.Any(d => d.Status == "DELIVERED");
            var anyShipping = deliveries.Any(d => d.Status == "SHIPPING" || d.Status == "PENDING");

            if (allCancelled) return OrderStatus.CANCELLED;
            if (allDelivered) return OrderStatus.COMPLETED;
            if (anyShipping) return OrderStatus.SHIPPING;
            if (anyFailed && anyDelivered) return OrderStatus.PARTIAL_DELIVERY;
            if (anyFailed) return OrderStatus.DELIVERY_FAILED;
            return OrderStatus.SHIPPING;
        }

        /// Cập nhật delivery status và tự aggregate order status
        public async Task UpdateDeliveryStatusAsync(string deliveryId, string status, string? failureReason = null)
        {
            var delivery = await _context.OrderDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId);
            if (delivery == null) throw new InvalidOperationException("Delivery not found");

            delivery.Status = status;
            delivery.LastAttemptAt = DateTime.UtcNow;

            if (status == "FAILED")
            {
                delivery.FailureReason = failureReason;
                delivery.RetryCount++;
            }

            await _context.SaveChangesAsync();

            // Aggregate order status từ tất cả deliveries
            var aggregatedStatus = await AggregateDeliveryStatusAsync(delivery.OrderId);
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == ObjectId.Parse(delivery.OrderId));
            if (order != null && order.Status != aggregatedStatus)
            {
                order.Status = aggregatedStatus;
                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = aggregatedStatus,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "System-DeliveryAggregation",
                    Notes = $"Trạng thái đơn cập nhật từ delivery aggregation: {aggregatedStatus}"
                });
                order.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        /// Reship — thử giao lại delivery đã fail (nếu chưa vượt maxRetries)
        public async Task<bool> ReshipDeliveryAsync(string deliveryId)
        {
            var delivery = await _context.OrderDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId);
            if (delivery == null) throw new InvalidOperationException("Delivery not found");
            if (delivery.Status != "FAILED") throw new InvalidOperationException("Only failed deliveries can be reshipped");
            if (delivery.RetryCount >= delivery.MaxRetries)
                throw new InvalidOperationException($"Max retries ({delivery.MaxRetries}) exceeded for this delivery");

            delivery.Status = "SHIPPING";
            delivery.LastAttemptAt = DateTime.UtcNow;
            delivery.FailureReason = null;
            await _context.SaveChangesAsync();

            // Re-aggregate order status
            var aggregatedStatus = await AggregateDeliveryStatusAsync(delivery.OrderId);
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == ObjectId.Parse(delivery.OrderId));
            if (order != null)
            {
                order.Status = aggregatedStatus;
                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = aggregatedStatus,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "System-Reship",
                    Notes = $"Giao lại delivery {deliveryId} (lần {delivery.RetryCount + 1})"
                });
                order.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return true;
        }

        private async Task<bool> TryReserveSlotAsync(string? slotId)
        {
            if (string.IsNullOrEmpty(slotId))
            {
                return true;
            }

            if (!await _slotRepo.IsSlotAvailableAsync(slotId))
            {
                return false;
            }

            return await _slotRepo.IncrementOrderCountAsync(slotId);
        }

        private async Task RollbackSlotAsync(string? slotId)
        {
            if (string.IsNullOrEmpty(slotId))
            {
                return;
            }

            await _slotRepo.DecrementOrderCountAsync(slotId);
        }

        private static bool IsValidEmail(string email)
        {
            var validator = new EmailAddressAttribute();
            return validator.IsValid(email);
        }

        private bool IsValidStatusTransition(OrderStatus currentStatus, OrderStatus nextStatus)
        {
            return (currentStatus == OrderStatus.PAYMENT_CONFIRMING && nextStatus == OrderStatus.PREPARING)
                   || (currentStatus == OrderStatus.PAYMENT_CONFIRMING && nextStatus == OrderStatus.CANCELLED)
                   || (currentStatus == OrderStatus.PREPARING && nextStatus == OrderStatus.CANCELLED)
                   || (currentStatus == OrderStatus.PREPARING && nextStatus == OrderStatus.SHIPPING)
                   || (currentStatus == OrderStatus.SHIPPING && nextStatus == OrderStatus.COMPLETED)
                   || (currentStatus == OrderStatus.SHIPPING && nextStatus == OrderStatus.CANCELLED)
                   || (currentStatus == OrderStatus.SHIPPING && nextStatus == OrderStatus.PARTIAL_DELIVERY)
                   || (currentStatus == OrderStatus.SHIPPING && nextStatus == OrderStatus.DELIVERY_FAILED)
                   || (currentStatus == OrderStatus.DELIVERY_FAILED && nextStatus == OrderStatus.SHIPPING) // reship
                   || (currentStatus == OrderStatus.DELIVERY_FAILED && nextStatus == OrderStatus.CANCELLED)
                   || (currentStatus == OrderStatus.PARTIAL_DELIVERY && nextStatus == OrderStatus.SHIPPING) // reship remaining
                   || (currentStatus == OrderStatus.PARTIAL_DELIVERY && nextStatus == OrderStatus.COMPLETED)
                   || (currentStatus == OrderStatus.PARTIAL_DELIVERY && nextStatus == OrderStatus.CANCELLED);
        }

        private async Task<List<OrderItemSnapshotItem>> BuildGiftBoxSnapshotItemsAsync(GiftBox giftBox)
        {
            var itemIds = giftBox.Items.Select(x => x.ItemId).ToList();
            if (!itemIds.Any()) return new List<OrderItemSnapshotItem>();

            var items = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
            var itemMap = items.ToDictionary(x => x.Id, x => x);

            return giftBox.Items.Select(x =>
            {
                itemMap.TryGetValue(x.ItemId, out var item);
                return new OrderItemSnapshotItem
                {
                    ItemId = x.ItemId,
                    ItemName = item?.Name ?? string.Empty,
                    Quantity = x.Quantity,
                    UnitPrice = x.ItemPriceSnapshot > 0 ? x.ItemPriceSnapshot : (item?.Price ?? 0)
                };
            }).ToList();
        }

        private async Task<List<OrderItemSnapshotItem>> BuildCustomBoxSnapshotItemsAsync(CustomBox customBox)
        {
            var itemIds = customBox.Items.Select(x => x.ItemId).ToList();
            if (!itemIds.Any()) return new List<OrderItemSnapshotItem>();

            var items = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
            var itemMap = items.ToDictionary(x => x.Id, x => x);

            return customBox.Items.Select(x =>
            {
                itemMap.TryGetValue(x.ItemId, out var item);
                return new OrderItemSnapshotItem
                {
                    ItemId = x.ItemId,
                    ItemName = item?.Name ?? string.Empty,
                    Quantity = x.Quantity,
                    UnitPrice = item?.Price ?? 0
                };
            }).ToList();
        }

        /// Reserve: tăng ReservedQuantity (chưa trừ StockQuantity)
        private async Task ReserveItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;

            var item = await _context.Items.FirstOrDefaultAsync(x => x.Id == itemId);
            if (item == null) return;

            if (item.AvailableQuantity < quantity)
            {
                throw new InvalidOperationException(
                    $"Không đủ tồn kho cho sản phẩm '{item.Name}'. Cần: {quantity}, Có sẵn: {item.AvailableQuantity}");
            }

            item.ReservedQuantity += quantity;

            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId,
                ItemId = itemId,
                Quantity = -quantity,
                Action = "RESERVE",
                CreatedAt = DateTime.UtcNow
            });
        }

        /// Deduct: trừ StockQuantity và giảm ReservedQuantity (khi confirm payment)
        private async Task DeductItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;

            var item = await _context.Items.FirstOrDefaultAsync(x => x.Id == itemId);
            if (item == null) return;

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

        /// Release: giảm ReservedQuantity (khi cancel/expire)
        private async Task ReleaseItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;

            var item = await _context.Items.FirstOrDefaultAsync(x => x.Id == itemId);
            if (item == null) return;

            item.ReservedQuantity = Math.Max(0, item.ReservedQuantity - quantity);

            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId,
                ItemId = itemId,
                Quantity = quantity, // Dương cho RELEASE
                Action = "RELEASE",
                CreatedAt = DateTime.UtcNow
            });
        }

        /// Restock: cộng lại StockQuantity khi đơn đã deduct bị hủy
        private async Task RestockItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;

            var item = await _context.Items.FirstOrDefaultAsync(x => x.Id == itemId);
            if (item == null) return;

            item.StockQuantity += quantity;

            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId,
                ItemId = itemId,
                Quantity = quantity,
                Action = "RESTOCK",
                CreatedAt = DateTime.UtcNow
            });
        }

        private async Task RestockOrderInventoryAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
            {
                if (orderItem.Type == OrderItemType.READY_MADE)
                {
                    if (orderItem.GiftBoxId == null) continue;
                    var giftBoxId = orderItem.GiftBoxId.Value.ToString();
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == giftBoxId);
                    if (giftBox == null) continue;

                    foreach (var giftBoxItem in giftBox.Items)
                    {
                        var quantity = giftBoxItem.Quantity * orderItem.Quantity;
                        await RestockItemStockAsync(giftBoxItem.ItemId, quantity, order.Id.ToString(), updatedBy);
                    }
                }
                else if (orderItem.Type == OrderItemType.MIX_MATCH)
                {
                    if (orderItem.CustomBoxId == null) continue;
                    var customBoxId = orderItem.CustomBoxId.Value.ToString();
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == customBoxId);
                    if (customBox == null) continue;

                    foreach (var customItem in customBox.Items)
                    {
                        var quantity = customItem.Quantity * orderItem.Quantity;
                        await RestockItemStockAsync(customItem.ItemId, quantity, order.Id.ToString(), updatedBy);
                    }
                }
            }
        }

        /// Đặt hàng B2C (Guest hoặc Member) - 1 địa chỉ duy nhất
        public async Task<OrderModel> PlaceB2COrderAsync(CreateOrderB2CDto dto)
        {
            var validation = await ValidateB2COrderAsync(dto);
            if (!validation.IsValid)
            {
                throw new InvalidOperationException(string.Join("; ", validation.Errors));
            }

            _logger.LogInformation($"Creating B2C order for {dto.CustomerEmail}");

            if (!await TryReserveSlotAsync(dto.DeliverySlotId))
            {
                throw new InvalidOperationException("Delivery slot is not available");
            }

            try
            {
                var orderItems = await BuildOrderItemsFromB2CAsync(dto.Items);
                var totalQuantity = orderItems.Sum(x => x.Quantity);
                var shippingFee = ShouldApplyTestShippingOverride(orderItems)
                    ? 0
                    : CalculateShippingFee(1);

                var order = new OrderModel
                {
                    Id = ObjectId.GenerateNewId(),
                    OrderCode = GenerateOrderCode(),
                    OrderType = OrderType.B2C,
                    UserId = string.IsNullOrEmpty(dto.UserId) ? null : ObjectId.Parse(dto.UserId),
                    CustomerName = dto.CustomerName,
                    CustomerEmail = dto.CustomerEmail,
                    CustomerPhone = dto.CustomerPhone,
                    Items = orderItems,
                    // B2C: Single DeliveryAddress
                    DeliveryAddress = MapDeliveryAddressFromDto(dto, totalQuantity),
                    DeliveryDate = dto.DeliveryDate,
                    DeliverySlotId = string.IsNullOrEmpty(dto.DeliverySlotId) ? null : ObjectId.Parse(dto.DeliverySlotId),
                    GreetingMessage = dto.GreetingMessage,
                    GreetingCardUrl = dto.GreetingCardUrl,
                    SubTotal = orderItems.Sum(x => x.TotalPrice),
                    ShippingFee = shippingFee,
                    Status = OrderStatus.PAYMENT_CONFIRMING,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                order.TotalAmount = order.SubTotal + order.ShippingFee;
                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = OrderStatus.PAYMENT_CONFIRMING,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "System",
                    Notes = "Đơn hàng được tạo - Đang xác nhận thanh toán"
                });

                // Reserve inventory khi tạo đơn để tránh oversell
                await ReserveInventoryAsync(order, "System-PlaceOrder");

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"B2C Order created: {order.OrderCode}");
                return order;
            }
            catch
            {
                await RollbackSlotAsync(dto.DeliverySlotId);
                throw;
            }
        }

        /// Đặt hàng B2B (Member only) - OrderDelivery + OrderDeliveryItem
        public async Task<OrderModel> PlaceB2BOrderAsync(CreateOrderB2BDto dto)
        {
            var validation = await ValidateB2BOrderAsync(dto);
            if (!validation.IsValid)
            {
                throw new InvalidOperationException(string.Join("; ", validation.Errors));
            }

            _logger.LogInformation($"Creating B2B order for user {dto.UserId}");

            if (!await TryReserveSlotAsync(dto.DeliverySlotId))
            {
                throw new InvalidOperationException("Delivery slot is not available");
            }

            try
            {
                var orderItems = await BuildOrderItemsFromB2BAsync(dto.Items);
                
                // B2B: KHÔNG gán DeliveryAddress vào Order
                var addressIds = dto.DeliveryAllocations.Select(x => x.AddressId).ToList();
                var addresses = await _context.Addresses
                    .Where(x => addressIds.Contains(x.Id) && x.UserId == dto.UserId)
                    .ToListAsync();

                if (addresses.Count != addressIds.Count)
                {
                    throw new InvalidOperationException("Một hoặc nhiều địa chỉ không hợp lệ");
                }

                var order = new OrderModel
                {
                    Id = ObjectId.GenerateNewId(),
                    OrderCode = GenerateOrderCode(),
                    OrderType = OrderType.B2B,
                    UserId = ObjectId.Parse(dto.UserId),
                    CustomerName = dto.CustomerName,
                    CustomerEmail = dto.CustomerEmail,
                    CustomerPhone = dto.CustomerPhone,
                    Items = orderItems,
                    // B2B KHÔNG có DeliveryAddress - dùng OrderDelivery table
                    DeliveryAddress = null,
                    DeliveryDate = dto.DeliveryDate,
                    DeliverySlotId = string.IsNullOrEmpty(dto.DeliverySlotId) ? null : ObjectId.Parse(dto.DeliverySlotId),
                    GreetingMessage = dto.GreetingMessage,
                    GreetingCardUrl = dto.GreetingCardUrl,
                    SubTotal = orderItems.Sum(x => x.TotalPrice),
                    ShippingFee = CalculateB2BShippingFee(addresses.Count),
                    Status = OrderStatus.PAYMENT_CONFIRMING,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                order.TotalAmount = order.SubTotal + order.ShippingFee;
                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = OrderStatus.PAYMENT_CONFIRMING,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "System",
                    Notes = "Đơn hàng B2B được tạo - Đang xác nhận thanh toán"
                });

                // Reserve inventory khi tạo đơn để tránh oversell
                await ReserveInventoryAsync(order, "System-PlaceOrder");

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // B2B: Tạo OrderDelivery và OrderDeliveryItem
                foreach (var allocation in dto.DeliveryAllocations)
                {
                    var orderDelivery = new OrderDelivery
                    {
                        OrderId = order.Id.ToString(),
                        AddressId = allocation.AddressId,
                        Status = "PENDING",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.OrderDeliveries.Add(orderDelivery);
                    await _context.SaveChangesAsync(); // Để có OrderDelivery.Id

                    // Tạo OrderDeliveryItem cho từng allocation
                    foreach (var itemAllocation in allocation.ItemAllocations)
                    {
                        // Map OrderItemIndex to actual OrderItem
                        if (itemAllocation.OrderItemIndex < 0 || itemAllocation.OrderItemIndex >= orderItems.Count)
                        {
                            throw new InvalidOperationException($"Invalid OrderItemIndex: {itemAllocation.OrderItemIndex}");
                        }
                        
                        var orderItem = orderItems[itemAllocation.OrderItemIndex];
                        var orderItemId = orderItem.GiftBoxId?.ToString() ?? orderItem.CustomBoxId?.ToString() ?? "";
                        
                        var orderDeliveryItem = new OrderDeliveryItem
                        {
                            OrderDeliveryId = orderDelivery.Id,
                            OrderItemId = orderItemId,
                            Quantity = itemAllocation.Quantity,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.OrderDeliveryItems.Add(orderDeliveryItem);
                    }
                }
                await _context.SaveChangesAsync();

                _logger.LogInformation($"B2B Order created: {order.OrderCode}");
                return order;
            }
            catch
            {
                await RollbackSlotAsync(dto.DeliverySlotId);
                throw;
            }
        }

        ///Mix & Match Rules Validation
        public async Task<MixMatchValidationResult> ValidateMixMatchRulesAsync(string customBoxId)
        {
            var result = new MixMatchValidationResult { IsValid = true };

            var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == customBoxId);
            if (customBox == null)
            {
                result.IsValid = false;
                result.Errors.Add("CustomBox không tồn tại");
                return result;
            }

            if (!customBox.Items.Any())
            {
                result.IsValid = false;
                result.Errors.Add("Hộp quà phải có ít nhất 1 sản phẩm");
                return result;
            }

            // Load item details để validate category
            var itemIds = customBox.Items.Select(x => x.ItemId).ToList();
            var items = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
            var itemMap = items.ToDictionary(x => x.Id, x => x);

            // Đếm theo QUANTITY (không phải số dòng item)
            result.TotalItemCount = customBox.Items
                .Where(cbi => itemMap.ContainsKey(cbi.ItemId))
                .Sum(cbi => cbi.Quantity);

            result.DrinkCount = customBox.Items
                .Where(cbi => itemMap.ContainsKey(cbi.ItemId) && itemMap[cbi.ItemId].Category == ItemCategory.DRINK)
                .Sum(cbi => cbi.Quantity);

            result.AlcoholCount = customBox.Items
                .Where(cbi => itemMap.ContainsKey(cbi.ItemId) && itemMap[cbi.ItemId].Category == ItemCategory.ALCOHOL)
                .Sum(cbi => cbi.Quantity);

            result.NutCount = customBox.Items
                .Where(cbi => itemMap.ContainsKey(cbi.ItemId) && itemMap[cbi.ItemId].Category == ItemCategory.NUT)
                .Sum(cbi => cbi.Quantity);

            result.FoodCount = customBox.Items
                .Where(cbi => itemMap.ContainsKey(cbi.ItemId) && itemMap[cbi.ItemId].Category == ItemCategory.FOOD)
                .Sum(cbi => cbi.Quantity);

            result.SnackCount = result.NutCount + result.FoodCount;

            var savoryNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Khô gà lá chanh",
                "Khô bò",
                "Chà bông cá hồi",
                "Lạp xưởng tươi"
            };

            result.SavoryCount = customBox.Items
                .Where(cbi => itemMap.ContainsKey(cbi.ItemId) && savoryNames.Contains(itemMap[cbi.ItemId].Name))
                .Sum(cbi => cbi.Quantity);

            result.HasChivas12 = customBox.Items.Any(cbi =>
                itemMap.ContainsKey(cbi.ItemId)
                && itemMap[cbi.ItemId].Name.Contains("Chivas 12", StringComparison.OrdinalIgnoreCase));

            result.HasChivas21 = customBox.Items.Any(cbi =>
                itemMap.ContainsKey(cbi.ItemId)
                && itemMap[cbi.ItemId].Name.Contains("Chivas 21", StringComparison.OrdinalIgnoreCase));

            if (result.TotalItemCount < 4 || result.TotalItemCount > 6)
            {
                result.Errors.Add("Mix & Match phải có tổng từ 4 đến 6 món");
                result.IsValid = false;
            }

            if (result.DrinkCount + result.AlcoholCount < 1)
            {
                result.Errors.Add("Mix & Match phải có ít nhất 1 sản phẩm nhóm đồ uống (Trà hoặc Rượu)");
                result.IsValid = false;
            }

            if (result.SnackCount < 2)
            {
                result.Errors.Add("Mix & Match phải có ít nhất 2 sản phẩm nhóm snack (Hạt/Bánh/Kẹo)");
                result.IsValid = false;
            }

            if (result.SavoryCount > 2)
            {
                result.Errors.Add("Nhóm đặc sản mặn được chọn tối đa 2 sản phẩm");
                result.IsValid = false;
            }

            if (result.HasChivas21 && result.TotalItemCount > 4)
            {
                result.Errors.Add("Nếu hộp có Chivas 21, tổng số item tối đa là 4");
                result.IsValid = false;
            }
            else if (result.HasChivas12 && result.TotalItemCount > 5)
            {
                result.Errors.Add("Nếu hộp có Chivas 12, tổng số item tối đa là 5");
                result.IsValid = false;
            }

            return result;
        }

        //Validation methods
        public async Task<OrderValidationResult> ValidateB2COrderAsync(CreateOrderB2CDto dto)
        {
            var result = new OrderValidationResult { IsValid = true };

            // Validate basic fields
            if (string.IsNullOrEmpty(dto.CustomerName))
                result.Errors.Add("Customer name is required");

            if (!IsValidEmail(dto.CustomerEmail))
                result.Errors.Add("Valid email is required");

            if (dto.Items.Count == 0)
                result.Errors.Add("At least one item is required");

            // Validate Mix & Match items
            foreach (var item in dto.Items.Where(x => x.Type == OrderItemType.MIX_MATCH))
            {
                if (!string.IsNullOrEmpty(item.CustomBoxId))
                {
                    var validation = await ValidateMixMatchRulesAsync(item.CustomBoxId);
                    if (!validation.IsValid)
                    {
                        result.Errors.AddRange(validation.Errors);
                    }
                }
            }

            result.IsValid = result.Errors.Count == 0;
            return result;
        }

        public async Task<OrderValidationResult> ValidateB2BOrderAsync(CreateOrderB2BDto dto)
        {
            var result = new OrderValidationResult { IsValid = true };

            if (string.IsNullOrEmpty(dto.UserId))
                result.Errors.Add("B2B requires login - UserId is required");

            if (dto.DeliveryAllocations.Count == 0)
                result.Errors.Add("At least one delivery address is required for B2B");

            // Validate Mix & Match items
            foreach (var item in dto.Items.Where(x => x.Type == OrderItemType.MIX_MATCH))
            {
                if (!string.IsNullOrEmpty(item.CustomBoxId))
                {
                    var validation = await ValidateMixMatchRulesAsync(item.CustomBoxId);
                    if (!validation.IsValid)
                    {
                        result.Errors.AddRange(validation.Errors);
                    }
                }
            }

            result.IsValid = result.Errors.Count == 0;
            return result;
        }

        // Helper methods for new DTOs
        private async Task<List<OrderItem>> BuildOrderItemsFromB2CAsync(List<OrderItemDto> items)
        {
            var result = new List<OrderItem>();

            foreach (var dto in items)
            {
                if (dto.Type == OrderItemType.READY_MADE)
                {
                    // Handle GiftBox
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == dto.GiftBoxId);
                    if (giftBox == null)
                        throw new InvalidOperationException("GiftBox not found");

                    result.Add(new OrderItem
                    {
                        Type = OrderItemType.READY_MADE,
                        ProductName = giftBox.Name,
                        GiftBoxId = ObjectId.Parse(dto.GiftBoxId ?? ""),
                        Quantity = dto.Quantity,
                        UnitPrice = giftBox.Price,
                        TotalPrice = giftBox.Price * dto.Quantity,
                        SnapshotItems = await BuildGiftBoxSnapshotAsync(giftBox)
                    });
                }
                else if (dto.Type == OrderItemType.MIX_MATCH)
                {
                    // Handle CustomBox với validation
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == dto.CustomBoxId);
                    if (customBox == null)
                        throw new InvalidOperationException("CustomBox not found");

                    //Validate Mix & Match rules
                    var validation = await ValidateMixMatchRulesAsync(dto.CustomBoxId ?? "");
                    if (!validation.IsValid)
                    {
                        throw new InvalidOperationException($"Mix & Match validation failed: {string.Join(", ", validation.Errors)}");
                    }

                    result.Add(new OrderItem
                    {
                        Type = OrderItemType.MIX_MATCH,
                        ProductName = "Custom Mix & Match Box",
                        CustomBoxId = ObjectId.Parse(dto.CustomBoxId ?? ""),
                        Quantity = dto.Quantity,
                        UnitPrice = customBox.TotalPrice,
                        TotalPrice = customBox.TotalPrice * dto.Quantity,
                        SnapshotItems = await BuildCustomBoxSnapshotAsync(customBox)
                    });
                }
            }

            return result;
        }

        private async Task<List<OrderItem>> BuildOrderItemsFromB2BAsync(List<OrderItemDto> items)
        {
            return await BuildOrderItemsFromB2CAsync(items); // Same logic
        }

        private DeliveryAddress MapDeliveryAddressFromDto(CreateOrderB2CDto dto, int quantity)
        {
            return new DeliveryAddress
            {
                RecipientName = dto.ReceiverName,
                RecipientPhone = dto.ReceiverPhone,
                AddressLine = dto.DeliveryAddress,
                Ward = string.Empty, // B2C không yêu cầu chi tiết Ward/District
                District = string.Empty,
                City = string.Empty,
                Notes = string.Empty,
                Quantity = quantity,
                GreetingMessage = dto.GreetingMessage ?? "",
                HideInvoice = false // B2C default
            };
        }

        private async Task<List<OrderItemSnapshotItem>> BuildGiftBoxSnapshotAsync(GiftBox giftBox)
        {
            var snapshotItems = new List<OrderItemSnapshotItem>();

            foreach (var item in giftBox.Items)
            {
                var itemDetail = await _context.Items.FirstOrDefaultAsync(x => x.Id == item.ItemId);
                if (itemDetail != null)
                {
                    snapshotItems.Add(new OrderItemSnapshotItem
                    {
                        ItemId = item.ItemId,
                        ItemName = itemDetail.Name,
                        Quantity = item.Quantity,
                        UnitPrice = item.ItemPriceSnapshot > 0 ? item.ItemPriceSnapshot : itemDetail.Price
                    });
                }
            }

            return snapshotItems;
        }

        private async Task<List<OrderItemSnapshotItem>> BuildCustomBoxSnapshotAsync(CustomBox customBox)
        {
            var snapshotItems = new List<OrderItemSnapshotItem>();

            foreach (var item in customBox.Items)
            {
                var itemDetail = await _context.Items.FirstOrDefaultAsync(x => x.Id == item.ItemId);
                if (itemDetail != null)
                {
                    snapshotItems.Add(new OrderItemSnapshotItem
                    {
                        ItemId = item.ItemId,
                        ItemName = itemDetail.Name,
                        Quantity = item.Quantity,
                        UnitPrice = itemDetail.Price
                    });
                }
            }

            return snapshotItems;
        }

        private static bool ShouldApplyTestShippingOverride(List<OrderItem> orderItems)
        {
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            if (!string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            return orderItems.Any(x =>
                x.Type == OrderItemType.READY_MADE
                && !string.IsNullOrWhiteSpace(x.ProductName)
                && x.ProductName.Contains("[TEST10K]", StringComparison.OrdinalIgnoreCase));
        }

        private decimal CalculateShippingFee(int addressCount)
        {
            return 30000; // B2C flat rate
        }

        private decimal CalculateB2BShippingFee(int addressCount)
        {
            return addressCount * 25000; // B2B per address
        }
    }
}