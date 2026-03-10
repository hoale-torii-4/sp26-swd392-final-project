import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { cartService, type CartDto, type CartItemDto } from "../services/cartService";
import { authService } from "../services/authService";

/* ═══════════════════ HELPERS ═══════════════════ */

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

function getTypeBadge(type: number) {
    return type === 0
        ? { label: "GIỎ QUÀ CÓ SẴN", bg: "bg-teal-700" }
        : { label: "TÙY CHỈNH RIÊNG", bg: "bg-amber-600" };
}

/* ═══════════════════ PAGE ═══════════════════ */

export default function CheckoutPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [cart, setCart] = useState<CartDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deliveryMethod, setDeliveryMethod] = useState<"single" | "multi">("single");
    const isLoggedIn = authService.isAuthenticated();

    const checkoutState = location.state as
        | {
            buyNow?: boolean;
            items?: CartItemDto[];
            totalItems?: number;
            totalAmount?: number;
            selectedItems?: CartItemDto[];
        }
        | undefined;

    const isBuyNow = !!checkoutState?.buyNow && Array.isArray(checkoutState.items);
    const isSelectedCheckout = !isBuyNow && Array.isArray(checkoutState?.selectedItems);

    useEffect(() => {
        if (isBuyNow || isSelectedCheckout) {
            setLoading(false);
            return;
        }

        cartService
            .getCart()
            .then(setCart)
            .catch(() => setError("Không thể tải giỏ hàng."))
            .finally(() => setLoading(false));
    }, [isBuyNow, isSelectedCheckout]);

    const items = isBuyNow
        ? checkoutState?.items ?? []
        : isSelectedCheckout
            ? checkoutState?.selectedItems ?? []
            : cart?.Items ?? [];
    const totalAmount = isBuyNow
        ? checkoutState?.totalAmount ?? 0
        : isSelectedCheckout
            ? items.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0)
            : cart?.TotalAmount ?? 0;
    const totalItems = isBuyNow
        ? checkoutState?.totalItems ?? 0
        : isSelectedCheckout
            ? items.reduce((sum, item) => sum + item.Quantity, 0)
            : cart?.TotalItems ?? 0;

    /* ═══════════════════ LOADING ═══════════════════ */
    if (loading) {
        return (
            <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <svg className="w-10 h-10 text-[#8B1A1A] animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
                <Footer />
            </div>
        );
    }

    if (error || items.length === 0) {
        return (
            <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center">
                        <svg className="w-20 h-20 mx-auto text-gray-300 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                        </svg>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {error || "Giỏ hàng trống"}
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Vui lòng thêm sản phẩm vào giỏ trước khi thanh toán.
                        </p>
                        <Link
                            to="/gift-boxes"
                            className="px-6 py-3 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors"
                        >
                            Khám phá giỏ quà
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
            <Header />

            {/* ════════ BREADCRUMB ════════ */}
            <nav className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-6 pb-2">
                <ol className="flex items-center gap-2 text-xs text-gray-400">
                    <li><Link to="/" className="hover:text-[#8B1A1A] transition-colors">TRANG CHỦ</Link></li>
                    <li>/</li>
                    <li>
                        {isBuyNow ? (
                            <span className="text-gray-400">MUA NGAY</span>
                        ) : isSelectedCheckout ? (
                            <span className="text-gray-400">GIỎ HÀNG (ĐÃ CHỌN)</span>
                        ) : (
                            <Link to="/cart" className="hover:text-[#8B1A1A] transition-colors">GIỎ HÀNG</Link>
                        )}
                    </li>
                    <li>/</li>
                    <li className="text-[#8B1A1A] font-medium">XÁC NHẬN ĐƠN HÀNG</li>
                </ol>
            </nav>

            {/* ════════ PAGE TITLE ════════ */}
            <section className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-4 pb-6">
                <h1 className="font-serif text-3xl lg:text-4xl text-[#8B1A1A] font-bold italic">
                    Xác nhận đơn hàng
                </h1>
            </section>

            {/* ════════ TWO-COLUMN LAYOUT ════════ */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pb-14">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* ──────── LEFT: Gift Details ──────── */}
                    <div className="flex-1 min-w-0 space-y-5">
                        {/* Section header */}
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                            Chi tiết quà tặng
                        </h2>

                        {/* Product cards */}
                        <div className="space-y-4">
                            {items.map((item) => (
                                <OrderItemCard key={item.Id} item={item} />
                            ))}
                        </div>

                        {/* ── Pricing Summary ── */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">
                                        Giá trị quà tặng ({totalItems})
                                    </span>
                                    <span className="text-gray-900 font-medium">
                                        {formatPrice(totalAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Phí vận chuyển</span>
                                    <span className="text-green-600 font-semibold">Miễn phí</span>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-200 pt-3 mt-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-bold text-gray-900">Tổng cộng</span>
                                        <span className="text-2xl font-bold text-[#8B1A1A]">
                                            {formatPrice(totalAmount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ──────── RIGHT: Delivery & Actions ──────── */}
                    <div className="w-full lg:w-96 shrink-0 space-y-5">
                        {/* ── Delivery Method Card ── */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5">
                                Hình thức giao hàng
                            </h3>

                            <div className="space-y-3">
                                {/* Option 1: Single address */}
                                <label
                                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryMethod === "single"
                                        ? "border-[#8B1A1A] bg-[#8B1A1A]/5"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="delivery"
                                        checked={deliveryMethod === "single"}
                                        onChange={() => setDeliveryMethod("single")}
                                        className="mt-0.5 w-4 h-4 accent-[#8B1A1A]"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Giao 1 địa chỉ</p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                            Phù hợp khi gửi quà cho cá nhân hoặc gia đình.
                                        </p>
                                    </div>
                                </label>

                                {/* Option 2: Multi address — unlocked for logged-in users */}
                                {isLoggedIn ? (
                                    <label
                                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryMethod === "multi"
                                            ? "border-[#8B1A1A] bg-[#8B1A1A]/5"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="delivery"
                                            checked={deliveryMethod === "multi"}
                                            onChange={() => setDeliveryMethod("multi")}
                                            className="mt-0.5 w-4 h-4 accent-[#8B1A1A]"
                                        />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Giao nhiều địa chỉ (B2B)</p>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                Phù hợp cho doanh nghiệp gửi quà đến nhiều đối tác, khách hàng.
                                            </p>
                                        </div>
                                    </label>
                                ) : (
                                    <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed">
                                        <div className="mt-0.5">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-gray-400">
                                                    Giao nhiều địa chỉ (B2B)
                                                </p>
                                                <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-gray-200 text-gray-500 rounded">
                                                    Member only
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                                                Đăng nhập để sử dụng tính năng giao nhiều địa chỉ cho doanh nghiệp.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Action Buttons ── */}
                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={() => navigate("/checkout/payment", {
                                        state: {
                                            buyNow: isBuyNow ? true : undefined,
                                            items: isBuyNow ? items : undefined,
                                            totalItems: isBuyNow ? totalItems : undefined,
                                            totalAmount: isBuyNow ? totalAmount : undefined,
                                            selectedItems: isSelectedCheckout ? items : undefined,
                                        },
                                    })}
                                    className="w-full py-3.5 bg-[#8B1A1A] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors cursor-pointer flex items-center justify-center gap-2"
                                >
                                    Tiếp tục
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </button>

                                {!isBuyNow && !isSelectedCheckout && (
                                    <Link
                                        to="/cart"
                                        className="block w-full text-center text-sm text-gray-500 hover:text-[#8B1A1A] transition-colors py-2"
                                    >
                                        Quay lại giỏ hàng
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* ── Trust Banner ── */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
                            {/* Shield icon */}
                            <div className="w-11 h-11 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6 text-[#8B1A1A]" fill="currentColor" viewBox="0 0 24 24">
                                    <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#8B1A1A] uppercase tracking-wider mb-1">
                                    Cam kết Lộc Xuân
                                </p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Sản phẩm chính hãng 100%. Vận chuyển chuyên nghiệp, bảo hiểm đơn hàng tận tâm.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

/* ══════════════════════════════════════════════════
   ORDER ITEM CARD
   ══════════════════════════════════════════════════ */

function OrderItemCard({ item }: { item: CartItemDto }) {
    const badge = getTypeBadge(item.Type);

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex gap-5">
                {/* Product image placeholder */}
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-gray-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-gray-900 text-base mb-1">
                                {item.Name || "Sản phẩm"}
                            </h3>
                            {/* Type badge */}
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-white rounded ${badge.bg}`}>
                                {badge.label}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-end justify-between mt-3">
                        <p className="text-xs text-gray-500">
                            Số lượng: {String(item.Quantity).padStart(2, "0")}
                        </p>
                        <p className="text-lg font-bold text-[#8B1A1A]">
                            {formatPrice(item.UnitPrice * item.Quantity)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
