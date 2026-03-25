import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { paymentService } from "../services/paymentService";
import { FiCreditCard, FiBox, FiTruck, FiCheckCircle, FiGift, FiCalendar, FiDollarSign, FiChevronRight, FiMail } from "react-icons/fi";

/* ═══════════════════ HELPERS ═══════════════════ */

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

/* ═══════════════════ TIMELINE STEPS ═══════════════════ */

const TIMELINE_STEPS = [
    {
        label: "Chờ xác nhận\nthanh toán",
        icon: (active: boolean) => (
            <FiCreditCard className={`w-6 h-6 ${active ? "text-white" : "text-gray-400"}`} />
        ),
    },
    {
        label: "Chuẩn bị\nhàng",
        icon: (active: boolean) => (
            <FiBox className={`w-6 h-6 ${active ? "text-white" : "text-gray-400"}`} />
        ),
    },
    {
        label: "Đang\ngiao",
        icon: (active: boolean) => (
            <FiTruck className={`w-6 h-6 ${active ? "text-white" : "text-gray-400"}`} />
        ),
    },
    {
        label: "Hoàn\ntất",
        icon: (active: boolean) => (
            <FiCheckCircle className={`w-6 h-6 ${active ? "text-white" : "text-gray-400"}`} />
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
                                        <FiGift className="w-10 h-10 text-[#8B1A1A]/40" />
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
                                <FiCalendar className="w-4 h-4" />
                                Dự kiến giao: Theo lịch đã chọn
                            </div>

                            {totalAmount > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                    <FiDollarSign className="w-4 h-4" />
                                    Tổng thanh toán: <span className="font-bold text-[#8B1A1A]">{formatPrice(totalAmount)}</span>
                                </div>
                            )}

                            <Link
                                to={`/order-detail?code=${orderCode}`}
                                className="text-xs font-bold text-[#8B1A1A] uppercase tracking-wider hover:underline flex items-center gap-1"
                            >
                                Xem chi tiết đơn hàng
                                <FiChevronRight className="w-3 h-3" />
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
                                <FiMail className="w-4 h-4 text-gray-500" />
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
