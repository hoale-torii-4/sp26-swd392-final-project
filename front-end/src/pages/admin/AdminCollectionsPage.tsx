import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { adminService, type CollectionResponse } from "../../services/adminService";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";

export default function AdminCollectionsPage() {
    const [collections, setCollections] = useState<CollectionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<CollectionResponse | null>(null);
    const [form, setForm] = useState({ Name: "", Description: "", DisplayOrder: 0, IsActive: true });
    const [saving, setSaving] = useState(false);

    const fetch = async () => {
        setLoading(true);
        try { const res = await adminService.getCollections(); setCollections(res); }
        catch { setCollections([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const openCreate = () => { setEditing(null); setForm({ Name: "", Description: "", DisplayOrder: collections.length, IsActive: true }); setShowModal(true); };
    const openEdit = (c: CollectionResponse) => { setEditing(c); setForm({ Name: c.Name, Description: c.Description, DisplayOrder: c.DisplayOrder, IsActive: c.IsActive }); setShowModal(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editing) { await adminService.updateCollection(editing.Id, form); }
            else { await adminService.createCollection(form); }
            setShowModal(false); fetch();
        } catch { /* ignore */ }
        finally { setSaving(false); }
    };

    const handleToggle = async (c: CollectionResponse) => {
        try { await adminService.toggleCollectionStatus(c.Id, !c.IsActive); fetch(); } catch { /* ignore */ }
    };

    const handleDelete = async (c: CollectionResponse) => {
        if (!confirm(`Xóa bộ sưu tập "${c.Name}"?`)) return;
        try { 
            await adminService.deleteCollection(c.Id); 
            toast.success("Đã xóa bộ sưu tập");
            fetch(); 
        } catch (err: any) { 
            toast.error(err?.response?.data?.Message || "Không thể xóa bộ sưu tập này");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bộ sưu tập</h1>
                    <p className="text-sm text-gray-500">Quản lý các bộ sưu tập giỏ quà</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer">
                    <FiPlus className="w-4 h-4" />
                    Tạo bộ sưu tập
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-xs text-gray-400 uppercase">
                            <th className="px-4 py-3 font-medium w-12">#</th>
                            <th className="px-4 py-3 font-medium">Bộ sưu tập</th>
                            <th className="px-4 py-3 font-medium">Mô tả</th>
                            <th className="px-4 py-3 font-medium text-center">Giỏ quà</th>
                            <th className="px-4 py-3 font-medium">Trạng thái</th>
                            <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                        ) : collections.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chưa có bộ sưu tập nào</td></tr>
                        ) : collections.map((c) => (
                            <tr key={c.Id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="px-4 py-3 text-gray-400">{c.DisplayOrder}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {c.Thumbnail && <img src={c.Thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                                        <span className="font-medium text-gray-900">{c.Name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.Description}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">{c.GiftBoxCount}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <button onClick={() => handleToggle(c)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${c.IsActive ? "bg-emerald-500" : "bg-gray-300"}`}>
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${c.IsActive ? "translate-x-4.5" : "translate-x-0.5"}`} />
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-[#8B1A1A] cursor-pointer">
                                            <FiEdit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(c)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer">
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? "Chỉnh sửa bộ sưu tập" : "Tạo bộ sưu tập mới"}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Tên</label>
                                <input type="text" value={form.Name} onChange={e => setForm({ ...form, Name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                                <textarea value={form.Description} onChange={e => setForm({ ...form, Description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Thứ tự hiển thị</label>
                                <input type="number" value={form.DisplayOrder} onChange={e => setForm({ ...form, DisplayOrder: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={form.IsActive} onChange={e => setForm({ ...form, IsActive: e.target.checked })} id="col-active" className="cursor-pointer" />
                                <label htmlFor="col-active" className="text-sm text-gray-600 cursor-pointer">Kích hoạt</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">Hủy</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-[#8B1A1A] text-white rounded-lg text-sm font-bold hover:bg-[#701515] disabled:opacity-50 cursor-pointer">{saving ? "Đang lưu..." : "Lưu"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
