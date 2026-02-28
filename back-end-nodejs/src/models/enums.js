// ========== ENUMS ==========
export const OrderStatus = Object.freeze({
  PAYMENT_CONFIRMING: 'PAYMENT_CONFIRMING',
  PREPARING: 'PREPARING',
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
});

export const OrderType = Object.freeze({
  B2C: 'B2C',
  B2B: 'B2B',
});

export const OrderItemType = Object.freeze({
  READY_MADE: 'READY_MADE',
  MIX_MATCH: 'MIX_MATCH',
});

export const ItemCategory = Object.freeze({
  DRINK: 'DRINK',
  FOOD: 'FOOD',
  NUT: 'NUT',
  ALCOHOL: 'ALCOHOL',
});

export const UserRole = Object.freeze({
  MEMBER: 'MEMBER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
});

export const UserStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
});
