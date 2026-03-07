import apiClient from "./apiClient";
import type {
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
} from "../types/auth";

const AUTH_ENDPOINT = "/Auth";

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
     */
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await apiClient.post<LoginResponse>(
            `${AUTH_ENDPOINT}/login`,
            data,
        );
        return response.data;
    },
};
