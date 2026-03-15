import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { cartService, type CartItemDto, type CartDto } from "../services/cartService";
import mixMatchDefault from "../assets/mix-match-default.svg";

/* ═══════════════════ HELPER ═══════════════════ */

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

function getTypeLabel(type: number): string {
    return type === 0 ? "GIỎ QUÀ CÓ SẴN" : "TỰ CHỈNH RIÊNG";
}

function getTypeColor(type: number): string {
    return type === 0 ? "bg-teal-700" : "bg-amber-600";
}

/* ═══════════════════ COMPONENT ═══════════════════ */

export default function CartPage() {
    const navigate = useNavigate();
    const [cart, setCart] = useState<CartDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchCart = async () => {
        try {
            setError(null);
            const data = await cartService.getCart();
            setCart(data);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { Message?: string } }; message?: string };
            setError(axiosErr?.response?.data?.Message || axiosErr?.message || "Không thể tải giỏ hàng.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const items = useMemo(() => cart?.Items ?? [], [cart]);

    useEffect(() => {
        if (!cart) return;

        if (!items.length) {
            setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
            return;
        }

        setSelectedIds((prev) => {
            const next = new Set<string>();
            items.forEach((item) => {
                if (prev.has(item.Id)) {
                    next.add(item.Id);
                }
            });
            if (next.size === prev.size && items.every((item) => prev.has(item.Id) === next.has(item.Id))) {
                return prev;
            }
            return next;
        });
    }, [cart, items]);

    const { selectedItems, selectedTotals } = useMemo(() => {
        const filtered = items.filter((item) => selectedIds.has(item.Id));
        const totalItems = filtered.reduce((sum, item) => sum + item.Quantity, 0);
        const totalAmount = filtered.reduce((sum, item) => sum + item.Quantity * item.UnitPrice, 0);
        return { selectedItems: filtered, selectedTotals: { totalItems, totalAmount } };
    }, [items, selectedIds]);

    const allSelected = items.length > 0 && selectedIds.size === items.length;
    const totalAmount = selectedTotals.totalAmount;
    const totalItems = selectedTotals.totalItems;

    const handleQuantityChange = async (itemId: string, currentQty: number, delta: number) => {
        const newQty = currentQty + delta;
        if (newQty < 1) return;
        try {
            const updated = await cartService.updateQuantity(itemId, newQty);
            setCart(updated);
        } catch {
            toast.error("Không thể cập nhật giỏ hàng. Vui lòng thử lại.");
        }
    };

    const handleRemove = async (itemId: string) => {
        try {
            await cartService.removeItem(itemId);
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
            await fetchCart(); // reload after remove
            toast.success("Đã xoá sản phẩm khỏi giỏ hàng");
        } catch {
            toast.error("Không thể xóa sản phẩm. Vui lòng thử lại.");
        }
    };

    const toggleSelectItem = (itemId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(items.map((item) => item.Id)));
    };

    const handleCheckoutSelected = () => {
        if (!selectedItems.length) return;
        navigate("/checkout", {
            state: {
                selectedItems,
                totalItems,
                totalAmount,
            },
        });
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
                {/* Loading */}
                {loading && (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <svg className="w-10 h-10 mx-auto text-[#8B1A1A] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-gray-500 text-sm">Đang tải giỏ hàng...</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <svg className="w-16 h-16 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Có lỗi xảy ra</h2>
                        <p className="text-sm text-gray-500 mb-4">{error}</p>
                        <button
                            onClick={() => { setLoading(true); fetchCart(); }}
                            className="px-5 py-2.5 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer"
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {/* Empty cart */}
                {!loading && !error && items.length === 0 && (
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
                )}

                {/* Cart with items */}
                {!loading && !error && items.length > 0 && (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* ──────── CART ITEMS LIST ──────── */}
                        <div className="flex-1 min-w-0 space-y-4">
                            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 accent-[#8B1A1A]"
                                    />
                                    Chọn tất cả
                                </label>
                                <span className="text-xs text-gray-400">
                                    Đã chọn {selectedItems.length}/{items.length} sản phẩm
                                </span>
                            </div>

                            {items.map((item) => (
                                <CartItemCard
                                    key={item.Id}
                                    item={item}
                                    selected={selectedIds.has(item.Id)}
                                    onSelect={toggleSelectItem}
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
                                        <span className="text-gray-500">Giá trị quà tặng ({totalItems})</span>
                                        <span className="text-gray-900 font-medium">{formatPrice(totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Phí đóng gói &amp; Trang trí</span>
                                        <span className="text-green-600 font-medium">Miễn phí</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-100 pt-3">
                                        <span className="text-gray-500">Tạm tính</span>
                                        <span className="text-gray-900 font-medium">{formatPrice(totalAmount)}</span>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="mt-5 pt-4 border-t border-gray-200">
                                    <p className="text-xs font-bold text-[#8B1A1A] uppercase tracking-wider mb-1">
                                        Tổng giá trị đơn quà
                                    </p>
                                    <p className="text-2xl font-bold text-[#8B1A1A]">
                                        {formatPrice(totalAmount)}
                                    </p>
                                </div>

                                {/* Checkout button */}
                                <button
                                    onClick={handleCheckoutSelected}
                                    disabled={selectedItems.length === 0}
                                    className="w-full mt-5 py-3.5 bg-[#8B1A1A] text-white text-sm font-bold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Thanh toán ({selectedItems.length})
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
    item: CartItemDto;
    selected: boolean;
    onSelect: (id: string) => void;
    onQuantityChange: (id: string, currentQty: number, delta: number) => void;
    onRemove: (id: string) => void;
}

function CartItemCard({ item, selected, onSelect, onQuantityChange, onRemove }: CartItemCardProps) {
    return (
        <div className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${selected ? "border-[#8B1A1A]" : "border-transparent"}`}>
            <div className="flex gap-5">
                <div className="pt-1">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onSelect(item.Id)}
                        className="w-4 h-4 accent-[#8B1A1A]"
                    />
                </div>
                {/* Product placeholder image */}
                <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-gray-300">
                    {item.ImageUrl ? (
                        <img
                            src={item.ImageUrl}
                            alt={item.Name ?? "Giỏ quà"}
                            className="w-full h-full object-cover"
                        />
                    ) : item.Type === 1 ? (
                        <img
                            src={mixMatchDefault}
                            alt="Giỏ quà Mix & Match"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-gray-900 text-base mb-1.5">
                                {item.Name || "Sản phẩm"}
                            </h3>
                            {/* Type tag */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-white rounded ${getTypeColor(item.Type)}`}>
                                    {getTypeLabel(item.Type)}
                                </span>
                            </div>
                        </div>

                        {/* Delete button */}
                        <button
                            onClick={() => onRemove(item.Id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Xóa sản phẩm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                    </div>

                    {/* Unit price */}
                    <p className="text-xs text-gray-500 mb-2">
                        Đơn giá: {formatPrice(item.UnitPrice)}
                    </p>

                    {/* Bottom row: quantity + price */}
                    <div className="flex items-center justify-between mt-2">
                        {/* Quantity selector */}
                        <div className="flex items-center border border-gray-200 rounded-lg">
                            <button
                                onClick={() => onQuantityChange(item.Id, item.Quantity, -1)}
                                disabled={item.Quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-gray-900">
                                {item.Quantity}
                            </span>
                            <button
                                onClick={() => onQuantityChange(item.Id, item.Quantity, 1)}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>

                        {/* Total price for this item */}
                        <p className="text-lg font-bold text-[#8B1A1A]">
                            {formatPrice(item.UnitPrice * item.Quantity)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
