namespace ShopHangTet.Models;

public enum OrderStatus
{
    PAYMENT_CONFIRMING,
    PAYMENT_EXPIRED_INTERNAL, // Internal only — không expose ra ngoài cho Staff set thủ công
    PREPARING,
    SHIPPING,
    PARTIAL_DELIVERY,   // Internal only — tự động aggregate từ B2B deliveries
    DELIVERY_FAILED,    // Internal only — tự động aggregate từ B2B deliveries
    COMPLETED,
    CANCELLED
}

/// Các trạng thái Staff được phép set thủ công (4 trạng thái chính theo nghiệp vụ)
public static class AllowedStaffTransitions
{
    private static readonly HashSet<(OrderStatus From, OrderStatus To)> _allowed = new()
    {
        (OrderStatus.PAYMENT_CONFIRMING, OrderStatus.PREPARING),   // Staff xác nhận thanh toán
        (OrderStatus.PAYMENT_CONFIRMING, OrderStatus.CANCELLED),   // Hủy khi chưa thanh toán
        (OrderStatus.PREPARING,          OrderStatus.SHIPPING),    // Bắt đầu giao
        (OrderStatus.PREPARING,          OrderStatus.CANCELLED),   // Hủy khi đang chuẩn bị
        (OrderStatus.SHIPPING,           OrderStatus.COMPLETED),   // Giao thành công (B2C)
        (OrderStatus.SHIPPING,           OrderStatus.CANCELLED),   // Hủy khi đang giao
    };

    public static bool IsAllowed(OrderStatus from, OrderStatus to) =>
        _allowed.Contains((from, to));
}

public enum OrderType
{
    B2C,
    B2B
}

public enum OrderItemType
{
    READY_MADE,
    MIX_MATCH
}

/// Item Category Enum cho Mix & Match validation
/// SAVORY = nhóm đặc sản mặn (Khô gà, Khô bò, Chà bông, Lạp xưởng)
public enum ItemCategory
{
    DRINK,
    FOOD,
    NUT,
    ALCOHOL,
    SAVORY  // ← MỚI: thay thế hardcode tên sản phẩm trong ValidateMixMatchRulesAsync
}

public enum UserRole
{
    MEMBER,
    STAFF,
    ADMIN
}

public enum UserStatus
{
    ACTIVE,
    DISABLED
}
