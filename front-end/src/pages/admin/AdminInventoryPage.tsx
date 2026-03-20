import { useState, useEffect } from "react";
import { adminService, type InventoryItem, type InventoryLog, type InventorySummaryDto } from "../../services/adminService";

export default function AdminInventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [summary, setSummary] = useState<InventorySummaryDto | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [categoryFilter] = useState("");
    const [stockFilter, setStockFilter] = useState("");
    const [tab, setTab] = useState<"items" | "logs">("items");
    const [loading, setLoading] = useState(true);

    // Adjust modal
    const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
    const [adjustQty, setAdjustQty] = useState(0);
    const [adjustNote, setAdjustNote] = useState("");
    const [adjusting, setAdjusting] = useState(false);

    const pageSize = 20;

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await adminService.getInventory({ search: search || undefined, category: categoryFilter || undefined, stockStatus: stockFilter || undefined, page, pageSize });
            setItems(res.Data); setTotal(res.TotalItems);
        } catch { setItems([]); }
        finally { setLoading(false); }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await adminService.getInventoryLogs({ page, pageSize });
            setLogs(res.Data); setTotal(res.TotalItems);
        } catch { setLogs([]); }
        finally { setLoading(false); }
    };

    const fetchSummary = async () => {
        try { const s = await adminService.getInventorySummary(); setSummary(s); } catch { /* ignore */ }
    };

    useEffect(() => { fetchSummary(); }, []);
    useEffect(() => { if (tab === "items") fetchItems(); else fetchLogs(); }, [tab, page, search, categoryFilter, stockFilter]);

    const handleAdjust = async () => {
        if (!adjustItem || adjustQty === 0) return;
        setAdjusting(true);
        try {
            await adminService.adjustInventory({ ItemId: adjustItem.Id, QuantityChange: adjustQty, Note: adjustNote || undefined });
            setAdjustItem(null); setAdjustQty(0); setAdjustNote("");
            fetchItems(); fetchSummary();
        } catch { /* ignore */ }
        finally { setAdjusting(false); }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Kho hàng</h1>

            {/* Summary cards */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard label="Tổng sản phẩm" value={summary.TotalItems} color="bg-blue-100 text-blue-700" />
                    <SummaryCard label="Còn hàng" value={summary.InStock} color="bg-emerald-100 text-emerald-700" />
                    <SummaryCard label="Sắp hết" value={summary.LowStock} color="bg-amber-100 text-amber-700" />
                    <SummaryCard label="Hết hàng" value={summary.OutOfStock} color="bg-red-100 text-red-700" />
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                <button onClick={() => { setTab("items"); setPage(1); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === "items" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Sản phẩm</button>
                <button onClick={() => { setTab("logs"); setPage(1); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === "logs" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Lịch sử thay đổi</button>
            </div>

            {tab === "items" ? (
                <>
                    <div className="flex flex-wrap gap-3">
                        <input type="text" placeholder="Tìm sản phẩm..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20" />
                        <select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                            <option value="">Tất cả trạng thái</option>
                            <option value="IN_STOCK">Còn hàng</option>
                            <option value="LOW_STOCK">Sắp hết</option>
                            <option value="OUT_OF_STOCK">Hết hàng</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-left text-xs text-gray-400 uppercase">
                                    <th className="px-4 py-3 font-medium">Sản phẩm</th>
                                    <th className="px-4 py-3 font-medium">Danh mục</th>
                                    <th className="px-4 py-3 font-medium text-right">Tồn kho</th>
                                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                                    <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>
                                ) : items.map(item => (
                                    <tr key={item.Id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {item.Image && <img src={item.Image} alt="" className="w-8 h-8 rounded object-cover" />}
                                                <span className="font-medium text-gray-900">{item.Name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{item.CategoryLabel || item.Category}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${item.StockQuantity <= 0 ? "text-red-600" : item.StockQuantity <= 10 ? "text-amber-600" : "text-gray-900"}`}>{item.StockQuantity}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.StockStatus === "OUT_OF_STOCK" ? "bg-red-100 text-red-700" : item.StockStatus === "LOW_STOCK" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                                {item.StockStatusLabel || item.StockStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => { setAdjustItem(item); setAdjustQty(0); setAdjustNote(""); }} className="text-xs text-[#8B1A1A] font-semibold hover:underline cursor-pointer">
                                                Điều chỉnh
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} total={total} label="sản phẩm" onPageChange={setPage} />}
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr className="text-left text-xs text-gray-400 uppercase">
                                <th className="px-4 py-3 font-medium">Thời gian</th>
                                <th className="px-4 py-3 font-medium">Sản phẩm</th>
                                <th className="px-4 py-3 font-medium">Loại</th>
                                <th className="px-4 py-3 font-medium text-right">Thay đổi</th>
                                <th className="px-4 py-3 font-medium text-right">Trước</th>
                                <th className="px-4 py-3 font-medium text-right">Sau</th>
                                <th className="px-4 py-3 font-medium">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Chưa có lịch sử</td></tr>
                            ) : logs.map(log => (
                                <tr key={log.Id} className="border-b border-gray-50">
                                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(log.CreatedAt).toLocaleString("vi-VN")}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{log.ItemName}</td>
                                    <td className="px-4 py-3 text-gray-500">{log.ChangeType}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${log.QuantityChange > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {log.QuantityChange > 0 ? "+" : ""}{log.QuantityChange}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400">{log.PreviousQuantity}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{log.NewQuantity}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{log.Note || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalPages > 1 && <Pagination page={page} totalPages={totalPages} total={total} label="bản ghi" onPageChange={setPage} />}
                </div>
            )}

            {/* Adjust modal */}
            {adjustItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAdjustItem(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Điều chỉnh tồn kho</h2>
                        <p className="text-sm text-gray-500 mb-4">{adjustItem.Name} (hiện tại: <span className="font-bold">{adjustItem.StockQuantity}</span>)</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Số lượng thay đổi (+/-)</label>
                                <input type="number" value={adjustQty} onChange={e => setAdjustQty(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="VD: +10 hoặc -5" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
                                <input type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Lý do điều chỉnh..." />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setAdjustItem(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">Hủy</button>
                            <button onClick={handleAdjust} disabled={adjusting || adjustQty === 0} className="flex-1 px-4 py-2 bg-[#8B1A1A] text-white rounded-lg text-sm font-bold hover:bg-[#701515] disabled:opacity-50 cursor-pointer">{adjusting ? "Đang lưu..." : "Xác nhận"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color.includes("text-") ? color.split(" ").find(c => c.startsWith("text-")) : "text-gray-900"}`}>{value}</p>
        </div>
    );
}

function Pagination({ page, totalPages, total, label, onPageChange }: { page: number; totalPages: number; total: number; label: string; onPageChange: (p: number) => void }) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-gray-400">Trang {page} / {totalPages} ({total} {label})</span>
            <div className="flex gap-1">
                <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Trước</button>
                <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Sau</button>
            </div>
        </div>
    );
}
