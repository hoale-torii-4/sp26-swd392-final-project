import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { authService } from "../services/authService";
import apiClient from "../services/apiClient";
import { isValidEmail, isValidOrderCode } from "../utils/validation";

/* ═══════════════════ HELPERS ═══════════════════ */
function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    PENDING_PAYMENT: { label: "Chờ thanh toán", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: "⏳" },
    PREPARING:       { label: "Đang chuẩn bị", color: "text-blue-600 bg-blue-50 border-blue-200",   icon: "📦" },
    SHIPPING:        { label: "Đang giao hàng", color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: "🚚" },
    COMPLETED:       { label: "Giao thành công", color: "text-green-600 bg-green-50 border-green-200", icon: "✅" },
    CANCELLED:       { label: "Đã huỷ",          color: "text-red-600 bg-red-50 border-red-200",     icon: "❌" },
    DELIVERY_FAILED: { label: "Giao thất bại",   color: "text-orange-600 bg-orange-50 border-orange-200", icon: "⚠️" },
};

const STATUS_STEPS = ["PENDING_PAYMENT", "PREPARING", "SHIPPING", "COMPLETED"];

/* ═══════════════════ PAGE ═══════════════════ */
export default function OrderTrackingPage() {
    const [searchParams] = useSearchParams();
    const user = authService.getUser?.() ?? null;

    const [orderCode, setOrderCode] = useState(searchParams.get("code") ?? "");
    const [email, setEmail] = useState(user?.Email ?? "");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [orderCodeError, setOrderCodeError] = useState("");
    const [emailError, setEmailError] = useState("");

    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();
        const nextOrderCode = orderCode.trim().toUpperCase();
        const nextEmail = email.trim();

        let valid = true;
        setOrderCodeError("");
        setEmailError("");

        if (!nextOrderCode) {
            setOrderCodeError("Vui lòng nhập mã đơn hàng.");
            valid = false;
        } else if (!isValidOrderCode(nextOrderCode)) {
            setOrderCodeError("Mã đơn hàng không hợp lệ.");
            valid = false;
        }

        if (!nextEmail) {
            setEmailError("Vui lòng nhập email đặt hàng.");
            valid = false;
        } else if (!isValidEmail(nextEmail)) {
            setEmailError("Email không hợp lệ.");
            valid = false;
        }

        if (!valid) {
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await apiClient.get("/Orders/track", {
                params: { orderCode: nextOrderCode, email: nextEmail }
            });
            setResult(res.data);
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.response?.data?.Message ?? "Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và email.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const statusMeta = result ? (STATUS_LABELS[result.Status] ?? { label: result.Status, color: "text-gray-600 bg-gray-50 border-gray-200", icon: "📋" }) : null;
    const currentStep = result ? STATUS_STEPS.indexOf(result.Status) : -1;

    return (
        <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
            <Header />

            {/* ── Hero ── */}
            <section className="max-w-3xl w-full mx-auto px-4 lg:px-8 pt-10 pb-4">
                <h1 className="font-serif text-3xl lg:text-4xl font-bold italic mb-1">
                    <span className="relative">
                        <span className="relative z-10 text-[#8B1A1A]">Theo dõi</span>
                        <span className="absolute bottom-1 left-0 right-0 h-3 bg-yellow-300/50 -z-0" />
                    </span>
                    <span className="text-[#8B1A1A]"> đơn hàng</span>
                </h1>
                <p className="text-sm text-gray-500">Nhập mã đơn hàng và email để xem trạng thái</p>
            </section>

            <main className="flex-1 max-w-3xl w-full mx-auto px-4 lg:px-8 pb-14 space-y-6">

                {/* ── Search Form ── */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Mã đơn hàng
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: SHT2603123002"
                                    value={orderCode}
                                    onChange={e => {
                                        setOrderCode(e.target.value);
                                        setOrderCodeError("");
                                    }}
                                    required
                                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all font-mono ${orderCodeError
                                        ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                                        : "border-gray-200 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
                                        }`}
                                />
                                {orderCodeError && <p className="mt-1 text-xs text-red-500">{orderCodeError}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Email đặt hàng
                                </label>
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={e => {
                                        setEmail(e.target.value);
                                        setEmailError("");
                                    }}
                                    required
                                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${emailError
                                        ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                                        : "border-gray-200 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
                                        }`}
                                />
                                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-3 bg-[#8B1A1A] hover:bg-[#701515] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang tìm...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                                    </svg>
                                    Tra cứu đơn hàng
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* ── Error ── */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
                        <span className="text-lg">❌</span>
                        <p>{error}</p>
                    </div>
                )}

                {/* ── Result ── */}
                {result && statusMeta && (
                    <>
                        {/* Status Banner */}
                        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${statusMeta.color}`}>
                            <span className="text-3xl">{statusMeta.icon}</span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Trạng thái đơn hàng</p>
                                <p className="text-xl font-bold">{statusMeta.label}</p>
                                <p className="text-xs opacity-70 font-mono">{result.OrderCode}</p>
                            </div>
                        </div>

                        {/* Progress Steps (only for non-cancelled) */}
                        {result.Status !== "CANCELLED" && result.Status !== "DELIVERY_FAILED" && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5">Tiến trình đơn hàng</h3>
                                <div className="relative">
                                    {/* Track line */}
                                    <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" />
                                    <div
                                        className="absolute top-5 left-5 h-0.5 bg-[#8B1A1A] transition-all duration-700"
                                        style={{ width: `${currentStep >= 0 ? (currentStep / (STATUS_STEPS.length - 1)) * 100 : 0}%` }}
                                    />
                                    <div className="relative flex justify-between">
                                        {STATUS_STEPS.map((step, i) => {
                                            const done = i <= currentStep;
                                            const meta = STATUS_LABELS[step];
                                            return (
                                                <div key={step} className="flex flex-col items-center gap-2 w-20">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all z-10 ${done ? "bg-[#8B1A1A] border-[#8B1A1A] text-white scale-110" : "bg-white border-gray-300 text-gray-400"}`}>
                                                        {meta.icon}
                                                    </div>
                                                    <p className={`text-xs text-center leading-tight ${done ? "text-[#8B1A1A] font-semibold" : "text-gray-400"}`}>
                                                        {meta.label}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Details */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Thông tin đơn hàng</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-3">
                                    {result.CustomerName && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Người đặt</span>
                                            <span className="font-medium text-gray-900">{result.CustomerName}</span>
                                        </div>
                                    )}
                                    {result.ReceiverName && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Người nhận</span>
                                            <span className="font-medium text-gray-900">{result.ReceiverName}</span>
                                        </div>
                                    )}
                                    {result.ReceiverPhone && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Điện thoại</span>
                                            <span className="font-medium text-gray-900">{result.ReceiverPhone}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {result.DeliveryAddress && (
                                        <div className="flex justify-between gap-2">
                                            <span className="text-gray-500 shrink-0">Địa chỉ</span>
                                            <span className="font-medium text-gray-900 text-right">{result.DeliveryAddress}</span>
                                        </div>
                                    )}
                                    {result.DeliveryDate && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Ngày giao dự kiến</span>
                                            <span className="font-medium text-gray-900">{formatDate(result.DeliveryDate)}</span>
                                        </div>
                                    )}
                                    {result.CreatedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Ngày đặt</span>
                                            <span className="font-medium text-gray-900">{formatDate(result.CreatedAt)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Total */}
                            {result.TotalAmount != null && (
                                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Tổng thanh toán</span>
                                    <span className="text-xl font-bold text-[#8B1A1A]">{formatPrice(result.TotalAmount)}</span>
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        {Array.isArray(result.Items) && result.Items.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Sản phẩm ({result.Items.length})</h3>
                                <div className="space-y-3">
                                    {result.Items.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                            {item.Image && (
                                                <img src={item.Image} alt={item.Name} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{item.Name ?? item.ItemName ?? `Sản phẩm ${idx + 1}`}</p>
                                                <p className="text-xs text-gray-400">x{item.Quantity ?? 1}</p>
                                            </div>
                                            {item.Price != null && (
                                                <p className="text-sm font-semibold text-gray-800 shrink-0">{formatPrice(item.Price * (item.Quantity ?? 1))}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Greeting */}
                        {result.GreetingMessage && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Lời chúc gửi kèm 💌</p>
                                <p className="text-sm text-amber-900 italic">"{result.GreetingMessage}"</p>
                            </div>
                        )}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
}
