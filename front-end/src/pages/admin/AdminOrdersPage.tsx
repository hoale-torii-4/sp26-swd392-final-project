import { useState, useEffect } from "react";
import { adminService, type OrderStatusSummary } from "../../services/adminService";

const STATUS_CONFIG: { key: keyof OrderStatusSummary; label: string; color: string; bgColor: string }[] = [
    { key: "PendingPayment", label: "Chờ thanh toán", color: "text-amber-700", bgColor: "bg-amber-500" },
    { key: "Preparing", label: "Đang chuẩn bị", color: "text-blue-700", bgColor: "bg-blue-500" },
    { key: "Shipping", label: "Đang giao", color: "text-indigo-700", bgColor: "bg-indigo-500" },
    { key: "DeliveryFailed", label: "Giao thất bại", color: "text-red-700", bgColor: "bg-red-500" },
    { key: "PartiallyDelivered", label: "Giao một phần", color: "text-orange-700", bgColor: "bg-orange-500" },
    { key: "Completed", label: "Hoàn tất", color: "text-emerald-700", bgColor: "bg-emerald-500" },
    { key: "Cancelled", label: "Đã hủy", color: "text-gray-700", bgColor: "bg-gray-500" },
];

// Status update modal
const ALL_STATUSES = [
    { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
    { value: "PREPARING", label: "Đang chuẩn bị" },
    { value: "SHIPPING", label: "Đang giao" },
    { value: "COMPLETED", label: "Hoàn tất" },
    { value: "CANCELLED", label: "Đã hủy" },
];

export default function AdminOrdersPage() {
    const [statusSummary, setStatusSummary] = useState<OrderStatusSummary | null>(null);
    const [loading, setLoading] = useState(true);

    // Status update form
    const [showUpdate, setShowUpdate] = useState(false);
    const [orderId, setOrderId] = useState("");
    const [newStatus, setNewStatus] = useState("PREPARING");
    const [statusNote, setStatusNote] = useState("");
    const [updating, setUpdating] = useState(false);
    const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string } | null>(null);

    // Delivery update form
    const [showDelivery, setShowDelivery] = useState(false);
    const [deliveryId, setDeliveryId] = useState("");
    const [deliveryStatus, setDeliveryStatus] = useState("DELIVERED");
    const [failureReason, setFailureReason] = useState("");
    const [updatingDelivery, setUpdatingDelivery] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await adminService.getOrderStatusSummary();
            setStatusSummary(res);
        } catch { setStatusSummary(null); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const totalOrders = statusSummary
        ? Object.values(statusSummary).reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0)
        : 0;

    const handleUpdateStatus = async () => {
        if (!orderId.trim()) return;
        setUpdating(true);
        setUpdateResult(null);
        try {
            await adminService.updateOrderStatus(orderId.trim(), newStatus, statusNote || undefined);
            setUpdateResult({ success: true, message: `Đã cập nhật đơn hàng thành công!` });
            setOrderId("");
            setStatusNote("");
            fetchData(); // refresh summary
        } catch (err: any) {
            setUpdateResult({ success: false, message: err?.response?.data?.message || "Cập nhật thất bại. Kiểm tra lại mã đơn hàng." });
        }
        finally { setUpdating(false); }
    };

    const handleUpdateDelivery = async () => {
        if (!deliveryId.trim()) return;
        setUpdatingDelivery(true);
        try {
            if (deliveryStatus === "RESHIP") {
                await adminService.reshipDelivery(deliveryId.trim());
            } else {
                await adminService.updateDeliveryStatus(deliveryId.trim(), deliveryStatus, failureReason || undefined);
            }
            setShowDelivery(false);
            setDeliveryId("");
            setFailureReason("");
            fetchData();
        } catch { /* ignore */ }
        finally { setUpdatingDelivery(false); }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
                    <p className="text-sm text-gray-500">Tổng quan trạng thái và cập nhật đơn hàng</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setShowDelivery(true); setShowUpdate(false); }} className="px-4 py-2 border border-[#8B1A1A] text-[#8B1A1A] text-sm font-semibold rounded-lg hover:bg-[#8B1A1A]/5 transition-colors cursor-pointer">
                        Cập nhật giao hàng
                    </button>
                    <button onClick={() => { setShowUpdate(true); setShowDelivery(false); }} className="flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                        Cập nhật trạng thái
                    </button>
                </div>
            </div>

            {/* Total orders card */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-500">Tổng đơn hàng</p>
                    <button onClick={fetchData} className="text-xs text-gray-400 hover:text-[#8B1A1A] cursor-pointer">Làm mới</button>
                </div>
                <p className="text-3xl font-bold text-gray-900">{loading ? "..." : totalOrders}</p>
            </div>

            {/* Status breakdown grid */}
            {loading ? (
                <div className="text-center py-8 text-gray-400">Đang tải...</div>
            ) : statusSummary ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {STATUS_CONFIG.map(({ key, label, color, bgColor }) => {
                        const count = statusSummary[key] ?? 0;
                        const pct = totalOrders > 0 ? (count / totalOrders * 100) : 0;
                        return (
                            <div key={key} className="bg-white rounded-xl p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
                                    <div className={`w-3 h-3 rounded-full ${bgColor}`} />
                                </div>
                                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                                <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-gray-400">{pct.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div className={`${bgColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400">Không thể tải dữ liệu</div>
            )}

            {/* Visual bar chart */}
            {statusSummary && totalOrders > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Phân bổ trạng thái</h3>
                    <div className="flex rounded-lg overflow-hidden h-10">
                        {STATUS_CONFIG.map(({ key, label, bgColor }) => {
                            const count = statusSummary[key] ?? 0;
                            const pct = totalOrders > 0 ? (count / totalOrders * 100) : 0;
                            if (pct === 0) return null;
                            return (
                                <div
                                    key={key}
                                    className={`${bgColor} flex items-center justify-center transition-all duration-500`}
                                    style={{ width: `${pct}%` }}
                                    title={`${label}: ${count} (${pct.toFixed(1)}%)`}
                                >
                                    {pct > 8 && <span className="text-[10px] font-bold text-white">{count}</span>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                        {STATUS_CONFIG.map(({ key, label, bgColor }) => {
                            const count = statusSummary[key] ?? 0;
                            if (count === 0) return null;
                            return (
                                <div key={key} className="flex items-center gap-1.5">
                                    <div className={`w-2.5 h-2.5 rounded ${bgColor}`} />
                                    <span className="text-[10px] text-gray-500">{label} ({count})</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Update Status Panel */}
            {showUpdate && (
                <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-[#8B1A1A]/20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900">Cập nhật trạng thái đơn hàng</h3>
                        <button onClick={() => { setShowUpdate(false); setUpdateResult(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mã đơn hàng (Order ID)</label>
                            <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Nhập Order ID..." className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái mới</label>
                            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm cursor-pointer">
                                {ALL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
                            <input type="text" value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Tùy chọn..." className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={handleUpdateStatus} disabled={updating || !orderId.trim()} className="px-5 py-2 bg-[#8B1A1A] text-white rounded-lg text-sm font-bold hover:bg-[#701515] disabled:opacity-50 cursor-pointer">
                            {updating ? "Đang cập nhật..." : "Cập nhật"}
                        </button>
                        {updateResult && (
                            <span className={`text-sm font-medium ${updateResult.success ? "text-emerald-600" : "text-red-600"}`}>
                                {updateResult.message}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Update Delivery Panel */}
            {showDelivery && (
                <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900">Cập nhật trạng thái giao hàng</h3>
                        <button onClick={() => setShowDelivery(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Delivery ID</label>
                            <input type="text" value={deliveryId} onChange={e => setDeliveryId(e.target.value)} placeholder="Nhập Delivery ID..." className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                            <select value={deliveryStatus} onChange={e => setDeliveryStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm cursor-pointer">
                                <option value="SHIPPING">Đang giao</option>
                                <option value="DELIVERED">Đã giao</option>
                                <option value="FAILED">Giao thất bại</option>
                                <option value="RESHIP">Giao lại</option>
                            </select>
                        </div>
                        {deliveryStatus === "FAILED" && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Lý do thất bại</label>
                                <input type="text" value={failureReason} onChange={e => setFailureReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>
                        )}
                    </div>
                    <button onClick={handleUpdateDelivery} disabled={updatingDelivery || !deliveryId.trim()} className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                        {updatingDelivery ? "Đang cập nhật..." : "Cập nhật giao hàng"}
                    </button>
                </div>
            )}
        </div>
    );
}
