using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using ShopHangTet.Data;
using ShopHangTet.DTOs;
using ShopHangTet.Models;
using ShopHangTet.Services;
using Xunit;

namespace ShopHangTet.Tests
{
    public class DatabaseIntegrationTests
    {
        private const string MongoConnectionString = "mongodb://localhost:27017";

        private static ShopHangTetDbContext CreateContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ShopHangTetDbContext>()
                .UseMongoDB(MongoConnectionString, dbName)
                .Options;

            return new ShopHangTetDbContext(options);
        }

        private static OrderService CreateOrderService(ShopHangTetDbContext context, IMongoDatabase db)
        {
            var loggerFactory = LoggerFactory.Create(builder => builder.AddDebug().SetMinimumLevel(LogLevel.Warning));
            return new OrderService(context, loggerFactory.CreateLogger<OrderService>(), db);
        }

        private static async Task<bool> CanConnectMongoAsync(IMongoClient client)
        {
            try
            {
                await client.GetDatabase("admin").RunCommandAsync<BsonDocument>(new BsonDocument("ping", 1));
                return true;
            }
            catch
            {
                return false;
            }
        }

        [Fact]
        public async Task Concurrency_StockOne_TwoOrders_OnlyOneShouldSucceed()
        {
            var client = new MongoClient(MongoConnectionString);
            if (!await CanConnectMongoAsync(client))
            {
                return;
            }

            var dbName = $"ShopHangTet_Test_{Guid.NewGuid():N}";
            var db = client.GetDatabase(dbName);

            try
            {
                var itemId = ObjectId.GenerateNewId().ToString();
                var giftBoxId = ObjectId.GenerateNewId().ToString();

                await db.GetCollection<Item>("Items").InsertOneAsync(new Item
                {
                    Id = itemId,
                    Name = "Test Item",
                    Category = ItemCategory.FOOD,
                    Price = 100000,
                    StockQuantity = 1,
                    ReservedQuantity = 0,
                    IsActive = true,
                    Images = new List<string>()
                });

                await db.GetCollection<GiftBox>("GiftBoxes").InsertOneAsync(new GiftBox
                {
                    Id = giftBoxId,
                    Name = "Test GiftBox",
                    Description = "",
                    Price = 120000,
                    CollectionId = ObjectId.GenerateNewId().ToString(),
                    Items = new List<GiftBoxItem>
                    {
                        new GiftBoxItem { ItemId = itemId, Quantity = 1, ItemPriceSnapshot = 100000 }
                    },
                    Images = new List<string>(),
                    Tags = new List<string>(),
                    IsActive = true
                });

                var dto = new CreateOrderB2CDto
                {
                    CustomerEmail = "load@test.com",
                    CustomerName = "Concurrent Test",
                    CustomerPhone = "0909123456",
                    ReceiverName = "Receiver",
                    ReceiverPhone = "0912345678",
                    DeliveryAddress = "Test Address",
                    DeliveryDate = DateTime.UtcNow.Date.AddDays(1),
                    Items = new List<OrderItemDto>
                    {
                        new OrderItemDto { Type = OrderItemType.READY_MADE, Id = giftBoxId, Quantity = 1 }
                    }
                };

                async Task<bool> PlaceAsync()
                {
                    await using var ctx = CreateContext(dbName);
                    var service = CreateOrderService(ctx, db);
                    try
                    {
                        await service.PlaceB2COrderAsync(dto);
                        return true;
                    }
                    catch
                    {
                        return false;
                    }
                }

                var results = await Task.WhenAll(PlaceAsync(), PlaceAsync());
                Assert.Equal(1, results.Count(x => x));
            }
            finally
            {
                await client.DropDatabaseAsync(dbName);
            }
        }

        [Fact]
        public async Task ConfirmPayment_DuplicateWebhook_DeductOnlyOnce()
        {
            var client = new MongoClient(MongoConnectionString);
            if (!await CanConnectMongoAsync(client))
            {
                return;
            }

            var dbName = $"ShopHangTet_Test_{Guid.NewGuid():N}";
            var db = client.GetDatabase(dbName);

            try
            {
                var itemId = ObjectId.GenerateNewId().ToString();
                var giftBoxId = ObjectId.GenerateNewId().ToString();

                await db.GetCollection<Item>("Items").InsertOneAsync(new Item
                {
                    Id = itemId,
                    Name = "Webhook Item",
                    Category = ItemCategory.FOOD,
                    Price = 100000,
                    StockQuantity = 5,
                    ReservedQuantity = 0,
                    IsActive = true,
                    Images = new List<string>()
                });

                await db.GetCollection<GiftBox>("GiftBoxes").InsertOneAsync(new GiftBox
                {
                    Id = giftBoxId,
                    Name = "Webhook GiftBox",
                    Description = "",
                    Price = 120000,
                    CollectionId = ObjectId.GenerateNewId().ToString(),
                    Items = new List<GiftBoxItem>
                    {
                        new GiftBoxItem { ItemId = itemId, Quantity = 1, ItemPriceSnapshot = 100000 }
                    },
                    Images = new List<string>(),
                    Tags = new List<string>(),
                    IsActive = true
                });

                await using var ctx = CreateContext(dbName);
                var service = CreateOrderService(ctx, db);

                // Tạo order qua flow thật để reserve được xử lý đúng
                var createdOrder = await service.PlaceB2COrderAsync(new CreateOrderB2CDto
                {
                    UserId = null,
                    CustomerEmail = "payment@test.com",
                    CustomerName = "Payment Test",
                    CustomerPhone = "0909000000",
                    ReceiverName = "Receiver",
                    ReceiverPhone = "0912345678",
                    DeliveryAddress = "Address",
                    GreetingMessage = null,
                    GreetingCardUrl = null,
                    DeliveryDate = DateTime.UtcNow.AddDays(1),
                    Items = new List<OrderItemDto>
                    {
                        new OrderItemDto
                        {
                            Type = OrderItemType.READY_MADE,
                            Id = giftBoxId,
                            Quantity = 1
                        }
                    }
                });

                var afterReserve = await db.GetCollection<Item>("Items").Find(x => x.Id == itemId).FirstOrDefaultAsync();
                Assert.NotNull(afterReserve);
                Assert.Equal(1, afterReserve!.ReservedQuantity);

                var first = await service.ConfirmPaymentAsync(createdOrder.OrderCode, createdOrder.TotalAmount);
                var second = await service.ConfirmPaymentAsync(createdOrder.OrderCode, createdOrder.TotalAmount);
                var third = await service.ConfirmPaymentAsync(createdOrder.OrderCode, createdOrder.TotalAmount);

                Assert.True(first);
                Assert.True(second);
                Assert.True(third);

                var updatedItem = await db.GetCollection<Item>("Items").Find(x => x.Id == itemId).FirstOrDefaultAsync();
                Assert.NotNull(updatedItem);
                Assert.Equal(4, updatedItem!.StockQuantity);
                Assert.Equal(0, updatedItem.ReservedQuantity);
            }
            finally
            {
                await client.DropDatabaseAsync(dbName);
            }
        }

        [Fact]
        public async Task ConfirmPayment_ExpiredOrder_ShouldMarkExpired()
        {
            var client = new MongoClient(MongoConnectionString);
            if (!await CanConnectMongoAsync(client))
            {
                return;
            }

            var dbName = $"ShopHangTet_Test_{Guid.NewGuid():N}";
            var db = client.GetDatabase(dbName);

            try
            {
                await db.GetCollection<OrderModel>("Orders").InsertOneAsync(new OrderModel
                {
                    Id = ObjectId.GenerateNewId(),
                    OrderCode = "SHTEXPIRED01",
                    OrderType = OrderType.B2C,
                    CustomerEmail = "expired@test.com",
                    CustomerName = "Expired Test",
                    CustomerPhone = "0909000000",
                    DeliveryDate = DateTime.UtcNow.AddDays(1),
                    Status = OrderStatus.PAYMENT_CONFIRMING,
                    SubTotal = 100000,
                    ShippingFee = 30000,
                    TotalAmount = 130000,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-11),
                    UpdatedAt = DateTime.UtcNow.AddMinutes(-11),
                    Items = new List<OrderItem>(),
                    StatusHistory = new List<OrderStatusHistory>()
                });

                await using var ctx = CreateContext(dbName);
                var service = CreateOrderService(ctx, db);

                var result = await service.ConfirmPaymentAsync("SHTEXPIRED01", 130000);
                Assert.False(result);

                var order = await db.GetCollection<OrderModel>("Orders").Find(x => x.OrderCode == "SHTEXPIRED01").FirstOrDefaultAsync();
                Assert.NotNull(order);
                Assert.Equal(OrderStatus.PAYMENT_EXPIRED_INTERNAL, order!.Status);
            }
            finally
            {
                await client.DropDatabaseAsync(dbName);
            }
        }
    }
}