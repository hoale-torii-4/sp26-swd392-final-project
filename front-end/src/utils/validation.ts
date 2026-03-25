const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0\d{9,10}$/;
const ORDER_CODE_REGEX = /^[A-Za-z0-9-]{6,30}$/;

export function normalizePhone(value: string): string {
    return value.replace(/\D/g, "");
}

export function isValidEmail(value: string): boolean {
    return EMAIL_REGEX.test(value.trim());
}

export function isValidPhone(value: string): boolean {
    return PHONE_REGEX.test(normalizePhone(value));
}

export function isValidEmailOrPhone(value: string): boolean {
    const input = value.trim();
    return isValidEmail(input) || isValidPhone(input);
}

export function isValidOrderCode(value: string): boolean {
    return ORDER_CODE_REGEX.test(value.trim());
}

export function isValidFutureOrTodayDate(value: string): boolean {
    if (!value) return false;
    const input = new Date(value);
    if (Number.isNaN(input.getTime())) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selected = new Date(input.getFullYear(), input.getMonth(), input.getDate());
    return selected >= today;
}
