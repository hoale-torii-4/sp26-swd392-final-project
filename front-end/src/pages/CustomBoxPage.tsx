import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { authService } from "../services/authService";
import { mixMatchService } from "../services/mixMatchService";
import { cartService } from "../services/cartService";

const sidebarLinks = [
    {
        label: "Thông tin tài khoản",
        to: "/account",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
        ),
    },
    {
        label: "Đơn hàng của tôi",
        to: "/orders",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
    },
    {
        label: "Sổ địa chỉ",
        to: "/addresses",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
        ),
    },
    {
        label: "Giỏ quà custom",
        to: "/custom-box",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3.75l7.5 4.125v8.25L12 20.25l-7.5-4.125v-8.25L12 3.75z" />
            </svg>
        ),
    },
];

export default function CustomBoxPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = authService.getUser();
    const initials = user?.FullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

    const [customBoxes, setCustomBoxes] = useState<any[]>([]);
    const [selectedBoxIds, setSelectedBoxIds] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            navigate("/login");
            return;
        }
        const loadCustomBoxes = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await mixMatchService.getMyCustomBoxes();
                const payload = res?.Data ?? res?.data ?? res ?? [];
                setCustomBoxes(payload);
                const selectedInit: Record<string, boolean> = {};
                payload.forEach((box: any) => {
                    const key = box.Id ?? box.id;
                    if (key) selectedInit[key] = false;
                });
                setSelectedBoxIds(selectedInit);
            } catch (err: any) {
                if (err?.status === 404) {
                    setCustomBoxes([]);
                } else {
                    setError(err?.message ?? "Không thể tải giỏ quà custom.");
                }
            } finally {
                setLoading(false);
            }
        };

        loadCustomBoxes();
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    const toggleSelect = (id: string) => {
        setSelectedBoxIds((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const handleAddSelectedToCart = async () => {
        const selectedIds = Object.entries(selectedBoxIds)
            .filter(([, isSelected]) => isSelected)
            .map(([id]) => id);

        if (selectedIds.length === 0) {
            setError("Vui lòng chọn ít nhất một giỏ quà custom để thêm vào giỏ hàng.");
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            await cartService.addToCartBatch(
                selectedIds.map((id) => ({
                    Type: 1,
                    CustomBoxId: id,
                    Quantity: 1,
                })),
            );
            setSelectedBoxIds((prev) => {
                const next: Record<string, boolean> = {};
                Object.keys(prev).forEach((key) => {
                    next[key] = false;
                });
                return next;
            });
        } catch (err: any) {
            setError(err?.message ?? "Không thể thêm giỏ quà vào giỏ hàng.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="font-sans bg-[#F5F5F5] min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 lg:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
                    <aside className="bg-white rounded-2xl p-6 h-fit shadow-sm">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto bg-[#1B3022] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3">
                                {initials}
                            </div>
                            <p className="font-serif font-bold text-gray-900">{user?.FullName}</p>
                        </div>
                        <nav className="space-y-1">
                            {sidebarLinks.map((link) => {
                                const isActive = location.pathname === link.to;
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                            ? "bg-[#8B1A1A]/10 text-[#8B1A1A] font-semibold"
                                            : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        <span className={isActive ? "text-[#8B1A1A]" : "text-gray-400"}>{link.icon}</span>
                                        {link.label}
                                    </Link>
                                );
                            })}
                            <div className="border-t border-gray-100 !my-3" />
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-[#8B1A1A] transition-colors w-full cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                </svg>
                                Đăng xuất
                            </button>
                        </nav>
                    </aside>

                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-serif font-bold italic text-[#8B1A1A]">Giỏ quà custom</h1>
                                <p className="text-sm text-gray-500 mt-1">Quản lý giỏ quà tùy chọn của bạn.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleAddSelectedToCart}
                                    disabled={submitting}
                                    className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${submitting
                                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                        : "bg-[#1B3022] text-white hover:bg-[#142318]"
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.2 2.4a1 1 0 00.9 1.6h12.6m-9 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                    </svg>
                                    {submitting ? "Đang thêm..." : "Thêm vào giỏ hàng"}
                                </button>
                                <Link
                                    to="/mix-match"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Tạo giỏ quà mới
                                </Link>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <svg className="w-8 h-8 text-[#8B1A1A] animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : error ? (
                            <div className="bg-white rounded-2xl p-8 shadow-sm">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        ) : customBoxes.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 3.75l7.5 4.125v8.25L12 20.25l-7.5-4.125v-8.25L12 3.75z" />
                                </svg>
                                <p className="text-gray-400 text-sm">Bạn chưa tạo giỏ quà custom nào.</p>
                                <Link
                                    to="/mix-match"
                                    className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-[#8B1A1A] text-white text-xs font-bold uppercase rounded-lg hover:bg-[#701515] transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Tạo giỏ quà đầu tiên
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {customBoxes.map((customBox) => {
                                    const boxId = customBox.Id ?? customBox.id;
                                    return (
                                        <div
                                            key={boxId}
                                            className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${selectedBoxIds[boxId] ? "border-[#8B1A1A]" : "border-transparent"}`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(selectedBoxIds[boxId])}
                                                        onChange={() => toggleSelect(boxId)}
                                                        className="w-4 h-4 accent-[#8B1A1A]"
                                                    />
                                                    <span className="px-3 py-1 rounded-full bg-[#8B1A1A]/10 text-[#8B1A1A] font-semibold">
                                                        {customBox.TotalItems ?? customBox.totalItems ?? 0} sản phẩm
                                                    </span>
                                                    <span className="font-semibold text-gray-800">
                                                        Tổng tiền: {(customBox.TotalPrice ?? customBox.totalPrice ?? 0).toLocaleString("vi-VN")}₫
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    Tạo lúc: {customBox.CreatedAt ? new Date(customBox.CreatedAt).toLocaleDateString("vi-VN") : "--"}
                                                </span>
                                            </div>

                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(customBox.Items ?? customBox.items ?? []).map((item: any) => (
                                                    <div key={`${boxId}-${item.ItemId ?? item.itemId}`} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                        <p className="text-sm font-semibold text-gray-900 mb-1">{item.Name ?? item.name}</p>
                                                        <p className="text-xs text-gray-500">Số lượng: {item.Quantity ?? item.quantity}</p>
                                                        <p className="text-xs text-gray-500">Đơn giá: {(item.Price ?? item.price ?? 0).toLocaleString("vi-VN")}₫</p>
                                                        <p className="text-sm font-semibold text-[#8B1A1A] mt-2">
                                                            {(item.Subtotal ?? item.subtotal ?? 0).toLocaleString("vi-VN")}₫
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
