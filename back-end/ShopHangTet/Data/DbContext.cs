using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Storage;
using ShopHangTet.Models;

public class ShopHangTetDbContext : DbContext
{
    public ShopHangTetDbContext(DbContextOptions<ShopHangTetDbContext> options)
        : base(options)
    {
        this.Database.AutoTransactionBehavior = AutoTransactionBehavior.Never;
    }

    // Khai báo các Collection
    public DbSet<Product> Products { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Chỉ định tên Collection
        modelBuilder.Entity<Product>();
        modelBuilder.Entity<Order>();
        modelBuilder.Entity<User>();
    }
}