import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { authService } from "../services/authService";
import { orderService } from "../services/orderService";

interface MyOrderItemDto {
    Name: string;
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
    Type: string;
}

interface MyOrderResponseDto {
    Id: string;
    OrderCode: string;
    OrderType: string;
    Status: string;
    TotalAmount: number;
    CreatedAt: string;
    DeliveryDate: string;
    TotalItems: number;
    Items: MyOrderItemDto[];
}

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

export default function OrdersPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = authService.getUser();
    const initials = user?.FullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

    const [orders, setOrders] = useState<MyOrderResponseDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            navigate("/login");
            return;
        }

        const loadOrders = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await orderService.getMyOrders();
                const payload = res?.Data ?? res?.data ?? [];
                setOrders(payload);
            } catch (err: any) {
                setError(err?.message ?? "Không thể tải đơn hàng.");
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    const formatDate = (value: string) => {
        if (!value) return "--";
        return new Date(value).toLocaleDateString("vi-VN");
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
                        <div>
                            <h1 className="text-2xl font-serif font-bold italic text-[#8B1A1A]">Đơn hàng của tôi</h1>
                            <p className="text-sm text-gray-500 mt-1">Theo dõi các đơn hàng bạn đã đặt.</p>
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
                        ) : orders.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                                <p className="text-gray-400 text-sm">Bạn chưa có đơn hàng nào.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <div key={order.Id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-400">Mã đơn</p>
                                                <p className="text-sm font-semibold text-gray-900">{order.OrderCode}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-400">Trạng thái</p>
                                                <p className="text-sm font-semibold text-[#8B1A1A]">{order.Status}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-400">Ngày đặt</p>
                                                <p className="text-sm text-gray-700">{formatDate(order.CreatedAt)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-400">Tổng tiền</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {order.TotalAmount.toLocaleString("vi-VN")}₫
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {order.Items.map((item, idx) => (
                                                <div key={`${order.Id}-${idx}`} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                                                    <p className="text-sm font-semibold text-gray-900 mb-1">{item.Name}</p>
                                                    <p className="text-xs text-gray-500">Số lượng: {item.Quantity}</p>
                                                    <p className="text-xs text-gray-500">Đơn giá: {item.UnitPrice.toLocaleString("vi-VN")}₫</p>
                                                    <p className="text-sm font-semibold text-[#8B1A1A] mt-2">
                                                        {item.TotalPrice.toLocaleString("vi-VN")}₫
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
