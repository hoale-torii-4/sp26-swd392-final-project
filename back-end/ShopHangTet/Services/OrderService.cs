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

        private string GenerateOrderCode()
        {
            var timestamp = DateTime.UtcNow.ToString("yyMMdd");
            var random = new Random().Next(1000, 9999);
            return $"SHT{timestamp}{random}";
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