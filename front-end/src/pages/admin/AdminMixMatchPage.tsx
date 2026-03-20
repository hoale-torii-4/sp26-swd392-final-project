import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { adminService, type MixMatchItem, type MixMatchRule } from "../../services/adminService";

function formatPrice(v: number) { return v.toLocaleString("vi-VN") + "₫"; }

export default function AdminMixMatchPage() {
    const [items, setItems] = useState<MixMatchItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [categories, setCategories] = useState<{ Id: string; Name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Rules
    const [rules, setRules] = useState<MixMatchRule | null>(null);
    const [showRules, setShowRules] = useState(false);
    const [savingRules, setSavingRules] = useState(false);

    // Create/Edit modal
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MixMatchItem | null>(null);
    const [form, setForm] = useState({ Name: "", Price: 0, Category: "", Image: "", Description: "", IsAlcohol: false, IsActive: true });
    const [saving, setSaving] = useState(false);

    const pageSize = 20;

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await adminService.getMixMatchItems({ search: search || undefined, category: categoryFilter || undefined, page, pageSize });
            setItems(res.Data || res.data || []); setTotal(res.TotalItems || res.totalItems || 0);
        } catch { setItems([]); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        adminService.getMixMatchCategories()
            .then((data: any) => {
                const mapped = (data || []).map((c: any) => ({
                    Id: c.Id ?? c.id ?? c.value ?? "",
                    Name: c.Name ?? c.name ?? c.label ?? "",
                })).filter((c: any) => c.Id && c.Name);
                setCategories(mapped);
            })
            .catch(() => {});
        adminService.getMixMatchRules().then(setRules).catch(() => {});
    }, []);
    useEffect(() => { fetchItems(); }, [page, search, categoryFilter]);

    const openCreate = () => {
        setEditing(null);
        setForm({
            Name: "",
            Price: 0,
            Category: categories[0]?.Id || "",
            Image: "",
            Description: "",
            IsAlcohol: false,
            IsActive: true,
        });
        setShowModal(true);
    };
    const openEdit = (item: MixMatchItem) => {
        setEditing(item);
        setForm({
            Name: item.Name,
            Price: item.Price,
            Category: item.Category,
            Image: item.Image,
            Description: "",
            IsAlcohol: item.IsAlcohol,
            IsActive: item.IsActive,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editing) { await adminService.updateMixMatchItem(editing.Id, form); }
            else { await adminService.createMixMatchItem(form); }
            setShowModal(false); fetchItems();
        } catch { /* ignore */ }
        finally { setSaving(false); }
    };

    const handleToggle = async (item: MixMatchItem) => {
        try { await adminService.toggleMixMatchItemStatus(item.Id, !item.IsActive); fetchItems(); } catch { /* ignore */ }
    };

    const handleDelete = async (item: MixMatchItem) => {
        if (!confirm(`Xóa "${item.Name}"?`)) return;
        try { 
            await adminService.deleteMixMatchItem(item.Id); 
            toast.success("Đã xóa sản phẩm");
            fetchItems(); 
        } catch (err: any) { 
            toast.error(err?.response?.data?.Message || "Không thể xóa sản phẩm này");
        }
    };

    const handleSaveRules = async () => {
        if (!rules) return;
        setSavingRules(true);
        try { await adminService.updateMixMatchRules(rules); setShowRules(false); } catch { /* ignore */ }
        finally { setSavingRules(false); }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mix & Match</h1>
                    <p className="text-sm text-gray-500">Quản lý sản phẩm và quy tắc tự tạo giỏ quà</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowRules(true)} className="px-4 py-2 border border-[#8B1A1A] text-[#8B1A1A] text-sm font-semibold rounded-lg hover:bg-[#8B1A1A]/5 transition-colors cursor-pointer">
                        Quy tắc
                    </button>
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Thêm sản phẩm
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <input type="text" placeholder="Tìm kiếm..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20" />
                <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                    <option value="">Tất cả danh mục</option>
                    {categories.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-xs text-gray-400 uppercase">
                            <th className="px-4 py-3 font-medium">Sản phẩm</th>
                            <th className="px-4 py-3 font-medium">Danh mục</th>
                            <th className="px-4 py-3 font-medium text-right">Giá</th>
                            <th className="px-4 py-3 font-medium text-right">Tồn kho</th>
                            <th className="px-4 py-3 font-medium text-center">Rượu</th>
                            <th className="px-4 py-3 font-medium">Trạng thái</th>
                            <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>
                        ) : items.map(item => (
                            <tr key={item.Id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {item.Image && <img src={item.Image} alt="" className="w-8 h-8 rounded object-cover" />}
                                        <span className="font-medium text-gray-900">{item.Name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500">{item.CategoryLabel || item.Category}</td>
                                <td className="px-4 py-3 text-right font-bold text-[#8B1A1A]">{formatPrice(item.Price)}</td>
                                <td className="px-4 py-3 text-right">{item.StockQuantity}</td>
                                <td className="px-4 py-3 text-center">{item.IsAlcohol ? <span className="text-red-500 text-xs font-bold">18+</span> : "—"}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => handleToggle(item)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${item.IsActive ? "bg-emerald-500" : "bg-gray-300"}`}>
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${item.IsActive ? "translate-x-4.5" : "translate-x-0.5"}`} />
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-[#8B1A1A] cursor-pointer">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                                        </button>
                                        <button onClick={() => handleDelete(item)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <span className="text-xs text-gray-400">Trang {page} / {totalPages}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Trước</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Sau</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-medium text-gray-500 mb-1">Tên</label><input type="text" value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-medium text-gray-500 mb-1">Giá</label><input type="number" value={form.Price} onChange={e => setForm({ ...form, Price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-medium text-gray-500 mb-1">Danh mục</label>
                                <select value={form.Category} onChange={e => setForm({ ...form, Category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm cursor-pointer">
                                    <option value="">Chọn…</option>
                                    {categories.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-xs font-medium text-gray-500 mb-1">Hình ảnh (URL)</label><input type="text" value={form.Image} onChange={e => setForm({ ...form, Image: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={form.IsAlcohol} onChange={e => setForm({ ...form, IsAlcohol: e.target.checked })} id="is-alcohol" className="cursor-pointer" />
                                <label htmlFor="is-alcohol" className="text-sm text-gray-600 cursor-pointer">Sản phẩm có cồn (18+)</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">Hủy</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-[#8B1A1A] text-white rounded-lg text-sm font-bold hover:bg-[#701515] disabled:opacity-50 cursor-pointer">{saving ? "Đang lưu..." : "Lưu"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules modal */}
            {showRules && rules && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRules(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Quy tắc Mix & Match</h2>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="flex-1"><label className="block text-xs text-gray-500 mb-1">Min sản phẩm</label><input type="number" value={rules.MinItems} onChange={e => setRules({ ...rules, MinItems: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                                <div className="flex-1"><label className="block text-xs text-gray-500 mb-1">Max sản phẩm</label><input type="number" value={rules.MaxItems} onChange={e => setRules({ ...rules, MaxItems: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-xs text-gray-500 mb-1">Min đồ uống</label><input type="number" value={rules.MinDrink} onChange={e => setRules({ ...rules, MinDrink: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            <div><label className="block text-xs text-gray-500 mb-1">Min snack</label><input type="number" value={rules.MinSnack} onChange={e => setRules({ ...rules, MinSnack: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            <div><label className="block text-xs text-gray-500 mb-1">Max đặc sản mặn</label><input type="number" value={rules.MaxSavory} onChange={e => setRules({ ...rules, MaxSavory: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowRules(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">Hủy</button>
                            <button onClick={handleSaveRules} disabled={savingRules} className="flex-1 px-4 py-2 bg-[#8B1A1A] text-white rounded-lg text-sm font-bold hover:bg-[#701515] disabled:opacity-50 cursor-pointer">{savingRules ? "Đang lưu..." : "Lưu quy tắc"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
