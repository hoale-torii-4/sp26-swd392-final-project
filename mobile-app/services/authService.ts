import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import type {
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ApiResponse,
    User,
} from '../types/auth';

const AUTH_ENDPOINT = '/Auth';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const authService = {
    register: async (data: RegisterRequest): Promise<RegisterResponse> => {
        const response = await apiClient.post<RegisterResponse>(
            `${AUTH_ENDPOINT}/register`,
            data,
        );
        return response.data;
    },

    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>(
            `${AUTH_ENDPOINT}/login`,
            data,
        );
        const result = response.data;

        if (result.Success && result.Data) {
            await AsyncStorage.setItem(TOKEN_KEY, result.Data.Token);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.Data.User));
        }

        return result;
    },

    logout: async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_KEY);
    },

    getToken: async (): Promise<string | null> => {
        return AsyncStorage.getItem(TOKEN_KEY);
    },

    getUser: async (): Promise<User | null> => {
        const raw = await AsyncStorage.getItem(USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as User;
        } catch {
            return null;
        }
    },

    isAuthenticated: async (): Promise<boolean> => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        return !!token;
    },

    changePassword: async (data: { oldPassword: string; newPassword: string }) => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const response = await apiClient.post(
            `${AUTH_ENDPOINT}/change-password`,
            data,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        return response.data;
    },

    verifyOtp: async (data: { email: string; otp: string }): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(
            `${AUTH_ENDPOINT}/verify-email`,
            data,
        );
        return response.data;
    },

    resendOtp: async (email: string): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(
            `${AUTH_ENDPOINT}/resend-otp`,
            { email },
        );
        return response.data;
    },

    forgotPassword: async (email: string): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(
            `${AUTH_ENDPOINT}/forgot-password`,
            { email },
        );
        return response.data;
    },

    resetPassword: async (data: { email: string; otp: string; newPassword: string }): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(
            `${AUTH_ENDPOINT}/reset-password`,
            data,
        );
        return response.data;
    },
};
