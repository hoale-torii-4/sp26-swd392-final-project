import apiClient from "./apiClient";
import type {
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ApiResponse,
    User,
} from "../types/auth";

const AUTH_ENDPOINT = "/Auth";

// ── LocalStorage keys ──
const TOKEN_KEY = "token";
const USER_KEY = "user";

export interface DecodedToken {
    email: string;
    exp: number;
    iat: number;
    nameid: string; // User ID mapping from back-end
    role: string;
}

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
     * Clear guest cart session after logout to avoid reusing old guest cart.
     */
    clearGuestCartSession: () => {
        localStorage.removeItem("cart_session_id");
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
     * Check if user is an ADMIN or STAFF
     */
    isAdmin: () => {
        if (!authService.isAuthenticated()) return false;
        try {
            const user = authService.getUser();
            if (user && (
                user.Role === 1 || user.Role === 2 || 
                user.Role === "ADMIN" || user.Role === "STAFF" || 
                user.Role === "1" || user.Role === "2"
            )) return true;

            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) return false;
            const payload = token.split(".")[1];
            const decoded = JSON.parse(atob(payload)) as DecodedToken;
            return decoded.role === "ADMIN" || decoded.role === "STAFF" || decoded.role === "1" || decoded.role === "2";
        } catch {
            return false;
        }
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

    /**
     * POST /api/Auth/verify-email
     * Verifies the 6-digit OTP sent to the user's email after registration.
     */
    verifyOtp: async (data: { email: string; otp: string }): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(
            `${AUTH_ENDPOINT}/verify-email`,
            data,
        );
        return response.data;
    },

    /**
     * POST /api/Auth/resend-otp
     * Resends the OTP to the user's email.
     */
    resendOtp: async (email: string): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(
            `${AUTH_ENDPOINT}/resend-otp`,
            { email },
        );
        return response.data;
    },

    /**
     * POST /api/Auth/forgot-password
     * Sends a password reset email / OTP to the user.
     */
    forgotPassword: async (email: string): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(
            `${AUTH_ENDPOINT}/forgot-password`,
            { email },
        );
        return response.data;
    },

    /**
     * POST /api/Auth/reset-password
     * Resets the password using the email, OTP, and new password.
     */
    resetPassword: async (data: { email: string; otp: string; newPassword: string }): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(
            `${AUTH_ENDPOINT}/reset-password`,
            data,
        );
        return response.data;
    },

    /**
     * PUT /api/Auth/profile
     * Updates user's name and phone number.
     */
    updateProfile: async (data: { fullName: string; phone: string | null; bankName?: string | null; bankAccountNumber?: string | null; bankAccountName?: string | null }) => {
        const response = await apiClient.put<ApiResponse>(
            `${AUTH_ENDPOINT}/profile`,
            data,
        );
        const result = response.data;
        if (result.Success && result.Data) {
            // Update stored user
            const currentToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
            const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
            
            const loginRes = {
                Token: currentToken,
                User: result.Data,
                ExpiresAt: new Date().toISOString()
            };
            store.setItem(USER_KEY, JSON.stringify(loginRes.User));
        }
        return result;
    },

    /**
     * Check if user has completed bank account information.
     */
    hasBankInfo: (): boolean => {
        const user = authService.getUser();
        if (!user) return false;
        return !!(user.BankName && user.BankAccountNumber && user.BankAccountName);
    },
};
