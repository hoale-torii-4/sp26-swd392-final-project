using ShopHangTet.Models;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using MongoDB.Bson;
using MongoDB.Driver;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Services
{
    /// OrderService - Quản lý tạo và xử lý đơn hàng
    public class OrderService : IOrderService
    {
        private static readonly TimeSpan PaymentConfirmationWindow = TimeSpan.FromMinutes(10);

        private readonly ShopHangTetDbContext _context;
        private readonly ILogger<OrderService> _logger;
        private readonly IMongoCollection<Item> _itemsCollection;
        private readonly IMongoCollection<OrderModel> _ordersCollection;

        public OrderService(
            ShopHangTetDbContext context,
            ILogger<OrderService> logger,
            IMongoDatabase mongoDatabase)
        {
            _context = context;
            _logger = logger;
            _itemsCollection = mongoDatabase.GetCollection<Item>("Items");
            _ordersCollection = mongoDatabase.GetCollection<OrderModel>("Orders");
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
                Items = order.Items.Select(i => new OrderItemResponseDto
                {
                    Id = i.GiftBoxId?.ToString() ?? i.CustomBoxId?.ToString() ?? string.Empty,
                    Type = i.Type,
                    Name = i.ProductName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TotalPrice = i.TotalPrice
                }).ToList(),
                StatusHistory = order.StatusHistory.Select(x => new OrderStatusHistoryDto
                {
                    Status = x.Status,
                    ChangedAt = x.Timestamp,
                    Note = x.Notes,
                    ChangedBy = x.UpdatedBy
                }).ToList()
            };
        }

        public async Task<OrderDto?> GetOrderDetailByCodeAsync(string orderCode, string? email, string? requesterUserId, bool isStaffOrAdmin)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(x => x.OrderCode == orderCode);
            if (order == null)
            {
                return null;
            }

            if (!isStaffOrAdmin)
            {
                if (!string.IsNullOrWhiteSpace(requesterUserId))
                {
                    if (order.UserId == null || order.UserId.Value.ToString() != requesterUserId)
                    {
                        return null;
                    }
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(email)
                        || !string.Equals(order.CustomerEmail, email, StringComparison.OrdinalIgnoreCase))
                    {
                        return null;
                    }
                }
            }

            return await BuildOrderDetailDtoAsync(order);
        }

        public async Task<OrderDto?> GetOrderDetailByIdAsync(string orderId, string requesterUserId, bool isStaffOrAdmin)
        {
            if (!ObjectId.TryParse(orderId, out var objectId))
            {
                return null;
            }

            var order = await _context.Orders.FirstOrDefaultAsync(x => x.Id == objectId);
            if (order == null)
            {
                return null;
            }

            if (!isStaffOrAdmin && (order.UserId == null || order.UserId.Value.ToString() != requesterUserId))
            {
                return null;
            }

            return await BuildOrderDetailDtoAsync(order);
        }

        public async Task<bool> ConfirmReceivedByCustomerAsync(string orderCode, string email)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(x => x.OrderCode == orderCode && x.CustomerEmail == email);

            if (order == null)
            {
                return false;
            }

            if (order.OrderType == OrderType.B2B)
            {
                throw new InvalidOperationException("B2B order must be confirmed by delivery shipment.");
            }

            if (order.Status != OrderStatus.SHIPPING)
            {
                throw new InvalidOperationException("Only SHIPPING orders can be confirmed as received.");
            }

            await UpdateStatusAsync(
                order.Id.ToString(),
                OrderStatus.COMPLETED,
                "Customer",
                "Khach hang xac nhan da nhan hang");

            return true;
        }

        public async Task<bool> ConfirmDeliveryReceivedByCustomerAsync(string deliveryId, string email)
        {
            var delivery = await _context.OrderDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId);
            if (delivery == null)
            {
                return false;
            }

            if (!ObjectId.TryParse(delivery.OrderId, out var orderObjectId))
            {
                throw new InvalidOperationException("Invalid order id for delivery.");
            }

            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderObjectId);
            if (order == null)
            {
                return false;
            }

            if (!string.Equals(order.CustomerEmail, email, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (order.OrderType != OrderType.B2B)
            {
                throw new InvalidOperationException("Only B2B delivery shipment can use this endpoint.");
            }

            if (!string.Equals(delivery.Status, "SHIPPING", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only SHIPPING delivery can be confirmed as received.");
            }

            delivery.Status = "DELIVERED";
            delivery.LastAttemptAt = DateTime.UtcNow;
            delivery.FailureReason = null;
            await _context.SaveChangesAsync();

            var aggregatedStatus = await AggregateDeliveryStatusAsync(delivery.OrderId);
            if (order.Status != aggregatedStatus)
            {
                order.Status = aggregatedStatus;
                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = aggregatedStatus,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "Customer",
                    Notes = $"Khach hang xac nhan da nhan shipment {deliveryId}"
                });
                order.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return true;
        }

        /// Lấy đơn hàng của user (profile)
        public async Task<List<MyOrderResponseDto>> GetMyOrdersAsync(string userId, int skip, int take)
        {
            var userObjectId = ObjectId.Parse(userId);
            var orders = await _context.Orders
                .Where(o => o.UserId == userObjectId)
                .OrderByDescending(o => o.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            return orders.Select(o => new MyOrderResponseDto
            {
                Id = o.Id.ToString(),
                OrderCode = o.OrderCode,
                OrderType = o.OrderType,
                Status = o.Status,
                TotalAmount = o.TotalAmount,
                CreatedAt = o.CreatedAt,
                DeliveryDate = o.DeliveryDate,
                TotalItems = o.Items.Sum(i => i.Quantity),
                Items = o.Items.Select(i => new MyOrderItemDto
                {
                    Name = i.ProductName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TotalPrice = i.TotalPrice,
                    Type = i.Type
                }).ToList()
            }).ToList();
        }

        /// Lấy tất cả đơn hàng cho Admin (có phân trang, filter)
        public async Task<AdminOrderListResult> GetAllOrdersAsync(string? status, string? orderType, string? keyword, int page, int pageSize)
        {
            var query = _context.Orders.AsQueryable();

            // Filter by status
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, true, out var statusEnum))
            {
                filtered = filtered.Where(o => o.Status == statusEnum);
            }

            // Filter by order type
            if (!string.IsNullOrEmpty(orderType) && Enum.TryParse<OrderType>(orderType, true, out var typeEnum))
            {
                filtered = filtered.Where(o => o.OrderType == typeEnum);
            }

            // Search by keyword (orderCode, customerName, customerEmail)
            if (!string.IsNullOrEmpty(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(o =>
                    o.OrderCode.ToLower().Contains(kw) ||
                    o.CustomerName.ToLower().Contains(kw) ||
                    o.CustomerEmail.ToLower().Contains(kw));
            }

            var totalItems = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new AdminOrderListResult
            {
                Data = orders.Select(o => new AdminOrderListItem
                {
                    Id = o.Id.ToString(),
                    OrderCode = o.OrderCode,
                    CustomerName = o.CustomerName,
                    CustomerEmail = o.CustomerEmail,
                    CustomerPhone = o.CustomerPhone,
                    OrderType = o.OrderType.ToString(),
                    Status = o.Status.ToString(),
                    TotalAmount = o.TotalAmount,
                    TotalItems = o.Items.Sum(i => i.Quantity),
                    CreatedAt = o.CreatedAt,
                    DeliveryDate = o.DeliveryDate,
                }).ToList(),
                TotalItems = totalItems,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
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
        public async Task<bool> ConfirmPaymentAsync(
            string orderCode,
            decimal amountPaid,
            string paymentMethod = "SePay",
            string? transactionReference = null,
            DateTime? paymentDate = null,
            string? gateway = null)
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
                // Idempotent webhook behavior: nếu đơn đã qua PAYMENT_CONFIRMING do webhook trước đó thì coi là thành công.
                if (order.Status == OrderStatus.PREPARING
                    || order.Status == OrderStatus.SHIPPING
                    || order.Status == OrderStatus.COMPLETED)
                {
                    _logger.LogInformation("ConfirmPayment: Duplicate webhook ignored for {OrderCode}, current status {Status}",
                        orderCode, order.Status);
                    return true;
                }

                _logger.LogWarning("ConfirmPayment: Order {OrderCode} is not in PAYMENT_CONFIRMING status (current: {Status})",
                    orderCode, order.Status);
                return false;
            }

            var orderAge = DateTime.UtcNow - order.CreatedAt;
            if (orderAge > PaymentConfirmationWindow)
            {
                _logger.LogWarning("ConfirmPayment: Order {OrderCode} exceeded payment window ({Minutes} minutes). CreatedAt={CreatedAt}",
                    orderCode, PaymentConfirmationWindow.TotalMinutes, order.CreatedAt);

                order.Status = OrderStatus.PAYMENT_EXPIRED_INTERNAL;
                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = OrderStatus.PAYMENT_EXPIRED_INTERNAL,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "SePay-Webhook",
                    Notes = $"Hết thời gian xác nhận thanh toán ({PaymentConfirmationWindow.TotalMinutes} phút)"
                });
                order.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
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

            var normalizedMethod = string.IsNullOrWhiteSpace(paymentMethod) ? "SePay" : paymentMethod.Trim();
            var paidAt = paymentDate ?? DateTime.UtcNow;

            // 2. Persist payment metadata for reconciliation and support
            order.PaymentMethod = normalizedMethod;
            order.PaymentDate = paidAt;
            order.TransactionReference = string.IsNullOrWhiteSpace(transactionReference)
                ? null
                : transactionReference.Trim();

            // 3. Cập nhật trạng thái sang PREPARING
            var noteGateway = string.IsNullOrWhiteSpace(gateway) ? normalizedMethod : gateway.Trim();
            var noteReference = string.IsNullOrWhiteSpace(order.TransactionReference)
                ? "N/A"
                : order.TransactionReference;
            order.Status = OrderStatus.PREPARING;
            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = OrderStatus.PREPARING,
                Timestamp = DateTime.UtcNow,
                UpdatedBy = "SePay-Webhook",
                Notes = $"Thanh toán xác nhận tự động qua {noteGateway}. Số tiền: {amountPaid:N0} VND. Ref: {noteReference}"
                Notes = $"Thanh toán xác nhận tự động qua {noteGateway}. Số tiền: {amountPaid:N0} VND. Ref: {noteReference}"
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
            var random = Random.Shared.Next(1000, 9999);
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
                .Where(d => d.OrderId == orderId)
                .ToListAsync();

            if (!deliveries.Any()) return OrderStatus.SHIPPING;

            var allCancelled = deliveries.All(d => d.Status == "CANCELLED");
            var allDelivered = deliveries.All(d => d.Status == "DELIVERED");
            var anyFailed = deliveries.Any(d => d.Status == "FAILED");
            var anyFailed = deliveries.Any(d => d.Status == "FAILED");
            var anyDelivered = deliveries.Any(d => d.Status == "DELIVERED");
            var anyShipping = deliveries.Any(d => d.Status == "SHIPPING" || d.Status == "PENDING");

            if (allCancelled) return OrderStatus.CANCELLED;
            if (allDelivered) return OrderStatus.COMPLETED;
            if (anyShipping) return OrderStatus.SHIPPING;
            if (anyShipping) return OrderStatus.SHIPPING;
            if (anyFailed && anyDelivered) return OrderStatus.PARTIAL_DELIVERY;
            if (anyFailed) return OrderStatus.DELIVERY_FAILED;
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

        private async Task<OrderDto> BuildOrderDetailDtoAsync(OrderModel order)
        {
            var result = new OrderDto
            {
                Id = order.Id.ToString(),
                OrderCode = order.OrderCode,
                UserId = order.UserId?.ToString(),
                Email = order.CustomerEmail,
                OrderType = order.OrderType,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                DeliveryDate = order.DeliveryDate,
                GreetingMessage = order.GreetingMessage,
                GreetingCardUrl = order.GreetingCardUrl,
                CreatedAt = order.CreatedAt,
                Items = order.Items.Select(i => new OrderItemResponseDto
                {
                    Id = i.GiftBoxId?.ToString() ?? i.CustomBoxId?.ToString() ?? string.Empty,
                    Type = i.Type,
                    Name = i.ProductName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TotalPrice = i.TotalPrice
                }).ToList()
            };

            if (order.OrderType == OrderType.B2C && order.DeliveryAddress != null)
            {
                result.DeliveryAddresses.Add(new DeliveryAddressResponseDto
                {
                    Id = order.DeliveryAddress.AddressId ?? string.Empty,
                    ReceiverName = order.DeliveryAddress.RecipientName,
                    ReceiverPhone = order.DeliveryAddress.RecipientPhone,
                    FullAddress = order.DeliveryAddress.AddressLine,
                    Quantity = order.DeliveryAddress.Quantity,
                    GreetingMessage = order.DeliveryAddress.GreetingMessage,
                    HideInvoice = order.DeliveryAddress.HideInvoice
                });

                return result;
            }

            if (order.OrderType != OrderType.B2B)
            {
                return result;
            }

            var deliveries = await _context.OrderDeliveries
                .Where(d => d.OrderId == order.Id.ToString())
                .OrderBy(d => d.CreatedAt)
                .ToListAsync();

            if (!deliveries.Any())
            {
                return result;
            }

            var deliveryIds = deliveries.Select(d => d.Id).ToList();
            var deliveryItems = await _context.OrderDeliveryItems
                .Where(x => deliveryIds.Contains(x.OrderDeliveryId))
                .ToListAsync();

            var addressIds = deliveries
                .Select(d => d.AddressId)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

            var addresses = await _context.Addresses
                .Where(a => addressIds.Contains(a.Id))
                .ToListAsync();
            var addressMap = addresses.ToDictionary(a => a.Id, a => a);

            var orderItemMap = order.Items.ToDictionary(i => i.Id.ToString(), i => i);
            var addressQuantityMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            foreach (var delivery in deliveries)
            {
                var shipmentAllocations = deliveryItems
                    .Where(x => x.OrderDeliveryId == delivery.Id)
                    .ToList();

                var shipmentItems = new List<DeliveryShipmentItemResponseDto>();

                foreach (var allocation in shipmentAllocations)
                {
                    if (!addressQuantityMap.ContainsKey(delivery.AddressId))
                    {
                        addressQuantityMap[delivery.AddressId] = 0;
                    }
                    addressQuantityMap[delivery.AddressId] += allocation.Quantity;

                    if (!orderItemMap.TryGetValue(allocation.OrderItemId, out var orderItem))
                    {
                        continue;
                    }

                    shipmentItems.Add(new DeliveryShipmentItemResponseDto
                    {
                        OrderItemId = allocation.OrderItemId,
                        Name = orderItem.ProductName,
                        Type = orderItem.Type,
                        Quantity = allocation.Quantity,
                        UnitPrice = orderItem.UnitPrice,
                        TotalPrice = orderItem.UnitPrice * allocation.Quantity
                    });
                }

                result.DeliveryShipments.Add(new DeliveryShipmentResponseDto
                {
                    DeliveryId = delivery.Id,
                    AddressId = delivery.AddressId,
                    Status = delivery.Status,
                    RetryCount = delivery.RetryCount,
                    MaxRetries = delivery.MaxRetries,
                    LastAttemptAt = delivery.LastAttemptAt,
                    FailureReason = delivery.FailureReason,
                    CreatedAt = delivery.CreatedAt,
                    Items = shipmentItems
                });
            }

            foreach (var addressId in addressIds)
            {
                if (!addressMap.TryGetValue(addressId, out var address))
                {
                    continue;
                }

                result.DeliveryAddresses.Add(new DeliveryAddressResponseDto
                {
                    Id = address.Id,
                    ReceiverName = address.ReceiverName,
                    ReceiverPhone = address.ReceiverPhone,
                    FullAddress = address.FullAddress,
                    Quantity = addressQuantityMap.TryGetValue(address.Id, out var quantity) ? quantity : 0,
                    GreetingMessage = order.GreetingMessage,
                    HideInvoice = false
                });
            }

            return result;
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

            // Atomic reserve: chỉ tăng ReservedQuantity nếu AvailableQuantity đủ
            if (!ObjectId.TryParse(itemId, out var objectId))
                throw new InvalidOperationException("Invalid item id format");

            var filter = new BsonDocument
            {
                { "_id", objectId },
                {
                    "$expr",
                    new BsonDocument("$gte", new BsonArray
                    {
                        new BsonDocument("$subtract", new BsonArray { "$stockQuantity", "$reservedQuantity" }),
                        quantity
                    })
                }
            };

            var update = Builders<Item>.Update.Inc(x => x.ReservedQuantity, quantity);
            var result = await _itemsCollection.UpdateOneAsync(filter, update);

            if (result.ModifiedCount == 0)
            {
                var item = await _context.Items.FirstOrDefaultAsync(x => x.Id == itemId);
                if (item == null)
                    throw new InvalidOperationException("Item not found");

                throw new InvalidOperationException(
                    $"Không đủ tồn kho cho sản phẩm '{item.Name}'. Cần: {quantity}, Có sẵn: {item.AvailableQuantity}");
            }

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

            // Atomic deduct: chỉ trừ khi đủ reserved và stock
            var filter = Builders<Item>.Filter.And(
                Builders<Item>.Filter.Eq(x => x.Id, itemId),
                Builders<Item>.Filter.Gte(x => x.ReservedQuantity, quantity),
                Builders<Item>.Filter.Gte(x => x.StockQuantity, quantity));

            var update = Builders<Item>.Update
                .Inc(x => x.StockQuantity, -quantity)
                .Inc(x => x.ReservedQuantity, -quantity);

            var result = await _itemsCollection.UpdateOneAsync(filter, update);
            if (result.ModifiedCount == 0)
            {
                throw new InvalidOperationException($"Không thể trừ kho atomically cho item '{itemId}'");
            }

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

            // Atomic release: không cho ReservedQuantity âm
            var filter = Builders<Item>.Filter.And(
                Builders<Item>.Filter.Eq(x => x.Id, itemId),
                Builders<Item>.Filter.Gte(x => x.ReservedQuantity, quantity));

            var update = Builders<Item>.Update.Inc(x => x.ReservedQuantity, -quantity);
            await _itemsCollection.UpdateOneAsync(filter, update);

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

            // Atomic restock
            var filter = Builders<Item>.Filter.Eq(x => x.Id, itemId);
            var update = Builders<Item>.Update.Inc(x => x.StockQuantity, quantity);
            await _itemsCollection.UpdateOneAsync(filter, update);

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

            var orderItems = await BuildOrderItemsFromB2CAsync(dto.Items);
            if (!orderItems.Any())
            {
                throw new InvalidOperationException("Order has no valid items after mapping.");
            }

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

            // Persist order first to ensure we have a stable order Id before reserving inventory.
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // Reserve inventory after the order is saved to avoid ghost reservations if saving fails.
            await ReserveInventoryAsync(order, "System-PlaceOrder");
            // Persist inventory log entries added by ReserveInventoryAsync
            await _context.SaveChangesAsync();

            _logger.LogInformation($"B2C Order created: {order.OrderCode}");
            return order;
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

            var orderItems = await BuildOrderItemsFromB2BAsync(dto.Items);
            if (!orderItems.Any())
            {
                throw new InvalidOperationException("Order has no valid items after mapping.");
            }

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

            // Persist order first to ensure stable Id for reservations
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // Reserve inventory after order persisted to avoid ghost reservations
            await ReserveInventoryAsync(order, "System-PlaceOrder");
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
                    var orderItemId = orderItem.Id.ToString();

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
            _logger.LogInformation("ValidateB2COrderAsync Items.Count={Count}", dto.Items?.Count ?? 0);

            // Validate basic fields
            if (string.IsNullOrEmpty(dto.CustomerName))
                result.Errors.Add("Customer name is required");

            if (!IsValidEmail(dto.CustomerEmail))
                result.Errors.Add("Valid email is required");

            if (dto.Items == null || !dto.Items.Any())
                result.Errors.Add("At least one item is required");

            if (dto.DeliveryDate.Date < DateTime.UtcNow.Date)
                result.Errors.Add("Delivery date cannot be in the past");

            // Validate items
            foreach (var item in dto.Items ?? new List<OrderItemDto>())
            {
                if (item.Quantity <= 0)
                    result.Errors.Add("Quantity must be greater than 0");

#pragma warning disable CS0618
                var targetId = item.Id ?? item.GiftBoxId ?? item.CustomBoxId;
#pragma warning restore CS0618
                if (string.IsNullOrWhiteSpace(targetId))
                {
                    result.Errors.Add("Item Id is required");
                    continue;
                }

                if (item.Type == OrderItemType.MIX_MATCH)
                {
                    var validation = await ValidateMixMatchRulesAsync(targetId);
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
            _logger.LogInformation("ValidateB2BOrderAsync Items.Count={Count}", dto.Items?.Count ?? 0);

            if (string.IsNullOrEmpty(dto.UserId))
                result.Errors.Add("B2B requires login - UserId is required");

            if (dto.Items == null || !dto.Items.Any())
                result.Errors.Add("At least one item is required");

            if (dto.DeliveryAllocations.Count == 0)
                result.Errors.Add("At least one delivery address is required for B2B");

            if (dto.DeliveryDate.Date < DateTime.UtcNow.Date)
                result.Errors.Add("Delivery date cannot be in the past");

            // Validate items
            foreach (var item in dto.Items ?? new List<OrderItemDto>())
            {
                if (item.Quantity <= 0)
                    result.Errors.Add("Quantity must be greater than 0");

#pragma warning disable CS0618
                var targetId = item.Id ?? item.GiftBoxId ?? item.CustomBoxId;
#pragma warning restore CS0618
                if (string.IsNullOrWhiteSpace(targetId))
                {
                    result.Errors.Add("Item Id is required");
                    continue;
                }

                if (item.Type == OrderItemType.MIX_MATCH)
                {
                    var validation = await ValidateMixMatchRulesAsync(targetId);
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
            if (items == null || !items.Any())
                throw new InvalidOperationException("At least one item is required");

            _logger.LogInformation("BuildOrderItemsFromB2CAsync Items.Count={Count}", items.Count);
            var result = new List<OrderItem>();

            foreach (var dto in items)
            {
#pragma warning disable CS0618
                var targetId = dto.Id ?? dto.GiftBoxId ?? dto.CustomBoxId;
#pragma warning restore CS0618
                if (string.IsNullOrWhiteSpace(targetId))
                    throw new InvalidOperationException("Item Id is required");

                if (dto.Type == OrderItemType.READY_MADE)
                {
                    // Handle GiftBox
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == targetId);
                    if (giftBox == null)
                        throw new InvalidOperationException("GiftBox not found");

                    result.Add(new OrderItem
                    {
                        Id = ObjectId.GenerateNewId(),
                        Type = OrderItemType.READY_MADE,
                        ProductName = giftBox.Name,
                        GiftBoxId = ObjectId.Parse(targetId),
                        Quantity = dto.Quantity,
                        UnitPrice = giftBox.Price,
                        TotalPrice = giftBox.Price * dto.Quantity,
                        SnapshotItems = await BuildGiftBoxSnapshotAsync(giftBox)
                    });
                }
                else if (dto.Type == OrderItemType.MIX_MATCH)
                {
                    // Handle CustomBox với validation
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == targetId);
                    if (customBox == null)
                        throw new InvalidOperationException("CustomBox not found");

                    //Validate Mix & Match rules
                    var validation = await ValidateMixMatchRulesAsync(targetId);
                    if (!validation.IsValid)
                    {
                        throw new InvalidOperationException($"Mix & Match validation failed: {string.Join(", ", validation.Errors)}");
                    }

                    result.Add(new OrderItem
                    {
                        Id = ObjectId.GenerateNewId(),
                        Type = OrderItemType.MIX_MATCH,
                        ProductName = "Custom Mix & Match Box",
                        CustomBoxId = ObjectId.Parse(targetId),
                        Quantity = dto.Quantity,
                        UnitPrice = customBox.TotalPrice,
                        TotalPrice = customBox.TotalPrice * dto.Quantity,
                        SnapshotItems = await BuildCustomBoxSnapshotAsync(customBox)
                    });
                }
                else
                {
                    throw new InvalidOperationException($"Unsupported order item type: {dto.Type}");
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

            var itemIds = giftBox.Items.Select(i => i.ItemId).ToList();
            if (!itemIds.Any()) return snapshotItems;

            var items = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
            var itemMap = items.ToDictionary(x => x.Id, x => x);

            foreach (var item in giftBox.Items)
            {
                if (!itemMap.TryGetValue(item.ItemId, out var itemDetail)) continue;

                snapshotItems.Add(new OrderItemSnapshotItem
                {
                    ItemId = item.ItemId,
                    ItemName = itemDetail.Name,
                    Quantity = item.Quantity,
                    UnitPrice = item.ItemPriceSnapshot > 0 ? item.ItemPriceSnapshot : itemDetail.Price
                });
            }

            return snapshotItems;
        }

        private async Task<List<OrderItemSnapshotItem>> BuildCustomBoxSnapshotAsync(CustomBox customBox)
        {
            var snapshotItems = new List<OrderItemSnapshotItem>();

            var itemIds = customBox.Items.Select(i => i.ItemId).ToList();
            if (!itemIds.Any()) return snapshotItems;

            var items = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
            var itemMap = items.ToDictionary(x => x.Id, x => x);

            foreach (var item in customBox.Items)
            {
                if (!itemMap.TryGetValue(item.ItemId, out var itemDetail)) continue;

                snapshotItems.Add(new OrderItemSnapshotItem
                {
                    ItemId = item.ItemId,
                    ItemName = itemDetail.Name,
                    Quantity = item.Quantity,
                    UnitPrice = itemDetail.Price
                });
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