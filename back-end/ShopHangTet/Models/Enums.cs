namespace ShopHangTet.Models;

public enum OrderStatus
{
    PAYMENT_CONFIRMING,
    PAYMENT_EXPIRED_INTERNAL,
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

/// Item Category Enum for Mix & Match validation
public enum ItemCategory
{
    DRINK,
    FOOD, 
    NUT,
    ALCOHOL
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
