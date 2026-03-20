import { Link } from "react-router-dom";

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
                                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L13.09 8.26L20 9.27L15 14.14L16.18 21.02L12 17.77L7.82 21.02L9 14.14L4 9.27L10.91 8.26L12 2Z" />
                                </svg>
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
                                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                <span>Quận 1, TP. Hồ Chí Minh</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>
                                <span>0909 123 456</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <span>info@locxuan.vn</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-500">
                        © 2024 LỘC XUÂN — MÓN QUÀ GỬI TRAO TỪ CÔNG THỨC QUÀ.
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
