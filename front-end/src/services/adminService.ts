import apiClient from "./apiClient";

/* ═══════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════ */

// ── Pagination ──
export interface PagedResult<T> {
    Data: T[];
    TotalItems: number;
    Page: number;
    PageSize: number;
    TotalPages: number;
}

// ── Dashboard ──
export interface DashboardSummary {
    TotalRevenue: number;
    RevenueGrowthPercent: number;
    TotalOrders: number;
    OrderGrowthPercent: number;
    OrdersToday: number;
    B2cPercent: number;
    B2bPercent: number;
    LastUpdated: string;
}

export interface OrderStatusSummary {
    PendingPayment: number;
    Preparing: number;
    Shipping: number;
    DeliveryFailed: number;
    PartiallyDelivered: number;
    Completed: number;
    Cancelled: number;
    Refunding: number;
    Refunded: number;
}

export interface OrderTypeSummary {
    B2cOrders: number;
    B2bOrders: number;
    B2cRevenue: number;
    B2bRevenue: number;
    B2cPercent: number;
    B2bPercent: number;
}

export interface TopCollection {
    CollectionId: string;
    CollectionName: string;
    Thumbnail?: string;
    Orders: number;
    Revenue: number;
    Percent: number;
}

export interface TopGiftBox {
    GiftBoxId: string;
    GiftBoxName: string;
    Image?: string;
    CollectionName: string;
    SoldQuantity: number;
    Revenue: number;
}

export interface InventoryAlert {
    ItemId: string;
    ItemName: string;
    Category: string;
    StockQuantity: number;
    Threshold: number;
}

// ── Users ──
export interface InternalUser {
    Id: string;
    FullName: string;
    Email: string;
    Role: string;
    RoleLabel: string;
    IsActive: boolean;
    StatusLabel: string;
    CreatedAt: string;
}

export interface InternalUserList {
    Users: InternalUser[];
    Page: number;
    PageSize: number;
    TotalItems: number;
}

export interface CreateInternalUserDto {
    FullName: string;
    Email: string;
    Password: string;
    Role: string;
}

export interface UpdateInternalUserDto {
    FullName: string;
    Role: string;
    IsActive?: boolean;
}

// ── Collections ──
export interface CollectionResponse {
    Id: string;
    Name: string;
    Description: string;
    DisplayOrder: number;
    IsActive: boolean;
    StatusLabel: string;
    GiftBoxCount: number;
    Thumbnail?: string;
}

export interface CollectionCreateDto {
    Name: string;
    Description: string;
    DisplayOrder: number;
    IsActive?: boolean;
}

export interface CollectionUpdateDto {
    Name: string;
    Description: string;
    DisplayOrder: number;
    IsActive: boolean;
}

export interface CollectionReorderDto {
    Id: string;
    DisplayOrder: number;
}

// ── GiftBoxes ──
export interface GiftBoxListItem {
    Id: string;
    Name: string;
    Price: number;
    CollectionId: string;
    CollectionName: string;
    Type: string;
    Status: boolean;
    StatusLabel: string;
    Thumbnail?: string;
    TagNames: string[];
    ItemCount: number;
}

export interface GiftBoxDetail {
    Id: string;
    Name: string;
    Description: string;
    Price: number;
    CollectionId: string;
    CollectionName: string;
    Images: string[];
    Tags: { Id: string; Name: string; Type: string }[];
    Items: { ItemId: string; ItemName: string; Category: string; Price: number; Quantity: number; Image?: string }[];
    IsActive: boolean;
    StatusLabel: string;
}

export interface GiftBoxCreateDto {
    Name: string;
    Description: string;
    Price: number;
    Images: string[];
    CollectionId: string;
    TagIds: string[];
    Items: { ItemId: string; ItemName: string; Quantity: number; ItemPrice: number }[];
    IsActive?: boolean;
}

export interface GiftBoxUpdateDto {
    Name?: string;
    Description?: string;
    Price?: number;
    Images?: string[];
    CollectionId?: string;
    TagIds?: string[];
    Items?: { ItemId: string; ItemName: string; Quantity: number; ItemPrice: number }[];
    IsActive?: boolean;
}

export interface SimpleCollectionDto {
    Id: string;
    Name: string;
}

export interface SimpleItemDto {
    Id: string;
    Name: string;
    Category: string;
    Price: number;
}

export interface SimpleTagDto {
    Id: string;
    Name: string;
    Type: string;
}

export interface GiftBoxStatusDto {
    IsActive: boolean;
}

// ── Inventory ──
export interface InventoryItem {
    Id: string;
    Name: string;
    Category: string;
    CategoryLabel: string;
    Price: number;
    StockQuantity: number;
    StockStatus: string;
    StockStatusLabel: string;
    IsActive: boolean;
    Image?: string;
}

export interface InventoryItemDetail {
    Id: string;
    Name: string;
    Category: string;
    Price: number;
    StockQuantity: number;
    Image?: string;
    IsActive: boolean;
    Logs: InventoryLog[];
}

export interface InventoryLog {
    Id: string;
    ItemId: string;
    ItemName: string;
    Sku: string;
    ChangeType: string;
    ChangeTypeLabel: string;
    QuantityChange: number;
    PreviousStock: number;
    NewStock: number;
    Source: string;
    Reason?: string;
    CreatedAt: string;
}

export interface InventorySummaryDto {
    TotalItems: number;
    InStock: number;
    LowStock: number;
    OutOfStock: number;
}

export interface InventoryAdjustDto {
    ItemId: string;
    AdjustType: "INCREASE" | "DECREASE";
    Quantity: number;
    Reason?: string;
}

export interface InventoryCreateDto {
    Name: string;
    Category: string;
    Price: number;
    Image?: string;
    IsAlcohol: boolean;
    InitialStock: number;
    IsActive?: boolean;
}

// ── MixMatch ──
export interface MixMatchItem {
    Id: string;
    Name: string;
    Image: string;
    Category: string;
    CategoryLabel: string;
    Price: number;
    IsAlcohol: boolean;
    StockQuantity: number;
    StockStatus: string;
    StockStatusLabel: string;
    IsActive: boolean;
    StatusLabel: string;
}

export interface MixMatchCreateDto {
    Name: string;
    Price: number;
    Category: string;
    Image?: string;
    Description?: string;
    IsAlcohol: boolean;
    IsActive?: boolean;
}

export interface MixMatchUpdateDto {
    Name: string;
    Price: number;
    Category: string;
    Image?: string;
    Description?: string;
    IsAlcohol: boolean;
    IsActive?: boolean;
}

export interface MixMatchRule {
    MinItems: number;
    MaxItems: number;
    MinDrink: number;
    MinSnack: number;
    MaxSavory: number;
}

// ── Reviews ──
export interface ReviewListItem {
    Id: string;
    ReviewerName: string;
    ReviewerEmail: string;
    ReviewerAvatar?: string;
    GiftBoxId: string;
    GiftBoxName: string;
    GiftBoxImage?: string;
    Rating: number;
    Content: string;
    CreatedAt: string;
    Status: string;
    StatusLabel: string;
}

export interface ReviewDetail {
    Id: string;
    ReviewerName: string;
    ReviewerEmail: string;
    ReviewerAvatar?: string;
    OrderCode?: string;
    GiftBoxId: string;
    GiftBoxName: string;
    GiftBoxImage?: string;
    Rating: number;
    Content: string;
    CreatedAt: string;
    Status: string;
}

export interface ReviewListResponse {
    Items: ReviewListItem[];
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
}

// ── Reports ──
export interface ReportDashboard {
    TotalRevenue: number;
    TotalOrders: number;
    AverageOrderValue: number;
    TopGiftBox: string;
}

export interface RevenueData {
    Labels: string[];
    Values: number[];
    Total: number;
}

export interface CollectionPerformance {
    CollectionId: string;
    CollectionName: string;
    Orders: number;
    Revenue: number;
    Percent: number;
}

export interface GiftBoxPerformance {
    GiftBoxId: string;
    GiftBoxName: string;
    CollectionName: string;
    Orders: number;
    Revenue: number;
}

export interface B2cB2bComparison {
    B2cOrders: number;
    B2bOrders: number;
    B2cRevenue: number;
    B2bRevenue: number;
}

// ── Orders (STAFF) ──
export interface OrderAdminResponse {
    id: string;
    orderCode: string;
    status: string;
    updatedAt: string;
}

export interface AdminOrderListItem {
    Id: string;
    OrderCode: string;
    CustomerName: string;
    CustomerEmail: string;
    CustomerPhone: string;
    OrderType: string;
    Status: string;
    TotalAmount: number;
    TotalItems: number;
    CreatedAt: string;
    DeliveryDate?: string;
    BankName?: string;
    BankAccountNumber?: string;
}

/* ═══════════════════════════════════════════════════════════
   API FUNCTIONS
   ═══════════════════════════════════════════════════════════ */

export const adminService = {
    // ════════ DASHBOARD ════════
    getDashboardSummary: () =>
        apiClient.get<DashboardSummary>("/admin/dashboard/summary").then(r => r.data),

    getOrderStatusSummary: () =>
        apiClient.get<OrderStatusSummary>("/admin/dashboard/order-status").then(r => r.data),

    getOrderTypeSummary: () =>
        apiClient.get<OrderTypeSummary>("/admin/dashboard/order-type").then(r => r.data),

    getTopCollections: (limit = 5) =>
        apiClient.get<TopCollection[]>("/admin/dashboard/top-collections", { params: { limit } }).then(r => r.data),

    getTopGiftBoxes: (limit = 10) =>
        apiClient.get<TopGiftBox[]>("/admin/dashboard/top-giftboxes", { params: { limit } }).then(r => r.data),

    getInventoryAlerts: (threshold = 10) =>
        apiClient.get<InventoryAlert[]>("/admin/dashboard/inventory-alert", { params: { threshold } }).then(r => r.data),

    exportDashboard: (fromDate?: string, toDate?: string) =>
        apiClient.get("/admin/dashboard/export", { params: { fromDate, toDate }, responseType: "blob" }).then(r => r.data),

    // ════════ USERS ════════
    getUsers: (params?: { search?: string; role?: string; status?: string; page?: number; pageSize?: number }) =>
        apiClient.get<InternalUserList>("/admin/users", { params }).then(r => r.data),

    getUserById: (id: string) =>
        apiClient.get<InternalUser>(`/admin/users/${id}`).then(r => r.data),

    createUser: (data: CreateInternalUserDto) =>
        apiClient.post("/admin/users", data).then(r => r.data),

    updateUser: (id: string, data: UpdateInternalUserDto) =>
        apiClient.put(`/admin/users/${id}`, data),

    toggleUserStatus: (id: string, isActive: boolean) =>
        apiClient.patch(`/admin/users/${id}/status`, { IsActive: isActive }),

    // ════════ COLLECTIONS ════════
    getCollections: () =>
        apiClient.get<CollectionResponse[]>("/admin/collections").then(r => r.data),

    getCollectionById: (id: string) =>
        apiClient.get<CollectionResponse>(`/admin/collections/${id}`).then(r => r.data),

    createCollection: (data: CollectionCreateDto) =>
        apiClient.post("/admin/collections", data).then(r => r.data),

    updateCollection: (id: string, data: CollectionUpdateDto) =>
        apiClient.put(`/admin/collections/${id}`, data),

    toggleCollectionStatus: (id: string, isActive: boolean) =>
        apiClient.patch(`/admin/collections/${id}/status`, { IsActive: isActive }),

    deleteCollection: (id: string) =>
        apiClient.delete(`/admin/collections/${id}`),

    reorderCollections: (items: CollectionReorderDto[]) =>
        apiClient.patch("/admin/collections/reorder", items),

    // ════════ GIFT BOXES ════════
    getGiftBoxes: (params?: { collectionId?: string; keyword?: string; status?: boolean; page?: number; pageSize?: number }) =>
        apiClient.get<PagedResult<GiftBoxListItem>>("/admin/giftboxes", { params }).then(r => r.data),

    getGiftBoxById: (id: string) =>
        apiClient.get<GiftBoxDetail>(`/admin/giftboxes/${id}`).then(r => r.data),

    createGiftBox: (data: GiftBoxCreateDto) =>
        apiClient.post("/admin/giftboxes", data).then(r => r.data),

    updateGiftBox: (id: string, data: GiftBoxUpdateDto) =>
        apiClient.put(`/admin/giftboxes/${id}`, data),

    toggleGiftBoxStatus: (id: string, isActive: boolean) =>
        apiClient.patch(`/admin/giftboxes/${id}/status`, { IsActive: isActive }),

    deleteGiftBox: (id: string) =>
        apiClient.delete(`/admin/giftboxes/${id}`),

    getGiftBoxCollections: () =>
        apiClient.get<SimpleCollectionDto[]>("/admin/giftboxes/collections").then(r => r.data),

    getGiftBoxItems: () =>
        apiClient.get<SimpleItemDto[]>("/admin/giftboxes/items").then(r => r.data),

    getGiftBoxTags: () =>
        apiClient.get<SimpleTagDto[]>("/admin/giftboxes/tags").then(r => r.data),

    // ════════ INVENTORY ════════
    getInventory: (params?: { search?: string; category?: string; stockStatus?: string; page?: number; pageSize?: number }) =>
        apiClient.get<PagedResult<InventoryItem>>("/admin/inventory", { params }).then(r => r.data),

    getInventoryItemDetail: (id: string) =>
        apiClient.get<InventoryItemDetail>(`/admin/inventory/items/${id}`).then(r => r.data),

    getInventoryLogs: (params?: { search?: string; changeType?: string; source?: string; date?: string; page?: number; pageSize?: number }) =>
        apiClient.get<PagedResult<InventoryLog>>("/admin/inventory/logs", { params }).then(r => r.data),

    adjustInventory: (data: InventoryAdjustDto) =>
        apiClient.post("/admin/inventory/adjust", data),

    createInventoryItem: (data: InventoryCreateDto) =>
        apiClient.post<{ Id: string }>("/admin/inventory", data).then(r => r.data),

    getInventorySummary: () =>
        apiClient.get<InventorySummaryDto>("/admin/inventory/summary").then(r => r.data),

    // ════════ MIX & MATCH ════════
    getMixMatchItems: (params?: { search?: string; category?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
        apiClient.get("/admin/mix-match/items", { params }).then(r => r.data),

    getMixMatchItemById: (id: string) =>
        apiClient.get<MixMatchItem>(`/admin/mix-match/items/${id}`).then(r => r.data),

    createMixMatchItem: (data: MixMatchCreateDto) =>
        apiClient.post("/admin/mix-match/items", data).then(r => r.data),

    updateMixMatchItem: (id: string, data: MixMatchUpdateDto) =>
        apiClient.put(`/admin/mix-match/items/${id}`, data),

    toggleMixMatchItemStatus: (id: string, isActive: boolean) =>
        apiClient.patch(`/admin/mix-match/items/${id}/status`, { IsActive: isActive }),

    deleteMixMatchItem: (id: string) =>
        apiClient.delete(`/admin/mix-match/items/${id}`),

    getMixMatchCategories: () =>
        apiClient.get("/admin/mix-match/categories").then(r => r.data),

    getMixMatchRules: () =>
        apiClient.get<MixMatchRule>("/admin/mix-match/rules").then(r => r.data),

    updateMixMatchRules: (data: MixMatchRule) =>
        apiClient.put("/admin/mix-match/rules", data),

    // ════════ REVIEWS ════════
    getReviews: (params?: { status?: string; rating?: number; giftBoxId?: string; page?: number; pageSize?: number }) =>
        apiClient.get<ReviewListResponse>("/admin/reviews", { params }).then(r => r.data),

    getReviewDetail: (id: string) =>
        apiClient.get<ReviewDetail>(`/admin/reviews/${id}`).then(r => r.data),

    approveReview: (id: string) =>
        apiClient.patch(`/admin/reviews/${id}/approve`),

    hideReview: (id: string) =>
        apiClient.patch(`/admin/reviews/${id}/hide`),

    // ════════ REPORTS ════════
    getReportDashboard: () =>
        apiClient.get("/admin/reports/dashboard").then(r => r.data),

    getRevenue: (params?: { fromDate?: string; toDate?: string; view?: string; orderType?: string }) =>
        apiClient.get("/admin/reports/revenue", { params }).then(r => r.data),

    getCollectionsPerformance: () =>
        apiClient.get("/admin/reports/collections-performance").then(r => r.data),

    getGiftBoxPerformance: () =>
        apiClient.get("/admin/reports/giftbox-performance").then(r => r.data),

    getB2cB2bComparison: () =>
        apiClient.get("/admin/reports/b2c-b2b-comparison").then(r => r.data),

    getReportInventoryAlert: (threshold = 10) =>
        apiClient.get("/admin/reports/inventory-alert", { params: { threshold } }).then(r => r.data),

    exportRevenue: (params?: { fromDate?: string; toDate?: string; view?: string; orderType?: string }) =>
        apiClient.get("/admin/reports/export/revenue", { params, responseType: "blob" }).then(r => r.data),

    exportCollections: () =>
        apiClient.get("/admin/reports/export/collections", { responseType: "blob" }).then(r => r.data),

    exportGiftBoxes: () =>
        apiClient.get("/admin/reports/export/giftboxes", { responseType: "blob" }).then(r => r.data),

    exportB2cB2b: () =>
        apiClient.get("/admin/reports/export/b2c-b2b", { responseType: "blob" }).then(r => r.data),

    exportInventoryAlert: (threshold = 10) =>
        apiClient.get("/admin/reports/export/inventory-alert", { params: { threshold }, responseType: "blob" }).then(r => r.data),

    // ════════ ORDERS (STAFF) ════════
    getAdminOrders: (params?: { status?: string; orderType?: string; keyword?: string; page?: number; pageSize?: number }) =>
        apiClient.get<PagedResult<AdminOrderListItem>>("/admin/orders", { params }).then(r => r.data),

    updateOrderStatus: (orderId: string, status: string, note?: string) =>
        apiClient.put(`/Orders/${orderId}/status`, { Status: status, Note: note }).then(r => r.data),

    updateDeliveryStatus: (deliveryId: string, status: string, failureReason?: string) =>
        apiClient.put(`/Orders/deliveries/${deliveryId}/status`, { Status: status, FailureReason: failureReason }).then(r => r.data),

    reshipDelivery: (deliveryId: string) =>
        apiClient.post(`/Orders/deliveries/${deliveryId}/reship`).then(r => r.data),

    trackOrder: (orderCode: string, email: string) =>
        apiClient.get("/Orders/track", { params: { orderCode, email } }).then(r => r.data),
};
