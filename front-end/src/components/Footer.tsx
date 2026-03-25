import { Link } from "react-router-dom";
import { FaGift } from "react-icons/fa6";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";

const footerLinks = {
    about: [
        { label: "Câu chuyện thương hiệu", to: "/about" },
        { label: "Cam kết chất lượng", to: "/quality" },
        { label: "Đối tác & Khách hàng", to: "/partners" },
    ],
    support: [
        { label: "Hướng dẫn mua hàng", to: "/guide" },
        { label: "Chính sách vận chuyển", to: "/shipping" },
        { label: "Chính sách đổi trả", to: "/returns" },
        { label: "Câu hỏi thường gặp", to: "/faq" },
    ],
};

export default function Footer() {
    return (
        <footer className="bg-[#1B1B1B] text-gray-300">
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 bg-[#8B1A1A] rounded-full flex items-center justify-center">
                                <FaGift className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-serif font-bold text-white">Lộc Xuân</span>
                                <p className="text-[9px] tracking-[0.2em] text-[#C0A062] uppercase">Premium Tết Gifts</p>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 mb-6">
                            Món quà gửi trao từ công thức quà.
                            Mang đến những giỏ quà Tết tinh tế,
                            gói trọn tâm tình người trao.
                        </p>
                        {/* Social */}
                        <div className="flex gap-3">
                            {["facebook", "instagram", "tiktok"].map((s) => (
                                <a
                                    key={s}
                                    href="#"
                                    className="w-9 h-9 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#C0A062] transition-colors"
                                >
                                    <span className="text-xs font-semibold uppercase">{s[0]}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* About */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C0A062] mb-5">
                            Về Lộc Xuân
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.about.map((l) => (
                                <li key={l.to}>
                                    <Link to={l.to} className="text-sm text-gray-400 hover:text-white transition-colors">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C0A062] mb-5">
                            Hỗ trợ
                        </h4>
                        <ul className="space-y-3">
                            {footerLinks.support.map((l) => (
                                <li key={l.to}>
                                    <Link to={l.to} className="text-sm text-gray-400 hover:text-white transition-colors">
                                        {l.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C0A062] mb-5">
                            Liên hệ
                        </h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li className="flex items-start gap-2">
                                <FiMapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>Quận 1, TP. Hồ Chí Minh</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <FiPhone className="w-4 h-4 shrink-0" />
                                <span>0909 123 456</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <FiMail className="w-4 h-4 shrink-0" />
                                <span>info@locxuan.vn</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-500">
                        © 2026 LỘC XUÂN — MÓN QUÀ GỬI TRAO TỪ CÔNG THỨC QUÀ.
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500">
                        <Link to="/privacy" className="hover:text-gray-300 transition-colors">Chính sách bảo mật</Link>
                        <Link to="/terms" className="hover:text-gray-300 transition-colors">Điều khoản sử dụng</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
