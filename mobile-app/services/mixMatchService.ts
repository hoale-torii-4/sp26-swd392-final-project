import apiClient from './apiClient';

export interface MixMatchItem {
    Id: string;
    Name: string;
    Image?: string;
    Category?: string;
    CategoryLabel?: string;
    Price?: number;
}

export interface CustomBoxItemPayload {
    ItemId: string;
    Quantity: number;
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
        // Backend expects { items: [ { ItemId, Quantity } ] }
        const res = await apiClient.post('/mix-match/custom-box', { items });
        // C# backend returns the ID string directly in the response body
        return res.data;
    },
};
