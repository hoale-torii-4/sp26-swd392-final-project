import { useState, useEffect } from "react";
import { adminService, type DashboardSummary, type OrderStatusSummary, type OrderTypeSummary, type TopCollection, type TopGiftBox, type InventoryAlert } from "../../services/adminService";

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

function formatPercent(v: number) {
    return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

export default function AdminDashboardPage() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [orderStatus, setOrderStatus] = useState<OrderStatusSummary | null>(null);
    const [orderType, setOrderType] = useState<OrderTypeSummary | null>(null);
    const [topCollections, setTopCollections] = useState<TopCollection[]>([]);
    const [topGiftBoxes, setTopGiftBoxes] = useState<TopGiftBox[]>([]);
    const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            adminService.getDashboardSummary().catch(() => null),
            adminService.getOrderStatusSummary().catch(() => null),
            adminService.getOrderTypeSummary().catch(() => null),
            adminService.getTopCollections(5).catch(() => []),
            adminService.getTopGiftBoxes(10).catch(() => []),
            adminService.getInventoryAlerts(10).catch(() => []),
        ]).then(([s, os, ot, tc, tg, ia]) => {
            setSummary(s);
            setOrderStatus(os);
            setOrderType(ot);
            setTopCollections(tc as TopCollection[]);
            setTopGiftBoxes(tg as TopGiftBox[]);
            setInventoryAlerts(ia as InventoryAlert[]);
        }).finally(() => setLoading(false));
    }, []);

    const handleExport = async () => {
        try {
            const blob = await adminService.exportDashboard();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <svg className="w-8 h-8 text-[#8B1A1A] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    const statusItems = orderStatus ? [
        { label: "Chờ thanh toán", value: orderStatus.PendingPayment, color: "bg-amber-500" },
        { label: "Đang chuẩn bị", value: orderStatus.Preparing, color: "bg-blue-500" },
        { label: "Đang giao", value: orderStatus.Shipping, color: "bg-indigo-500" },
        { label: "Giao thất bại", value: orderStatus.DeliveryFailed, color: "bg-red-500" },
        { label: "Giao một phần", value: orderStatus.PartiallyDelivered, color: "bg-orange-500" },
        { label: "Hoàn tất", value: orderStatus.Completed, color: "bg-emerald-500" },
        { label: "Đã hủy", value: orderStatus.Cancelled, color: "bg-gray-500" },
    ] : [];

    const totalOrders = statusItems.reduce((s, i) => s + i.value, 0) || 1;

    return (
        <div className="p-6 space-y-6">
            {/* ──── Header ──── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-500">Tổng quan hoạt động kinh doanh</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Xuất báo cáo
                </button>
            </div>

            {/* ──── KPI Cards ──── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Tổng doanh thu"
                    value={summary ? formatPrice(summary.TotalRevenue) : "—"}
                    change={summary?.RevenueGrowthPercent}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    accentColor="bg-emerald-100 text-emerald-700"
                />
                <KpiCard
                    title="Tổng đơn hàng"
                    value={summary?.TotalOrders?.toString() ?? "—"}
                    change={summary?.OrderGrowthPercent}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>}
                    accentColor="bg-blue-100 text-blue-700"
                />
                <KpiCard
                    title="Đơn hôm nay"
                    value={summary?.OrdersToday?.toString() ?? "—"}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
                    accentColor="bg-purple-100 text-purple-700"
                />
                <KpiCard
                    title="Tỷ lệ B2C / B2B"
                    value={summary ? `${summary.B2cPercent.toFixed(0)}% / ${summary.B2bPercent.toFixed(0)}%` : "—"}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>}
                    accentColor="bg-orange-100 text-orange-700"
                />
            </div>

            {/* ──── Order Status + Order Type ──── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Order status breakdown */}
                <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Trạng thái đơn hàng</h3>
                    <div className="space-y-3">
                        {statusItems.map((item) => (
                            <div key={item.label} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-28 shrink-0">{item.label}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                    <div
                                        className={`${item.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                                        style={{ width: `${Math.max((item.value / totalOrders) * 100, item.value > 0 ? 8 : 0)}%` }}
                                    >
                                        {item.value > 0 && (
                                            <span className="text-[10px] font-bold text-white">{item.value}</span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-gray-700 w-8 text-right">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order type breakdown */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Loại đơn hàng</h3>
                    {orderType ? (
                        <div className="space-y-4">
                            {/* Simple donut-like visual */}
                            <div className="flex justify-center">
                                <div className="relative w-32 h-32">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                        <circle
                                            cx="18" cy="18" r="15.9" fill="none"
                                            stroke="#8B1A1A" strokeWidth="3"
                                            strokeDasharray={`${orderType.B2cPercent} ${100 - orderType.B2cPercent}`}
                                            strokeDashoffset="0"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-lg font-bold text-gray-900">{(orderType.B2cOrders + orderType.B2bOrders)}</span>
                                        <span className="text-[10px] text-gray-400">đơn</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-[#8B1A1A]" />
                                        <span className="text-gray-600">B2C</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-gray-900">{orderType.B2cOrders}</span>
                                        <span className="text-gray-400 text-xs ml-1">({orderType.B2cPercent.toFixed(0)}%)</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                                        <span className="text-gray-600">B2B</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-gray-900">{orderType.B2bOrders}</span>
                                        <span className="text-gray-400 text-xs ml-1">({orderType.B2bPercent.toFixed(0)}%)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-3 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">B2C Revenue</span>
                                    <span className="font-semibold text-gray-700">{formatPrice(orderType.B2cRevenue)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">B2B Revenue</span>
                                    <span className="font-semibold text-gray-700">{formatPrice(orderType.B2bRevenue)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-8">Không có dữ liệu</p>
                    )}
                </div>
            </div>

            {/* ──── Top Collections + Top GiftBoxes ──── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Collections */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Top bộ sưu tập</h3>
                    {topCollections.length > 0 ? (
                        <div className="space-y-3">
                            {topCollections.map((c, i) => (
                                <div key={c.CollectionId} className="flex items-center gap-3">
                                    <span className="w-5 h-5 rounded-full bg-[#8B1A1A] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                    {c.Thumbnail && <img src={c.Thumbnail} alt="" className="w-8 h-8 rounded object-cover" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{c.CollectionName}</p>
                                        <p className="text-[10px] text-gray-400">{c.Orders} đơn · {c.Percent.toFixed(1)}%</p>
                                    </div>
                                    <span className="text-xs font-bold text-[#8B1A1A]">{formatPrice(c.Revenue)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
                    )}
                </div>

                {/* Top GiftBoxes */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Top giỏ quà bán chạy</h3>
                    {topGiftBoxes.length > 0 ? (
                        <div className="space-y-3">
                            {topGiftBoxes.slice(0, 5).map((g, i) => (
                                <div key={g.GiftBoxId} className="flex items-center gap-3">
                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                    {g.Image && <img src={g.Image} alt="" className="w-8 h-8 rounded object-cover" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{g.GiftBoxName}</p>
                                        <p className="text-[10px] text-gray-400">{g.CollectionName} · {g.SoldQuantity} đã bán</p>
                                    </div>
                                    <span className="text-xs font-bold text-amber-600">{formatPrice(g.Revenue)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
                    )}
                </div>
            </div>

            {/* ──── Inventory Alerts ──── */}
            {inventoryAlerts.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-sm font-bold text-gray-900">Cảnh báo tồn kho ({inventoryAlerts.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-400 uppercase border-b">
                                    <th className="pb-2 font-medium">Sản phẩm</th>
                                    <th className="pb-2 font-medium">Danh mục</th>
                                    <th className="pb-2 font-medium text-right">Tồn kho</th>
                                    <th className="pb-2 font-medium text-right">Ngưỡng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventoryAlerts.map((item) => (
                                    <tr key={item.ItemId} className="border-b border-gray-50 last:border-0">
                                        <td className="py-2 font-medium text-gray-900">{item.ItemName}</td>
                                        <td className="py-2 text-gray-500">{item.Category}</td>
                                        <td className={`py-2 text-right font-bold ${item.StockQuantity <= 0 ? "text-red-600" : "text-amber-600"}`}>
                                            {item.StockQuantity}
                                        </td>
                                        <td className="py-2 text-right text-gray-400">{item.Threshold}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ──── KPI Card Component ──── */
function KpiCard({ title, value, change, icon, accentColor }: {
    title: string;
    value: string;
    change?: number;
    icon: React.ReactNode;
    accentColor: string;
}) {
    return (
        <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${accentColor} flex items-center justify-center`}>
                    {icon}
                </div>
                {change !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${change >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {formatPercent(change)}
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
    );
}
