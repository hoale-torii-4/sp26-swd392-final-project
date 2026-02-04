namespace ShopHangTet.Models;

public enum OrderStatus
{
    PAYMENT_CONFIRMING,
    PREPARING,
    SHIPPING,
    COMPLETED
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
