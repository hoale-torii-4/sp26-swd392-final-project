import { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";
import { FiLoader } from "react-icons/fi";

function formatPrice(v: number | undefined | null) { return (v ?? 0).toLocaleString("vi-VN") + "₫"; }

interface ChartItem { Date: string; Revenue: number; LastYearRevenue: number; }
interface MonthlyChart { Month: string; B2COrders: number; B2BOrders: number; }

export default function AdminReportsPage() {
    const [revenueData, setRevenueData] = useState<any>(null);
    const [chart, setChart] = useState<ChartItem[]>([]);
    const [revenueView, setRevenueView] = useState("day");
    const [collectionsPerf, setCollectionsPerf] = useState<any[]>([]);
    const [giftboxPerf, setGiftboxPerf] = useState<any[]>([]);
    const [b2cb2b, setB2cb2b] = useState<any>(null);
    const [monthlyChart, setMonthlyChart] = useState<MonthlyChart[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            adminService.getRevenue({ view: revenueView }).catch(() => null),
            adminService.getCollectionsPerformance().catch(() => []),
            adminService.getGiftBoxPerformance().catch(() => []),
            adminService.getB2cB2bComparison().catch(() => null),
        ]).then(([r, cp, gp, bb]) => {
            setRevenueData(r);
            // Revenue chart: RevenueReportDTO.Chart = [{Date, Revenue, LastYearRevenue}]
            setChart(r?.Chart || r?.chart || []);
            // Collections: CollectionPerformanceItemDTO[] = [{Rank, CollectionId, CollectionName, Orders, Revenue, Percent, Thumbnail}]
            setCollectionsPerf(Array.isArray(cp) ? cp : []);
            // GiftBox: GiftBoxPerformanceItemDTO[] = [{GiftBoxId, GiftBoxName, SoldQuantity, Revenue, AvgRating, Image}]
            setGiftboxPerf(Array.isArray(gp) ? gp : []);
            setB2cb2b(bb);
            setMonthlyChart(bb?.MonthlyOrdersChart || bb?.monthlyOrdersChart || []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [revenueView]);

    const downloadExport = async (fn: () => Promise<any>, filename: string) => {
        try {
            const blob = await fn();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full"><FiLoader className="w-8 h-8 text-[#8B1A1A] animate-spin" /></div>;
    }

    const maxChart = Math.max(...chart.map(c => c.Revenue), 1);
    const totalRevenue = revenueData?.TotalRevenue ?? revenueData?.totalRevenue ?? 0;
    const growthPct = revenueData?.GrowthPercent ?? revenueData?.growthPercent ?? 0;
    const b2cRevenue = b2cb2b?.B2CRevenue ?? b2cb2b?.b2cRevenue ?? 0;
    const b2cOrders = b2cb2b?.B2COrders ?? b2cb2b?.b2cOrders ?? 0;
    const b2bRevenue = b2cb2b?.B2BRevenue ?? b2cb2b?.b2bRevenue ?? 0;
    const b2bOrders = b2cb2b?.B2BOrders ?? b2cb2b?.b2bOrders ?? 0;
    const b2cAvg = b2cb2b?.B2CAvgOrderValue ?? b2cb2b?.b2cAvgOrderValue ?? 0;
    const maxMonthly = Math.max(...monthlyChart.map(m => m.B2COrders + m.B2BOrders), 1);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Báo cáo</h1>

            {/* Revenue summary + chart */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Doanh thu</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-xl font-bold text-[#8B1A1A]">{formatPrice(totalRevenue)}</span>
                            {growthPct !== 0 &&
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${growthPct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                    {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%
                                </span>
                            }
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                            {["day", "week", "month"].map(v => (
                                <button key={v} onClick={() => setRevenueView(v)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${revenueView === v ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                                    {v === "day" ? "Ngày" : v === "week" ? "Tuần" : "Tháng"}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => downloadExport(() => adminService.exportRevenue({ view: revenueView }), "revenue.xlsx")} className="px-3 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-[#8B1A1A] cursor-pointer">
                            Xuất Excel
                        </button>
                    </div>
                </div>

                {/* Bar chart from Chart array: [{Date, Revenue, LastYearRevenue}] */}
                <div className="flex items-end gap-1 h-48">
                    {chart.length > 0 ? chart.slice(-30).map((c, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center group relative" title={`${c.Date}: ${formatPrice(c.Revenue)}`}>
                            <div className="w-full bg-[#8B1A1A]/80 rounded-t hover:bg-[#8B1A1A] transition-colors cursor-default" style={{ height: `${(c.Revenue / maxChart) * 100}%`, minHeight: c.Revenue > 0 ? "4px" : "0" }} />
                        </div>
                    )) : (
                        <div className="w-full flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu doanh thu</div>
                    )}
                </div>
                {chart.length > 0 && (
                    <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                        <span>{chart[0]?.Date}</span>
                        <span>{chart[chart.length - 1]?.Date}</span>
                    </div>
                )}
            </div>

            {/* Collections + GiftBox Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Collections Performance: [{Rank, CollectionName, Orders, Revenue, Percent, Thumbnail}] */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900">Hiệu suất bộ sưu tập</h3>
                        <button onClick={() => downloadExport(adminService.exportCollections, "collections.xlsx")} className="text-[10px] text-gray-400 hover:text-[#8B1A1A] cursor-pointer">Xuất Excel</button>
                    </div>
                    {collectionsPerf.length > 0 ? (
                        <div className="space-y-3">
                            {collectionsPerf.map((c: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-5 h-5 rounded-full bg-[#8B1A1A] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{c.Rank ?? c.rank ?? i + 1}</span>
                                    {(c.Thumbnail || c.thumbnail) && <img src={c.Thumbnail || c.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{c.CollectionName || c.collectionName}</p>
                                        <p className="text-[10px] text-gray-400">{c.Orders ?? c.orders ?? 0} đơn · {(c.Percent ?? c.percent ?? 0).toFixed(1)}%</p>
                                    </div>
                                    <span className="text-xs font-bold text-[#8B1A1A]">{formatPrice(c.Revenue ?? c.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>}
                </div>

                {/* GiftBox Performance: [{GiftBoxName, SoldQuantity, Revenue, AvgRating, Image}] */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900">Hiệu suất giỏ quà</h3>
                        <button onClick={() => downloadExport(adminService.exportGiftBoxes, "giftboxes.xlsx")} className="text-[10px] text-gray-400 hover:text-[#8B1A1A] cursor-pointer">Xuất Excel</button>
                    </div>
                    {giftboxPerf.length > 0 ? (
                        <div className="space-y-3">
                            {giftboxPerf.slice(0, 8).map((g: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                    {(g.Image || g.image) && <img src={g.Image || g.image} alt="" className="w-8 h-8 rounded object-cover" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{g.GiftBoxName || g.giftBoxName}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {g.SoldQuantity ?? g.soldQuantity ?? 0} đã bán
                                            {(g.AvgRating ?? g.avgRating) > 0 && <> · ⭐ {(g.AvgRating ?? g.avgRating).toFixed(1)}</>}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold text-amber-600">{formatPrice(g.Revenue ?? g.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>}
                </div>
            </div>

            {/* B2C vs B2B Comparison */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">So sánh B2C vs B2B</h3>
                    <button onClick={() => downloadExport(adminService.exportB2cB2b, "b2c-b2b.xlsx")} className="text-[10px] text-gray-400 hover:text-[#8B1A1A] cursor-pointer">Xuất Excel</button>
                </div>
                {b2cb2b ? (
                    <div className="space-y-6">
                        {/* KPI cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">B2C Đơn hàng</p>
                                <p className="text-2xl font-bold text-blue-700">{b2cOrders}</p>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">B2C Doanh thu</p>
                                <p className="text-lg font-bold text-blue-600">{formatPrice(b2cRevenue)}</p>
                                {b2cAvg > 0 && <p className="text-[10px] text-gray-400 mt-1">TB: {formatPrice(b2cAvg)}/đơn</p>}
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">B2B Đơn hàng</p>
                                <p className="text-2xl font-bold text-purple-700">{b2bOrders}</p>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">B2B Doanh thu</p>
                                <p className="text-lg font-bold text-purple-600">{formatPrice(b2bRevenue)}</p>
                            </div>
                        </div>

                        {/* Monthly orders chart */}
                        {monthlyChart.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Đơn hàng theo tháng</h4>
                                <div className="flex items-end gap-2 h-40">
                                    {monthlyChart.map((m, i) => {
                                        const total = m.B2COrders + m.B2BOrders;
                                        const b2cH = maxMonthly > 0 ? (m.B2COrders / maxMonthly) * 100 : 0;
                                        const b2bH = maxMonthly > 0 ? (m.B2BOrders / maxMonthly) * 100 : 0;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${m.Month}: B2C=${m.B2COrders}, B2B=${m.B2BOrders}`}>
                                                <span className="text-[9px] text-gray-400 font-medium">{total > 0 ? total : ""}</span>
                                                <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                                                    {b2bH > 0 && <div className="w-full bg-purple-400 rounded-t" style={{ height: `${b2bH}%`, minHeight: "3px" }} />}
                                                    {b2cH > 0 && <div className={`w-full bg-blue-500 ${b2bH > 0 ? "" : "rounded-t"}`} style={{ height: `${b2cH}%`, minHeight: "3px" }} />}
                                                </div>
                                                <span className="text-[9px] text-gray-400">{m.Month.slice(5)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-center gap-4 mt-3">
                                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500" /><span className="text-[10px] text-gray-500">B2C</span></div>
                                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-purple-400" /><span className="text-[10px] text-gray-500">B2B</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>}
            </div>
        </div>
    );
}
