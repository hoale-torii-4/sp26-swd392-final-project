using ShopHangTet.Models;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using MongoDB.Bson;
using MongoDB.Driver;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace ShopHangTet.Services
{
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

        // TRA CỨU ĐƠN HÀNG

        public async Task<OrderTrackingResult?> TrackOrderAsync(string orderCode, string email)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(x => x.OrderCode == orderCode && x.CustomerEmail == email);

            if (order == null) return null;

            return new OrderTrackingResult
            {
                OrderCode = order.OrderCode,
                Status = order.Status.ToString(),
                StatusLabel = GetStatusLabel(order.Status),
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
                    TotalPrice = i.TotalPrice,
                    SnapshotItems = i.SnapshotItems.Select(s => new OrderItemSnapshotResponseDto
                    {
                        ItemId = s.ItemId,
                        ItemName = s.ItemName,
                        Quantity = s.Quantity,
                        UnitPrice = s.UnitPrice
                    }).ToList()
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

        public async Task<OrderDto?> GetOrderDetailByCodeAsync(
            string orderCode, string? email, string? requesterUserId, bool isStaffOrAdmin)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(x => x.OrderCode == orderCode);
            if (order == null) return null;

            if (!isStaffOrAdmin)
            {
                if (!string.IsNullOrWhiteSpace(requesterUserId))
                {
                    if (order.UserId == null || order.UserId.Value.ToString() != requesterUserId)
                        return null;
                }
                else
                {
                    if (string.IsNullOrWhiteSpace(email)
                        || !string.Equals(order.CustomerEmail, email, StringComparison.OrdinalIgnoreCase))
                        return null;
                }
            }

            return await BuildOrderDetailDtoAsync(order);
        }

        public async Task<OrderDto?> GetOrderDetailByIdAsync(
            string orderId, string requesterUserId, bool isStaffOrAdmin)
        {
            if (!ObjectId.TryParse(orderId, out var objectId)) return null;

            var order = await _context.Orders.FirstOrDefaultAsync(x => x.Id == objectId);
            if (order == null) return null;

            if (!isStaffOrAdmin &&
                (order.UserId == null || order.UserId.Value.ToString() != requesterUserId))
                return null;

            return await BuildOrderDetailDtoAsync(order);
        }

        // MY ORDERS (Member)

        public async Task<List<MyOrderResponseDto>> GetMyOrdersAsync(
            string userId, int skip, int take, string? statusFilter = null)
        {
            var userObjectId = ObjectId.Parse(userId);
            var query = _context.Orders.Where(o => o.UserId == userObjectId);

            if (!string.IsNullOrWhiteSpace(statusFilter)
                && Enum.TryParse<OrderStatus>(statusFilter, true, out var statusEnum))
            {
                query = query.Where(o => o.Status == statusEnum);
            }

            var orders = await query
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
                StatusLabel = GetStatusLabel(o.Status),
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
                    Type = i.Type,
                    SnapshotItems = i.SnapshotItems.Select(s => new OrderItemSnapshotResponseDto
                    {
                        ItemId = s.ItemId,
                        ItemName = s.ItemName,
                        Quantity = s.Quantity,
                        UnitPrice = s.UnitPrice
                    }).ToList()
                }).ToList()
            }).ToList();
        }

        // STAFF ORDER LIST

        public async Task<StaffOrderListResponseDto> GetStaffOrdersAsync(
            int page, int pageSize, string? statusFilter, string? typeFilter, string? search)
        {
            var query = _context.Orders.AsQueryable();

            if (!string.IsNullOrWhiteSpace(statusFilter)
                && Enum.TryParse<OrderStatus>(statusFilter, true, out var statusEnum))
            {
                filtered = filtered.Where(o => o.Status == statusEnum);
            }

            if (!string.IsNullOrWhiteSpace(typeFilter)
                && Enum.TryParse<OrderType>(typeFilter, true, out var typeEnum))
            {
                filtered = filtered.Where(o => o.OrderType == typeEnum);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(o =>
                    o.OrderCode.ToLower().Contains(s) ||
                    o.CustomerEmail.ToLower().Contains(s) ||
                    o.CustomerName.ToLower().Contains(s) ||
                    o.CustomerPhone.Contains(s));
            }

            var totalItems = await query.CountAsync();

            var safePage = Math.Max(1, page);
            var safeSize = Math.Clamp(pageSize, 1, 100);
            var skip = (safePage - 1) * safeSize;

            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip(skip)
                .Take(safeSize)
                .ToListAsync();

            var items = orders.Select(o => new StaffOrderListItemDto
            {
                Id = o.Id.ToString(),
                OrderCode = o.OrderCode,
                OrderType = o.OrderType,
                Status = o.Status,
                StatusLabel = GetStatusLabel(o.Status),
                CustomerName = o.CustomerName,
                CustomerEmail = o.CustomerEmail,
                CustomerPhone = o.CustomerPhone,
                TotalAmount = o.TotalAmount,
                TotalItems = o.Items.Sum(i => i.Quantity),
                CreatedAt = o.CreatedAt,
                DeliveryDate = o.DeliveryDate == default ? null : o.DeliveryDate
            }).ToList();

            return new StaffOrderListResponseDto
            {
                Items = items,
                Page = safePage,
                PageSize = safeSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling((double)totalItems / safeSize)
            };
        }

        private static string GetStatusLabel(OrderStatus status) => status switch
        {
            OrderStatus.PAYMENT_CONFIRMING => "Đang xác nhận thanh toán",
            OrderStatus.PREPARING => "Đang chuẩn bị",
            OrderStatus.SHIPPING => "Đang được giao",
            OrderStatus.PARTIAL_DELIVERY => "Đang được giao",
            OrderStatus.DELIVERY_FAILED => "Đang được giao",
            OrderStatus.PAYMENT_EXPIRED_INTERNAL => "Đang xác nhận thanh toán",
            OrderStatus.COMPLETED => "Hoàn thành",
            OrderStatus.CANCELLED => "Đã hủy",
            _ => status.ToString()
        };

        // CẬP NHẬT TRẠNG THÁI

        public async Task<OrderModel> UpdateStatusAsync(
            string orderId, OrderStatus status, string updatedBy, string? notes = null)
        {
            var orderObjectId = ObjectId.Parse(orderId);
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderObjectId)
                ?? throw new InvalidOperationException("Order not found");

            // Kiểm tra transition hợp lệ (chỉ dùng AllowedStaffTransitions — không dùng IsValidStatusTransition cũ)
            if (!AllowedStaffTransitions.IsAllowed(order.Status, status))
            {
                throw new InvalidOperationException(
                    $"Không thể chuyển đơn từ {order.Status} sang {status}");
            }

            // Deduct kho khi PREPARING — có guard chống double-deduct
            if (status == OrderStatus.PREPARING && !order.IsInventoryDeducted)
            {
                await DeductReservedInventoryAsync(order, updatedBy);
            }

            // Xử lý hủy đơn
            if (status == OrderStatus.CANCELLED)
            {
                if (order.Status == OrderStatus.PAYMENT_CONFIRMING
                    || order.Status == OrderStatus.PAYMENT_EXPIRED_INTERNAL)
                {
                    await ReleaseInventoryReservationAsync(order, updatedBy);
                }
                else if (order.IsInventoryDeducted)
                {
                    await RestockOrderInventoryAsync(order, updatedBy);
                }
                }
            }

            order.Status = status;
            order.StatusHistory.Add(new OrderStatusHistory
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

        // THANH TOÁN

        /// Xác nhận thanh toán tự động từ SePay webhook
        public async Task<bool> ConfirmPaymentAsync(
            string orderCode,
            decimal amountPaid,
            string? transactionReference = null,
            string? paymentGateway = null,
            string? rawWebhookData = null)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderCode == orderCode);

            if (order == null)
            {
                _logger.LogWarning("ConfirmPayment: Order {Code} not found", orderCode);
                return false;
            }

            if (order.Status != OrderStatus.PAYMENT_CONFIRMING)
            {
                // Idempotent: nếu đã qua PREPARING/SHIPPING/COMPLETED do webhook trước → bỏ qua
                if (order.Status is OrderStatus.PREPARING or OrderStatus.SHIPPING or OrderStatus.COMPLETED)
                {
                    _logger.LogInformation("ConfirmPayment: Duplicate webhook ignored for {Code}", orderCode);
                    return true;
                }

                _logger.LogWarning("ConfirmPayment: Order {Code} not in PAYMENT_CONFIRMING (current: {S})",
                    orderCode, order.Status);
                return false;
            }

            if (DateTime.UtcNow - order.CreatedAt > PaymentConfirmationWindow)
            {
                _logger.LogWarning("ConfirmPayment: Order {Code} exceeded payment window", orderCode);
                order.Status = OrderStatus.PAYMENT_EXPIRED_INTERNAL;
                order.StatusHistory.Add(new OrderStatusHistory
                {
                    Status = OrderStatus.PAYMENT_EXPIRED_INTERNAL,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "SePay-Webhook",
                    Notes = "Hết thời gian xác nhận thanh toán (10 phút)"
                });
                order.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return false;
            }

            order.TransactionReference = transactionReference;
            order.PaymentGateway = paymentGateway;
            if (!string.IsNullOrWhiteSpace(rawWebhookData))
            {
                order.RawWebhookData = rawWebhookData;
            }

            if (amountPaid < order.TotalAmount)
            {
                _logger.LogWarning("ConfirmPayment: Insufficient amount for {Code}. Expected={E}, Got={G}",
                    orderCode, order.TotalAmount, amountPaid);
                return false;
            }

            // Guard chống double-deduct: chỉ deduct nếu chưa được deduct
            if (!order.IsInventoryDeducted)
            {
                await DeductReservedInventoryAsync(order, "SePay-Webhook");
            }

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

            _logger.LogInformation("ConfirmPayment: Order {Code} confirmed. Amount: {A}", orderCode, amountPaid);
            return true;
        }

        /// Xác nhận thanh toán thủ công bởi Staff (khi webhook không bắt được)
        public async Task<bool> StaffConfirmPaymentAsync(string orderId, string staffName)
        {
            if (!ObjectId.TryParse(orderId, out var objectId))
                throw new InvalidOperationException("Invalid order id");

            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == objectId)
                ?? throw new InvalidOperationException("Order not found");

            if (order.Status != OrderStatus.PAYMENT_CONFIRMING)
                throw new InvalidOperationException(
                    $"Chỉ có thể xác nhận thanh toán khi đơn đang ở trạng thái 'Đang xác nhận thanh toán'. Trạng thái hiện tại: {order.Status}");

            // Guard chống double-deduct
            if (!order.IsInventoryDeducted)
            {
                await DeductReservedInventoryAsync(order, staffName);
            }

            order.Status = OrderStatus.PREPARING;
            order.StatusHistory.Add(new OrderStatusHistory
            {
                Status = OrderStatus.PREPARING,
                Timestamp = DateTime.UtcNow,
                UpdatedBy = staffName,
                Notes = "Staff xác nhận thanh toán thủ công"
            });
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("StaffConfirmPayment: Order {Code} confirmed by {Staff}",
                order.OrderCode, staffName);
            return true;
        }

        public async Task<OrderModel?> GetOrderByCodeAsync(string orderCode)
            => await _context.Orders.FirstOrDefaultAsync(o => o.OrderCode == orderCode);

        // CONFIRM RECEIVED (Customer)

        public async Task<bool> ConfirmReceivedByCustomerAsync(string orderCode, string email)
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(x => x.OrderCode == orderCode && x.CustomerEmail == email);
            if (order == null) return false;

            if (order.OrderType == OrderType.B2B)
                throw new InvalidOperationException("B2B order must be confirmed by delivery shipment.");

            if (order.Status != OrderStatus.SHIPPING)
                throw new InvalidOperationException("Only SHIPPING orders can be confirmed as received.");

            await UpdateStatusAsync(order.Id.ToString(), OrderStatus.COMPLETED, "Customer",
                "Khách hàng xác nhận đã nhận hàng");
            return true;
        }

        public async Task<bool> ConfirmDeliveryReceivedByCustomerAsync(string deliveryId, string email)
        {
            var delivery = await _context.OrderDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId);
            if (delivery == null) return false;

            if (!ObjectId.TryParse(delivery.OrderId, out var orderObjectId))
                throw new InvalidOperationException("Invalid order id for delivery.");

            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderObjectId);
            if (order == null) return false;

            if (!string.Equals(order.CustomerEmail, email, StringComparison.OrdinalIgnoreCase))
                return false;

            if (order.OrderType != OrderType.B2B)
                throw new InvalidOperationException("Only B2B delivery shipment can use this endpoint.");

            if (!string.Equals(delivery.Status, "SHIPPING", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Only SHIPPING delivery can be confirmed as received.");

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
                    Notes = $"Khách hàng xác nhận đã nhận shipment {deliveryId}"
                });
                order.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return true;
        }

        // DELIVERY (B2B)

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
            var anyShipping = deliveries.Any(d => d.Status is "SHIPPING" or "PENDING");

            if (allCancelled) return OrderStatus.CANCELLED;
            if (allDelivered) return OrderStatus.COMPLETED;
            if (anyShipping) return OrderStatus.SHIPPING;
            if (anyShipping) return OrderStatus.SHIPPING;
            if (anyFailed && anyDelivered) return OrderStatus.PARTIAL_DELIVERY;
            if (anyFailed) return OrderStatus.DELIVERY_FAILED;
            if (anyFailed) return OrderStatus.DELIVERY_FAILED;
            return OrderStatus.SHIPPING;
        }

        public async Task UpdateDeliveryStatusAsync(
            string deliveryId, string status, string? failureReason = null)
        {
            var delivery = await _context.OrderDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId)
                ?? throw new InvalidOperationException("Delivery not found");

            delivery.Status = status;
            delivery.LastAttemptAt = DateTime.UtcNow;

            if (status == "FAILED")
            {
                delivery.FailureReason = failureReason;
                delivery.RetryCount++;
            }

            await _context.SaveChangesAsync();

            var aggregatedStatus = await AggregateDeliveryStatusAsync(delivery.OrderId);
            var order = await _context.Orders.FirstOrDefaultAsync(
                o => o.Id == ObjectId.Parse(delivery.OrderId));

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

        public async Task<bool> ReshipDeliveryAsync(string deliveryId)
        {
            var delivery = await _context.OrderDeliveries.FirstOrDefaultAsync(d => d.Id == deliveryId)
                ?? throw new InvalidOperationException("Delivery not found");

            if (delivery.Status != "FAILED")
                throw new InvalidOperationException("Only failed deliveries can be reshipped");

            if (delivery.RetryCount >= delivery.MaxRetries)
                throw new InvalidOperationException(
                    $"Max retries ({delivery.MaxRetries}) exceeded for this delivery");

            delivery.Status = "SHIPPING";
            delivery.LastAttemptAt = DateTime.UtcNow;
            delivery.FailureReason = null;
            await _context.SaveChangesAsync();

            var aggregatedStatus = await AggregateDeliveryStatusAsync(delivery.OrderId);
            var order = await _context.Orders.FirstOrDefaultAsync(
                o => o.Id == ObjectId.Parse(delivery.OrderId));

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

        // ĐẶT HÀNG B2C

        public async Task<OrderModel> PlaceB2COrderAsync(CreateOrderB2CDto dto)
        {
            var validation = await ValidateB2COrderAsync(dto);
            if (!validation.IsValid)
                throw new InvalidOperationException(string.Join("; ", validation.Errors));

            _logger.LogInformation("Creating B2C order for {Email}", dto.CustomerEmail);

            var orderItems = await BuildOrderItemsAsync(dto.Items);
            var shippingFee = CalculateShippingFee(1);

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
                DeliveryAddress = new DeliveryAddress
                {
                    RecipientName = dto.ReceiverName,
                    RecipientPhone = dto.ReceiverPhone,
                    AddressLine = dto.DeliveryAddress,
                    Notes = string.Empty,
                    Quantity = orderItems.Sum(x => x.Quantity),
                    GreetingMessage = dto.GreetingMessage ?? string.Empty,
                    HideInvoice = false
                },
                DeliveryDate = dto.DeliveryDate.Date,
                GreetingMessage = dto.GreetingMessage,
                GreetingCardUrl = dto.GreetingCardUrl,
                SubTotal = orderItems.Sum(x => x.TotalPrice),
                ShippingFee = shippingFee,
                Status = OrderStatus.PAYMENT_CONFIRMING,
                IsInventoryDeducted = false,
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

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            await ReserveInventoryAsync(order, "System-PlaceOrder");
            await _context.SaveChangesAsync();

            _logger.LogInformation("B2C Order created: {Code}", order.OrderCode);
            return order;
        }

        // ĐẶT HÀNG B2B

        public async Task<OrderModel> PlaceB2BOrderAsync(CreateOrderB2BDto dto)
        {
            var validation = await ValidateB2BOrderAsync(dto);
            if (!validation.IsValid)
                throw new InvalidOperationException(string.Join("; ", validation.Errors));

            _logger.LogInformation("Creating B2B order for user {UserId}", dto.UserId);

            var orderItems = await BuildOrderItemsAsync(dto.Items);

            var addressIds = dto.DeliveryAllocations.Select(x => x.AddressId).Distinct().ToList();
            var addresses = await _context.Addresses
                .Where(x => addressIds.Contains(x.Id) && x.UserId == dto.UserId)
                .ToListAsync();

            if (addresses.Count != addressIds.Count)
                throw new InvalidOperationException("Một hoặc nhiều địa chỉ không hợp lệ");

            // Tạo lookup itemId → orderItem để map allocation
            // Dùng (itemId, itemType) làm key vì cùng GiftBox có thể có nhiều dòng khác nhau
            var orderItemLookup = orderItems.ToDictionary(
                i => (i.GiftBoxId?.ToString() ?? i.CustomBoxId?.ToString() ?? string.Empty, i.Type),
                i => i);

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
                DeliveryAddress = null, // B2B dùng OrderDelivery table
                DeliveryDate = dto.DeliveryAllocations
                    .Select(a => (a.DeliveryDate ?? dto.DeliveryDate).Date)
                    .Min(), // Ngày giao sớm nhất
                GreetingMessage = dto.GreetingMessage,
                GreetingCardUrl = dto.GreetingCardUrl,
                SubTotal = orderItems.Sum(x => x.TotalPrice),
                ShippingFee = CalculateB2BShippingFee(addresses.Count),
                Status = OrderStatus.PAYMENT_CONFIRMING,
                IsInventoryDeducted = false,
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

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            await ReserveInventoryAsync(order, "System-PlaceOrder");
            await _context.SaveChangesAsync();

            // Tạo OrderDelivery per địa chỉ — mỗi địa chỉ có DeliveryDate riêng
            foreach (var allocation in dto.DeliveryAllocations)
            {
                var effectiveDeliveryDate = (allocation.DeliveryDate ?? dto.DeliveryDate).Date;
                var orderDelivery = new OrderDelivery
                {
                    OrderId = order.Id.ToString(),
                    AddressId = allocation.AddressId,
                    DeliveryDate = effectiveDeliveryDate,
                    Status = "PENDING",
                    CreatedAt = DateTime.UtcNow
                };
                _context.OrderDeliveries.Add(orderDelivery);
                await _context.SaveChangesAsync(); // cần Id trước khi tạo items

                foreach (var itemAlloc in allocation.ItemAllocations)
                {
                    // Map bằng ItemId + ItemType — an toàn hơn dùng index
                    var key = (itemAlloc.ItemId, itemAlloc.ItemType);
                    if (!orderItemLookup.TryGetValue(key, out var orderItem))
                    {
                        throw new InvalidOperationException(
                            $"ItemId '{itemAlloc.ItemId}' (type={itemAlloc.ItemType}) không tồn tại trong đơn hàng");
                    }

                    _context.OrderDeliveryItems.Add(new OrderDeliveryItem
                    {
                        OrderDeliveryId = orderDelivery.Id,
                        OrderItemId = orderItem.Id.ToString(),
                        Quantity = itemAlloc.Quantity,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("B2B Order created: {Code}", order.OrderCode);
            return order;
        }

        // VALIDATION

        public async Task<OrderValidationResult> ValidateB2COrderAsync(CreateOrderB2CDto dto)
        {
            var result = new OrderValidationResult { IsValid = true };

            if (string.IsNullOrEmpty(dto.CustomerName))
                result.Errors.Add("Tên khách hàng là bắt buộc");

            if (!IsValidEmail(dto.CustomerEmail))
                result.Errors.Add("Email không hợp lệ");

            if (dto.Items == null || !dto.Items.Any())
                result.Errors.Add("Phải có ít nhất 1 sản phẩm");

            // So sánh ngày theo Asia/Ho_Chi_Minh tránh lỗi timezone
            var vnNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));
            if (dto.DeliveryDate.Date < vnNow.Date)
                result.Errors.Add("Ngày giao hàng không được trong quá khứ");

            foreach (var item in dto.Items ?? new List<OrderItemDto>())
            {
                if (item.Quantity <= 0)
                    result.Errors.Add("Số lượng phải lớn hơn 0");

#pragma warning disable CS0618
                var targetId = item.Id ?? item.GiftBoxId ?? item.CustomBoxId;
#pragma warning restore CS0618
                if (string.IsNullOrWhiteSpace(targetId))
                {
                    result.Errors.Add("Item Id là bắt buộc");
                    continue;
                }

                if (item.Type == OrderItemType.MIX_MATCH)
                {
                    var mmValidation = await ValidateMixMatchRulesAsync(targetId);
                    if (!mmValidation.IsValid)
                        result.Errors.AddRange(mmValidation.Errors);
                }
            }

            result.IsValid = result.Errors.Count == 0;
            return result;
        }

        public async Task<OrderValidationResult> ValidateB2BOrderAsync(CreateOrderB2BDto dto)
        {
            var result = new OrderValidationResult { IsValid = true };

            if (string.IsNullOrEmpty(dto.UserId))
                result.Errors.Add("B2B yêu cầu đăng nhập - UserId là bắt buộc");

            if (dto.Items == null || !dto.Items.Any())
                result.Errors.Add("Phải có ít nhất 1 sản phẩm");

            if (!dto.DeliveryAllocations.Any())
                result.Errors.Add("B2B phải có ít nhất 1 địa chỉ giao hàng");

            // Kiểm tra từng địa chỉ có deliveryDate hợp lệ
            var vnNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
                TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));

            if (dto.DeliveryDate.Date < vnNow.Date)
                result.Errors.Add("Ngày giao hàng không được trong quá khứ");

            foreach (var alloc in dto.DeliveryAllocations)
            {
                var effectiveDeliveryDate = (alloc.DeliveryDate ?? dto.DeliveryDate).Date;
                if (effectiveDeliveryDate < vnNow.Date)
                    result.Errors.Add($"Ngày giao hàng cho địa chỉ {alloc.AddressId} không được trong quá khứ");
            }

            foreach (var item in dto.Items ?? new List<OrderItemDto>())
            {
                if (item.Quantity <= 0)
                    result.Errors.Add("Số lượng phải lớn hơn 0");

#pragma warning disable CS0618
                var targetId = item.Id ?? item.GiftBoxId ?? item.CustomBoxId;
#pragma warning restore CS0618
                if (string.IsNullOrWhiteSpace(targetId))
                {
                    result.Errors.Add("Item Id là bắt buộc");
                    continue;
                }

                if (item.Type == OrderItemType.MIX_MATCH)
                {
                    var mmValidation = await ValidateMixMatchRulesAsync(targetId);
                    if (!mmValidation.IsValid)
                        result.Errors.AddRange(mmValidation.Errors);
                }
            }

            result.IsValid = result.Errors.Count == 0;
            return result;
        }

        // MIX & MATCH VALIDATION (đã bỏ rule Chivas)
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

            var itemIds = customBox.Items.Select(x => x.ItemId).ToList();
            var items = await _context.Items.Where(x => itemIds.Contains(x.Id)).ToListAsync();
            var itemMap = items.ToDictionary(x => x.Id, x => x);

            // Đếm theo tổng QUANTITY (không phải số dòng)
            result.TotalItemCount = customBox.Items
                .Where(cbi => itemMap.ContainsKey(cbi.ItemId))
                .Sum(cbi => cbi.Quantity);

            result.DrinkCount = customBox.Items
                .Where(cbi => itemMap.TryGetValue(cbi.ItemId, out var it) && it.Category == ItemCategory.DRINK)
                .Sum(cbi => cbi.Quantity);

            result.AlcoholCount = customBox.Items
                .Where(cbi => itemMap.TryGetValue(cbi.ItemId, out var it) && it.Category == ItemCategory.ALCOHOL)
                .Sum(cbi => cbi.Quantity);

            result.NutCount = customBox.Items
                .Where(cbi => itemMap.TryGetValue(cbi.ItemId, out var it) && it.Category == ItemCategory.NUT)
                .Sum(cbi => cbi.Quantity);

            result.FoodCount = customBox.Items
                .Where(cbi => itemMap.TryGetValue(cbi.ItemId, out var it) && it.Category == ItemCategory.FOOD)
                .Sum(cbi => cbi.Quantity);

            result.SnackCount = result.NutCount + result.FoodCount;

            // SAVORY dùng category thay vì hardcode tên
            result.SavoryCount = customBox.Items
                .Where(cbi => itemMap.TryGetValue(cbi.ItemId, out var it) && it.Category == ItemCategory.SAVORY)
                .Sum(cbi => cbi.Quantity);

            // ── Kiểm tra rules ──────────────────────────────────────────────
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

            // NOTE: Rule Chivas (max item khi có Chivas 12/21) đã được bỏ theo nghiệp vụ mới

            return result;
        }

        // BUILD ORDER DETAIL DTO
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
                StatusLabel = GetStatusLabel(order.Status),
                TotalAmount = order.TotalAmount,
                DeliveryDate = order.DeliveryDate == default ? null : order.DeliveryDate,
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
                    TotalPrice = i.TotalPrice,
                    SnapshotItems = i.SnapshotItems.Select(s => new OrderItemSnapshotResponseDto
                    {
                        ItemId = s.ItemId,
                        ItemName = s.ItemName,
                        Quantity = s.Quantity,
                        UnitPrice = s.UnitPrice
                    }).ToList()
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
                    DeliveryDate = order.DeliveryDate == default ? null : order.DeliveryDate,
                    GreetingMessage = order.DeliveryAddress.GreetingMessage,
                    HideInvoice = order.DeliveryAddress.HideInvoice
                });
                return result;
            }

            if (order.OrderType != OrderType.B2B) return result;

            // B2B: load deliveries kèm DeliveryDate riêng từng shipment
            var deliveries = await _context.OrderDeliveries
                .Where(d => d.OrderId == order.Id.ToString())
                .OrderBy(d => d.CreatedAt)
                .ToListAsync();

            if (!deliveries.Any()) return result;

            var deliveryIds = deliveries.Select(d => d.Id).ToList();
            var deliveryItems = await _context.OrderDeliveryItems
                .Where(x => deliveryIds.Contains(x.OrderDeliveryId))
                .ToListAsync();

            var addressIds = deliveries
                .Select(d => d.AddressId)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct().ToList();

            var addresses = await _context.Addresses
                .Where(a => addressIds.Contains(a.Id))
                .ToListAsync();
            var addressMap = addresses.ToDictionary(a => a.Id, a => a);

            var orderItemMap = order.Items.ToDictionary(i => i.Id.ToString(), i => i);
            var addressQuantityMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var addressDeliveryDateMap = new Dictionary<string, DateTime>(StringComparer.OrdinalIgnoreCase);

            foreach (var delivery in deliveries)
            {
                var shipmentAllocations = deliveryItems
                    .Where(x => x.OrderDeliveryId == delivery.Id).ToList();

                var shipmentItems = new List<DeliveryShipmentItemResponseDto>();

                foreach (var allocation in shipmentAllocations)
                {
                    if (!addressQuantityMap.ContainsKey(delivery.AddressId))
                        addressQuantityMap[delivery.AddressId] = 0;
                    addressQuantityMap[delivery.AddressId] += allocation.Quantity;

                    if (!addressDeliveryDateMap.ContainsKey(delivery.AddressId))
                        addressDeliveryDateMap[delivery.AddressId] = delivery.DeliveryDate;

                    if (!orderItemMap.TryGetValue(allocation.OrderItemId, out var orderItem))
                        continue;

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
                    DeliveryDate = delivery.DeliveryDate == default ? null : delivery.DeliveryDate,
                    LastAttemptAt = delivery.LastAttemptAt,
                    FailureReason = delivery.FailureReason,
                    CreatedAt = delivery.CreatedAt,
                    Items = shipmentItems
                });
            }

            foreach (var addressId in addressIds)
            {
                if (!addressMap.TryGetValue(addressId, out var address)) continue;

                result.DeliveryAddresses.Add(new DeliveryAddressResponseDto
                {
                    Id = address.Id,
                    ReceiverName = address.ReceiverName,
                    ReceiverPhone = address.ReceiverPhone,
                    FullAddress = address.FullAddress,
                    Quantity = addressQuantityMap.TryGetValue(address.Id, out var q) ? q : 0,
                    DeliveryDate = addressDeliveryDateMap.TryGetValue(address.Id, out var dd) ? dd : null,
                    GreetingMessage = order.GreetingMessage,
                    HideInvoice = false
                });
            }

            return result;
        }

        // INVENTORY HELPERS
        private async Task ReserveInventoryAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
                await ProcessInventoryForOrderItemAsync(orderItem, ReserveItemStockAsync, updatedBy, order.Id.ToString());
        }

        private async Task DeductReservedInventoryAsync(OrderModel order, string updatedBy)
        {
            if (order.IsInventoryDeducted)
                return;

            foreach (var orderItem in order.Items)
                await ProcessInventoryForOrderItemAsync(orderItem, DeductItemStockAsync, updatedBy, order.Id.ToString());

            order.IsInventoryDeducted = true;
        }

        public async Task ReleaseInventoryReservationAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
                await ProcessInventoryForOrderItemAsync(orderItem, ReleaseItemStockAsync, updatedBy, order.Id.ToString());
        }

        private async Task RestockOrderInventoryAsync(OrderModel order, string updatedBy)
        {
            foreach (var orderItem in order.Items)
                await ProcessInventoryForOrderItemAsync(orderItem, RestockItemStockAsync, updatedBy, order.Id.ToString());
        }

        private async Task ProcessInventoryForOrderItemAsync(
            OrderItem orderItem,
            Func<string, int, string, string, Task> action,
            string updatedBy,
            string orderId)
        {
            if (orderItem.Type == OrderItemType.READY_MADE)
            {
                if (orderItem.GiftBoxId == null) return;
                var giftBox = await _context.GiftBoxes
                    .FirstOrDefaultAsync(x => x.Id == orderItem.GiftBoxId.Value.ToString());
                if (giftBox == null) return;

                foreach (var giftBoxItem in giftBox.Items)
                    await action(giftBoxItem.ItemId, giftBoxItem.Quantity * orderItem.Quantity, orderId, updatedBy);
            }
            else if (orderItem.Type == OrderItemType.MIX_MATCH)
            {
                if (orderItem.CustomBoxId == null) return;
                var customBox = await _context.CustomBoxes
                    .FirstOrDefaultAsync(x => x.Id == orderItem.CustomBoxId.Value.ToString());
                if (customBox == null) return;

                foreach (var customItem in customBox.Items)
                    await action(customItem.ItemId, customItem.Quantity * orderItem.Quantity, orderId, updatedBy);
            }
        }

        private async Task ReserveItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;
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
                if (item == null) throw new InvalidOperationException("Item not found");
                throw new InvalidOperationException(
                    $"Không đủ tồn kho cho sản phẩm '{item.Name}'. Cần: {quantity}, Có sẵn: {item.AvailableQuantity}");
            }

            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId, ItemId = itemId, Quantity = -quantity,
                Action = "RESERVE", CreatedAt = DateTime.UtcNow
            });
        }

        private async Task DeductItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;

            var filter = Builders<Item>.Filter.And(
                Builders<Item>.Filter.Eq(x => x.Id, itemId),
                Builders<Item>.Filter.Gte(x => x.ReservedQuantity, quantity),
                Builders<Item>.Filter.Gte(x => x.StockQuantity, quantity));

            var update = Builders<Item>.Update
                .Inc(x => x.StockQuantity, -quantity)
                .Inc(x => x.ReservedQuantity, -quantity);

            var result = await _itemsCollection.UpdateOneAsync(filter, update);
            if (result.ModifiedCount == 0)
                throw new InvalidOperationException($"Không thể trừ kho atomically cho item '{itemId}'");

            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId, ItemId = itemId, Quantity = -quantity,
                Action = "DEDUCT", CreatedAt = DateTime.UtcNow
            });
        }

        private async Task ReleaseItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;

            var filter = Builders<Item>.Filter.And(
                Builders<Item>.Filter.Eq(x => x.Id, itemId),
                Builders<Item>.Filter.Gte(x => x.ReservedQuantity, quantity));

            var update = Builders<Item>.Update.Inc(x => x.ReservedQuantity, -quantity);
            await _itemsCollection.UpdateOneAsync(filter, update);

            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId, ItemId = itemId, Quantity = quantity,
                Action = "RELEASE", CreatedAt = DateTime.UtcNow
            });
        }

        private async Task RestockItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;

            var filter = Builders<Item>.Filter.Eq(x => x.Id, itemId);
            var update = Builders<Item>.Update.Inc(x => x.StockQuantity, quantity);
            await _itemsCollection.UpdateOneAsync(filter, update);

            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId, ItemId = itemId, Quantity = quantity,
                Action = "RESTOCK", CreatedAt = DateTime.UtcNow
            });
        }

        // BUILD ORDER ITEMS
        private async Task<List<OrderItem>> BuildOrderItemsAsync(List<OrderItemDto> items)
        {
            if (items == null || !items.Any())
                throw new InvalidOperationException("Phải có ít nhất 1 sản phẩm");

            var result = new List<OrderItem>();

            foreach (var dto in items)
            {
#pragma warning disable CS0618
                var targetId = dto.Id ?? dto.GiftBoxId ?? dto.CustomBoxId;
#pragma warning restore CS0618
                if (string.IsNullOrWhiteSpace(targetId))
                    throw new InvalidOperationException("Item Id là bắt buộc");

                if (dto.Type == OrderItemType.READY_MADE)
                {
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == targetId)
                        ?? throw new InvalidOperationException($"GiftBox '{targetId}' không tồn tại");

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
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == targetId)
                        ?? throw new InvalidOperationException($"CustomBox '{targetId}' không tồn tại");

                    var validation = await ValidateMixMatchRulesAsync(targetId);
                    if (!validation.IsValid)
                        throw new InvalidOperationException(
                            $"Mix & Match validation failed: {string.Join(", ", validation.Errors)}");

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

        private async Task<List<OrderItemSnapshotItem>> BuildGiftBoxSnapshotAsync(GiftBox giftBox)
        {
            var itemIds = giftBox.Items.Select(i => i.ItemId).ToList();
            if (!itemIds.Any()) return new();

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

        private async Task<List<OrderItemSnapshotItem>> BuildCustomBoxSnapshotAsync(CustomBox customBox)
        {
            var itemIds = customBox.Items.Select(i => i.ItemId).ToList();
            if (!itemIds.Any()) return new();

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

        // HELPERS

        private string GenerateOrderCode()
        {
            var timestamp = DateTime.UtcNow.ToString("yyMMdd");
            var random = Random.Shared.Next(1000, 9999);
            return $"SHT{timestamp}{random}";
        }

        private static bool IsValidEmail(string email)
            => new EmailAddressAttribute().IsValid(email);

        private decimal CalculateShippingFee(int addressCount) => 30_000m;

        private decimal CalculateB2BShippingFee(int addressCount) => addressCount * 25_000m;
    }
}
