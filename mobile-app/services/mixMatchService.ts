import apiClient from './apiClient';

export interface MixMatchItem {
    Id: string;
    Name: string;
    Image?: string;
    Category?: string;
    CategoryLabel?: string;
    Price?: number;
    IsAlcohol?: boolean;
    StockQuantity?: number;
    AvailableQuantity?: number;
}

export interface CustomBoxItemPayload {
    ItemId: string;
    Quantity: number;
}

export interface CustomBoxItemResponse {
    ItemId: string;
    Name: string;
    Price: number;
    Quantity: number;
    Subtotal: number;
    ImageUrl?: string;
}

export interface CustomBoxResponse {
    Id: string;
    TotalItems: number;
    TotalPrice: number;
    Items: CustomBoxItemResponse[];
    CreatedAt: string;
}

export const mixMatchService = {
    getItems: async (params: { search?: string; category?: string; isActive?: boolean; page?: number; pageSize?: number }) => {
        const res = await apiClient.get('/admin/mix-match/items', { params });
        return res.data;
    },
    getCategories: async () => {
        const res = await apiClient.get('/admin/mix-match/categories');
        return res.data;
    },
    createCustomBox: async (items: CustomBoxItemPayload[]) => {
        const res = await apiClient.post('/mix-match/custom-box', { items });
        return res.data;
    },
    getMyCustomBoxes: async (): Promise<CustomBoxResponse[]> => {
        const res = await apiClient.get('/mix-match/custom-box/me/all');
        return res.data;
    },
    getMyCustomBox: async (): Promise<CustomBoxResponse> => {
        const res = await apiClient.get('/mix-match/custom-box/me');
        return res.data;
    },
    updateCustomBox: async (boxId: string, items: CustomBoxItemPayload[]): Promise<void> => {
        await apiClient.put(`/mix-match/custom-box/${boxId}`, { Items: items });
    },
    deleteCustomBox: async (boxId: string): Promise<void> => {
        await apiClient.delete(`/mix-match/custom-box/${boxId}`);
    },
};
