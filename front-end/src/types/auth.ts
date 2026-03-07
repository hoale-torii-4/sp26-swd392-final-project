// ──────────────────────────────────────────────
// Auth Types — mirrors back-end DTOs
// ──────────────────────────────────────────────

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    phone: string | null;
}

export interface RegisterResponse {
    message: string;
    userId: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
}

// ──────────────────────────────────────────────
// Generic API response wrapper
// ──────────────────────────────────────────────

export interface ApiError {
    message: string;
    status: number;
}
