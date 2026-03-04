import apiClient from "./apiClient";

// ── GiftBox types (mirrors backend GiftBox model) ──

export interface GiftBox {
    Id: string;
    Name: string;
    Description: string;
    Price: number;
    Images: string[];
    CollectionId: string;
    Tags: string[];
    Items: { ItemId: string; Quantity: number }[];
    IsActive: boolean;
    CreatedAt: string;
}

const PRODUCTS_ENDPOINT = "/Products";

export const productService = {
    /**
     * GET /api/Products/gift-boxes
     */
    getGiftBoxes: async (): Promise<GiftBox[]> => {
        const response = await apiClient.get<GiftBox[]>(
            `${PRODUCTS_ENDPOINT}/gift-boxes`,
        );
        return response.data;
    },

    /**
     * GET /api/Products/collections
     */
    getCollections: async () => {
        const response = await apiClient.get(
            `${PRODUCTS_ENDPOINT}/collections`,
        );
        return response.data;
    },
};
