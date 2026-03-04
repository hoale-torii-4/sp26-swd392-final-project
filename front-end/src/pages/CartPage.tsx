import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { cartService, type CartItem } from "../services/cartService";

/* ═══════════════════ HELPER ═══════════════════ */

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

/* ═══════════════════ COMPONENT ═══════════════════ */

export default function CartPage() {
    const [items, setItems] = useState<CartItem[]>([]);

    const reload = () => setItems(cartService.getItems());

    useEffect(() => {
        reload();
    }, []);

    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);

    const handleQuantityChange = (id: string, delta: number) => {
        const item = items.find((i) => i.id === id);
        if (!item) return;
        cartService.updateQuantity(id, item.quantity + delta);
        reload();
    };

    const handleRemove = (id: string) => {
        cartService.removeItem(id);
        reload();
    };

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
            <Header />

            {/* ════════ HERO TITLE ════════ */}
            <section className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-10 pb-6">
                <h1 className="font-serif text-4xl lg:text-5xl text-[#8B1A1A] font-bold italic mb-3">
                    Giỏ hàng
                </h1>
                <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
                    Gói trọn chân tình qua từng thức quà trân quý, thay lời chúc Xuân an khang và
                    thịnh vượng đến những người thương yêu.
                </p>
            </section>

            {/* ════════ MAIN LAYOUT ════════ */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pb-14">
                {items.length === 0 ? (
                    /* Empty cart */
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <svg className="w-20 h-20 mx-auto text-gray-300 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                        </svg>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Hãy khám phá bộ sưu tập quà Tết sang trọng của chúng tôi!
                        </p>
                        <Link
                            to="/gift-boxes"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors"
                        >
                            Khám phá giỏ quà
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* ──────── CART ITEMS LIST ──────── */}
                        <div className="flex-1 min-w-0 space-y-4">
                            {items.map((item) => (
                                <CartItemCard
                                    key={item.id}
                                    item={item}
                                    onQuantityChange={handleQuantityChange}
                                    onRemove={handleRemove}
                                />
                            ))}
                        </div>

                        {/* ──────── ORDER SUMMARY SIDEBAR ──────── */}
                        <aside className="w-full lg:w-96 shrink-0">
                            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                                <h3 className="font-serif text-lg font-bold text-gray-900 mb-5">
                                    Tóm tắt đơn hàng
                                </h3>

                                {/* Breakdown rows */}
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Giá trị quà tặng ({totalQty})</span>
                                        <span className="text-gray-900 font-medium">{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Phí đóng gói &amp; Trang trí</span>
                                        <span className="text-green-600 font-medium">Miễn phí</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-100 pt-3">
                                        <span className="text-gray-500">Tạm tính</span>
                                        <span className="text-gray-900 font-medium">{formatPrice(subtotal)}</span>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="mt-5 pt-4 border-t border-gray-200">
                                    <p className="text-xs font-bold text-[#8B1A1A] uppercase tracking-wider mb-1">
                                        Tổng giá trị đơn quà
                                    </p>
                                    <p className="text-2xl font-bold text-[#8B1A1A]">
                                        {formatPrice(subtotal)}
                                    </p>
                                </div>

                                {/* Checkout button */}
                                <button className="w-full mt-5 py-3.5 bg-[#8B1A1A] text-white text-sm font-bold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer flex items-center justify-center gap-2">
                                    Thanh toán
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>

                                {/* Helper note */}
                                <p className="mt-4 text-xs text-gray-400 flex items-start gap-1.5">
                                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Bạn sẽ chọn hình thức giao hàng và lời chúc ở bước tiếp theo.
                                </p>

                                {/* Trust badges */}
                                <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
                                    <div className="flex items-center gap-2.5 text-xs text-gray-500">
                                        <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Cam kết hàng chính hãng 100%
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs text-gray-500">
                                        <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75M7.5 14.25v-5.625m0 0H2.25m5.25 0h8.25m0 0v5.625m0-5.625h5.25" />
                                        </svg>
                                        Giao hàng nhanh toàn quốc
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

/* ══════════════════════════════════════════════════
   CART ITEM CARD
   ══════════════════════════════════════════════════ */

interface CartItemCardProps {
    item: CartItem;
    onQuantityChange: (id: string, delta: number) => void;
    onRemove: (id: string) => void;
}

function CartItemCard({ item, onQuantityChange, onRemove }: CartItemCardProps) {
    const [showComponents, setShowComponents] = useState(false);

    const tagColors: Record<string, string> = {
        "GIỎ QUÀ CÓ SẴN": "bg-teal-700",
        "BIẾU ĐỐI TÁC": "bg-[#8B1A1A]",
        "TỰ CHỈNH RIÊNG": "bg-amber-600",
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex gap-5">
                {/* Product image */}
                <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {item.image ? (
                        <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-gray-900 text-base mb-1.5">{item.name}</h3>
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {item.tags?.map((tag, i) => (
                                    <span
                                        key={i}
                                        className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-white rounded ${tagColors[tag] || "bg-gray-500"}`}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Delete button */}
                        <button
                            onClick={() => onRemove(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Xóa sản phẩm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                    </div>

                    {/* Description (for custom boxes) */}
                    {item.description && (
                        <p className="text-xs text-gray-500 mb-1">{item.description}</p>
                    )}

                    {/* Expandable components list */}
                    {item.components && item.components.length > 0 && (
                        <button
                            onClick={() => setShowComponents(!showComponents)}
                            className="flex items-center gap-1 text-xs text-[#8B1A1A] font-medium mb-2 hover:underline cursor-pointer"
                        >
                            <svg className={`w-3 h-3 transition-transform ${showComponents ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {showComponents ? "ẨN THÀNH PHẦN" : "XEM THÀNH PHẦN"}
                        </button>
                    )}
                    {showComponents && item.components && (
                        <ul className="text-xs text-gray-500 list-disc list-inside mb-2 space-y-0.5">
                            {item.components.map((c, i) => (
                                <li key={i}>{c}</li>
                            ))}
                        </ul>
                    )}

                    {/* Bottom row: quantity + price */}
                    <div className="flex items-center justify-between mt-2">
                        {/* Quantity selector */}
                        <div className="flex items-center border border-gray-200 rounded-lg">
                            <button
                                onClick={() => onQuantityChange(item.id, -1)}
                                disabled={item.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-gray-900">
                                {item.quantity}
                            </span>
                            <button
                                onClick={() => onQuantityChange(item.id, 1)}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>

                        {/* Price */}
                        <p className="text-lg font-bold text-[#8B1A1A]">
                            {formatPrice(item.price * item.quantity)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
