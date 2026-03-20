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

// ──────────────────────────────────────────────
// API Response types (actual back-end format)
// ──────────────────────────────────────────────

export interface User {
    Id: string;
    Email: string;
    FullName: string;
    Phone: string;
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
