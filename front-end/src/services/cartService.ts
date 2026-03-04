// ── Cart service — manages shopping cart state in localStorage ──

export interface CartItem {
    id: string;           // unique cart-item id
    productId: string;    // gift-box or custom-box id
    name: string;
    image: string;
    price: number;
    quantity: number;
    type: "gift-box" | "custom";   // "gift-box" = ready-made, "custom" = tự tạo
    tags?: string[];               // display tags like "GIỎ QUÀ CÓ SẴN", "BIẾU ĐỐI TÁC"
    description?: string;          // short description for custom boxes
    components?: string[];         // items inside custom box
}

const CART_KEY = "cart";

function getCart(): CartItem[] {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as CartItem[];
    } catch {
        return [];
    }
}

function saveCart(items: CartItem[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    // Dispatch a custom event so other components (e.g., Header badge) can react
    window.dispatchEvent(new Event("cart-updated"));
}

export const cartService = {
    getItems: (): CartItem[] => getCart(),

    getCount: (): number => {
        return getCart().reduce((sum, item) => sum + item.quantity, 0);
    },

    getTotal: (): number => {
        return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    addItem: (item: Omit<CartItem, "id">) => {
        const cart = getCart();
        // Check if same product already exists
        const existing = cart.find((c) => c.productId === item.productId && c.type === item.type);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            cart.push({ ...item, id: crypto.randomUUID() });
        }
        saveCart(cart);
    },

    updateQuantity: (id: string, quantity: number) => {
        const cart = getCart();
        const item = cart.find((c) => c.id === id);
        if (item) {
            item.quantity = Math.max(1, quantity);
            saveCart(cart);
        }
    },

    removeItem: (id: string) => {
        const cart = getCart().filter((c) => c.id !== id);
        saveCart(cart);
    },

    clearCart: () => {
        localStorage.removeItem(CART_KEY);
        window.dispatchEvent(new Event("cart-updated"));
    },
};
