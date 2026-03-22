import apiClient from "./apiClient";

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
    StockStatus?: string;
    StockStatusLabel?: string;
    IsActive?: boolean;
}

export interface CustomBoxItemPayload {
    ItemId: string;
    Quantity: number;
}

export const mixMatchService = {
    getItems: async (params: { search?: string; category?: string; isActive?: boolean; page?: number; pageSize?: number }) => {
        const res = await apiClient.get("/admin/mix-match/items", { params });
        return res.data;
    },
    getCategories: async () => {
        const res = await apiClient.get("/admin/mix-match/categories");
        return res.data;
    },
    createCustomBox: async (items: CustomBoxItemPayload[]) => {
        const res = await apiClient.post("/mix-match/custom-box", { items });
        return res.data;
    },
    getMyCustomBox: async () => {
        const res = await apiClient.get("/mix-match/custom-box/me");
        return res.data;
    },
    getMyCustomBoxes: async () => {
        const res = await apiClient.get("/mix-match/custom-box/me/all");
        return res.data;
    },
};
