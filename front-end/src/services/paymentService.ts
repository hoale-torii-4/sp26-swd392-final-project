// ── Payment service — communicates with backend Payment API ──

import apiClient from "./apiClient";

// ─── Response types ───

export interface PaymentQrResponse {
    orderCode: string;
    amount: number;
    bankAccount: string;
    bankName: string;
    qrUrl: string;
}

export interface PaymentStatusResponse {
    OrderCode: string;
    Status: string;
    TotalAmount: number;
    IsPaid: boolean;
}

// ─── API wrapper type ───

interface ApiResponse<T> {
    Success: boolean;
    Message: string;
    Data: T;
}

// ─── Payment API Service ───

const PAYMENT = "/Payment";

export const paymentService = {
    /**
     * GET /api/Payment/create-qr/{orderCode}
     * Generate a SePay QR code for the given order.
     */
    createQr: async (orderCode: string): Promise<PaymentQrResponse> => {
        const res = await apiClient.get<ApiResponse<PaymentQrResponse>>(
            `${PAYMENT}/create-qr/${orderCode}`,
        );
        return res.data.Data;
    },

    /**
     * GET /api/Payment/check-status/{orderCode}
     * Check payment status of an order (for polling).
     */
    checkPaymentStatus: async (orderCode: string): Promise<PaymentStatusResponse> => {
        const res = await apiClient.get<ApiResponse<PaymentStatusResponse>>(
            `${PAYMENT}/check-status/${orderCode}`,
        );
        return res.data.Data;
    },
};
