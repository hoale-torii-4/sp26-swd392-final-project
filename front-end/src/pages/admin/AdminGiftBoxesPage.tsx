import { useState, useEffect } from "react";
import { adminService, type GiftBoxListItem, type SimpleCollectionDto } from "../../services/adminService";

function formatPrice(v: number) { return v.toLocaleString("vi-VN") + "₫"; }

export default function AdminGiftBoxesPage() {
    const [items, setItems] = useState<GiftBoxListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState("");
    const [collectionFilter, setCollectionFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [collections, setCollections] = useState<SimpleCollectionDto[]>([]);
    const [loading, setLoading] = useState(true);

    const pageSize = 20;

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await adminService.getGiftBoxes({
                collectionId: collectionFilter || undefined,
                keyword: keyword || undefined,
                status: statusFilter === "" ? undefined : statusFilter === "true",
                page, pageSize,
            });
            setItems(res.Data);
            setTotal(res.TotalItems);
        } catch { setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { adminService.getGiftBoxCollections().then(setCollections).catch(() => {}); }, []);
    useEffect(() => { fetchData(); }, [page, keyword, collectionFilter, statusFilter]);

    const handleToggle = async (item: GiftBoxListItem) => {
        try { await adminService.toggleGiftBoxStatus(item.Id, !item.Status); fetchData(); } catch { /* ignore */ }
    };

    const handleDelete = async (item: GiftBoxListItem) => {
        if (!confirm(`Xóa giỏ quà "${item.Name}"?`)) return;
        try { await adminService.deleteGiftBox(item.Id); fetchData(); } catch { /* ignore */ }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Giỏ quà</h1>
                    <p className="text-sm text-gray-500">Quản lý danh sách giỏ quà Tết</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="text" placeholder="Tìm kiếm giỏ quà..."
                    value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                />
                <select value={collectionFilter} onChange={(e) => { setCollectionFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                    <option value="">Tất cả bộ sưu tập</option>
                    {collections.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                    <option value="">Tất cả trạng thái</option>
                    <option value="true">Đang bán</option>
                    <option value="false">Tạm ẩn</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-xs text-gray-400 uppercase">
                            <th className="px-4 py-3 font-medium">Giỏ quà</th>
                            <th className="px-4 py-3 font-medium">Bộ sưu tập</th>
                            <th className="px-4 py-3 font-medium text-right">Giá</th>
                            <th className="px-4 py-3 font-medium text-center">Sản phẩm</th>
                            <th className="px-4 py-3 font-medium">Tags</th>
                            <th className="px-4 py-3 font-medium">Trạng thái</th>
                            <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>
                        ) : items.map((item) => (
                            <tr key={item.Id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {item.Thumbnail && <img src={item.Thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                                        <span className="font-medium text-gray-900">{item.Name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500">{item.CollectionName}</td>
                                <td className="px-4 py-3 text-right font-bold text-[#8B1A1A]">{formatPrice(item.Price)}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">{item.ItemCount}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {item.TagNames.slice(0, 2).map((tag, i) => (
                                            <span key={i} className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded">{tag}</span>
                                        ))}
                                        {item.TagNames.length > 2 && <span className="text-[10px] text-gray-400">+{item.TagNames.length - 2}</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <button onClick={() => handleToggle(item)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${item.Status ? "bg-emerald-500" : "bg-gray-300"}`}>
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${item.Status ? "translate-x-4.5" : "translate-x-0.5"}`} />
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleDelete(item)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <span className="text-xs text-gray-400">Trang {page} / {totalPages} ({total} giỏ quà)</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Trước</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Sau</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
