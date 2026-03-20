import apiClient from "./apiClient";

// ── Types matching backend API response ──

export interface GiftBoxDetailItemDto {
    Id: string;
    Name: string;
    Price: number;
    Image: string | null;
    Quantity: number;
}

export interface GiftBoxDetailDto {
    Id: string;
    Name: string;
    Description: string;
    Price: number;
    Images: string[];
    Image: string | null;
    Collection: string | null;
    Tags: string[];
    Items: GiftBoxDetailItemDto[];
    IsActive: boolean;
    CreatedAt: string;
}

export interface GiftBoxListDto {
    Id: string;
    Name: string;
    Description: string;
    Price: number;
    Image: string | null;
    CollectionId: string;
    CollectionName: string;
    IsActive: boolean;
    CreatedAt: string;
}

const PRODUCTS_ENDPOINT = "/Products";

export const productService = {
    /**
     * GET /api/Products/gift-boxes
     */
    getGiftBoxes: async (name?: string): Promise<GiftBoxListDto[]> => {
        const response = await apiClient.get<GiftBoxListDto[]>(
            `${PRODUCTS_ENDPOINT}/gift-boxes`,
            { params: name ? { name } : undefined },
        );
        return response.data;
    },

    /**
     * GET /api/Products/gift-boxes/{id}
     */
    getGiftBoxById: async (id: string): Promise<GiftBoxDetailDto> => {
        const response = await apiClient.get<GiftBoxDetailDto>(
            `${PRODUCTS_ENDPOINT}/gift-boxes/${id}`,
        );
        return response.data;
    },

    getCollections: async (name?: string) => {
        const response = await apiClient.get(
            `${PRODUCTS_ENDPOINT}/collections`,
            { params: name ? { name } : undefined },
        );
        return response.data;
    },

    /**
     * GET /api/Products/collections/{id}
     */
    getCollectionDetailById: async (id: string) => {
        const response = await apiClient.get(
            `${PRODUCTS_ENDPOINT}/collections/${id}`,
        );
        return response.data;
    },
};
