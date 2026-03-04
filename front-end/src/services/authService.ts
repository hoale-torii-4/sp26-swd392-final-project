import apiClient from "./apiClient";
import type {
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    User,
} from "../types/auth";

const AUTH_ENDPOINT = "/Auth";

// ── LocalStorage keys ──
const TOKEN_KEY = "token";
const USER_KEY = "user";

export const authService = {
    /**
     * POST /api/Auth/register
     */
    register: async (data: RegisterRequest): Promise<RegisterResponse> => {
        const response = await apiClient.post<RegisterResponse>(
            `${AUTH_ENDPOINT}/register`,
            data,
        );
        return response.data;
    },

    /**
     * POST /api/Auth/login
     * Stores token + user data in localStorage on success.
     */
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>(
            `${AUTH_ENDPOINT}/login`,
            data,
        );
        const result = response.data;

        if (result.Success && result.Data) {
            localStorage.setItem(TOKEN_KEY, result.Data.Token);
            localStorage.setItem(USER_KEY, JSON.stringify(result.Data.User));
        }

        return result;
    },

    /**
     * Clear auth data and log out.
     */
    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    /**
     * Get stored JWT token.
     */
    getToken: (): string | null => {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored user data.
     */
    getUser: (): User | null => {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as User;
        } catch {
            return null;
        }
    },

    /**
     * Check if user is authenticated.
     */
    isAuthenticated: (): boolean => {
        return !!localStorage.getItem(TOKEN_KEY);
    },

    /**
     * POST /api/Auth/change-password
     * Requires JWT token in Authorization header.
     */
    changePassword: async (data: { oldPassword: string; newPassword: string }) => {
        const token = localStorage.getItem(TOKEN_KEY);
        const response = await apiClient.post(
            `${AUTH_ENDPOINT}/change-password`,
            data,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        return response.data;
    },

    /**
     * POST /api/Auth/google-login
     * Sends the Google OAuth ID token to the backend.
     * On success, stores token + user data in localStorage.
     */
    googleLogin: async (idToken: string): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>(
            `${AUTH_ENDPOINT}/google-login`,
            { idToken },
        );
        const result = response.data;

        if (result.Success && result.Data) {
            localStorage.setItem(TOKEN_KEY, result.Data.Token);
            localStorage.setItem(USER_KEY, JSON.stringify(result.Data.User));
        }

        return result;
    },
};
