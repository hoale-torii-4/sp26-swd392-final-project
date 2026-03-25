import { useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { FiGrid, FiShoppingBag, FiUsers, FiLayers, FiPackage, FiShuffle, FiStar, FiBarChart2, FiLogOut, FiChevronLeft, FiHome } from "react-icons/fi";
import { FaGift } from "react-icons/fa6";

/* ═══════════════════ HELPERS ═══════════════════ */

function getRoleName(role: number | string): string {
    if (role === 0 || role === "0" || role === "CUSTOMER") return "Khách hàng";
    if (role === 1 || role === "1" || role === "STAFF") return "Staff";
    if (role === 2 || role === "2" || role === "ADMIN") return "Admin";
    return "User";
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

/* ═══════════════════ NAV ITEMS ═══════════════════ */

const NAV_ITEMS: { label: string; path: string; icon: ReactNode; roles?: number[] }[] = [
    {
        label: "Dashboard",
        path: "/admin",
        roles: [2],
        icon: <FiGrid className="w-5 h-5" />,
    },
    {
        label: "Đơn hàng",
        path: "/admin/orders",
        roles: [1, 2],
        icon: <FiShoppingBag className="w-5 h-5" />,
    },
    {
        label: "Người dùng",
        path: "/admin/users",
        roles: [2],
        icon: <FiUsers className="w-5 h-5" />,
    },
    {
        label: "Bộ sưu tập",
        path: "/admin/collections",
        roles: [1, 2],
        icon: <FiLayers className="w-5 h-5" />,
    },
    {
        label: "Giỏ quà",
        path: "/admin/giftboxes",
        roles: [1, 2],
        icon: <FaGift className="w-4 h-4" />,
    },
    {
        label: "Kho hàng",
        path: "/admin/inventory",
        roles: [1, 2],
        icon: <FiPackage className="w-5 h-5" />,
    },
    {
        label: "Mix & Match",
        path: "/admin/mix-match",
        roles: [2],
        icon: <FiShuffle className="w-5 h-5" />,
    },
    {
        label: "Đánh giá",
        path: "/admin/reviews",
        roles: [2],
        icon: <FiStar className="w-5 h-5" />,
    },
    {
        label: "Báo cáo",
        path: "/admin/reports",
        roles: [2],
        icon: <FiBarChart2 className="w-5 h-5" />,
    },
];

/* ═══════════════════ LAYOUT ═══════════════════ */

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const user = authService.getUser();
    const roleName = user ? getRoleName(user.Role) : "";
    const userRole = user?.Role ?? 0;
    
    // Normalize role string to number if needed for NAV_ITEMS check
    const normalizedRole = userRole === "ADMIN" || userRole === "2" || userRole === 2 ? 2 
        : userRole === "STAFF" || userRole === "1" || userRole === 1 ? 1 : 0;

    const handleLogout = () => {
        authService.logout();
        authService.clearGuestCartSession();
        navigate("/admin/login");
    };

    const isActive = (path: string) => {
        if (path === "/admin") return location.pathname === "/admin";
        return location.pathname.startsWith(path);
    };

    // Filter items according to the user's role
    const filteredNavItems = NAV_ITEMS.filter(
        (item) => !item.roles || item.roles.includes(normalizedRole)
    );

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* ──── Sidebar ──── */}
            <aside
                className={`${sidebarCollapsed ? "w-16" : "w-60"} bg-[#1a1a2e] flex flex-col transition-all duration-300 shrink-0`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-[#8B1A1A] flex items-center justify-center shrink-0">
                        <FaGift className="w-5 h-5 text-yellow-300" />
                    </div>
                    {!sidebarCollapsed && (
                        <div>
                            <h2 className="text-white font-bold text-sm leading-tight">Lộc Xuân</h2>
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider">Admin Panel</p>
                        </div>
                    )}
                </div>

                {/* Nav items */}
                <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
                    {filteredNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                                isActive(item.path)
                                    ? "bg-[#8B1A1A] text-white shadow-lg shadow-[#8B1A1A]/30"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                            title={sidebarCollapsed ? item.label : undefined}
                        >
                            {item.icon}
                            {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                {/* ──── Account info ──── */}
                {user && (
                    <div className="border-t border-white/10 px-3 py-3">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B1A1A] to-[#c0392b] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                                {getInitials(user.FullName)}
                            </div>
                            {!sidebarCollapsed && (
                                <div className="min-w-0 flex-1">
                                    <p className="text-white text-sm font-medium truncate">{user.FullName}</p>
                                    <p className="text-gray-400 text-[11px] truncate">{user.Email}</p>
                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#8B1A1A]/30 text-[#f1a9a0]">
                                        {roleName}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ──── Logout button ──── */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-3 border-t border-white/10 text-gray-400 hover:text-red-400 text-xs transition-colors cursor-pointer"
                    title={sidebarCollapsed ? "Đăng xuất" : undefined}
                >
                    <FiLogOut className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Đăng xuất</span>}
                </button>

                {/* Collapse toggle */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="flex items-center justify-center py-3 border-t border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                    <FiChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
                </button>

                {/* Back to store link */}
                <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-3 border-t border-white/10 text-gray-400 hover:text-white text-xs transition-colors"
                >
                    <FiHome className="w-4 h-4" />
                    {!sidebarCollapsed && <span>Về cửa hàng</span>}
                </Link>
            </aside>

            {/* ──── Main content ──── */}
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
