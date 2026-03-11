import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { paymentService } from "../services/paymentService";

/* ═══════════════════ HELPERS ═══════════════════ */

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

/* ═══════════════════ TIMELINE STEPS ═══════════════════ */

const TIMELINE_STEPS = [
    {
        label: "Chờ xác nhận\nthanh toán",
        icon: (active: boolean) => (
            <svg className={`w-6 h-6 ${active ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
        ),
    },
    {
        label: "Chuẩn bị\nhàng",
        icon: (active: boolean) => (
            <svg className={`w-6 h-6 ${active ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
    },
    {
        label: "Đang\ngiao",
        icon: (active: boolean) => (
            <svg className={`w-6 h-6 ${active ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
        ),
    },
    {
        label: "Hoàn\ntất",
        icon: (active: boolean) => (
            <svg className={`w-6 h-6 ${active ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
        ),
    },
];

/* ═══════════════════ PAGE ═══════════════════ */

export default function OrderSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storedCode = sessionStorage.getItem("last_order_code") ?? "";
    const orderCode = (searchParams.get("code") ?? storedCode).toUpperCase();
    const [isPaid, setIsPaid] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        if (!orderCode) {
            navigate("/checkout", { replace: true });
            return;
        }

        const fetchInitial = async () => {
            try {
                const status = await paymentService.checkPaymentStatus(orderCode);
                setTotalAmount(status.TotalAmount);
                setIsPaid(status.IsPaid);
            } catch {
                // ignore
            }
        };

        fetchInitial();
    }, [orderCode, navigate]);

    // Poll payment status
    useEffect(() => {
        if (isPaid || !orderCode) return;
        const poll = async () => {
            try {
                const status = await paymentService.checkPaymentStatus(orderCode);
                setTotalAmount(status.TotalAmount);
                if (status.IsPaid) setIsPaid(true);
            } catch { /* ignore */ }
        };
        poll(); // initial check
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
    }, [orderCode, isPaid]);

    const activeStep = isPaid ? 1 : 0; // 0 = waiting for payment, 1 = preparing

    return (
        <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10">

                {/* ════════ SUCCESS HEADER ════════ */}
                <div className="text-center mb-8">
                    {/* Gift illustration */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#f0e6d4] to-[#e0d4c0] flex items-center justify-center overflow-hidden shadow-lg">
                                <div className="relative">
                                    {/* Gift box shape */}
                                    <div className="w-24 h-20 bg-[#8B1A1A]/10 rounded-lg border-2 border-[#8B1A1A]/20 flex items-center justify-center">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#8B1A1A]/15 rounded-t-lg" />
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-[#8B1A1A]/20" />
                                        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-[#8B1A1A]/20" />
                                        <svg className="w-10 h-10 text-[#8B1A1A]/40" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9.375 3a6.75 6.75 0 0112 4.318L21 7.5V18a2.25 2.25 0 01-2.25 2.25h-1.5a.75.75 0 01-.75-.75V11.25a3.75 3.75 0 00-3.75-3.75h-1.5a3 3 0 00-3 3v7.5a.75.75 0 01-.75.75h-1.5A2.25 2.25 0 013 16.5V7.5l.375-.182A6.75 6.75 0 019.375 3z" />
                                        </svg>
                                    </div>
                                    {/* Ribbon bow */}
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                        <div className="flex gap-0.5">
                                            <div className="w-4 h-5 bg-[#8B1A1A]/30 rounded-full -rotate-12" />
                                            <div className="w-4 h-5 bg-[#8B1A1A]/30 rounded-full rotate-12" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Sparkle dots */}
                            <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                            <div className="absolute -bottom-1 -left-3 w-2 h-2 bg-[#8B1A1A]/40 rounded-full animate-pulse delay-300" />
                            <div className="absolute top-4 -left-4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse delay-700" />
                        </div>
                    </div>

                    <h1 className="font-serif text-3xl lg:text-4xl font-bold italic text-[#8B1A1A] mb-3">
                        Đặt Hàng Thành Công!
                    </h1>
                    <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                        Cảm ơn bạn đã chọn gửi trao thành ý cùng chúng tôi. Món quà của bạn đang được chuẩn bị chu đáo.
                    </p>
                </div>

                {orderCode && (
                    <>
                        {/* ════════ ORDER INFO CARD ════════ */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mã đơn hàng</p>
                                    <p className="text-xl font-bold text-gray-900">#{orderCode}</p>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${isPaid
                                        ? "bg-green-100 text-green-700"
                                        : "bg-orange-100 text-orange-600"
                                    }`}>
                                    {isPaid ? "Đã xác nhận thanh toán" : "Chờ xác nhận thanh toán"}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                                Dự kiến giao: Theo lịch đã chọn
                            </div>

                            {totalAmount > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                    </svg>
                                    Tổng thanh toán: <span className="font-bold text-[#8B1A1A]">{formatPrice(totalAmount)}</span>
                                </div>
                            )}

                            <Link
                                to={`/order-detail?code=${orderCode}`}
                                className="text-xs font-bold text-[#8B1A1A] uppercase tracking-wider hover:underline flex items-center gap-1"
                            >
                                Xem chi tiết đơn hàng
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </Link>
                        </div>


                        {/* ════════ ORDER JOURNEY TIMELINE ════════ */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                            <h3 className="text-sm font-bold text-gray-900 text-center mb-6">
                                Hành trình đơn hàng của bạn
                            </h3>

                            <div className="flex items-start justify-between relative">
                                {/* Connecting line */}
                                <div className="absolute top-6 left-[calc(12.5%)] right-[calc(12.5%)] h-0.5 bg-gray-200 z-0" />
                                <div
                                    className="absolute top-6 left-[calc(12.5%)] h-0.5 bg-[#8B1A1A] z-0 transition-all duration-500"
                                    style={{ width: `${(activeStep / (TIMELINE_STEPS.length - 1)) * 75}%` }}
                                />

                                {TIMELINE_STEPS.map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center z-10 relative" style={{ width: "25%" }}>
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${idx <= activeStep
                                                    ? "bg-[#8B1A1A] shadow-lg shadow-[#8B1A1A]/20"
                                                    : "bg-gray-100"
                                                }`}
                                        >
                                            {step.icon(idx <= activeStep)}
                                        </div>
                                        <p
                                            className={`text-[11px] mt-2 text-center leading-tight whitespace-pre-line font-medium ${idx <= activeStep ? "text-[#8B1A1A]" : "text-gray-400"
                                                }`}
                                        >
                                            {step.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ════════ EMAIL NOTIFICATION ════════ */}
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">Thông báo qua Email</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Một email xác nhận kèm hóa đơn chi tiết đã được gửi đến bạn. Vui lòng kiểm tra cả hộp thư rác (Spam).
                                </p>
                            </div>
                        </div>

                        {/* ════════ ACTION BUTTONS ════════ */}
                        <div className="space-y-3">
                            <Link
                                to="/gift-boxes"
                                className="block w-full py-3.5 bg-[#8B1A1A] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors text-center"
                            >
                                Tiếp tục mua sắm
                            </Link>
                            <Link
                                to={`/order-tracking?code=${orderCode}`}
                                className="block w-full py-3.5 border-2 border-[#8B1A1A] text-[#8B1A1A] text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#8B1A1A]/5 transition-colors text-center"
                            >
                                Theo dõi đơn hàng
                            </Link>
                        </div>
                    </>
                )}

            </main>

            <Footer />
        </div>
    );
}
