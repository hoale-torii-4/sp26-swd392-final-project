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
};
