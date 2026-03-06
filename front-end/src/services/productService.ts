import apiClient from "./apiClient";

// ── Types matching backend DTOs ──

export interface CollectionSummaryDto {
    Id: string;
    Name: string;
    CoverImage: string | null;
}

export interface TagSummaryDto {
    Id: string;
    Name: string;
    Type: string;
}

export interface GiftBoxDetailItemDto {
    ItemId: string;
    Name: string;
    Quantity: number;
    PriceSnapshot: number;
    Images: string[];
}

export interface GiftBoxDetailDto {
    Id: string;
    Name: string;
    Description: string;
    Price: number;
    Images: string[];
    Collection: CollectionSummaryDto | null;
    Tags: TagSummaryDto[];
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
    getGiftBoxes: async (): Promise<GiftBoxListDto[]> => {
        const response = await apiClient.get<GiftBoxListDto[]>(
            `${PRODUCTS_ENDPOINT}/gift-boxes`,
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
