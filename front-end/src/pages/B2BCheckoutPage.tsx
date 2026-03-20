import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { authService } from "../services/authService";
import { cartService, type CartItemDto } from "../services/cartService";
import {
    orderService,
    type CreateOrderB2BDto,
    type B2BDeliveryAllocationDto,
    OrderItemType,
} from "../services/orderService";
import apiClient from "../services/apiClient";

/* ══════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════ */
interface SavedAddress {
    Id: string;
    ReceiverName: string;
    ReceiverPhone: string;
    FullAddress: string;
    IsDefault: boolean;
}

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

/* ══════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════ */
export default function B2BCheckoutPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = authService.getUser();

    // ── Items from navigation state (same as B2C) ──
    const checkoutState = location.state as {
        buyNow?: boolean;
        items?: CartItemDto[];
        totalAmount?: number;
        selectedItems?: CartItemDto[];
    } | undefined;

    const isBuyNow = !!checkoutState?.buyNow && Array.isArray(checkoutState.items);
    const isSelectedCheckout = !isBuyNow && Array.isArray(checkoutState?.selectedItems);

    const [cartItems, setCartItems] = useState<CartItemDto[]>([]);
    const [loadingCart, setLoadingCart] = useState(true);

    // ── Address book ──
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [loadingAddr, setLoadingAddr] = useState(true);

    // ── Form state ──
    const [greetingMessage, setGreetingMessage] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [customerName, setCustomerName] = useState(user?.FullName ?? "");
    const [customerEmail, setCustomerEmail] = useState(user?.Email ?? "");
    const [customerPhone, setCustomerPhone] = useState(user?.Phone ?? "");

    // ── Multi-address allocations ──
    // allocations: addressId → { qty per item index }
    const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
    const [allocations, setAllocations] = useState<Record<string, Record<number, number>>>({});

    // ── Add new address form (inline) ──
    const [showAddAddr, setShowAddAddr] = useState(false);
    const [newAddr, setNewAddr] = useState({ ReceiverName: "", ReceiverPhone: "", FullAddress: "" });
    const [addingAddr, setAddingAddr] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── QR Payment state ──
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [orderCode, setOrderCode] = useState<string | null>(null);
    const [paymentDetected, setPaymentDetected] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!authService.isAuthenticated()) {
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    // Load cart
    useEffect(() => {
        if (isBuyNow) {
            setCartItems(checkoutState?.items ?? []);
            setLoadingCart(false);
        } else if (isSelectedCheckout) {
            setCartItems(checkoutState?.selectedItems ?? []);
            setLoadingCart(false);
        } else {
            cartService.getCart()
                .then(c => setCartItems(c?.Items ?? []))
                .catch(() => setCartItems([]))
                .finally(() => setLoadingCart(false));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load address book
    useEffect(() => {
        apiClient.get("/Address")
            .then(r => setAddresses(r.data?.Data ?? r.data ?? []))
            .catch(() => setAddresses([]))
            .finally(() => setLoadingAddr(false));
    }, []);

    const items = cartItems;
    const totalAmount = isBuyNow
        ? checkoutState?.totalAmount ?? 0
        : items.reduce((s, i) => s + i.UnitPrice * i.Quantity, 0);

    /* ── Allocation helpers ── */
    const toggleAddress = (addrId: string) => {
        setSelectedAddresses(prev => {
            if (prev.includes(addrId)) {
                const next = prev.filter(a => a !== addrId);
                setAllocations(al => { const c = { ...al }; delete c[addrId]; return c; });
                return next;
            }
            setAllocations(al => ({
                ...al,
                [addrId]: items.reduce((acc, _, idx) => ({ ...acc, [idx]: 0 }), {} as Record<number, number>)
            }));
            return [...prev, addrId];
        });
    };

    const setQty = (addrId: string, itemIdx: number, val: number) => {
        setAllocations(al => ({
            ...al,
            [addrId]: { ...(al[addrId] ?? {}), [itemIdx]: Math.max(0, val) }
        }));
    };

    // Total allocated per item
    const allocatedPerItem = (itemIdx: number) =>
        selectedAddresses.reduce((s, a) => s + (allocations[a]?.[itemIdx] ?? 0), 0);

    const allAllocationsValid = items.every((item, idx) => allocatedPerItem(idx) === item.Quantity);

    /* ── Add new address ── */
    const handleAddAddress = async () => {
        if (!newAddr.ReceiverName || !newAddr.FullAddress) return;
        setAddingAddr(true);
        try {
            const res = await apiClient.post("/Address", newAddr);
            const saved: SavedAddress = res.data?.Data ?? res.data;
            setAddresses(prev => [...prev, saved]);
            setShowAddAddr(false);
            setNewAddr({ ReceiverName: "", ReceiverPhone: "", FullAddress: "" });
        } catch {
            toast.error("Không thể thêm địa chỉ. Vui lòng thử lại.");
        } finally {
            setAddingAddr(false);
        }
    };

    // ── Auto-polling payment status ──
    useEffect(() => {
        if (!qrImageUrl || !orderCode) return;
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
                    setTimeout(() => navigate(`/order-success?code=${orderCode}`), 1500);
                }
            } catch { /* silently ignore */ }
        };
        pollIntervalRef.current = setInterval(poll, 3000);
        return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    }, [qrImageUrl, orderCode, navigate]);

    /* ── Submit B2B order ── */
    const handleSubmit = async () => {
        if (!user?.Id) return;
        if (selectedAddresses.length === 0) { setError("Vui lòng chọn ít nhất 1 địa chỉ giao hàng."); return; }
        if (!allAllocationsValid) { setError("Số lượng phân bổ chưa khớp với số lượng đặt hàng. Vui lòng kiểm tra lại."); return; }
        if (!deliveryDate) { setError("Vui lòng chọn ngày giao hàng."); return; }

        setSubmitting(true);
        setError(null);

        try {
            const deliveryAllocations: B2BDeliveryAllocationDto[] = selectedAddresses.map(addrId => ({
                AddressId: addrId,
                ItemAllocations: items.map((_, idx) => ({
                    OrderItemIndex: idx,
                    Quantity: allocations[addrId]?.[idx] ?? 0,
                })).filter(a => a.Quantity > 0),
                GreetingMessage: greetingMessage || undefined,
                HideInvoice: false,
            }));

            const orderData: CreateOrderB2BDto = {
                UserId: user.Id,
                CustomerEmail: customerEmail,
                CustomerName: customerName,
                CustomerPhone: customerPhone,
                Items: items.map(item => ({
                    Type: item.Type as OrderItemType,
                    Id: item.ProductId || item.Id,
                    Quantity: item.Quantity,
                    Price: item.UnitPrice,
                    Name: item.Name ?? undefined,
                })),
                DeliveryAllocations: deliveryAllocations,
                GreetingMessage: greetingMessage || undefined,
                DeliveryDate: new Date(deliveryDate).toISOString(),
            };

            const result = await orderService.createB2BOrder(orderData);
            sessionStorage.setItem("last_order_code", result.orderCode);
            setOrderCode(result.orderCode);

            // Clear cart
            if (!isBuyNow && !isSelectedCheckout) {
                await cartService.clearCart();
            } else if (isSelectedCheckout) {
                await Promise.all(items.map(item => cartService.removeItem(item.Id)));
            }

            // Fetch QR code
            setQrLoading(true);
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || "https://shophangtet-api.onrender.com";
                const qrRes = await fetch(`${apiBase}/Payment/create-qr/${result.orderCode}`);
                if (qrRes.ok) {
                    const json = await qrRes.json();
                    const qrUrl = json?.Data?.qrUrl ?? json?.data?.qrUrl ?? json?.qrUrl;
                    if (qrUrl) {
                        setQrImageUrl(qrUrl);
                    } else {
                        navigate(`/order-success?code=${result.orderCode}`);
                    }
                } else {
                    navigate(`/order-success?code=${result.orderCode}`);
                }
            } catch {
                navigate(`/order-success?code=${result.orderCode}`);
            } finally {
                setQrLoading(false);
            }
        } catch (err: unknown) {
            const msg = err && typeof err === "object" && "message" in err
                ? (err as { message: string }).message
                : "Có lỗi xảy ra khi tạo đơn hàng.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    /* ══════════ RENDER ══════════ */
    if (loadingCart || loadingAddr) {
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

    return (
        <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
            <Header />

            {/* ════════ QR PAYMENT MODAL ════════ */}
            {(qrLoading || qrImageUrl) && orderCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4">
                        {paymentDetected ? (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Thanh toán thành công!</h2>
                                <p className="text-sm text-gray-500 text-center">Đang chuyển đến trang xác nhận...</p>
                                <svg className="w-5 h-5 text-green-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-purple-100 text-purple-700 rounded">B2B</span>
                                    <h2 className="text-lg font-bold text-gray-900">Thanh toán QR Code</h2>
                                </div>
                                <p className="text-sm text-gray-500 text-center">
                                    Mã đơn hàng: <span className="font-semibold text-[#8B1A1A]">{orderCode}</span>
                                </p>
                                <p className="text-sm text-gray-500 text-center">Quét QR bằng ứng dụng ngân hàng</p>

                                {qrLoading ? (
                                    <div className="flex flex-col items-center gap-3 py-8">
                                        <svg className="w-10 h-10 text-[#8B1A1A] animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <p className="text-sm text-gray-500">Đang tạo mã QR...</p>
                                    </div>
                                ) : qrImageUrl ? (
                                    <img src={qrImageUrl} alt="QR thanh toán" className="w-52 h-52 object-contain border-2 border-gray-100 rounded-xl" />
                                ) : null}

                                <p className="text-xs text-gray-400 text-center">
                                    Tổng thanh toán: <span className="font-bold text-gray-800">{formatPrice(totalAmount)}</span>
                                </p>

                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    Đang tự động kiểm tra thanh toán...
                                </div>

                                <Link
                                    to={`/order-success?code=${orderCode}`}
                                    className="w-full py-3 bg-[#8B1A1A] hover:bg-[#701515] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer text-center"
                                >
                                    Đã thanh toán xong →
                                </Link>
                                <Link
                                    to={`/order-success?code=${orderCode}`}
                                    className="text-xs text-gray-400 hover:text-gray-600 hover:underline cursor-pointer text-center"
                                >
                                    Thanh toán sau (COD)
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Title */}
            <section className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-8 pb-4">
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-purple-100 text-purple-700 rounded">B2B</span>
                    <h1 className="font-serif text-3xl font-bold italic text-[#8B1A1A]">Đặt hàng doanh nghiệp</h1>
                </div>
                <p className="text-sm text-gray-500">Phân bổ sản phẩm đến nhiều địa chỉ nhận hàng khác nhau</p>
            </section>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pb-14">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ─── LEFT COLUMN ─── */}
                    <div className="flex-1 min-w-0 space-y-6">

                        {/* Instructions / Validation Rules Note */}
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                            <div className="shrink-0 pt-0.5">
                                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-wider">Lưu ý khi đặt hàng B2B</h3>
                                <ul className="text-sm text-blue-800 space-y-1.5 list-disc pl-4 marker:text-blue-400">
                                    <li>Cần chọn <strong>ít nhất 1 địa chỉ giao hàng</strong> và phân bổ số lượng sản phẩm phù hợp.</li>
                                    <li>Tổng số lượng sản phẩm phân bổ phải <strong>khớp chính xác</strong> với số lượng trong giỏ hàng.</li>
                                    <li>Phí giao hàng được tính theo từng địa chỉ: <strong>25,000₫ / địa chỉ</strong>.</li>
                                    <li>Bạn có thể viết một lời chúc chung gửi kèm đơn hàng trên tất cả địa chỉ.</li>
                                </ul>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Thông tin người đặt</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input type="text" placeholder="Họ và tên" value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]" />
                                <input type="email" placeholder="Email" value={customerEmail}
                                    onChange={e => setCustomerEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]" />
                                <input type="tel" placeholder="Số điện thoại" value={customerPhone}
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] sm:col-span-2" />
                            </div>
                        </div>

                        {/* Delivery Date + Greeting */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Ngày giao hàng dự kiến</h2>
                                <input type="date" value={deliveryDate}
                                    onChange={e => setDeliveryDate(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Lời chúc gửi kèm (chung)</h2>
                                <textarea rows={2} placeholder="Lời chúc sẽ được gửi đến tất cả địa chỉ..."
                                    value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A] resize-none" />
                            </div>
                        </div>

                        {/* Address Selection */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                                    Địa chỉ giao hàng <span className="text-[#8B1A1A]">({selectedAddresses.length} đã chọn)</span>
                                </h2>
                                <button
                                    onClick={() => setShowAddAddr(v => !v)}
                                    className="text-xs text-[#8B1A1A] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Thêm địa chỉ mới
                                </button>
                            </div>

                            {/* Add address inline form */}
                            {showAddAddr && (
                                <div className="mb-4 p-4 border-2 border-dashed border-[#8B1A1A]/30 rounded-xl space-y-3 bg-[#8B1A1A]/5">
                                    <input type="text" placeholder="Tên người nhận *" value={newAddr.ReceiverName}
                                        onChange={e => setNewAddr(a => ({ ...a, ReceiverName: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]" />
                                    <input type="tel" placeholder="Số điện thoại" value={newAddr.ReceiverPhone}
                                        onChange={e => setNewAddr(a => ({ ...a, ReceiverPhone: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]" />
                                    <input type="text" placeholder="Địa chỉ đầy đủ *" value={newAddr.FullAddress}
                                        onChange={e => setNewAddr(a => ({ ...a, FullAddress: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]" />
                                    <div className="flex gap-2">
                                        <button onClick={handleAddAddress} disabled={addingAddr}
                                            className="px-4 py-2 bg-[#8B1A1A] text-white text-xs font-bold rounded-lg hover:bg-[#701515] transition-colors disabled:opacity-50 cursor-pointer">
                                            {addingAddr ? "Đang lưu..." : "Lưu địa chỉ"}
                                        </button>
                                        <button onClick={() => setShowAddAddr(false)}
                                            className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
                                            Huỷ
                                        </button>
                                    </div>
                                </div>
                            )}

                            {addresses.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">Chưa có địa chỉ nào. Hãy thêm địa chỉ mới ở trên.</p>
                            ) : (
                                <div className="space-y-3">
                                    {addresses.map(addr => {
                                        const selected = selectedAddresses.includes(addr.Id);
                                        return (
                                            <div key={addr.Id} className={`rounded-xl border-2 transition-all ${selected ? "border-[#8B1A1A] bg-[#8B1A1A]/5" : "border-gray-200"}`}>
                                                <label className="flex items-start gap-3 p-4 cursor-pointer">
                                                    <input type="checkbox" checked={selected}
                                                        onChange={() => toggleAddress(addr.Id)}
                                                        className="mt-1 w-4 h-4 accent-[#8B1A1A]" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-gray-900">{addr.ReceiverName}</p>
                                                            {addr.IsDefault && <span className="text-[9px] px-1.5 py-0.5 bg-[#8B1A1A] text-white rounded uppercase tracking-wider">Mặc định</span>}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5">{addr.ReceiverPhone}</p>
                                                        <p className="text-xs text-gray-500 truncate">{addr.FullAddress}</p>
                                                    </div>
                                                </label>

                                                {/* Allocation table */}
                                                {selected && (
                                                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phân bổ sản phẩm cho địa chỉ này</p>
                                                        <div className="space-y-4">
                                                            {items.map((item, idx) => {
                                                                const totalOtherAddresses = selectedAddresses
                                                                    .filter(a => a !== addr.Id)
                                                                    .reduce((s, a) => s + (allocations[a]?.[idx] ?? 0), 0);
                                                                const maxAllowed = item.Quantity - totalOtherAddresses;
                                                                const current = allocations[addr.Id]?.[idx] ?? 0;
                                                                const totalAllocated = totalOtherAddresses + current;

                                                                return (
                                                                    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-100">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <p className="text-xs font-bold text-gray-800 flex-1 truncate">{item.Name ?? `Sản phẩm ${idx + 1}`}</p>
                                                                            <p className={`text-[11px] font-semibold shrink-0 ${totalAllocated > item.Quantity ? "text-red-500" : totalAllocated === item.Quantity ? "text-green-600" : "text-gray-500"}`}>
                                                                                {totalAllocated}/{item.Quantity} đã chia
                                                                            </p>
                                                                        </div>
                                                                        
                                                                        <div className="flex items-center gap-3">
                                                                            {/* Range Slider */}
                                                                            <div className="flex-1 flex items-center gap-2">
                                                                                 <span className="text-xs text-gray-400 w-4 text-center">0</span>
                                                                                 <input 
                                                                                    type="range" 
                                                                                    min="0" 
                                                                                    max={maxAllowed} 
                                                                                    value={current}
                                                                                    onChange={(e) => setQty(addr.Id, idx, parseInt(e.target.value) || 0)}
                                                                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8B1A1A]"
                                                                                 />
                                                                                 <span className="text-xs text-[#8B1A1A] font-bold w-6 text-center">{current}</span>
                                                                            </div>

                                                                            {/* Quick Fill Button */}
                                                                            <button 
                                                                                onClick={() => setQty(addr.Id, idx, maxAllowed)}
                                                                                disabled={current === maxAllowed || maxAllowed === 0}
                                                                                className="shrink-0 px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase rounded border border-green-200 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                                            >
                                                                                Tối đa
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── RIGHT: Summary & Submit ─── */}
                    <div className="w-full lg:w-[380px] shrink-0 space-y-5">

                        {/* Item summary */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Đơn hàng ({items.length} sản phẩm)</h3>
                            <div className="space-y-3">
                                {items.map((item, idx) => {
                                    const allocated = allocatedPerItem(idx);
                                    const ok = allocated === item.Quantity;
                                    return (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-800 truncate">{item.Name ?? `Sản phẩm ${idx + 1}`}</p>
                                                <p className="text-xs text-gray-400">x{item.Quantity}</p>
                                            </div>
                                            <div className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${ok ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"}`}>
                                                {ok ? "✓ Đủ" : `${allocated}/${item.Quantity} đã phân bổ`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between">
                                <span className="text-sm text-gray-500">Tổng tiền hàng</span>
                                <span className="text-xl font-bold text-[#8B1A1A]">{formatPrice(totalAmount)}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 text-right">Phí ship sẽ được tính riêng theo địa chỉ</p>
                        </div>

                        {/* Allocation status summary */}
                        {selectedAddresses.length > 0 && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tóm tắt phân bổ</h3>
                                {selectedAddresses.map(addrId => {
                                    const addr = addresses.find(a => a.Id === addrId);
                                    const totalQty = items.reduce((s, _, idx) => s + (allocations[addrId]?.[idx] ?? 0), 0);
                                    return (
                                        <div key={addrId} className="flex justify-between text-xs py-1">
                                            <span className="text-gray-600 truncate flex-1">{addr?.ReceiverName}</span>
                                            <span className="text-gray-900 font-semibold ml-2">{totalQty} sản phẩm</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Total Status Box */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-dashed border-[#8B1A1A]/30 mb-6">
                             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Trạng thái phân chia</h3>
                             {allAllocationsValid ? (
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl border border-green-200">
                                     <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                     <p className="text-sm font-bold">Đã phân bổ khớp 100% giỏ hàng. Tuyệt vời!</p>
                                </div>
                             ) : (
                                <div className="flex items-start gap-2 text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-200">
                                     <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                     <div className="flex-1 text-sm leading-relaxed">
                                        <span className="font-bold block mb-1">Cần phân chia đủ số lượng.</span>
                                        Bạn có thể phân bổ bằng cách kéo thanh gạt hoặc nhấn <span className="inline-block px-1.5 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold uppercase rounded border border-green-200">Tối đa</span> cho từng địa chỉ.
                                     </div>
                                </div>
                             )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">{error}</div>
                        )}

                        {/* Submit */}
                        <button onClick={handleSubmit}
                            disabled={submitting || !allAllocationsValid || selectedAddresses.length === 0}
                            className={`w-full py-3.5 text-white text-sm font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer ${submitting || !allAllocationsValid || selectedAddresses.length === 0
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-[#8B1A1A] hover:bg-[#701515] filter drop-shadow-md"}`}>
                            {submitting ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    Xác nhận đặt hàng B2B
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </>
                            )}
                        </button>

                        <Link to="/checkout" state={location.state}
                            className="block w-full text-center text-xs text-gray-400 hover:text-[#8B1A1A] transition-colors py-2 uppercase tracking-wider font-semibold">
                            ← Quay lại
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
