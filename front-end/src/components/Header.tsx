import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { cartService } from "../services/cartService";

const navLinks = [
    { label: "TRANG CHỦ", to: "/" },
    { label: "GIỎ QUÀ TẾT", to: "/gift-boxes" },
    { label: "TỰ TẠO GIỎ QUÀ", to: "/custom" },
    { label: "VỀ CHÚNG TÔI", to: "/about" },
    { label: "HƯỚNG DẪN MUA", to: "/guide" },
];

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Check auth state
    const isLoggedIn = authService.isAuthenticated();
    const user = authService.getUser();
    const userName = user?.FullName || "Thành viên";

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close dropdown on route change
    useEffect(() => {
        setDropdownOpen(false);
    }, [location.pathname]);

    const loadCartCount = async () => {
        try {
            const data = await cartService.getCart();
            setCartCount(data?.TotalItems ?? 0);
        } catch {
            setCartCount(0);
        }
    };

    useEffect(() => {
        loadCartCount();

        const handleCartUpdated = () => {
            loadCartCount();
        };

        window.addEventListener("cart-updated", handleCartUpdated);
        return () => window.removeEventListener("cart-updated", handleCartUpdated);
    }, [location.pathname, isLoggedIn]);

    const handleLogout = () => {
        authService.logout();
        authService.clearGuestCartSession();
        cartService.notifyCartUpdated();
        setDropdownOpen(false);
        navigate("/login");
    };

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#8B1A1A] rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L13.09 8.26L20 9.27L15 14.14L16.18 21.02L12 17.77L7.82 21.02L9 14.14L4 9.27L10.91 8.26L12 2Z" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-xl font-serif font-bold text-gray-900 tracking-wide">Lộc Xuân</span>
                        <p className="text-[10px] tracking-[0.2em] text-[#8B1A1A] uppercase -mt-0.5">Premium Tết Gifts</p>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.to || (link.to === "/home" && location.pathname === "/");
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`text-xs font-semibold tracking-[0.15em] transition-colors ${isActive
                                    ? "text-[#8B1A1A] border-b-2 border-[#8B1A1A] pb-0.5"
                                    : "text-gray-600 hover:text-[#8B1A1A]"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right Icons */}
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <button className="text-gray-600 hover:text-[#8B1A1A] transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </button>

                    {/* Cart */}
                    <Link to="/cart" className="text-gray-600 hover:text-[#8B1A1A] transition-colors relative">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                        </svg>
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-[#8B1A1A] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                                {cartCount}
                            </span>
                        )}
                    </Link>

                    {/* ── Auth: Guest vs Logged-in ── */}
                    {isLoggedIn ? (
                        <div className="relative" ref={dropdownRef}>
                            {/* Profile Trigger */}
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <div className="hidden sm:flex flex-col items-end mr-1">
                                    <span className="text-[10px] tracking-[0.1em] text-gray-400 uppercase">Thành viên</span>
                                    <span className="text-sm font-semibold text-[#8B1A1A] -mt-0.5">Chào {userName.split(" ").pop()}</span>
                                </div>
                                <div className="w-9 h-9 bg-[#1B3022] rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                                <svg
                                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Menu items */}
                                    <Link
                                        to="/account"
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                        </svg>
                                        Tài khoản của tôi
                                    </Link>
                                    <Link
                                        to="/orders"
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                        </svg>
                                        Đơn hàng của tôi
                                    </Link>
                                    <Link
                                        to="/addresses"
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                        </svg>
                                        Sổ địa chỉ
                                    </Link>

                                    {/* Separator */}
                                    <div className="border-t border-gray-100 my-1" />

                                    {/* Logout */}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-[#8B1A1A] hover:bg-red-50 transition-colors w-full cursor-pointer"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                        </svg>
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="text-gray-600 hover:text-[#8B1A1A] transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                            </svg>
                        </Link>
                    )}

                    {/* Mobile hamburger */}
                    <button
                        className="lg:hidden text-gray-600"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <nav className="lg:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setMobileOpen(false)}
                            className="block text-sm font-medium text-gray-700 hover:text-[#8B1A1A] transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                    {isLoggedIn && (
                        <>
                            <div className="border-t border-gray-100 pt-3 mt-3">
                                <Link to="/account" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#8B1A1A]">Tài khoản của tôi</Link>
                                <Link to="/orders" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#8B1A1A] mt-3">Đơn hàng của tôi</Link>
                                <button onClick={handleLogout} className="block text-sm font-medium text-[#8B1A1A] mt-3 cursor-pointer">Đăng xuất</button>
                            </div>
                        </>
                    )}
                </nav>
            )}
        </header>
    );
}
