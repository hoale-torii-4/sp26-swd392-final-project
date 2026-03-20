import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import type { ApiResponse } from '../types/auth';

// ─── Types matching backend DTOs ───

export interface CartItemDto {
    Id: string;
    Type: number;            // 0 = READY_MADE, 1 = MIX_MATCH
    ProductId: string | null;
    GiftBoxId: string | null;
    CustomBoxId: string | null;
    Quantity: number;
    UnitPrice: number;
    Name: string | null;
    ImageUrl?: string | null;
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
    Type: number;
    GiftBoxId?: string;
    CustomBoxId?: string;
    Quantity: number;
}

// ─── Session ID for guest users ───

const SESSION_KEY = 'cart_session_id';

async function getSessionId(): Promise<string> {
    let sid = await AsyncStorage.getItem(SESSION_KEY);
    if (!sid) {
        sid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
        await AsyncStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
}

async function getHeaders() {
    return { 'X-Session-Id': await getSessionId() };
}

// Event emitter for cart updates (React Native equivalent of window events)
type CartListener = () => void;
const cartListeners: CartListener[] = [];

export const cartEvents = {
    subscribe: (listener: CartListener) => {
        cartListeners.push(listener);
        return () => {
            const idx = cartListeners.indexOf(listener);
            if (idx >= 0) cartListeners.splice(idx, 1);
        };
    },
    emit: () => {
        cartListeners.forEach((fn) => fn());
    },
};

// ─── Cart API Service ───

export const cartService = {
    getCart: async (): Promise<CartDto> => {
        const res = await apiClient.get<ApiResponse<CartDto>>('/Cart', {
            headers: await getHeaders(),
        });
        return res.data.Data;
    },

    addToCart: async (item: AddToCartRequest): Promise<CartDto> => {
        const res = await apiClient.post<ApiResponse<CartDto>>('/Cart/add', item, {
            headers: await getHeaders(),
        });
        cartEvents.emit();
        return res.data.Data;
    },

    updateQuantity: async (itemId: string, quantity: number): Promise<CartDto> => {
        const res = await apiClient.put<ApiResponse<CartDto>>(
            `/Cart/update/${itemId}`,
            { Quantity: quantity },
            { headers: await getHeaders() },
        );
        cartEvents.emit();
        return res.data.Data;
    },

    removeItem: async (itemId: string): Promise<void> => {
        await apiClient.delete(`/Cart/remove/${itemId}`, {
            headers: await getHeaders(),
        });
        cartEvents.emit();
    },

    clearCart: async (): Promise<void> => {
        await apiClient.delete('/Cart/clear', {
            headers: await getHeaders(),
        });
        cartEvents.emit();
    },

    addToCartBatch: async (items: AddToCartRequest[]): Promise<CartDto> => {
        const res = await apiClient.post<ApiResponse<CartDto>>('/Cart/add-batch', { Items: items }, {
            headers: await getHeaders(),
        });
        cartEvents.emit();
        return res.data.Data;
    },
};
