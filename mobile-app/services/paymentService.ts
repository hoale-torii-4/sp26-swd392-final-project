import apiClient from './apiClient';

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

interface ApiResponse<T> {
  Success: boolean;
  Message: string;
  Data: T;
}

const PAYMENT = '/Payment';

export const paymentService = {
  createQr: async (orderCode: string): Promise<PaymentQrResponse> => {
    const res = await apiClient.get<ApiResponse<PaymentQrResponse>>(
      `${PAYMENT}/create-qr/${orderCode}`,
    );
    return res.data.Data;
  },

  checkPaymentStatus: async (orderCode: string): Promise<PaymentStatusResponse> => {
    const res = await apiClient.get<ApiResponse<PaymentStatusResponse>>(
      `${PAYMENT}/check-status/${orderCode}`,
    );
    return res.data.Data;
  },
};
