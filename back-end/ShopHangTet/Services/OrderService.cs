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

        public async Task<bool> ConfirmPaymentAsync(string orderCode, string updatedBy, string? paymentRef = null)
        {
            if (string.IsNullOrWhiteSpace(orderCode))
            {
                throw new InvalidOperationException("Order code is required");
            }

            var now = DateTime.UtcNow;
            var note = string.IsNullOrWhiteSpace(paymentRef)
                ? "Payment confirmed by webhook"
                : $"Payment confirmed by webhook. Ref: {paymentRef}";

            // Atomic idempotency lock: only transition PAYMENT_CONFIRMING -> PROCESSING_PAYMENT once.
            var filter = Builders<OrderModel>.Filter.And(
                Builders<OrderModel>.Filter.Eq(x => x.OrderCode, orderCode),
                Builders<OrderModel>.Filter.Eq(x => x.Status, OrderStatus.PAYMENT_CONFIRMING)
            );

            var update = Builders<OrderModel>.Update
                .Set(x => x.Status, OrderStatus.PROCESSING_PAYMENT)
                .Set(x => x.UpdatedAt, now)
                .Push(x => x.StatusHistory, new OrderStatusHistory
                {
                    Status = OrderStatus.PROCESSING_PAYMENT,
                    Timestamp = now,
                    UpdatedBy = updatedBy,
                    Notes = note
                });

            var transitionResult = await _orderCollection.UpdateOneAsync(filter, update);
            if (transitionResult.ModifiedCount == 0)
            {
                _logger.LogInformation("Duplicate or stale payment webhook ignored for {OrderCode}", orderCode);
                return false;
            }

            var order = await _context.Orders.FirstOrDefaultAsync(x => x.OrderCode == orderCode);
            if (order == null)
            {
                throw new InvalidOperationException("Order not found after status transition");
            }

            try
            {
                await ApplyInventoryOnPreparingAsync(order, updatedBy);
                await _context.SaveChangesAsync();

                var finalFilter = Builders<OrderModel>.Filter.And(
                    Builders<OrderModel>.Filter.Eq(x => x.OrderCode, orderCode),
                    Builders<OrderModel>.Filter.Eq(x => x.Status, OrderStatus.PROCESSING_PAYMENT)
                );

                var finalUpdate = Builders<OrderModel>.Update
                    .Set(x => x.Status, OrderStatus.PREPARING)
                    .Set(x => x.UpdatedAt, DateTime.UtcNow)
                    .Push(x => x.StatusHistory, new OrderStatusHistory
                    {
                        Status = OrderStatus.PREPARING,
                        Timestamp = DateTime.UtcNow,
                        UpdatedBy = updatedBy,
                        Notes = "Payment confirmed and inventory deducted"
                    });

                var finalResult = await _orderCollection.UpdateOneAsync(finalFilter, finalUpdate);
                if (finalResult.ModifiedCount == 0)
                {
                    throw new InvalidOperationException("Failed to finalize payment status transition");
                }

                return true;
            }
            catch
            {
                // Compensation: reset to PAYMENT_CONFIRMING so webhook can be retried safely.
                var rollbackFilter = Builders<OrderModel>.Filter.And(
                    Builders<OrderModel>.Filter.Eq(x => x.OrderCode, orderCode),
                    Builders<OrderModel>.Filter.Eq(x => x.Status, OrderStatus.PROCESSING_PAYMENT)
                );

                var rollbackUpdate = Builders<OrderModel>.Update
                    .Set(x => x.Status, OrderStatus.PAYMENT_CONFIRMING)
                    .Set(x => x.UpdatedAt, DateTime.UtcNow)
                    .Push(x => x.StatusHistory, new OrderStatusHistory
                    {
                        Status = OrderStatus.PAYMENT_CONFIRMING,
                        Timestamp = DateTime.UtcNow,
                        UpdatedBy = "System",
                        Notes = "Rollback payment confirmation due to inventory update failure"
                    });

                await _orderCollection.UpdateOneAsync(rollbackFilter, rollbackUpdate);
                throw;
            }
        }

        private string GenerateOrderCode()
        {
            var datePart = DateTime.UtcNow.ToString("yyMMdd");
            var randomPart = RandomNumberGenerator.GetInt32(1000, 10000);
            return $"SHT{datePart}{randomPart}";
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

        private static bool IsValidEmail(string email)
        {
            var validator = new EmailAddressAttribute();
            return validator.IsValid(email);
        }

        private bool IsValidStatusTransition(OrderStatus currentStatus, OrderStatus nextStatus)
        {
            return (currentStatus == OrderStatus.PAYMENT_CONFIRMING && nextStatus == OrderStatus.PREPARING)
                   || (currentStatus == OrderStatus.PAYMENT_CONFIRMING && nextStatus == OrderStatus.PROCESSING_PAYMENT)
                   || (currentStatus == OrderStatus.PROCESSING_PAYMENT && nextStatus == OrderStatus.PREPARING)
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

            if (item.StockQuantity < quantity)
            {
                throw new InvalidOperationException($"Insufficient stock for item {item.Name}");
            }

            // Deduct stock
            item.StockQuantity -= quantity;

            //Chỉ log DEDUCT khi Order chuyển sang PREPARING
            _context.InventoryLogs.Add(new InventoryLog
            {
                OrderId = orderId,
                ItemId = itemId,
                Quantity = -quantity, // Âm cho DEDUCT
                Action = "DEDUCT",
                CreatedAt = DateTime.UtcNow
            });
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
                    ShippingFee = CalculateShippingFee(1),
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
        public async Task<OrderModel> PlaceB2BOrderAsync(CreateOrderB2BDto dto, string userId)
        {
            var validation = await ValidateB2BOrderAsync(dto, userId);
            if (!validation.IsValid)
            {
                throw new InvalidOperationException(string.Join("; ", validation.Errors));
            }

            _logger.LogInformation($"Creating B2B order for user {userId}");

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
                    .Where(x => addressIds.Contains(x.Id) && x.UserId == userId)
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
                    UserId = ObjectId.Parse(userId),
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

            // Đếm theo category
            result.DrinkCount = customBox.Items.Count(cbi => itemMap.ContainsKey(cbi.ItemId) && itemMap[cbi.ItemId].Category == ItemCategory.DRINK);
            result.FoodCount = customBox.Items.Count(cbi => itemMap.ContainsKey(cbi.ItemId) && itemMap[cbi.ItemId].Category == ItemCategory.FOOD);
            result.NutCount = customBox.Items.Count(cbi => itemMap.ContainsKey(cbi.ItemId) && itemMap[cbi.ItemId].Category == ItemCategory.NUT);
            result.AlcoholCount = customBox.Items.Count(cbi => itemMap.ContainsKey(cbi.ItemId) && itemMap[cbi.ItemId].Category == ItemCategory.ALCOHOL);

            //Rules: ≥1 DRINK, 2-4 FOOD, ≤1 ALCOHOL
            if (result.DrinkCount < 1)
            {
                result.Errors.Add("Mix & Match phải có ít nhất 1 đồ uống");
                result.IsValid = false;
            }

            if (result.FoodCount < 2)
            {
                result.Errors.Add("Mix & Match phải có ít nhất 2 món ăn");
                result.IsValid = false;
            }
            else if (result.FoodCount > 4)
            {
                result.Errors.Add("Mix & Match không được có quá 4 món ăn");
                result.IsValid = false;
            }

            if (result.AlcoholCount > 1)
            {
                result.Errors.Add("Mix & Match không được có quá 1 rượu");
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

            await ValidateOrderItemsAsync(dto.Items, result);
            await ValidateStockAvailabilityAsync(dto.Items, result);

            result.IsValid = result.Errors.Count == 0;
            return result;
        }

        public async Task<OrderValidationResult> ValidateB2BOrderAsync(CreateOrderB2BDto dto, string userId)
        {
            var result = new OrderValidationResult { IsValid = true };

            if (string.IsNullOrWhiteSpace(userId))
                result.Errors.Add("B2B requires login - UserId is required");

            if (dto.DeliveryAllocations.Count == 0)
                result.Errors.Add("At least one delivery address is required for B2B");

            await ValidateOrderItemsAsync(dto.Items, result);
            await ValidateStockAvailabilityAsync(dto.Items, result);

            result.IsValid = result.Errors.Count == 0;
            return result;
        }

        private async Task ValidateStockAvailabilityAsync(List<OrderItemDto> items, OrderValidationResult result)
        {
            var requiredByItemId = new Dictionary<string, int>();

            foreach (var orderItem in items)
            {
                if (orderItem.Quantity <= 0) continue;

                if (orderItem.Type == OrderItemType.READY_MADE && !string.IsNullOrWhiteSpace(orderItem.GiftBoxId))
                {
                    var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == orderItem.GiftBoxId && x.IsActive);
                    if (giftBox == null) continue;

                    foreach (var giftBoxItem in giftBox.Items)
                    {
                        var requiredQty = giftBoxItem.Quantity * orderItem.Quantity;
                        if (requiredByItemId.ContainsKey(giftBoxItem.ItemId))
                        {
                            requiredByItemId[giftBoxItem.ItemId] += requiredQty;
                        }
                        else
                        {
                            requiredByItemId[giftBoxItem.ItemId] = requiredQty;
                        }
                    }
                }
                else if (orderItem.Type == OrderItemType.MIX_MATCH && !string.IsNullOrWhiteSpace(orderItem.CustomBoxId))
                {
                    var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == orderItem.CustomBoxId);
                    if (customBox == null) continue;

                    foreach (var customItem in customBox.Items)
                    {
                        var requiredQty = customItem.Quantity * orderItem.Quantity;
                        if (requiredByItemId.ContainsKey(customItem.ItemId))
                        {
                            requiredByItemId[customItem.ItemId] += requiredQty;
                        }
                        else
                        {
                            requiredByItemId[customItem.ItemId] = requiredQty;
                        }
                    }
                }
            }

            if (!requiredByItemId.Any()) return;

            var requiredItemIds = requiredByItemId.Keys.ToList();
            var dbItems = await _context.Items.Where(x => requiredItemIds.Contains(x.Id)).ToListAsync();
            var itemMap = dbItems.ToDictionary(x => x.Id, x => x);

            foreach (var kvp in requiredByItemId)
            {
                if (!itemMap.TryGetValue(kvp.Key, out var item))
                {
                    result.Errors.Add($"Referenced item not found: {kvp.Key}");
                    continue;
                }

                if (!item.IsActive)
                {
                    result.Errors.Add($"Item is inactive: {item.Name}");
                    continue;
                }

                if (item.StockQuantity < kvp.Value)
                {
                    result.Errors.Add($"Insufficient stock for item {item.Name}. Required: {kvp.Value}, Available: {item.StockQuantity}");
                }
            }
        }

        private async Task ValidateOrderItemsAsync(List<OrderItemDto> items, OrderValidationResult result)
        {
            foreach (var item in items)
            {
                if (!Enum.IsDefined(typeof(OrderItemType), item.Type))
                {
                    result.Errors.Add("Invalid order item type");
                    continue;
                }

                if (item.Quantity <= 0)
                {
                    result.Errors.Add("Quantity must be greater than 0");
                }

                if (item.Type == OrderItemType.READY_MADE)
                {
                    if (string.IsNullOrWhiteSpace(item.GiftBoxId))
                    {
                        result.Errors.Add("GiftBoxId is required for READY_MADE items");
                    }

                    if (!string.IsNullOrWhiteSpace(item.CustomBoxId))
                    {
                        result.Errors.Add("CustomBoxId must be null for READY_MADE items");
                    }

                    if (!string.IsNullOrWhiteSpace(item.GiftBoxId))
                    {
                        var giftBox = await _context.GiftBoxes.FirstOrDefaultAsync(x => x.Id == item.GiftBoxId && x.IsActive);
                        if (giftBox == null)
                        {
                            result.Errors.Add("GiftBox not found or inactive");
                        }
                    }
                }
                else if (item.Type == OrderItemType.MIX_MATCH)
                {
                    if (string.IsNullOrWhiteSpace(item.CustomBoxId))
                    {
                        result.Errors.Add("CustomBoxId is required for MIX_MATCH items");
                    }

                    if (!string.IsNullOrWhiteSpace(item.GiftBoxId))
                    {
                        result.Errors.Add("GiftBoxId must be null for MIX_MATCH items");
                    }

                    if (!string.IsNullOrWhiteSpace(item.CustomBoxId))
                    {
                        var customBox = await _context.CustomBoxes.FirstOrDefaultAsync(x => x.Id == item.CustomBoxId);
                        if (customBox == null)
                        {
                            result.Errors.Add("CustomBox not found");
                        }
                        else
                        {
                            var validation = await ValidateMixMatchRulesAsync(item.CustomBoxId);
                            if (!validation.IsValid)
                            {
                                result.Errors.AddRange(validation.Errors);
                            }
                        }
                    }
                }
            }
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
                        UnitPrice = itemDetail.Price
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