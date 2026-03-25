import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { cartService, type CartItemDto, type CartDto } from "../services/cartService";
import { FiLoader, FiAlertCircle, FiShoppingCart, FiChevronRight, FiInfo, FiCheckCircle, FiTruck, FiBox, FiTrash2, FiMinus, FiPlus } from "react-icons/fi";
import mixMatchDefault from "../assets/mix-match-default.svg";

/* ═══════════════════ HELPER ═══════════════════ */

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

function getTypeLabel(type: number | string): string {
    return (type === 0 || type === "READY_MADE") ? "GIỎ QUÀ CÓ SẴN" : "TỰ CHỈNH RIÊNG";
}

function getTypeColor(type: number | string): string {
    return (type === 0 || type === "READY_MADE") ? "bg-teal-700" : "bg-amber-600";
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
    const activeItems = useMemo(() => items.filter(i => i.IsActive !== false), [items]);

    useEffect(() => {
        if (!cart) return;

        if (!items.length) {
            setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
            return;
        }

        setSelectedIds((prev) => {
            const next = new Set<string>();
            items.forEach((item) => {
                if (prev.has(item.Id) && item.IsActive !== false) {
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
        const filtered = items.filter((item) => selectedIds.has(item.Id) && item.IsActive !== false);
        const totalItems = filtered.reduce((sum, item) => sum + item.Quantity, 0);
        const totalAmount = filtered.reduce((sum, item) => sum + item.Quantity * item.UnitPrice, 0);
        return { selectedItems: filtered, selectedTotals: { totalItems, totalAmount } };
    }, [items, selectedIds]);

    const allSelected = activeItems.length > 0 && selectedIds.size === activeItems.length;
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
        const item = items.find(i => i.Id === itemId);
        if (item?.IsActive === false) return;

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
        setSelectedIds(new Set(activeItems.map((item) => item.Id)));
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
                        <FiLoader className="w-10 h-10 mx-auto text-[#8B1A1A] animate-spin mb-4" />
                        <p className="text-gray-500 text-sm">Đang tải giỏ hàng...</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <FiAlertCircle className="w-16 h-16 mx-auto text-red-300 mb-4" />
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
                        <FiShoppingCart className="w-20 h-20 mx-auto text-gray-300 mb-5" strokeWidth={1.2} />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Hãy khám phá bộ sưu tập quà Tết sang trọng của chúng tôi!
                        </p>
                        <Link
                            to="/gift-boxes"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors"
                        >
                            Khám phá giỏ quà
                            <FiChevronRight className="w-4 h-4" />
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
                                        disabled={activeItems.length === 0}
                                        className="w-4 h-4 accent-[#8B1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    Chọn tất cả
                                </label>
                                <span className="text-xs text-gray-400">
                                    Đã chọn {selectedItems.length}/{activeItems.length} sản phẩm
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
                                    <FiChevronRight className="w-4 h-4" />
                                </button>

                                {/* Helper note */}
                                <p className="mt-4 text-xs text-gray-400 flex items-start gap-1.5">
                                    <FiInfo className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    Bạn sẽ chọn hình thức giao hàng và lời chúc ở bước tiếp theo.
                                </p>

                                {/* Trust badges */}
                                <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
                                    <div className="flex items-center gap-2.5 text-xs text-gray-500">
                                        <FiCheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                        Cam kết hàng chính hãng 100%
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs text-gray-500">
                                        <FiTruck className="w-4 h-4 text-blue-600 shrink-0" />
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
    const isInactive = item.IsActive === false;

    return (
        <div className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-colors ${selected ? "border-[#8B1A1A]" : "border-transparent"} ${isInactive ? "opacity-60 bg-gray-50" : ""}`}>
            <div className="flex gap-4 sm:gap-5">
                <div className="pt-1">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onSelect(item.Id)}
                        disabled={isInactive}
                        className="w-4 h-4 accent-[#8B1A1A] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    />
                </div>
                {/* Product placeholder image */}
                <Link to={(item.Type === 0 || item.Type === "READY_MADE") ? `/gift-boxes/${item.ProductId || item.Id}` : '/custom-box'} className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 hover:opacity-80 transition-opacity ${isInactive ? "grayscale" : ""}`}>
                    {item.ImageUrl ? (
                        <img
                            src={item.ImageUrl}
                            alt={item.Name ?? "Giỏ quà"}
                            className="w-full h-full object-cover"
                        />
                    ) : (item.Type === 1 || item.Type === "MIX_MATCH") ? (
                        <img
                            src={mixMatchDefault}
                            alt="Giỏ quà Mix & Match"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <FiBox className="w-10 h-10" />
                    )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <Link to={(item.Type === 0 || item.Type === "READY_MADE") ? `/gift-boxes/${item.ProductId || item.Id}` : '/custom-box'} className="font-bold text-gray-900 text-base mb-1.5 hover:text-[#8B1A1A] transition-colors line-clamp-2">
                                {item.Name || "Sản phẩm"}
                            </Link>
                            {/* Type tag */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-white rounded ${getTypeColor(item.Type)}`}>
                                    {getTypeLabel(item.Type)}
                                </span>
                                {isInactive && item.StatusLabel && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-white rounded bg-red-600">
                                        {item.StatusLabel}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Delete button */}
                        <button
                            onClick={() => onRemove(item.Id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Xóa sản phẩm"
                        >
                            <FiTrash2 className="w-5 h-5" />
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
                                disabled={item.Quantity <= 1 || isInactive}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                <FiMinus className="w-3.5 h-3.5" />
                            </button>
                            <span className={`w-8 text-center text-sm font-medium ${isInactive ? "text-gray-400" : "text-gray-900"}`}>
                                {item.Quantity}
                            </span>
                            <button
                                onClick={() => onQuantityChange(item.Id, item.Quantity, 1)}
                                disabled={isInactive}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                <FiPlus className="w-3.5 h-3.5" />
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
