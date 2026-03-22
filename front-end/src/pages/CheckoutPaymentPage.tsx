import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { cartService, type CartDto, type CartItemDto } from "../services/cartService";
import { orderService, type CreateOrderB2CDto, OrderItemType } from "../services/orderService";
import { authService } from "../services/authService";
import apiClient from "../services/apiClient";

interface Address {
    Id: string;
    ReceiverName: string;
    ReceiverPhone: string;
    FullAddress: string;
    IsDefault: boolean;
}

/* ═══════════════════ HELPERS ═══════════════════ */

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

/* ═══════════════════ PAGE ═══════════════════ */

export default function CheckoutPaymentPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [cart, setCart] = useState<CartDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrRemainingSeconds, setQrRemainingSeconds] = useState<number | null>(null);
    const [qrExpired, setQrExpired] = useState(false);
    const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Form state ──
    const [receiverName, setReceiverName] = useState("");
    const [receiverPhone, setReceiverPhone] = useState("");
    const [province, setProvince] = useState("");
    const [district, setDistrict] = useState("");
    const [ward, setWard] = useState("");
    const [addressDetail, setAddressDetail] = useState("");
    const [greetingMessage, setGreetingMessage] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");

    // ── Address Book state ──
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
    const [addressesLoading, setAddressesLoading] = useState(false);

    // ── Customer info (from auth or manual) ──
    const user = authService.getUser?.() ?? null;
    const [customerName, setCustomerName] = useState(user?.FullName ?? "");
    const [customerEmail, setCustomerEmail] = useState(user?.Email ?? "");
    const [customerPhone, setCustomerPhone] = useState(user?.Phone ?? "");

    const checkoutState = location.state as
        | {
            buyNow?: boolean;
            items?: CartItemDto[];
            totalItems?: number;
            totalAmount?: number;
            selectedItems?: CartItemDto[];
        }
        | undefined;
    const isBuyNow = !!checkoutState?.buyNow && Array.isArray(checkoutState.items);
    const isSelectedCheckout = !isBuyNow && Array.isArray(checkoutState?.selectedItems);

    const [orderCode, setOrderCode] = useState<string | null>(null);
    const [paymentDetected, setPaymentDetected] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isBuyNow || isSelectedCheckout) {
            setLoading(false);
            return;
        }

        cartService
            .getCart()
            .then(setCart)
            .catch(() => setError("Không thể tải giỏ hàng."))
            .finally(() => setLoading(false));
    }, [isBuyNow, isSelectedCheckout]);

    // Fetch user addresses if logged in
    useEffect(() => {
        if (user) {
            setAddressesLoading(true);
            apiClient.get("/Address")
                .then(r => {
                    const data = r.data?.Data ?? r.data ?? [];
                    setAddresses(data);
                    if (data.length > 0) {
                        const def = data.find((a: any) => a.IsDefault);
                        setSelectedAddressId(def ? def.Id : data[0].Id);
                    }
                })
                .catch(() => {})
                .finally(() => setAddressesLoading(false));
        }
    }, [user?.Id]);

    // ── Auto-polling: check payment status every 3 sec when QR is shown ──
    useEffect(() => {
        if (!qrImageUrl || !orderCode || qrExpired) return;

        const apiBase = import.meta.env.VITE_API_BASE_URL || "https://shophangtet-api.onrender.com";

        const poll = async () => {
            try {
                const res = await fetch(`${apiBase}/Payment/check-status/${orderCode}`);
                if (!res.ok) return;
                const json = await res.json();
                const isPaid = json?.Data?.isPaid ?? json?.data?.isPaid ?? json?.isPaid;
                if (isPaid) {
                    setPaymentDetected(true);
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
                    setTimeout(() => navigate(`/order-success?code=${orderCode}`), 1500);
                }
            } catch {
                // silently ignore polling errors
            }
        };

        pollIntervalRef.current = setInterval(poll, 3000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [qrImageUrl, orderCode, navigate, qrExpired]);

    useEffect(() => {
        if (!qrImageUrl || !orderCode) return;

        const countdownMinutes = Number(import.meta.env.VITE_QR_TIMEOUT_MINUTES ?? 10);
        const totalSeconds = Math.max(1, Math.round(countdownMinutes * 60));
        setQrExpired(false);
        setQrRemainingSeconds(totalSeconds);

        if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
        qrCountdownRef.current = setInterval(() => {
            setQrRemainingSeconds((prev) => {
                if (prev === null) return prev;
                if (prev <= 1) {
                    if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setQrExpired(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
        };
    }, [qrImageUrl, orderCode]);


    const items = isBuyNow
        ? checkoutState?.items ?? []
        : isSelectedCheckout
            ? checkoutState?.selectedItems ?? []
            : cart?.Items ?? [];
    const totalAmount = isBuyNow
        ? checkoutState?.totalAmount ?? 0
        : isSelectedCheckout
            ? items.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0)
            : cart?.TotalAmount ?? 0;

    // ── Submit order ──
    const formatCountdown = (seconds: number | null) => {
        if (seconds === null) return "";
        const mm = Math.floor(seconds / 60);
        const ss = seconds % 60;
        return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
    };

    const handleSubmit = async () => {
        let finalReceiverName = receiverName;
        let finalReceiverPhone = receiverPhone;
        let finalDeliveryAddress = [addressDetail, ward, district, province].filter(Boolean).join(", ");

        if (user && selectedAddressId !== "new") {
            const addr = addresses.find((a) => a.Id === selectedAddressId);
            if (addr) {
                finalReceiverName = addr.ReceiverName;
                finalReceiverPhone = addr.ReceiverPhone;
                finalDeliveryAddress = addr.FullAddress;
            }
        }

        if (!finalReceiverName || !finalReceiverPhone || !finalDeliveryAddress || !deliveryDate) {
            setError("Vui lòng điền đầy đủ thông tin người nhận, địa chỉ và ngày giao hàng.");
            return;
        }
        if (!customerEmail) {
            setError("Vui lòng nhập email để nhận thông tin đơn hàng.");
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const orderData: CreateOrderB2CDto = {
                UserId: user?.Id,
                CustomerEmail: customerEmail,
                CustomerName: customerName || receiverName,
                CustomerPhone: customerPhone || receiverPhone,
                Items: items.map((item) => ({
                    Type: item.Type as OrderItemType,
                    Id: item.ProductId || item.Id,
                    Quantity: item.Quantity,
                    Price: item.UnitPrice,
                    Name: item.Name ?? undefined,
                })),
                ReceiverName: finalReceiverName,
                ReceiverPhone: finalReceiverPhone,
                DeliveryAddress: finalDeliveryAddress,
                GreetingMessage: greetingMessage || undefined,
                DeliveryDate: new Date(deliveryDate).toISOString(),
            };

            const result = await orderService.createB2COrder(orderData);
            setOrderCode(result.orderCode);
            sessionStorage.setItem("last_order_code", result.orderCode);
            setPaymentDetected(false);
            setQrExpired(false);
            setQrRemainingSeconds(null);

            if (!isBuyNow && !isSelectedCheckout) {
                await cartService.clearCart();
            } else if (isSelectedCheckout) {
                await Promise.all(items.map((item) => cartService.removeItem(item.Id)));
            }

            // Fetch QR code for payment
            setQrLoading(true);
            try {
                const qrRes = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL || "https://shophangtet-api.onrender.com"}/Payment/create-qr/${result.orderCode}`
                );
                if (qrRes.ok) {
                    const json = await qrRes.json();
                    // Backend trả về { Data: { qrUrl, bankAccount, bankName, ... } }
                    const qrUrl = json?.Data?.qrUrl ?? json?.data?.qrUrl ?? json?.qrUrl;
                    if (qrUrl) {
                        setQrImageUrl(qrUrl);
                    } else {
                        navigate(`/order-success?code=${result.orderCode}`);
                    }
                } else {
                    // If QR fails, just navigate to success
                    navigate(`/order-success?code=${result.orderCode}`);
                }
            } catch {
                navigate(`/order-success?code=${result.orderCode}`);
            } finally {
                setQrLoading(false);
            }
        } catch (err: unknown) {
            const message = err && typeof err === "object" && "message" in err
                ? (err as { message: string }).message
                : "Có lỗi xảy ra khi tạo đơn hàng.";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    /* ═══════════════════ LOADING ═══════════════════ */
    if (loading) {
        return (
            <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <svg className="w-10 h-10 text-[#8B1A1A] animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
                <Footer />
            </div>
        );
    }

    if (items.length === 0 && !orderCode) {
        return (
            <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
                        <p className="text-sm text-gray-500 mb-6">Vui lòng thêm sản phẩm vào giỏ trước khi thanh toán.</p>
                        <Link to="/gift-boxes" className="px-6 py-3 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors">
                            Khám phá giỏ quà
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
            <Header />

            {/* ════════ QR PAYMENT MODAL ════════ */}
            {(qrLoading || qrImageUrl) && orderCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4">

                        {paymentDetected ? (
                            /* ── Payment Detected State ── */
                            <div className="flex flex-col items-center gap-3 py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Thanh toán thành công!</h2>
                                <p className="text-sm text-gray-500 text-center">Đang chuyển đến trang xác nhận đơn hàng...</p>
                                <svg className="w-5 h-5 text-green-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <svg className="w-6 h-6 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    <h2 className="text-lg font-bold text-gray-900">Thanh toán QR Code</h2>
                                </div>

                                <p className="text-sm text-gray-500 text-center">
                                    Mã đơn hàng: <span className="font-semibold text-[#8B1A1A]">{orderCode}</span>
                                </p>
                                <p className="text-sm text-gray-500 text-center">
                                    Quét QR bằng ứng dụng ngân hàng để thanh toán
                                </p>

                                {qrLoading ? (
                                    <div className="flex flex-col items-center gap-3 py-8">
                                        <svg className="w-10 h-10 text-[#8B1A1A] animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <p className="text-sm text-gray-500">Đang tạo mã QR...</p>
                                    </div>
                                ) : qrImageUrl ? (
                                    <img
                                        src={qrImageUrl}
                                        alt="QR thanh toán"
                                        className="w-52 h-52 object-contain border-2 border-gray-100 rounded-xl"
                                    />
                                ) : null}

                                <p className="text-xs text-gray-400 text-center">
                                    Tổng thanh toán: <span className="font-bold text-gray-800">{formatPrice(totalAmount + 35000)}</span>
                                </p>

                                <div className="flex items-center justify-between w-full text-xs">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        Đang tự động kiểm tra thanh toán...
                                    </div>
                                    {qrRemainingSeconds !== null && (
                                        <span className={`font-semibold ${qrRemainingSeconds <= 30 ? "text-red-600" : "text-gray-500"}`}>
                                            Hết hạn sau: {formatCountdown(qrRemainingSeconds)}
                                        </span>
                                    )}
                                </div>

                                {qrExpired && (
                                    <div className="w-full text-center text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg py-2">
                                        Mã QR đã hết hạn. Vui lòng tạo lại để thanh toán.
                                    </div>
                                )}

                                <Link
                                    to={`/order-success?code=${orderCode}`}
                                    className={`w-full py-3 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer text-center ${qrExpired ? "bg-gray-400 cursor-not-allowed" : "bg-[#8B1A1A] hover:bg-[#701515]"}`}
                                    onClick={(event) => {
                                        if (qrExpired) event.preventDefault();
                                    }}
                                >
                                    Đã thanh toán xong →
                                </Link>
                                <Link
                                    to={`/order-success?code=${orderCode}`}
                                    className="text-xs text-gray-400 hover:text-gray-600 hover:underline cursor-pointer text-center"
                                >
                                    Thanh toán sau
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ════════ PAGE TITLE ════════ */}
            <section className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-8 pb-4">
                <h1 className="font-serif text-3xl lg:text-4xl font-bold italic mb-2">
                    <span className="relative">
                        <span className="relative z-10 text-[#8B1A1A]">Thanh toán</span>
                        <span className="absolute bottom-1 left-0 right-0 h-3 bg-yellow-300/50 -z-0" />
                    </span>
                    <span className="text-[#8B1A1A]"> đơn hàng</span>
                </h1>
                <p className="text-sm text-gray-500">
                    Hoàn tất thông tin để gửi trọn vẹn lời chúc Tết
                </p>
            </section>

            {/* ════════ TWO-COLUMN LAYOUT ════════ */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pb-14">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ──────── LEFT: Receiver Form ──────── */}
                    <div className="flex-1 min-w-0 space-y-6">

                        {/* ── Customer Email (if not logged in) ── */}
                        {!user && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                    Thông tin người đặt
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Họ và tên"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email nhận thông tin đơn hàng"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all"
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Số điện thoại"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Receiver Info Card ── */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                Thông tin người nhận
                            </h2>

                            {/* Address Book Selection for logged in users */}
                            {user && addresses.length > 0 && !addressesLoading && (
                                <div className="space-y-3 mb-6">
                                    {addresses.map((addr) => (
                                        <label key={addr.Id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressId === addr.Id ? "border-[#8B1A1A] bg-[#8B1A1A]/5" : "border-gray-200 hover:border-gray-300"}`}>
                                            <input type="radio" checked={selectedAddressId === addr.Id} onChange={() => setSelectedAddressId(addr.Id)} className="mt-0.5 w-4 h-4 accent-[#8B1A1A]" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{addr.ReceiverName} <span className="text-gray-400 font-normal ml-2">({addr.ReceiverPhone})</span></p>
                                                <p className="text-xs text-gray-500 mt-1">{addr.FullAddress}</p>
                                            </div>
                                        </label>
                                    ))}
                                    <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressId === "new" ? "border-[#8B1A1A] bg-[#8B1A1A]/5" : "border-gray-200 hover:border-gray-300"}`}>
                                        <input type="radio" checked={selectedAddressId === "new"} onChange={() => setSelectedAddressId("new")} className="mt-0.5 w-4 h-4 accent-[#8B1A1A]" />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Giao đến địa chỉ khác</p>
                                            <p className="text-xs text-gray-500 mt-1">Nhập thông tin địa chỉ mới phía dưới</p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {(!user || selectedAddressId === "new" || addresses.length === 0) && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Họ tên người nhận"
                                            value={receiverName}
                                            onChange={(e) => setReceiverName(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all"
                                        />
                                        <input
                                            type="tel"
                                            placeholder="Số điện thoại"
                                            value={receiverPhone}
                                            onChange={(e) => setReceiverPhone(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all"
                                        />
                                    </div>

                                    {/* Address dropdowns */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                        <select
                                            value={province}
                                            onChange={(e) => setProvince(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all bg-white appearance-none cursor-pointer"
                                        >
                                            <option value="">Tỉnh / Thành phố</option>
                                            <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                            <option value="Hà Nội">Hà Nội</option>
                                            <option value="Đà Nẵng">Đà Nẵng</option>
                                        </select>
                                        <select
                                            value={district}
                                            onChange={(e) => setDistrict(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all bg-white appearance-none cursor-pointer"
                                        >
                                            <option value="">Quận / Huyện</option>
                                            <option value="Quận 1">Quận 1</option>
                                            <option value="Quận 3">Quận 3</option>
                                            <option value="Quận 7">Quận 7</option>
                                        </select>
                                        <select
                                            value={ward}
                                            onChange={(e) => setWard(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all bg-white appearance-none cursor-pointer"
                                        >
                                            <option value="">Phường / Xã</option>
                                            <option value="Phường Bến Nghé">Phường Bến Nghé</option>
                                            <option value="Phường Bến Thành">Phường Bến Thành</option>
                                        </select>
                                    </div>

                                    <textarea
                                        placeholder="Số nhà, tên đường, phường/xã..."
                                        value={addressDetail}
                                        onChange={(e) => setAddressDetail(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all resize-none"
                                    />
                                </>
                            )}

                            {/* Decorative delivery illustration */}
                            <div className="mt-5 rounded-xl overflow-hidden bg-gradient-to-r from-[#f0e6d4] to-[#e8dcc8] flex items-center gap-4 p-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-5 h-5 text-[#8B1A1A]" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-sm font-bold text-[#8B1A1A]">Giao hàng tận nơi</p>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        Đội ngũ giao hàng chuyên nghiệp, đảm bảo quà tặng đến tay người nhận nguyên vẹn và đúng hẹn.
                                    </p>
                                </div>
                                <div className="w-20 h-20 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center shrink-0">
                                    <svg className="w-10 h-10 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* ── Greeting Message ── */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                                </svg>
                                Lời chúc gửi kèm
                            </h2>
                            <textarea
                                placeholder="Nhập lời chúc ý nghĩa gửi đến người nhận quà..."
                                value={greetingMessage}
                                onChange={(e) => setGreetingMessage(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all resize-none mb-4"
                            />
                            {/* Canva button */}
                            <a
                                href="https://www.canva.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-teal-400 rounded-xl text-teal-600 text-sm font-semibold hover:bg-teal-50 transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10" fill="#00C4CC" />
                                    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">C</text>
                                </svg>
                                THIẾT KẾ THIỆP CHÚC BẰNG CANVA
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                            </a>
                        </div>

                        {/* ── Delivery Date ── */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                                Thời gian giao hàng
                            </h2>
                            <p className="text-xs text-gray-500 mb-3">
                                Ngày giao hàng mong muốn
                            </p>
                            <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] transition-all"
                            />
                        </div>
                    </div>

                    {/* ──────── RIGHT: Order Summary & Payment ──────── */}
                    <div className="w-full lg:w-[420px] shrink-0 space-y-5">

                        {/* ── Order Summary ── */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-center mb-5">
                                Tóm tắt đơn hàng
                            </h3>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Giá trị đơn quà ({items.length} sản phẩm)</span>
                                    <span className="text-gray-900 font-medium">{formatPrice(totalAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Phí vận chuyển</span>
                                    <span className="text-gray-900 font-medium">35.000₫</span>
                                </div>

                                <div className="border-t border-gray-200 pt-3 mt-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">
                                            Tổng <span className="bg-yellow-300/60 px-1 py-0.5 rounded text-[#8B1A1A] font-bold">thanh toán</span>
                                        </span>
                                        <span className="text-2xl font-bold text-[#8B1A1A]">
                                            {formatPrice(totalAmount + 35000)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Error message ── */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {/* ── Action Buttons ── */}
                        <div className="space-y-3">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !!orderCode}
                                className={`w-full py-3.5 text-white text-sm font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer ${submitting || orderCode
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-[#8B1A1A] hover:bg-[#701515]"
                                    }`}
                            >
                                {submitting ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Đang xử lý...
                                    </>
                                ) : orderCode ? (
                                    "Đơn hàng đã được tạo"
                                ) : (
                                    <>
                                        Xác nhận & tạo đơn
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                    </>
                                )}
                            </button>

                            <Link
                                to="/checkout"
                                className="block w-full text-center text-xs text-gray-400 hover:text-[#8B1A1A] transition-colors py-2 uppercase tracking-wider font-semibold"
                            >
                                ← Quay lại xác nhận đơn hàng
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

