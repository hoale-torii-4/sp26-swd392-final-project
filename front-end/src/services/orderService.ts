// ── Order service — communicates with backend Orders API ──

import apiClient from "./apiClient";

// ─── Enums as const objects (erasableSyntaxOnly compatible) ───

export const OrderStatus = {
    PAYMENT_CONFIRMING: "PAYMENT_CONFIRMING",
    PAYMENT_EXPIRED_INTERNAL: "PAYMENT_EXPIRED_INTERNAL",
    PREPARING: "PREPARING",
    SHIPPING: "SHIPPING",
    PARTIAL_DELIVERY: "PARTIAL_DELIVERY",
    DELIVERY_FAILED: "DELIVERY_FAILED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderType = {
    B2C: "B2C",
    B2B: "B2B",
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderItemType = {
    READY_MADE: 0,
    MIX_MATCH: 1,
} as const;
export type OrderItemType = (typeof OrderItemType)[keyof typeof OrderItemType];

// ─── Request DTOs ───

export interface OrderItemDto {
    Type: OrderItemType;
    GiftBoxId?: string;
    CustomBoxId?: string;
    Quantity: number;
    Price: number;
    Name?: string;
}

/** B2C order — single delivery address (guest or member) */
export interface CreateOrderB2CDto {
    UserId?: string;
    CustomerEmail: string;
    CustomerName: string;
    CustomerPhone: string;
    Items: OrderItemDto[];
    ReceiverName: string;
    ReceiverPhone: string;
    DeliveryAddress: string;
    GreetingMessage?: string;
    GreetingCardUrl?: string;
    DeliveryDate: string; // ISO date
}

/** B2B order — multiple delivery addresses (member only) */
export interface CreateOrderB2BDto {
    UserId: string;
    CustomerEmail: string;
    CustomerName: string;
    CustomerPhone: string;
    Items: OrderItemDto[];
    DeliveryAllocations: B2BDeliveryAllocationDto[];
    GreetingMessage?: string;
    GreetingCardUrl?: string;
    DeliveryDate: string; // ISO date
}

export interface B2BDeliveryAllocationDto {
    AddressId: string;
    ItemAllocations: OrderItemAllocationDto[];
    GreetingMessage?: string;
    HideInvoice: boolean;
}

export interface OrderItemAllocationDto {
    OrderItemIndex: number;
    Quantity: number;
}

// ─── Response DTOs ───

export interface OrderCreatedResponse {
    orderId: string;
    orderCode: string;
    orderType: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    deliveryAddressCount?: number; // B2B only
}

export interface OrderItemResponseDto {
    Id: string;
    Type: OrderItemType;
    GiftBoxId: string | null;
    CustomBoxId: string | null;
    Quantity: number;
    Price: number;
    Name: string | null;
}

export interface DeliveryAddressResponseDto {
    Id: string;
    ReceiverName: string;
    ReceiverPhone: string;
    FullAddress: string;
    Quantity: number;
    GreetingMessage: string | null;
    HideInvoice: boolean;
}

export interface OrderDto {
    Id: string;
    OrderCode: string;
    UserId: string | null;
    Email: string;
    OrderType: OrderType;
    Status: OrderStatus;
    TotalAmount: number;
    DeliveryDate: string;
    GreetingMessage: string | null;
    GreetingCardUrl: string | null;
    CreatedAt: string;
    Items: OrderItemResponseDto[];
    DeliveryAddresses: DeliveryAddressResponseDto[];
}

export interface MixMatchValidationResult {
    IsValid: boolean;
    Errors: string[];
    TotalItemCount: number;
    DrinkCount: number;
    FoodCount: number;
    NutCount: number;
    SnackCount: number;
    SavoryCount: number;
    AlcoholCount: number;
    HasChivas12: boolean;
    HasChivas21: boolean;
    MeetsRules: boolean;
}

// ─── API wrapper type ───

interface ApiResponse<T> {
    Success: boolean;
    Message: string;
    Data: T;
    Errors: string[];
}

// ─── Order API Service ───

const ORDERS = "/Orders";

export const orderService = {
    /**
     * POST /api/Orders/b2c
     * Create a B2C order (single address). Works for guests and members.
     */
    createB2COrder: async (data: CreateOrderB2CDto): Promise<OrderCreatedResponse> => {
        const res = await apiClient.post<ApiResponse<OrderCreatedResponse>>(
            `${ORDERS}/b2c`,
            data,
        );
        return res.data.Data;
    },

    /**
     * POST /api/Orders/b2b
     * Create a B2B order (multi-address). Requires authentication.
     */
    createB2BOrder: async (data: CreateOrderB2BDto): Promise<OrderCreatedResponse> => {
        const res = await apiClient.post<ApiResponse<OrderCreatedResponse>>(
            `${ORDERS}/b2b`,
            data,
        );
        return res.data.Data;
    },

    /**
     * GET /api/Orders/track?orderCode=...&email=...
     * Track an order by code + email (public, no auth required).
     */
    trackOrder: async (orderCode: string, email: string): Promise<OrderDto> => {
        const res = await apiClient.get<OrderDto>(`${ORDERS}/track`, {
            params: { orderCode, email },
        });
        return res.data;
    },

    /**
     * GET /api/Orders/my-orders
     * Get orders for the authenticated user.
     */
    getMyOrders: async (skip = 0, take = 20) => {
        const res = await apiClient.get(`${ORDERS}/my-orders`, {
            params: { skip, take },
        });
        return res.data;
    },

    /**
     * POST /api/Orders/validate-mixmatch/{customBoxId}
     * Validate mix & match rules for a custom box.
     */
    validateMixMatch: async (customBoxId: string): Promise<MixMatchValidationResult> => {
        const res = await apiClient.post<ApiResponse<MixMatchValidationResult>>(
            `${ORDERS}/validate-mixmatch/${customBoxId}`,
        );
        return res.data.Data;
    },
};
