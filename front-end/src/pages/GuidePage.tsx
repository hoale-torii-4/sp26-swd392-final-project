import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

/* ───── Static Data ───── */
const collectionSteps = [
    {
        num: "01",
        title: "Chọn Bộ Sưu Tập",
        desc: "Duyệt qua các bộ sưu tập quà Tết được phân loại theo chủ đề và đối tượng nhận quà.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
        ),
    },
    {
        num: "02",
        title: "Chọn Sản Phẩm",
        desc: "Xem chi tiết từng hộp quà trong bộ sưu tập, so sánh giá và lựa chọn phù hợp nhất.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
        ),
    },
    {
        num: "03",
        title: "Thêm Vào Giỏ Hàng",
        desc: "Thêm sản phẩm vào giỏ hàng, điền thông tin giao hàng và thanh toán nhanh chóng.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
        ),
    },
];

const customSteps = [
    {
        num: "01",
        title: "Chọn Giỏ / Hộp Quà",
        desc: "Lựa chọn kiểu giỏ hoặc hộp làm nền tảng cho món quà cá nhân hóa của bạn.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
    },
    {
        num: "02",
        title: "Chọn Sản Phẩm Lẻ",
        desc: "Tự do chọn từng món trong hơn 200+ đặc sản tuyển chọn để tạo nên giỏ quà riêng.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z" />
            </svg>
        ),
    },
    {
        num: "03",
        title: "Kiểm Tra & Thanh Toán",
        desc: "Xem lại giỏ quà, điều chỉnh nếu cần và tiến hành thanh toán đơn giản.",
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
        ),
    },
];

export default function GuidePage() {
    const [orderCode, setOrderCode] = useState("");
    const [trackEmail, setTrackEmail] = useState("");

    return (
        <div className="font-sans">
            <Header />

            {/* ════════ HERO ════════ */}
            <section className="bg-[#F9F7F2] py-20 lg:py-28 text-center">
                <div className="max-w-3xl mx-auto px-6">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <span className="h-px w-12 bg-[#C0A062]" />
                        <span className="text-xs font-semibold tracking-[0.2em] text-[#8B1A1A] uppercase">Hỗ trợ khách hàng</span>
                        <span className="h-px w-12 bg-[#C0A062]" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-serif font-bold text-gray-900 mb-6">
                        Hướng Dẫn Mua
                    </h1>
                    <p className="text-gray-500 text-base lg:text-lg leading-relaxed">
                        Lộc Xuân mang đến nhiều cách để bạn lựa chọn món quà phù hợp nhất.
                        Hãy cùng khám phá các bước đơn giản để sở hữu những giỏ quà Tết tinh tế.
                    </p>
                </div>
            </section>

            {/* ════════ MUA THEO BỘ SƯU TẬP ════════ */}
            <section className="bg-white py-20 lg:py-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-[#8B1A1A]/10 text-xs font-semibold tracking-[0.15em] text-[#8B1A1A] uppercase mb-4">
                            Cách 1
                        </span>
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-3">
                            Mua Quà Theo Bộ Sưu Tập
                        </h2>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Chọn từ các bộ sưu tập được tuyển chọn sẵn — nhanh chóng và tiện lợi.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {collectionSteps.map((step) => (
                            <div key={step.num} className="text-center group">
                                <div className="w-20 h-20 mx-auto mb-6 bg-[#1B3022] rounded-2xl flex items-center justify-center text-[#C0A062] group-hover:scale-105 transition-transform">
                                    {step.icon}
                                </div>
                                <span className="text-xs font-bold tracking-[0.15em] text-[#C0A062] uppercase">Bước {step.num}</span>
                                <h3 className="text-xl font-serif font-bold text-gray-900 mt-2 mb-3">{step.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            to="/products"
                            className="inline-block px-8 py-3.5 bg-[#8B1A1A] text-white text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-[#7A1717] transition-colors"
                        >
                            Xem bộ sưu tập
                        </Link>
                    </div>
                </div>
            </section>

            {/* ════════ TỰ TẠO GIỎ QUÀ ════════ */}
            <section className="bg-[#F9F7F2] py-20 lg:py-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-[#8B1A1A]/10 text-xs font-semibold tracking-[0.15em] text-[#8B1A1A] uppercase mb-4">
                            Cách 2
                        </span>
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-3">
                            Tự Tạo Giỏ Quà Riêng
                        </h2>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Tự do sáng tạo giỏ quà theo phong cách của bạn với hệ thống Mix & Match.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {customSteps.map((step) => (
                            <div key={step.num} className="text-center group">
                                <div className="w-20 h-20 mx-auto mb-6 bg-[#C0A062] rounded-2xl flex items-center justify-center text-[#1B3022] group-hover:scale-105 transition-transform">
                                    {step.icon}
                                </div>
                                <span className="text-xs font-bold tracking-[0.15em] text-[#8B1A1A] uppercase">Bước {step.num}</span>
                                <h3 className="text-xl font-serif font-bold text-gray-900 mt-2 mb-3">{step.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            to="/custom"
                            className="inline-block px-8 py-3.5 bg-[#C0A062] text-[#1B3022] text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-[#D4B876] transition-colors"
                        >
                            Bắt đầu tạo giỏ quà
                        </Link>
                    </div>
                </div>
            </section>

            {/* ════════ THANH TOÁN & GIAO HÀNG ════════ */}
            <section className="bg-[#1B3022] py-20 lg:py-24 text-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <span className="h-px w-12 bg-[#C0A062]" />
                            <span className="text-xs font-semibold tracking-[0.2em] text-[#C0A062] uppercase">Thông tin</span>
                            <span className="h-px w-12 bg-[#C0A062]" />
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold mb-3">
                            Thanh Toán & Giao Hàng
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Payment */}
                        <div className="bg-white/10 rounded-2xl p-8 backdrop-blur">
                            <div className="w-14 h-14 bg-[#C0A062] rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-[#1B3022]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-3">Thanh toán An Toàn</h3>
                            <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                Hỗ trợ thanh toán qua QR Code và chuyển khoản ngân hàng với xác nhận tự động.
                            </p>
                            <ul className="space-y-2">
                                {["Chuyển khoản ngân hàng", "QR Code thanh toán", "COD (nhận hàng trả tiền)"].map((m) => (
                                    <li key={m} className="flex items-center gap-2 text-sm text-gray-200">
                                        <svg className="w-4 h-4 text-[#C0A062] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                        {m}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Delivery */}
                        <div className="bg-white/10 rounded-2xl p-8 backdrop-blur">
                            <div className="w-14 h-14 bg-[#C0A062] rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-[#1B3022]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-serif font-bold mb-3">Giao Hàng Nhanh Chóng</h3>
                            <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                Đội ngũ giao hàng chuyên nghiệp, đóng gói cẩn thận đảm bảo quà đến tay người nhận nguyên vẹn.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold">B2C (Cá nhân)</p>
                                        <p className="text-xs text-gray-400">Nội thành HN & HCM</p>
                                    </div>
                                    <span className="text-[#C0A062] font-bold text-sm">24h - 48h</span>
                                </div>
                                <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold">B2B (Doanh nghiệp)</p>
                                        <p className="text-xs text-gray-400">Toàn quốc</p>
                                    </div>
                                    <span className="text-[#C0A062] font-bold text-sm">3 - 7 ngày</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════ THEO DÕI ĐƠN HÀNG ════════ */}
            <section className="bg-white py-20 lg:py-24">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <span className="h-px w-12 bg-[#C0A062]" />
                            <span className="text-xs font-semibold tracking-[0.2em] text-[#8B1A1A] uppercase">Đơn hàng</span>
                            <span className="h-px w-12 bg-[#C0A062]" />
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-3">
                            Theo Dõi Đơn Hàng
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Guest tracking */}
                        <div className="bg-[#F9F7F2] rounded-2xl p-8">
                            <h3 className="text-lg font-serif font-bold text-gray-900 mb-1">Khách vãng lai</h3>
                            <p className="text-sm text-gray-500 mb-6">Tra cứu đơn hàng bằng email và mã đơn.</p>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    console.log("Track:", { orderCode, trackEmail });
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                                        Email của bạn
                                    </label>
                                    <input
                                        type="email"
                                        value={trackEmail}
                                        onChange={(e) => setTrackEmail(e.target.value)}
                                        placeholder="example@email.com"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                                        Mã đơn hàng
                                    </label>
                                    <input
                                        type="text"
                                        value={orderCode}
                                        onChange={(e) => setOrderCode(e.target.value)}
                                        placeholder="VD: LX-12345"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-[#8B1A1A] text-white text-xs font-bold tracking-[0.15em] uppercase rounded-lg hover:bg-[#7A1717] transition-colors cursor-pointer"
                                >
                                    Tra cứu ngay
                                </button>
                            </form>
                        </div>

                        {/* Member tracking */}
                        <div className="bg-[#1B3022] rounded-2xl p-8 text-white flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-serif font-bold mb-1">Thành viên Lộc Xuân</h3>
                                <p className="text-sm text-gray-300 mb-6">
                                    Đăng nhập để xem toàn bộ lịch sử đặt hàng, trạng thái giao hàng và quản lý tài khoản.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    {[
                                        "Xem lịch sử đơn hàng",
                                        "Theo dõi trạng thái giao hàng",
                                        "Quản lý địa chỉ giao hàng",
                                        "Đặt lại đơn hàng nhanh chóng",
                                    ].map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-sm text-gray-200">
                                            <svg className="w-4 h-4 text-[#C0A062] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Link
                                to="/login"
                                className="block text-center w-full py-3 bg-[#C0A062] text-[#1B3022] text-xs font-bold tracking-[0.15em] uppercase rounded-lg hover:bg-[#D4B876] transition-colors"
                            >
                                Đăng nhập tài khoản
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════ HỖ TRỢ ════════ */}
            <section className="bg-[#F9F7F2] py-16 lg:py-20">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-2xl lg:text-3xl font-serif font-bold text-gray-900 mb-3">
                        Bạn cần hỗ trợ thêm?
                    </h2>
                    <p className="text-gray-500 mb-8">
                        Đội ngũ Lộc Xuân luôn sẵn sàng hỗ trợ bạn trong quá trình mua sắm.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B1A1A] text-white text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-[#7A1717] transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                            </svg>
                            Chat trực tuyến
                        </button>
                        <a
                            href="mailto:info@locxuan.vn"
                            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            Gửi email hỗ trợ
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
