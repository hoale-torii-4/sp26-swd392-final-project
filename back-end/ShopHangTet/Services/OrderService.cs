using ShopHangTet.Interfaces;
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

        /// Đặt hàng B2C (Guest hoặc Member) - 1 địa chỉ
        public async Task<OrderModel> PlaceB2COrderAsync(CreateOrderDto dto)
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
                var orderItems = await BuildOrderItemsAsync(dto.Items);
                var totalQuantity = orderItems.Sum(x => x.Quantity);

                var deliveryAddress = MapDeliveryAddress(dto.DeliveryAddresses.Single(), totalQuantity);
                var deliveryAddresses = new List<DeliveryAddress> { deliveryAddress };

                var order = new OrderModel
                {
                    Id = ObjectId.GenerateNewId(),
                    OrderCode = GenerateOrderCode(),
                    UserId = string.IsNullOrEmpty(dto.UserId) ? null : ObjectId.Parse(dto.UserId),
                    CustomerName = dto.CustomerName,
                    CustomerEmail = dto.CustomerEmail,
                    CustomerPhone = dto.CustomerPhone,
                    Items = orderItems,
                    DeliveryAddresses = deliveryAddresses,
                    DeliveryDate = dto.DeliveryDate,
                    DeliverySlotId = string.IsNullOrEmpty(dto.DeliverySlotId) ? null : ObjectId.Parse(dto.DeliverySlotId),
                    GreetingMessage = dto.GreetingMessage,
                    GreetingCardUrl = dto.GreetingCardUrl,
                    SubTotal = orderItems.Sum(x => x.TotalPrice),
                    ShippingFee = CalculateShippingFee(deliveryAddresses),
                    Status = Models.OrderStatus.PAYMENT_CONFIRMING,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                order.TotalAmount = order.SubTotal + order.ShippingFee;
                order.StatusHistory.Add(new Models.OrderStatusHistory
                {
                    Status = Models.OrderStatus.PAYMENT_CONFIRMING,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "System",
                    Notes = "Đơn hàng được tạo - Đang xác nhận thanh toán"
                });

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Order created: {order.OrderCode}");
                return order;
            }
            catch
            {
                await RollbackSlotAsync(dto.DeliverySlotId);
                throw;
            }
        }

        /// Đặt hàng B2B (Chỉ Member - nhiều địa chỉ)
        public async Task<OrderModel> PlaceB2BOrderAsync(CreateOrderDto dto)
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
                var orderItems = await BuildOrderItemsAsync(dto.Items);
                var addressIds = dto.DeliveryAddresses.Select(x => x.AddressId!).ToList();
                var addresses = await _context.Addresses
                    .Where(x => addressIds.Contains(x.Id) && x.UserId == dto.UserId)
                    .ToListAsync();

                var addressMap = addresses.ToDictionary(x => x.Id, x => x);
                var deliveryAddresses = dto.DeliveryAddresses
                    .Select(x => MapDeliveryAddressFromAddress(addressMap[x.AddressId!], x))
                    .ToList();

                var order = new OrderModel
                {
                    Id = ObjectId.GenerateNewId(),
                    OrderCode = GenerateOrderCode(),
                    UserId = ObjectId.Parse(dto.UserId!),
                    CustomerName = dto.CustomerName,
                    CustomerEmail = dto.CustomerEmail,
                    CustomerPhone = dto.CustomerPhone,
                    Items = orderItems,
                    DeliveryAddresses = deliveryAddresses,
                    DeliveryDate = dto.DeliveryDate,
                    DeliverySlotId = string.IsNullOrEmpty(dto.DeliverySlotId) ? null : ObjectId.Parse(dto.DeliverySlotId),
                    GreetingMessage = dto.GreetingMessage,
                    GreetingCardUrl = dto.GreetingCardUrl,
                    SubTotal = orderItems.Sum(x => x.TotalPrice),
                    ShippingFee = CalculateShippingFee(deliveryAddresses),
                    Status = Models.OrderStatus.PAYMENT_CONFIRMING,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                order.TotalAmount = order.SubTotal + order.ShippingFee;
                order.StatusHistory.Add(new Models.OrderStatusHistory
                {
                    Status = Models.OrderStatus.PAYMENT_CONFIRMING,
                    Timestamp = DateTime.UtcNow,
                    UpdatedBy = "System",
                    Notes = "Đơn hàng được tạo - Đang xác nhận thanh toán"
                });

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Order created: {order.OrderCode}");
                return order;
            }
            catch
            {
                await RollbackSlotAsync(dto.DeliverySlotId);
                throw;
            }
        }

        /// Validate đơn hàng B2C trước khi tạo
        public async Task<OrderValidationResult> ValidateB2COrderAsync(CreateOrderDto dto)
        {
            var result = new OrderValidationResult { IsValid = true };

            if (!IsValidEmail(dto.CustomerEmail))
            {
                result.Errors.Add("Email không hợp lệ");
                result.IsValid = false;
            }

            if (string.IsNullOrWhiteSpace(dto.CustomerName))
            {
                result.Errors.Add("Tên khách hàng là bắt buộc");
                result.IsValid = false;
            }

            ValidateOrderItems(dto, result);

            if (dto.DeliveryAddresses == null || dto.DeliveryAddresses.Count != 1)
            {
                result.Errors.Add("Đơn hàng B2C phải có đúng 1 địa chỉ giao hàng");
                result.IsValid = false;
            }

            if (dto.DeliveryDate == default)
            {
                result.Errors.Add("Ngày giao hàng là bắt buộc");
                result.IsValid = false;
            }

            if (!string.IsNullOrEmpty(dto.DeliverySlotId) && !ObjectId.TryParse(dto.DeliverySlotId, out _))
            {
                result.Errors.Add("DeliverySlotId không hợp lệ");
                result.IsValid = false;
            }

            return await Task.FromResult(result);
        }

        /// Validate đơn hàng B2B trước khi tạo
        public async Task<OrderValidationResult> ValidateB2BOrderAsync(CreateOrderDto dto)
        {
            var result = new OrderValidationResult { IsValid = true };

            if (string.IsNullOrEmpty(dto.UserId))
            {
                result.Errors.Add("Đơn hàng B2B yêu cầu đăng nhập");
                result.IsValid = false;
            }

            if (!IsValidEmail(dto.CustomerEmail))
            {
                result.Errors.Add("Email không hợp lệ");
                result.IsValid = false;
            }

            ValidateOrderItems(dto, result);

            if (dto.DeliveryAddresses == null || !dto.DeliveryAddresses.Any())
            {
                result.Errors.Add("Đơn hàng B2B phải có ít nhất 1 địa chỉ giao hàng");
                result.IsValid = false;
            }
            else
            {
                if (dto.DeliveryAddresses.Any(x => x.Quantity <= 0))
                {
                    result.Errors.Add("Số lượng cho từng địa chỉ phải lớn hơn 0");
                    result.IsValid = false;
                }
            }

            if (dto.DeliveryDate == default)
            {
                result.Errors.Add("Ngày giao hàng là bắt buộc");
                result.IsValid = false;
            }

            if (!string.IsNullOrEmpty(dto.DeliverySlotId) && !ObjectId.TryParse(dto.DeliverySlotId, out _))
            {
                result.Errors.Add("DeliverySlotId không hợp lệ");
                result.IsValid = false;
            }

            if (result.IsValid)
            {
                var orderItems = dto.Items ?? new List<OrderItemRequestDto>();
                var totalItemQuantity = orderItems.Sum(x => x.Quantity);
                var deliveryAddresses = dto.DeliveryAddresses ?? new List<DeliveryAddressRequestDto>();
                var totalAddressQuantity = deliveryAddresses.Sum(x => x.Quantity);
                if (totalItemQuantity != totalAddressQuantity)
                {
                    result.Errors.Add("Tổng số lượng địa chỉ phải bằng tổng số lượng sản phẩm");
                    result.IsValid = false;
                }

                var addressIds = deliveryAddresses.Select(x => x.AddressId).Where(x => !string.IsNullOrEmpty(x)).ToList();
                if (addressIds.Count != deliveryAddresses.Count)
                {
                    result.Errors.Add("B2B yêu cầu AddressId cho từng địa chỉ giao hàng");
                    result.IsValid = false;
                }
                else
                {
                    var addresses = await _context.Addresses
                        .Where(x => addressIds.Contains(x.Id) && x.UserId == dto.UserId)
                        .ToListAsync();

                    if (addresses.Count != addressIds.Count)
                    {
                        result.Errors.Add("Một hoặc nhiều địa chỉ không tồn tại hoặc không thuộc user");
                        result.IsValid = false;
                    }
                }
            }

            return result;
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

        /// <summary>
        /// Cập nhật trạng thái đơn hàng và trừ kho khi chuyển sang PREPARING
        /// </summary>
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
                await ApplyInventoryOnPreparingAsync(order, updatedBy);
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

        #region Helper Methods

        private string GenerateOrderCode()
        {
            var timestamp = DateTime.UtcNow.ToString("yyMMdd");
            var random = new Random().Next(1000, 9999);
            return $"SHT{timestamp}{random}";
        }

        private async Task<List<Models.OrderItem>> BuildOrderItemsAsync(List<OrderItemRequestDto> items)
        {
            var result = new List<Models.OrderItem>();

            foreach (var dto in items)
            {
                if (dto.Type == OrderItemType.READY_MADE)
                {
                    var giftBoxId = dto.GiftBoxId ?? throw new InvalidOperationException("GiftBoxId is required for READY_MADE");
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == giftBoxId);
                    if (giftBox == null)
                    {
                        throw new InvalidOperationException("GiftBox not found");
                    }

                    var snapshotItems = await BuildGiftBoxSnapshotItemsAsync(giftBox);
                    var unitPrice = giftBox.Price;

                    result.Add(new Models.OrderItem
                    {
                        ProductName = giftBox.Name,
                        Type = OrderItemType.READY_MADE,
                        Quantity = dto.Quantity,
                        UnitPrice = unitPrice,
                        TotalPrice = unitPrice * dto.Quantity,
                        GiftBoxId = ObjectId.Parse(giftBoxId),
                        SnapshotItems = snapshotItems
                    });
                }
                else if (dto.Type == OrderItemType.MIX_MATCH)
                {
                    var customBoxId = dto.CustomBoxId ?? throw new InvalidOperationException("CustomBoxId is required for MIX_MATCH");
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == customBoxId);
                    if (customBox == null)
                    {
                        throw new InvalidOperationException("CustomBox not found");
                    }

                    var snapshotItems = await BuildCustomBoxSnapshotItemsAsync(customBox);
                    var unitPrice = customBox.TotalPrice;

                    result.Add(new Models.OrderItem
                    {
                        ProductName = "Custom Mix & Match Box",
                        Type = OrderItemType.MIX_MATCH,
                        Quantity = dto.Quantity,
                        UnitPrice = unitPrice,
                        TotalPrice = unitPrice * dto.Quantity,
                        CustomBoxId = ObjectId.Parse(customBoxId),
                        SnapshotItems = snapshotItems
                    });
                }
            }

            return result;
        }

        private DeliveryAddress MapDeliveryAddress(DeliveryAddressRequestDto dto, int quantity)
        {
            return new DeliveryAddress
            {
                RecipientName = dto.RecipientName,
                RecipientPhone = dto.RecipientPhone,
                AddressLine = dto.AddressLine,
                Ward = dto.Ward,
                District = dto.District,
                City = dto.City,
                Notes = dto.Notes,
                Quantity = quantity,
                GreetingMessage = dto.GreetingMessage,
                HideInvoice = dto.HideInvoice
            };
        }

        private DeliveryAddress MapDeliveryAddressFromAddress(Address address, DeliveryAddressRequestDto dto)
        {
            return new DeliveryAddress
            {
                AddressId = address.Id,
                RecipientName = address.ReceiverName,
                RecipientPhone = address.ReceiverPhone,
                AddressLine = address.FullAddress,
                Ward = string.Empty,
                District = string.Empty,
                City = string.Empty,
                Notes = string.Empty,
                Quantity = dto.Quantity,
                GreetingMessage = dto.GreetingMessage,
                HideInvoice = dto.HideInvoice
            };
        }

        private decimal CalculateShippingFee(List<DeliveryAddress> addresses)
        {
            if (addresses == null || !addresses.Any())
                return 0;

            // Simple logic: 30k per address
            return addresses.Count * 30000;
        }

        private async Task ApplyInventoryOnPreparingAsync(OrderModel order, string updatedBy)
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

        private void ValidateOrderItems(CreateOrderDto dto, OrderValidationResult result)
        {
            if (dto.Items == null || !dto.Items.Any())
            {
                result.Errors.Add("Đơn hàng phải có ít nhất 1 sản phẩm");
                result.IsValid = false;
                return;
            }

            foreach (var item in dto.Items)
            {
                if (item.Quantity <= 0)
                {
                    result.Errors.Add("Số lượng sản phẩm phải lớn hơn 0");
                    result.IsValid = false;
                }

                if (item.Type == OrderItemType.READY_MADE && string.IsNullOrEmpty(item.GiftBoxId))
                {
                    result.Errors.Add("GiftBoxId là bắt buộc cho sản phẩm READY_MADE");
                    result.IsValid = false;
                }

                if (item.Type == OrderItemType.MIX_MATCH && string.IsNullOrEmpty(item.CustomBoxId))
                {
                    result.Errors.Add("CustomBoxId là bắt buộc cho sản phẩm MIX_MATCH");
                    result.IsValid = false;
                }
            }
        }

        private static bool IsValidEmail(string email)
        {
            var validator = new EmailAddressAttribute();
            return validator.IsValid(email);
        }

        private bool IsValidStatusTransition(OrderStatus currentStatus, OrderStatus nextStatus)
        {
            return (currentStatus == OrderStatus.PAYMENT_CONFIRMING && nextStatus == OrderStatus.PREPARING)
                   || (currentStatus == OrderStatus.PREPARING && nextStatus == OrderStatus.SHIPPING)
                   || (currentStatus == OrderStatus.SHIPPING && nextStatus == OrderStatus.COMPLETED);
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
                    UnitPrice = item?.Price ?? 0
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

        private async Task DeductItemStockAsync(string itemId, int quantity, string orderId, string updatedBy)
        {
            if (quantity <= 0) return;

            var item = await _context.Items.FirstOrDefaultAsync(x => x.Id == itemId);
            if (item == null) return;

            var previousStock = item.StockQuantity;
            var newStock = previousStock - quantity;

            item.StockQuantity = newStock;

            _context.InventoryLogs.Add(new InventoryLog
            {
                ProductId = itemId,
                ProductType = "ITEM",
                ChangeType = "ORDER",
                Quantity = -quantity,
                PreviousStock = previousStock,
                NewStock = newStock,
                OrderId = orderId,
                UpdatedBy = updatedBy,
                Notes = "Deducted when order moved to PREPARING",
                CreatedAt = DateTime.UtcNow
            });
        }

        #endregion
    }
}
