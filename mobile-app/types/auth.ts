// ──────────────────────────────────────────────
// Auth Types — mirrors back-end DTOs
// ──────────────────────────────────────────────

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    phone: string | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface GoogleLoginRequest {
    idToken: string;
}

// ──────────────────────────────────────────────
// API Response types (actual back-end format)
// ──────────────────────────────────────────────

export enum UserRole {
    MEMBER = 0,
    STAFF = 1,
    ADMIN = 2,
}

export type SiteMode = 'customer' | 'admin';

export interface User {
    Id: string;
    Email: string;
    FullName: string;
    Phone: string;
    BankName?: string;
    BankAccountNumber?: string;
    Role: number | string;
    Status: number | string;
    CreatedAt: string;
}

export interface LoginData {
    Token: string;
    User: User;
    ExpiresAt: string;
}

export interface ApiResponse<T = unknown> {
    Success: boolean;
    Message: string;
    Data: T;
    Errors: string[];
    Timestamp: string;
}

export type LoginResponse = ApiResponse<LoginData>;
export type RegisterResponse = ApiResponse<{ userId: string }>;

// ──────────────────────────────────────────────
// Generic API error
// ──────────────────────────────────────────────

export interface ApiError {
    message: string;
    status: number;
}

export const isInternalRole = (role?: number | string | null): boolean => {
    if (role === null || role === undefined) return false;

    if (typeof role === 'string') {
        const normalized = role.trim().toUpperCase();
        return normalized === 'STAFF' || normalized === 'ADMIN';
    }

    return role === UserRole.STAFF || role === UserRole.ADMIN;
};
