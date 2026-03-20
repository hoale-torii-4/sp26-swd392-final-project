// ── Cart service — communicates with backend Cart API ──

import apiClient from "./apiClient";
import type { ApiResponse } from "../types/auth";

// ─── Types matching backend DTOs ───

export interface CartItemDto {
    Id: string;
    Type: number;            // 0 = READY_MADE, 1 = MIX_MATCH
    ProductId: string;
    Quantity: number;
    UnitPrice: number;
    Name: string | null;
    ImageUrl?: string | null;
    IsActive?: boolean;
    StatusLabel?: string | null;
}

export interface CartDto {
    Id: string;
    UserId: string | null;
    SessionId: string | null;
    Items: CartItemDto[];
    TotalAmount: number;
    TotalItems: number;
}

export interface AddToCartRequest {
    Type: number;            // 0 = READY_MADE, 1 = MIX_MATCH
    GiftBoxId?: string;
    CustomBoxId?: string;
    Quantity: number;
}

export interface AddToCartBatchRequest {
    Items: AddToCartRequest[];
}

// ─── Session ID for guest users ───

const SESSION_KEY = "cart_session_id";

function getSessionId(): string {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
        sid = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
}

function getHeaders() {
    return { "X-Session-Id": getSessionId() };
}

export function clearGuestSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ─── Cart API Service ───

export const cartService = {
    /**
     * GET /api/Cart
     */
    getCart: async (): Promise<CartDto> => {
        const res = await apiClient.get<ApiResponse<CartDto>>("/Cart", {
            headers: getHeaders(),
        });
        return res.data.Data;
    },

    /**
     * POST /api/Cart/add
     */
    addToCart: async (item: AddToCartRequest): Promise<CartDto> => {
        const res = await apiClient.post<ApiResponse<CartDto>>("/Cart/add", item, {
            headers: getHeaders(),
        });
        window.dispatchEvent(new Event("cart-updated"));
        return res.data.Data;
    },

    /**
     * POST /api/Cart/add-batch
     */
    addToCartBatch: async (items: AddToCartRequest[]): Promise<CartDto> => {
        const payload: AddToCartBatchRequest = { Items: items };
        const res = await apiClient.post<ApiResponse<CartDto>>("/Cart/add-batch", payload, {
            headers: getHeaders(),
        });
        window.dispatchEvent(new Event("cart-updated"));
        return res.data.Data;
    },

    notifyCartUpdated: () => {
        window.dispatchEvent(new Event("cart-updated"));
    },

    /**
     * PUT /api/Cart/update/{itemId}
     */
    updateQuantity: async (itemId: string, quantity: number): Promise<CartDto> => {
        const res = await apiClient.put<ApiResponse<CartDto>>(
            `/Cart/update/${itemId}`,
            { Quantity: quantity },
            { headers: getHeaders() },
        );
        window.dispatchEvent(new Event("cart-updated"));
        return res.data.Data;
    },

    /**
     * DELETE /api/Cart/remove/{itemId}
     */
    removeItem: async (itemId: string): Promise<void> => {
        await apiClient.delete(`/Cart/remove/${itemId}`, {
            headers: getHeaders(),
        });
        window.dispatchEvent(new Event("cart-updated"));
    },

    /**
     * DELETE /api/Cart/clear
     */
    clearCart: async (): Promise<void> => {
        await apiClient.delete("/Cart/clear", {
            headers: getHeaders(),
        });
        window.dispatchEvent(new Event("cart-updated"));
    },

    // ─── Custom Box APIs directly within cartService for convenience ───

    updateCustomBox: async (boxId: string, items: { ItemId: string, Quantity: number }[]) => {
        const payload = { Items: items };
        const res = await apiClient.put(`/api/mix-match/custom-box/${boxId}`, payload);
        return res.data;
    },

    deleteCustomBox: async (boxId: string) => {
        await apiClient.delete(`/api/mix-match/custom-box/${boxId}`);
    }
};
