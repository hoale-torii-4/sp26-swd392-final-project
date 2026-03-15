import { useState, useEffect } from "react";
import { adminService, type OrderStatusSummary, type AdminOrderListItem } from "../../services/adminService";

const STATUS_CONFIG: { key: keyof OrderStatusSummary; label: string; color: string; bgColor: string }[] = [
    { key: "PendingPayment", label: "Chờ thanh toán", color: "text-amber-700", bgColor: "bg-amber-500" },
    { key: "Preparing", label: "Đang chuẩn bị", color: "text-blue-700", bgColor: "bg-blue-500" },
    { key: "Shipping", label: "Đang giao", color: "text-indigo-700", bgColor: "bg-indigo-500" },
    { key: "DeliveryFailed", label: "Giao thất bại", color: "text-red-700", bgColor: "bg-red-500" },
    { key: "PartiallyDelivered", label: "Giao một phần", color: "text-orange-700", bgColor: "bg-orange-500" },
    { key: "Completed", label: "Hoàn tất", color: "text-emerald-700", bgColor: "bg-emerald-500" },
    { key: "Cancelled", label: "Đã hủy", color: "text-gray-700", bgColor: "bg-gray-500" },
];

const ALL_STATUSES = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "PAYMENT_CONFIRMING", label: "Chờ thanh toán" },
    { value: "PREPARING", label: "Đang chuẩn bị" },
    { value: "SHIPPING", label: "Đang giao" },
    { value: "COMPLETED", label: "Hoàn tất" },
    { value: "CANCELLED", label: "Đã hủy" },
    { value: "DELIVERY_FAILED", label: "Giao thất bại" },
    { value: "PARTIAL_DELIVERY", label: "Giao một phần" },
];

const STATUS_UPDATE_OPTIONS = [
    { value: "PREPARING", label: "Đang chuẩn bị" },
    { value: "SHIPPING", label: "Đang giao" },
    { value: "COMPLETED", label: "Hoàn tất" },
    { value: "CANCELLED", label: "Đã hủy" },
];

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
    PAYMENT_CONFIRMING: { text: "Chờ thanh toán", cls: "bg-amber-100 text-amber-700" },
    PREPARING: { text: "Đang chuẩn bị", cls: "bg-blue-100 text-blue-700" },
    SHIPPING: { text: "Đang giao", cls: "bg-indigo-100 text-indigo-700" },
    PARTIAL_DELIVERY: { text: "Giao một phần", cls: "bg-orange-100 text-orange-700" },
    DELIVERY_FAILED: { text: "Giao thất bại", cls: "bg-red-100 text-red-700" },
    COMPLETED: { text: "Hoàn tất", cls: "bg-emerald-100 text-emerald-700" },
    CANCELLED: { text: "Đã hủy", cls: "bg-gray-100 text-gray-600" },
    PAYMENT_EXPIRED_INTERNAL: { text: "Hết hạn TT", cls: "bg-gray-100 text-gray-500" },
};

function formatPrice(v: number) { return v.toLocaleString("vi-VN") + "₫"; }
function formatDate(d: string) { return new Date(d).toLocaleString("vi-VN"); }
function getStatusInfo(s: string) { return STATUS_BADGE[s] ?? { text: s, cls: "bg-gray-100 text-gray-600" }; }

export default function AdminOrdersPage() {
    const [statusSummary, setStatusSummary] = useState<OrderStatusSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);

    // Order list
    const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [listLoading, setListLoading] = useState(true);

    // Status update modal
    const [showUpdate, setShowUpdate] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<AdminOrderListItem | null>(null);
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

    const pageSize = 20;

    const fetchSummary = async () => {
        setSummaryLoading(true);
        try {
            const res = await adminService.getOrderStatusSummary();
            setStatusSummary(res);
        } catch { setStatusSummary(null); }
        finally { setSummaryLoading(false); }
    };

    const fetchOrders = async () => {
        setListLoading(true);
        try {
            const res = await adminService.getAdminOrders({
                status: statusFilter || undefined,
                orderType: typeFilter || undefined,
                keyword: keyword || undefined,
                page,
                pageSize,
            });
            setOrders(res.Data);
            setTotalOrders(res.TotalItems);
            setTotalPages(res.TotalPages);
        } catch { setOrders([]); }
        finally { setListLoading(false); }
    };

    useEffect(() => { fetchSummary(); }, []);
    useEffect(() => { fetchOrders(); }, [page, keyword, statusFilter, typeFilter]);

    const summaryTotal = statusSummary
        ? Object.values(statusSummary).reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0)
        : 0;

    const openUpdateForOrder = (order: AdminOrderListItem) => {
        setSelectedOrder(order);
        setNewStatus("PREPARING");
        setStatusNote("");
        setUpdateResult(null);
        setShowUpdate(true);
        setShowDelivery(false);
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder) return;
        setUpdating(true);
        setUpdateResult(null);
        try {
            await adminService.updateOrderStatus(selectedOrder.Id, newStatus, statusNote || undefined);
            setUpdateResult({ success: true, message: "Đã cập nhật thành công!" });
            fetchOrders();
            fetchSummary();
        } catch (err: any) {
            setUpdateResult({ success: false, message: err?.response?.data?.message || err?.message || "Cập nhật thất bại." });
        } finally { setUpdating(false); }
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
            fetchOrders();
            fetchSummary();
        } catch { /* ignore */ }
        finally { setUpdatingDelivery(false); }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
                    <p className="text-sm text-gray-500">Danh sách đơn hàng, trạng thái và cập nhật</p>
                </div>
                <button onClick={() => { setShowDelivery(true); setShowUpdate(false); }} className="px-4 py-2 border border-[#8B1A1A] text-[#8B1A1A] text-sm font-semibold rounded-lg hover:bg-[#8B1A1A]/5 transition-colors cursor-pointer">
                    Cập nhật giao hàng
                </button>
            </div>

            {/* Status summary cards */}
            {summaryLoading ? (
                <div className="text-center py-4 text-gray-400 text-sm">Đang tải tổng quan...</div>
            ) : statusSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {STATUS_CONFIG.map(({ key, label, color, bgColor }) => {
                        const count = statusSummary[key] ?? 0;
                        return (
                            <div key={key} className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter(key === "PendingPayment" ? "PAYMENT_CONFIRMING" : key === "DeliveryFailed" ? "DELIVERY_FAILED" : key === "PartiallyDelivered" ? "PARTIAL_DELIVERY" : key.toUpperCase()); setPage(1); }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2.5 h-2.5 rounded-full ${bgColor}`} />
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
                                </div>
                                <p className={`text-xl font-bold ${color}`}>{count}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="Tìm mã đơn, tên, email..." value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]" />
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                    {ALL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                    <option value="">Tất cả loại</option>
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                </select>
                {(statusFilter || typeFilter || keyword) && (
                    <button onClick={() => { setStatusFilter(""); setTypeFilter(""); setKeyword(""); setPage(1); }} className="text-xs text-[#8B1A1A] hover:underline cursor-pointer">
                        Xóa bộ lọc
                    </button>
                )}
                <span className="ml-auto text-xs text-gray-400">{totalOrders} đơn hàng</span>
            </div>

            {/* Orders table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-xs text-gray-400 uppercase">
                            <th className="px-4 py-3 font-medium">Mã đơn</th>
                            <th className="px-4 py-3 font-medium">Khách hàng</th>
                            <th className="px-4 py-3 font-medium">Loại</th>
                            <th className="px-4 py-3 font-medium">Trạng thái</th>
                            <th className="px-4 py-3 font-medium text-right">Tổng tiền</th>
                            <th className="px-4 py-3 font-medium text-center">SP</th>
                            <th className="px-4 py-3 font-medium">Ngày tạo</th>
                            <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listLoading ? (
                            <tr><td colSpan={8} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-8 text-gray-400">Không có đơn hàng nào</td></tr>
                        ) : orders.map((order) => {
                            const badge = getStatusInfo(order.Status);
                            return (
                                <tr key={order.Id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-medium text-[#8B1A1A] text-xs">{order.OrderCode}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{order.CustomerName}</p>
                                            <p className="text-[11px] text-gray-400">{order.CustomerEmail}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.OrderType === "B2B" ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"}`}>{order.OrderType}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.text}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatPrice(order.TotalAmount)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">{order.TotalItems}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(order.CreatedAt)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => openUpdateForOrder(order)} className="p-1 text-gray-400 hover:text-[#8B1A1A] cursor-pointer" title="Cập nhật trạng thái">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <span className="text-xs text-gray-400">Trang {page} / {totalPages} ({totalOrders} đơn hàng)</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Trước</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Sau</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Update Status Panel */}
            {showUpdate && selectedOrder && (
                <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-[#8B1A1A]/20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900">
                            Cập nhật trạng thái — <span className="text-[#8B1A1A] font-mono">{selectedOrder.OrderCode}</span>
                            <span className="ml-2 text-gray-400 font-normal">({selectedOrder.CustomerName})</span>
                        </h3>
                        <button onClick={() => { setShowUpdate(false); setUpdateResult(null); }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-gray-400">Trạng thái hiện tại:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusInfo(selectedOrder.Status).cls}`}>{getStatusInfo(selectedOrder.Status).text}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái mới</label>
                            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm cursor-pointer">
                                {STATUS_UPDATE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
                            <input type="text" value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Tùy chọn..." className="w-full px-3 py-2 border rounded-lg text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={handleUpdateStatus} disabled={updating} className="px-5 py-2 bg-[#8B1A1A] text-white rounded-lg text-sm font-bold hover:bg-[#701515] disabled:opacity-50 cursor-pointer">
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
