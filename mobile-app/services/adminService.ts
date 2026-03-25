import apiClient from './apiClient';

export interface AdminDashboardSummary {
    totalOrders?: number;
    totalRevenue?: number;
    totalCustomers?: number;
    totalProducts?: number;
    [key: string]: any;
}

export const adminService = {
    getDashboardSummary: async (): Promise<AdminDashboardSummary> => {
        const response = await apiClient.get('/admin/dashboard/summary');
        return response.data ?? {};
    },

    getOrderStatusSummary: async (): Promise<any> => {
        const response = await apiClient.get('/admin/dashboard/order-status');
        return response.data;
    },

    getOrderTypeSummary: async (): Promise<any> => {
        const response = await apiClient.get('/admin/dashboard/order-type');
        return response.data;
    },

    getReportsDashboard: async (): Promise<any> => {
        const response = await apiClient.get('/admin/reports/dashboard');
        return response.data;
    },

    getOrders: async (params?: {
        status?: string;
        orderType?: string;
        keyword?: string;
        page?: number;
        pageSize?: number;
    }): Promise<any> => {
        const response = await apiClient.get('/admin/orders', { params });
        return response.data;
    },

    updateOrderStatus: async (orderId: string, status: string, note?: string): Promise<any> => {
        const response = await apiClient.put(`/orders/${orderId}/status`, { status, note });
        return response.data;
    },

    updateDeliveryStatus: async (deliveryId: string, status: string, failureReason?: string): Promise<any> => {
        const response = await apiClient.put(`/orders/deliveries/${deliveryId}/status`, {
            status,
            failureReason,
        });
        return response.data;
    },

    // ════════ COLLECTIONS ════════
    getCollections: async (): Promise<any[]> => {
        const response = await apiClient.get('/admin/collections');
        return response.data;
    },
    createCollection: async (data: any): Promise<any> => {
        const response = await apiClient.post('/admin/collections', data);
        return response.data;
    },
    updateCollection: async (id: string, data: any): Promise<any> => {
        const response = await apiClient.put(`/admin/collections/${id}`, data);
        return response.data;
    },
    toggleCollectionStatus: async (id: string, isActive: boolean): Promise<any> => {
        const response = await apiClient.patch(`/admin/collections/${id}/status`, { IsActive: isActive });
        return response.data;
    },
    deleteCollection: async (id: string): Promise<any> => {
        const response = await apiClient.delete(`/admin/collections/${id}`);
        return response.data;
    },

    // ════════ GIFT BOXES ════════
    getGiftBoxes: async (params?: any): Promise<any> => {
        const response = await apiClient.get('/admin/giftboxes', { params });
        return response.data;
    },
    getGiftBoxById: async (id: string): Promise<any> => {
        const response = await apiClient.get(`/admin/giftboxes/${id}`);
        return response.data;
    },
    toggleGiftBoxStatus: async (id: string, isActive: boolean): Promise<any> => {
        const response = await apiClient.patch(`/admin/giftboxes/${id}/status`, { IsActive: isActive });
        return response.data;
    },
    deleteGiftBox: async (id: string): Promise<any> => {
        const response = await apiClient.delete(`/admin/giftboxes/${id}`);
        return response.data;
    },
    getGiftBoxCollections: async (): Promise<any[]> => {
        const response = await apiClient.get('/admin/giftboxes/collections');
        return response.data;
    },
    getGiftBoxItems: async (): Promise<any[]> => {
        const response = await apiClient.get('/admin/giftboxes/items');
        return response.data;
    },
    getGiftBoxTags: async (): Promise<any[]> => {
        const response = await apiClient.get('/admin/giftboxes/tags');
        return response.data;
    },
    createGiftBox: async (data: any): Promise<any> => {
        const response = await apiClient.post('/admin/giftboxes', data);
        return response.data;
    },
    updateGiftBox: async (id: string, data: any): Promise<any> => {
        const response = await apiClient.put(`/admin/giftboxes/${id}`, data);
        return response.data;
    },

    // ════════ INVENTORY ════════
    getInventory: async (params?: any): Promise<any> => {
        const response = await apiClient.get('/admin/inventory', { params });
        return response.data;
    },
    getInventorySummary: async (): Promise<any> => {
        const response = await apiClient.get('/admin/inventory/summary');
        return response.data;
    },
    getInventoryLogs: async (params?: any): Promise<any> => {
        const response = await apiClient.get('/admin/inventory/logs', { params });
        return response.data;
    },
    adjustInventory: async (data: any): Promise<any> => {
        const response = await apiClient.post('/admin/inventory/adjust', data);
        return response.data;
    },
    createInventoryItem: async (data: any): Promise<any> => {
        const response = await apiClient.post('/admin/inventory', data);
        return response.data;
    },
};
