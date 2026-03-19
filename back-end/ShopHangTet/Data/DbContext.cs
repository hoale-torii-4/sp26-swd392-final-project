using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Storage;
using ShopHangTet.Models;

namespace ShopHangTet.Data
{
    public class ShopHangTetDbContext : DbContext
{
    public ShopHangTetDbContext(DbContextOptions<ShopHangTetDbContext> options)
        : base(options)
    {
        this.Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    // User & Authentication
    public DbSet<UserModel> Users { get; set; }
    public DbSet<Address> Addresses { get; set; }

    // Products & Collections
    public DbSet<Collection> Collections { get; set; }
    public DbSet<GiftBox> GiftBoxes { get; set; }
    public DbSet<Item> Items { get; set; }
    public DbSet<Tag> Tags { get; set; }

    // Cart & Mix & Match
    public DbSet<Cart> Carts { get; set; }
    public DbSet<CartItem> CartItems { get; set; }
    public DbSet<CustomBox> CustomBoxes { get; set; }

    // Orders
    public DbSet<OrderModel> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<OrderDelivery> OrderDeliveries { get; set; }
    public DbSet<OrderDeliveryItem> OrderDeliveryItems { get; set; }

    // Inventory
    public DbSet<InventoryLog> InventoryLogs { get; set; }

    // Support & Reviews
    public DbSet<Review> Reviews { get; set; }
    public DbSet<ChatSession> ChatSessions { get; set; }
    public DbSet<ChatMessage> ChatMessages { get; set; }
    public DbSet<SystemConfig> SystemConfigs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Main entities
        modelBuilder.Entity<UserModel>();
        modelBuilder.Entity<Address>();

        modelBuilder.Entity<Collection>();
        modelBuilder.Entity<GiftBox>();
        modelBuilder.Entity<Item>();
        modelBuilder.Entity<Tag>();

        modelBuilder.Entity<Cart>();
        modelBuilder.Entity<CartItem>();
        modelBuilder.Entity<CustomBox>();

        modelBuilder.Entity<OrderModel>();
        modelBuilder.Entity<OrderItem>().HasKey(x => x.Id);
        modelBuilder.Entity<OrderDelivery>();
        modelBuilder.Entity<OrderDeliveryItem>();

        modelBuilder.Entity<InventoryLog>();

        modelBuilder.Entity<Review>();
        modelBuilder.Entity<ChatSession>();
        modelBuilder.Entity<ChatMessage>();
        modelBuilder.Entity<SystemConfig>()
            .HasIndex(x => x.ConfigKey)
            .IsUnique();

        // Owned collections for embedded items
        modelBuilder.Entity<GiftBox>().OwnsMany(x => x.Items);
        modelBuilder.Entity<CustomBox>().OwnsMany(x => x.Items);

    }
}
}
