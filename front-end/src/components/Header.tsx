import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
    { label: "TRANG CHỦ", to: "/home" },
    { label: "GIỎ QUÀ TẾT", to: "/products" },
    { label: "TỰ TẠO GIỎ QUÀ", to: "/custom" },
    { label: "VỀ CHÚNG TÔI", to: "/about" },
    { label: "HƯỚNG DẪN MUA", to: "/guide" },
];

export default function Header() {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
                {/* Logo */}
                <Link to="/home" className="flex items-center gap-3">
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
                    </Link>
                    {/* User */}
                    <Link to="/login" className="text-gray-600 hover:text-[#8B1A1A] transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                    </Link>
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
                </nav>
            )}
        </header>
    );
}
