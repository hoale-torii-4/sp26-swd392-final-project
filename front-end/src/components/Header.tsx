import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { authService } from "../services/authService";
import { cartService } from "../services/cartService";
import { FiTruck, FiShoppingBag, FiChevronDown, FiUser, FiPackage, FiMapPin, FiBox, FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { FaGift } from "react-icons/fa6";

const navLinks = [
    { label: "TRANG CHỦ", to: "/" },
    { label: "GIỎ QUÀ TẾT", to: "/gift-boxes" },
    { label: "TỰ TẠO GIỎ QUÀ", to: "/mix-match" },
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
        toast.success("Đăng xuất thành công", { autoClose: 1500 });
        navigate("/login");
    };

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#8B1A1A] rounded-full flex items-center justify-center">
                        <FaGift className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="text-xl font-serif font-bold text-gray-900 tracking-wide">Lộc Xuân</span>
                        <p className="text-[10px] tracking-[0.2em] text-[#8B1A1A] uppercase -mt-0.5">Premium Tết Gifts</p>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.to
                            || (link.to !== "/" && location.pathname.startsWith(link.to + "/"))
                            || (link.to === "/home" && location.pathname === "/");
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

                    {/* Track Order */}
                    <Link
                        to="/order-tracking"
                        title="Theo dõi đơn hàng"
                        className="relative text-gray-600 hover:text-[#8B1A1A] transition-colors flex items-center"
                    >
                        <FiTruck className="w-5 h-5" />
                    </Link>

                    {/* Cart */}
                    <Link to="/cart" className="text-gray-600 hover:text-[#8B1A1A] transition-colors relative">
                        <FiShoppingBag className="w-5 h-5" />
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
                                <FiChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Menu items */}
                                    <Link
                                        to="/account"
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <FiUser className="w-5 h-5 text-gray-400" />
                                        Tài khoản của tôi
                                    </Link>
                                    <Link
                                        to="/orders"
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <FiPackage className="w-5 h-5 text-gray-400" />
                                        Đơn hàng của tôi
                                    </Link>
                                    <Link
                                        to="/addresses"
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <FiMapPin className="w-5 h-5 text-gray-400" />
                                        Sổ địa chỉ
                                    </Link>

                                    <Link
                                        to="/custom-box"
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <FiBox className="w-5 h-5 text-gray-400" />
                                        Giỏ quà custom
                                    </Link>



                                    {/* Separator */}
                                    <div className="border-t border-gray-100 my-1" />

                                    {/* Logout */}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-5 py-3 text-sm text-[#8B1A1A] hover:bg-red-50 transition-colors w-full cursor-pointer"
                                    >
                                        <FiLogOut className="w-5 h-5" />
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="text-gray-600 hover:text-[#8B1A1A] transition-colors">
                            <FiUser className="w-5 h-5" />
                        </Link>
                    )}

                    {/* Mobile hamburger */}
                    <button
                        className="lg:hidden text-gray-600"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
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
                    <Link
                        to="/order-tracking"
                        onClick={() => setMobileOpen(false)}
                        className="block text-sm font-medium text-gray-700 hover:text-[#8B1A1A] transition-colors"
                    >
                        🚚 Theo dõi đơn hàng
                    </Link>
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
