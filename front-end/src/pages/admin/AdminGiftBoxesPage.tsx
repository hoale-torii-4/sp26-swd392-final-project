import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { adminService, type GiftBoxListItem, type GiftBoxDetail, type SimpleCollectionDto, type SimpleItemDto, type SimpleTagDto, type GiftBoxCreateDto, type GiftBoxUpdateDto } from "../../services/adminService";
import { FiX, FiTrash2, FiPlus, FiEdit2 } from "react-icons/fi";

function formatPrice(v: number) { return v.toLocaleString("vi-VN") + "₫"; }

/* ═══════════════════ GIFT BOX FORM MODAL ═══════════════════ */

interface GiftBoxFormProps {
    editData?: GiftBoxDetail | null;
    collections: SimpleCollectionDto[];
    allItems: SimpleItemDto[];
    allTags: SimpleTagDto[];
    onClose: () => void;
    onSaved: () => void;
}

interface FormItem { ItemId: string; ItemName: string; Quantity: number; ItemPrice: number; }

function GiftBoxFormModal({ editData, collections, allItems, allTags, onClose, onSaved }: GiftBoxFormProps) {
    const isEdit = !!editData;

    const [name, setName] = useState(editData?.Name ?? "");
    const [description, setDescription] = useState(editData?.Description ?? "");
    const [priceOverride, setPriceOverride] = useState<string>(editData?.Price?.toString() ?? "");
    const [collectionId, setCollectionId] = useState(editData?.CollectionId ?? (collections[0]?.Id ?? ""));
    const [selectedTags, setSelectedTags] = useState<string[]>(editData?.Tags?.map(t => t.Id) ?? []);
    const [items, setItems] = useState<FormItem[]>(
        editData?.Items?.map(i => ({ ItemId: i.ItemId, ItemName: i.ItemName, Quantity: i.Quantity, ItemPrice: i.Price })) ?? []
    );
    const [imageUrls, setImageUrls] = useState<string>(editData?.Images?.join("\n") ?? "");
    const [isActive, setIsActive] = useState<boolean>(editData?.IsActive ?? true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const toggleTag = (id: string) => {
        setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const addItem = (item: SimpleItemDto) => {
        if (items.find(i => i.ItemId === item.Id)) return;
        setItems(prev => [...prev, { ItemId: item.Id, ItemName: item.Name, Quantity: 1, ItemPrice: item.Price }]);
    };

    const removeItem = (itemId: string) => {
        setItems(prev => prev.filter(i => i.ItemId !== itemId));
    };

    const updateItemQty = (itemId: string, qty: number) => {
        setItems(prev => prev.map(i => i.ItemId === itemId ? { ...i, Quantity: Math.max(1, qty) } : i));
    };

    const handleSubmit = async () => {
        if (!name.trim()) { setError("Vui lòng nhập tên giỏ quà"); return; }
        if (!collectionId) { setError("Vui lòng chọn bộ sưu tập"); return; }

        setSaving(true);
        setError("");

        const images = imageUrls.split("\n").map(s => s.trim()).filter(Boolean);
        const calcPrice = items.reduce((sum, item) => sum + item.ItemPrice * item.Quantity, 0);
        const finalPrice = priceOverride ? Number(priceOverride) : calcPrice;

        try {
            if (isEdit) {
                const dto: GiftBoxUpdateDto = {
                    Name: name.trim(),
                    Description: description.trim(),
                    Price: finalPrice,
                    CollectionId: collectionId,
                    TagIds: selectedTags,
                    Items: items.map(i => ({ ItemId: i.ItemId, ItemName: i.ItemName, Quantity: i.Quantity, ItemPrice: i.ItemPrice })),
                    Images: images,
                    IsActive: isActive,
                };
                await adminService.updateGiftBox(editData!.Id, dto);
            } else {
                const dto: GiftBoxCreateDto = {
                    Name: name.trim(),
                    Description: description.trim(),
                    Price: finalPrice,
                    CollectionId: collectionId,
                    TagIds: selectedTags,
                    Items: items.map(i => ({ ItemId: i.ItemId, ItemName: i.ItemName, Quantity: i.Quantity, ItemPrice: i.ItemPrice })),
                    Images: images,
                    IsActive: isActive,
                };
                await adminService.createGiftBox(dto);
            }
            onSaved();
        } catch (err: any) {
            setError(err?.message || err?.response?.data?.Message || "Đã xảy ra lỗi.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                    <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Chỉnh sửa giỏ quà" : "Thêm giỏ quà mới"}</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Name & Collection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tên giỏ quà *</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Hộp quà Tết An Khang" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Bộ sưu tập *</label>
                            <select value={collectionId} onChange={e => setCollectionId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm cursor-pointer">
                                <option value="">— Chọn bộ sưu tập —</option>
                                {collections.map(c => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Mô tả giỏ quà..." className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] resize-none" />
                    </div>

                    {/* Price Override */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Giá tùy chỉnh (để trống = tính tự động)</label>
                        <input type="number" value={priceOverride} onChange={e => setPriceOverride(e.target.value)} placeholder="VD: 500000" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]" />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {allTags.map(tag => (
                                <button key={tag.Id} type="button" onClick={() => toggleTag(tag.Id)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${selectedTags.includes(tag.Id) ? "bg-[#8B1A1A] text-white border-[#8B1A1A]" : "bg-white text-gray-600 border-gray-200 hover:border-[#8B1A1A] hover:text-[#8B1A1A]"}`}>
                                    {tag.Name}
                                </button>
                            ))}
                            {allTags.length === 0 && <span className="text-xs text-gray-400">Không có tags nào</span>}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Sản phẩm trong giỏ</label>

                        {/* Add item dropdown */}
                        <select onChange={e => { const item = allItems.find(i => i.Id === e.target.value); if (item) addItem(item); e.target.value = ""; }} className="w-full px-3 py-2 border rounded-lg text-sm cursor-pointer mb-3 text-gray-400" defaultValue="">
                            <option value="" disabled>+ Thêm sản phẩm...</option>
                            {allItems.filter(ai => !items.find(i => i.ItemId === ai.Id)).map(ai => (
                                <option key={ai.Id} value={ai.Id}>{ai.Name} — {formatPrice(ai.Price)}</option>
                            ))}
                        </select>

                        {/* Selected items list */}
                        {items.length > 0 && (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-400">
                                        <tr>
                                            <th className="text-left px-3 py-2 font-medium">Sản phẩm</th>
                                            <th className="text-right px-3 py-2 font-medium">Đơn giá</th>
                                            <th className="text-center px-3 py-2 font-medium w-24">SL</th>
                                            <th className="text-right px-3 py-2 font-medium w-14"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => (
                                            <tr key={item.ItemId} className="border-t">
                                                <td className="px-3 py-2 text-gray-900">{item.ItemName}</td>
                                                <td className="px-3 py-2 text-right text-gray-500">{formatPrice(item.ItemPrice)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <input type="number" min={1} value={item.Quantity} onChange={e => updateItemQty(item.ItemId, parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 border rounded text-sm text-center" />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <button onClick={() => removeItem(item.ItemId)} className="text-red-400 hover:text-red-600 cursor-pointer">
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {items.length === 0 && <p className="text-xs text-gray-400 italic">Chưa có sản phẩm nào được thêm.</p>}
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">URL ảnh (mỗi dòng 1 URL)</label>
                        <textarea value={imageUrls} onChange={e => setImageUrls(e.target.value)} rows={3} placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] resize-none font-mono text-xs" />
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} id="is-active" className="cursor-pointer" />
                        <label htmlFor="is-active" className="text-sm text-gray-600 cursor-pointer">Hiển thị (Đang bán)</label>
                    </div>

                    {/* Error */}
                    {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer">Hủy</button>
                    <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 bg-[#8B1A1A] text-white rounded-lg text-sm font-bold hover:bg-[#701515] disabled:opacity-50 cursor-pointer">
                        {saving ? "Đang lưu..." : (isEdit ? "Cập nhật" : "Tạo mới")}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */

export default function AdminGiftBoxesPage() {
    const [items, setItems] = useState<GiftBoxListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState("");
    const [collectionFilter, setCollectionFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [collections, setCollections] = useState<SimpleCollectionDto[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editDetail, setEditDetail] = useState<GiftBoxDetail | null>(null);
    const [allItems, setAllItems] = useState<SimpleItemDto[]>([]);
    const [allTags, setAllTags] = useState<SimpleTagDto[]>([]);
    const [loadingModal, setLoadingModal] = useState(false);

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

    const loadFormOptions = async () => {
        const [cols, its, tgs] = await Promise.all([
            adminService.getGiftBoxCollections(),
            adminService.getGiftBoxItems(),
            adminService.getGiftBoxTags(),
        ]);
        setCollections(cols);
        setAllItems(its);
        setAllTags(tgs);
    };

    useEffect(() => { loadFormOptions(); }, []);
    useEffect(() => { fetchData(); }, [page, keyword, collectionFilter, statusFilter]);

    const handleToggle = async (item: GiftBoxListItem) => {
        try { await adminService.toggleGiftBoxStatus(item.Id, !item.Status); fetchData(); } catch { /* ignore */ }
    };

    const handleDelete = async (item: GiftBoxListItem) => {
        if (!confirm(`Xóa giỏ quà "${item.Name}"?`)) return;
        try { 
            await adminService.deleteGiftBox(item.Id); 
            toast.success("Đã xóa giỏ quà");
            fetchData(); 
        } catch (err: any) { 
            toast.error(err?.response?.data?.Message || "Không thể xóa giỏ quà này");
        }
    };

    const openCreate = () => {
        setEditDetail(null);
        setShowModal(true);
    };

    const openEdit = async (id: string) => {
        setLoadingModal(true);
        try {
            const detail = await adminService.getGiftBoxById(id);
            setEditDetail(detail);
            setShowModal(true);
        } catch { /* ignore */ }
        finally { setLoadingModal(false); }
    };

    const handleSaved = () => {
        setShowModal(false);
        setEditDetail(null);
        fetchData();
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Giỏ quà</h1>
                    <p className="text-sm text-gray-500">Quản lý danh sách giỏ quà Tết</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer">
                    <FiPlus className="w-4 h-4" />
                    Thêm giỏ quà
                </button>
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
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEdit(item.Id)} className="p-1 text-gray-400 hover:text-[#8B1A1A] cursor-pointer" title="Chỉnh sửa">
                                            <FiEdit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer" title="Xóa">
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
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

            {/* Loading overlay for edit data */}
            {loadingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                    <div className="bg-white px-6 py-4 rounded-xl shadow-lg text-sm text-gray-600">Đang tải dữ liệu...</div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <GiftBoxFormModal
                    editData={editDetail}
                    collections={collections}
                    allItems={allItems}
                    allTags={allTags}
                    onClose={() => { setShowModal(false); setEditDetail(null); }}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
