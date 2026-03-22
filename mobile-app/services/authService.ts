import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import type {
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    GoogleLoginRequest,
    LoginResponse,
    ApiResponse,
    User,
} from '../types/auth';

const AUTH_ENDPOINT = '/Auth';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const normalizeUser = (input: any): User => ({
    Id: input?.Id ?? input?.id ?? '',
    Email: input?.Email ?? input?.email ?? '',
    FullName: input?.FullName ?? input?.fullName ?? '',
    Phone: input?.Phone ?? input?.phone ?? '',
    Role: Number(input?.Role ?? input?.role ?? 0),
    Status: Number(input?.Status ?? input?.status ?? 0),
    CreatedAt: input?.CreatedAt ?? input?.createdAt ?? new Date().toISOString(),
});

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

    loginWithGoogle: async (data: GoogleLoginRequest): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>(
            `${AUTH_ENDPOINT}/google-login`,
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
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) return null;

        try {
            const response = await apiClient.get<ApiResponse<User>>(`${AUTH_ENDPOINT}/me`);
            const result = response.data;

            if (result.Success && result.Data) {
                const normalized = normalizeUser(result.Data);
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalized));
                return normalized;
            }
        } catch {
            // fallback to cached user for temporary network failure
        }

        const raw = await AsyncStorage.getItem(USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as User;
        } catch {
            return null;
        }
    },

    validateSession: async (): Promise<boolean> => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) return false;

        try {
            const response = await apiClient.get<ApiResponse<User>>(`${AUTH_ENDPOINT}/me`);
            const result = response.data;
            const isValid = !!(result.Success && result.Data);

            if (isValid) {
                const normalized = normalizeUser(result.Data);
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalized));
                return true;
            }

            return true;
        } catch (error: any) {
            const status = error?.status;
            const message = String(error?.message || '').toLowerCase();
            const accountRemoved =
                message.includes('người dùng không tồn tại') ||
                message.includes('tai khoan khong ton tai') ||
                (status === 401 && message.includes('không tồn tại'));
            const definitelyInvalidToken =
                status === 401 &&
                (message.includes('jwt') ||
                    message.includes('token') ||
                    message.includes('signature') ||
                    message.includes('expired'));

            if (accountRemoved || definitelyInvalidToken) {
                await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
                return false;
            }

            // keep session on transient network/server errors or ambiguous 401
            return true;
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
