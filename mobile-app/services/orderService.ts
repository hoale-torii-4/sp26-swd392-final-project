import apiClient from './apiClient';

export const OrderStatus = {
  PAYMENT_CONFIRMING: 'PAYMENT_CONFIRMING',
  PAYMENT_EXPIRED_INTERNAL: 'PAYMENT_EXPIRED_INTERNAL',
  PREPARING: 'PREPARING',
  SHIPPING: 'SHIPPING',
  PARTIAL_DELIVERY: 'PARTIAL_DELIVERY',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderType = {
  B2C: 'B2C',
  B2B: 'B2B',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderItemType = {
  READY_MADE: 0,
  MIX_MATCH: 1,
} as const;
export type OrderItemType = (typeof OrderItemType)[keyof typeof OrderItemType];

export interface OrderItemDto {
  Type: OrderItemType;
  Id?: string;
  GiftBoxId?: string;
  CustomBoxId?: string;
  Quantity: number;
  Price: number;
  Name?: string;
}

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
  DeliveryDate: string;
  DeliverySlotId?: string | null;
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

export interface CreateOrderB2BDto {
  UserId: string;
  CustomerEmail: string;
  CustomerName: string;
  CustomerPhone: string;
  Items: OrderItemDto[];
  DeliveryAllocations: B2BDeliveryAllocationDto[];
  GreetingMessage?: string;
  GreetingCardUrl?: string;
  DeliveryDate: string;
}

export interface OrderCreatedResponse {
  orderId: string;
  orderCode: string;
  orderType: string | number;
  status: string | number;
  totalAmount: number;
  createdAt: string;
  deliveryAddressCount?: number;
}

type OrderCreatedApiResponse = {
  OrderId: string;
  OrderCode: string;
  OrderType: string | number;
  Status: string | number;
  TotalAmount: number;
  CreatedAt: string;
  DeliveryAddressCount?: number;
};

export interface OrderItemResponseDto {
  Id: string;
  Type: OrderItemType | string;
  GiftBoxId?: string | null;
  CustomBoxId?: string | null;
  Quantity: number;
  Price?: number;
  UnitPrice?: number;
  TotalPrice?: number;
  Name?: string | null;
  Image?: string | null;
  StockQuantity?: number | null;
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

export interface DeliveryShipmentItemResponseDto {
  OrderItemId: string;
  Name: string;
  Type: OrderItemType | string;
  Quantity: number;
  UnitPrice: number;
  TotalPrice: number;
}

export interface DeliveryShipmentResponseDto {
  DeliveryId: string;
  AddressId: string;
  Status: string;
  RetryCount: number;
  MaxRetries: number;
  LastAttemptAt: string | null;
  FailureReason: string | null;
  CreatedAt: string;
  Items: DeliveryShipmentItemResponseDto[];
}

export interface OrderDto {
  Id: string;
  OrderCode: string;
  UserId: string | null;
  Email: string;
  OrderType: OrderType | string;
  Status: OrderStatus | string;
  TotalAmount: number;
  DeliveryDate: string;
  GreetingMessage: string | null;
  GreetingCardUrl: string | null;
  CreatedAt: string;
  CustomerBankName?: string | null;
  CustomerBankAccount?: string | null;
  Items: OrderItemResponseDto[];
  DeliveryAddresses: DeliveryAddressResponseDto[];
  DeliveryShipments?: DeliveryShipmentResponseDto[];
}

export interface MyOrderItemDto {
  Name: string;
  Quantity: number;
  UnitPrice: number;
  TotalPrice: number;
  Type: string;
}

export interface MyOrderResponseDto {
  Id: string;
  OrderCode: string;
  OrderType: string;
  Status: string;
  TotalAmount: number;
  CreatedAt: string;
  DeliveryDate: string;
  TotalItems: number;
  Items: MyOrderItemDto[];
}

interface ApiResponse<T> {
  Success: boolean;
  Message: string;
  Data: T;
  Errors: string[];
}

const ORDERS = '/Orders';

const normalizeOrderDetail = (raw: any): OrderDto => {
  const src = raw?.Data ?? raw?.data ?? raw ?? {};

  const itemsFromRoot = src?.Items ?? src?.items ?? src?.OrderItems ?? src?.orderItems ?? [];
  const shipments = src?.DeliveryShipments ?? src?.deliveryShipments ?? [];

  const fallbackItemsFromShipments = Array.isArray(shipments)
    ? shipments.flatMap((s: any) => s?.Items ?? s?.items ?? [])
    : [];

  const normalizedItems = (Array.isArray(itemsFromRoot) && itemsFromRoot.length > 0
    ? itemsFromRoot
    : fallbackItemsFromShipments
  ).map((i: any, idx: number) => ({
    Id: i?.Id ?? i?.id ?? i?.OrderItemId ?? i?.orderItemId ?? String(idx),
    Type: i?.Type ?? i?.type ?? i?.OrderItemType ?? i?.orderItemType ?? 'READY_MADE',
    GiftBoxId: i?.GiftBoxId ?? i?.giftBoxId ?? null,
    CustomBoxId: i?.CustomBoxId ?? i?.customBoxId ?? null,
    Quantity: Number(i?.Quantity ?? i?.quantity ?? 0),
    Price: i?.Price ?? i?.price,
    UnitPrice: i?.UnitPrice ?? i?.unitPrice,
    TotalPrice: i?.TotalPrice ?? i?.totalPrice,
    Name: i?.Name ?? i?.name ?? i?.ProductName ?? i?.productName,
    Image: i?.Image ?? i?.image ?? null,
    StockQuantity: i?.StockQuantity ?? i?.stockQuantity ?? null,
  }));

  return {
    Id: src?.Id ?? src?.id ?? '',
    OrderCode: src?.OrderCode ?? src?.orderCode ?? '',
    UserId: src?.UserId ?? src?.userId ?? null,
    Email: src?.Email ?? src?.email ?? '',
    OrderType: src?.OrderType ?? src?.orderType ?? '',
    Status: src?.Status ?? src?.status ?? '',
    TotalAmount: Number(src?.TotalAmount ?? src?.totalAmount ?? 0),
    DeliveryDate: src?.DeliveryDate ?? src?.deliveryDate ?? '',
    GreetingMessage: src?.GreetingMessage ?? src?.greetingMessage ?? null,
    GreetingCardUrl: src?.GreetingCardUrl ?? src?.greetingCardUrl ?? null,
    CreatedAt: src?.CreatedAt ?? src?.createdAt ?? '',
    CustomerBankName: src?.CustomerBankName ?? src?.customerBankName ?? null,
    CustomerBankAccount: src?.CustomerBankAccount ?? src?.customerBankAccount ?? null,
    Items: normalizedItems,
    DeliveryAddresses: src?.DeliveryAddresses ?? src?.deliveryAddresses ?? [],
    DeliveryShipments: shipments,
  } as OrderDto;
};

export const orderService = {
  createB2COrder: async (data: CreateOrderB2CDto): Promise<OrderCreatedResponse> => {
    const res = await apiClient.post<ApiResponse<OrderCreatedApiResponse>>(
      `${ORDERS}/b2c`,
      data,
    );
    const payload = res.data.Data;
    return {
      orderId: payload.OrderId ?? '',
      orderCode: payload.OrderCode ?? '',
      orderType: payload.OrderType ?? '',
      status: payload.Status ?? '',
      totalAmount: payload.TotalAmount ?? 0,
      createdAt: payload.CreatedAt ?? '',
      deliveryAddressCount: payload.DeliveryAddressCount,
    };
  },

  createB2BOrder: async (data: CreateOrderB2BDto): Promise<OrderCreatedResponse> => {
    const res = await apiClient.post<ApiResponse<OrderCreatedApiResponse>>(
      `${ORDERS}/b2b`,
      data,
    );
    const payload = res.data.Data;
    return {
      orderId: payload.OrderId,
      orderCode: payload.OrderCode,
      orderType: payload.OrderType,
      status: payload.Status,
      totalAmount: payload.TotalAmount,
      createdAt: payload.CreatedAt,
      deliveryAddressCount: payload.DeliveryAddressCount,
    };
  },

  trackOrder: async (orderCode: string, email: string): Promise<OrderDto> => {
    const res = await apiClient.get<OrderDto>(`${ORDERS}/track`, {
      params: { orderCode, email },
    });
    return res.data;
  },

  getOrderDetailByCode: async (orderCode: string, email?: string): Promise<OrderDto> => {
    const res = await apiClient.get(`${ORDERS}/detail/${orderCode}`, {
      params: email ? { email } : undefined,
    });
    return normalizeOrderDetail(res.data);
  },

  getOrderDetailById: async (orderId: string): Promise<OrderDto> => {
    const res = await apiClient.get(`${ORDERS}/${orderId}`);
    return normalizeOrderDetail(res.data);
  },

  getMyOrders: async (skip = 0, take = 20) => {
    const res = await apiClient.get(`${ORDERS}/my-orders`, {
      params: { skip, take },
    });
    return res.data;
  },
};
