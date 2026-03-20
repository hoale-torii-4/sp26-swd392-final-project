import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { authService } from "../services/authService";
import apiClient from "../services/apiClient";

/* ─── Types ─── */
interface Address {
    Id: string;
    ReceiverName: string;
    ReceiverPhone: string;
    FullAddress: string;
    IsDefault: boolean;
    CreatedAt: string;
}

interface AddressForm {
    ReceiverName: string;
    ReceiverPhone: string;
    FullAddress: string;
    IsDefault: boolean;
}

const emptyForm: AddressForm = { ReceiverName: "", ReceiverPhone: "", FullAddress: "", IsDefault: false };

/* ─── Sidebar shared links (same as AccountPage) ─── */
const sidebarLinks = [
    {
        label: "Thông tin tài khoản",
        to: "/account",
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
    },
    {
        label: "Đơn hàng của tôi",
        to: "/orders",
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
    },
    {
        label: "Sổ địa chỉ",
        to: "/addresses",
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
    },
];

export default function AddressesPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = authService.getUser();
    const initials = user?.FullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<AddressForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Delete confirm
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!authService.isAuthenticated()) { navigate("/login"); return; }
        fetchAddresses();
    }, [navigate]);

    const fetchAddresses = () => {
        setLoading(true);
        apiClient.get("/Address")
            .then(r => setAddresses(r.data?.Data ?? r.data ?? []))
            .catch(() => setAddresses([]))
            .finally(() => setLoading(false));
    };

    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    /* ── Open add form ── */
    const openAdd = () => {
        setEditingId(null);
        setForm(emptyForm);
        setFormError("");
        setShowForm(true);
    };

    /* ── Open edit form ── */
    const openEdit = (addr: Address) => {
        setEditingId(addr.Id);
        setForm({ ReceiverName: addr.ReceiverName, ReceiverPhone: addr.ReceiverPhone, FullAddress: addr.FullAddress, IsDefault: addr.IsDefault });
        setFormError("");
        setShowForm(true);
    };

    /* ── Submit add/edit ── */
    const handleSave = async () => {
        if (!form.ReceiverName.trim() || !form.FullAddress.trim()) {
            setFormError("Tên người nhận và địa chỉ không được để trống.");
            return;
        }
        setSaving(true);
        setFormError("");
        try {
            if (editingId) {
                await apiClient.put(`/Address/${editingId}`, form);
            } else {
                await apiClient.post("/Address", form);
            }
            setShowForm(false);
            fetchAddresses();
        } catch {
            setFormError("Có lỗi xảy ra. Vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    /* ── Delete ── */
    const handleDelete = async (id: string) => {
        setDeleting(true);
        try {
            await apiClient.delete(`/Address/${id}`);
            setDeletingId(null);
            fetchAddresses();
        } catch {
            toast.error("Không thể xoá địa chỉ. Vui lòng thử lại.");
        } finally {
            setDeleting(false);
        }
    };

    /* ── Set default ── */
    const handleSetDefault = async (id: string) => {
        try {
            await apiClient.patch(`/Address/${id}/set-default`);
            fetchAddresses();
        } catch {
            toast.error("Không thể đặt mặc định. Vui lòng thử lại.");
        }
    };

    return (
        <div className="font-sans bg-[#F5F5F5] min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 lg:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">

                    {/* ════════ SIDEBAR ════════ */}
                    <aside className="bg-white rounded-2xl p-6 h-fit shadow-sm">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto bg-[#1B3022] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3">
                                {initials}
                            </div>
                            <p className="font-serif font-bold text-gray-900">{user?.FullName}</p>
                        </div>
                        <nav className="space-y-1">
                            {sidebarLinks.map((link) => {
                                const isActive = location.pathname === link.to;
                                return (
                                    <Link key={link.to} to={link.to}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${isActive ? "bg-[#8B1A1A]/10 text-[#8B1A1A] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
                                        <span className={isActive ? "text-[#8B1A1A]" : "text-gray-400"}>{link.icon}</span>
                                        {link.label}
                                    </Link>
                                );
                            })}
                            <div className="border-t border-gray-100 !my-3" />
                            <button onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-[#8B1A1A] transition-colors w-full cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                                Đăng xuất
                            </button>
                        </nav>
                    </aside>

                    {/* ════════ MAIN CONTENT ════════ */}
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-serif font-bold italic text-[#8B1A1A]">Sổ địa chỉ</h1>
                                <p className="text-sm text-gray-500 mt-1">Quản lý địa chỉ giao hàng cho đơn B2B.</p>
                            </div>
                            <button onClick={openAdd}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors cursor-pointer">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Thêm địa chỉ
                            </button>
                        </div>

                        {/* Address list */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <svg className="w-8 h-8 text-[#8B1A1A] animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : addresses.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                <p className="text-gray-400 text-sm">Chưa có địa chỉ nào.</p>
                                <button onClick={openAdd}
                                    className="mt-4 px-5 py-2 bg-[#8B1A1A] text-white text-xs font-bold uppercase rounded-lg hover:bg-[#701515] transition-colors cursor-pointer">
                                    Thêm địa chỉ đầu tiên
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {addresses.map(addr => (
                                    <div key={addr.Id}
                                        className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all ${addr.IsDefault ? "border-[#8B1A1A]" : "border-transparent hover:border-gray-200"}`}>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-gray-900 text-sm">{addr.ReceiverName}</p>
                                                    {addr.IsDefault && (
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-[#8B1A1A] text-white rounded uppercase font-bold tracking-wider">
                                                            Mặc định
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{addr.ReceiverPhone}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{addr.FullAddress}</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
                                            {!addr.IsDefault && (
                                                <button onClick={() => handleSetDefault(addr.Id)}
                                                    className="text-xs text-gray-500 hover:text-[#8B1A1A] transition-colors cursor-pointer font-medium">
                                                    Đặt mặc định
                                                </button>
                                            )}
                                            <button onClick={() => openEdit(addr)}
                                                className="text-xs text-blue-600 hover:text-blue-800 transition-colors cursor-pointer font-medium flex items-center gap-1 ml-auto">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                                </svg>
                                                Chỉnh sửa
                                            </button>
                                            <button onClick={() => setDeletingId(addr.Id)}
                                                className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer font-medium flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                                Xoá
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />

            {/* ═══════ ADD / EDIT MODAL ═══════ */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
                        <h2 className="text-lg font-bold text-gray-900 mb-5">
                            {editingId ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tên người nhận *</label>
                                <input type="text" value={form.ReceiverName}
                                    onChange={e => setForm(f => ({ ...f, ReceiverName: e.target.value }))}
                                    placeholder="Nguyễn Văn A"
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Số điện thoại</label>
                                <input type="tel" value={form.ReceiverPhone}
                                    onChange={e => setForm(f => ({ ...f, ReceiverPhone: e.target.value }))}
                                    placeholder="0909 123 456"
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Địa chỉ đầy đủ *</label>
                                <textarea rows={2} value={form.FullAddress}
                                    onChange={e => setForm(f => ({ ...f, FullAddress: e.target.value }))}
                                    placeholder="123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors resize-none" />
                            </div>
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input type="checkbox" checked={form.IsDefault}
                                    onChange={e => setForm(f => ({ ...f, IsDefault: e.target.checked }))}
                                    className="w-4 h-4 accent-[#8B1A1A]" />
                                <span className="text-sm text-gray-600">Đặt làm địa chỉ mặc định</span>
                            </label>
                            {formError && <p className="text-sm text-red-600">{formError}</p>}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-2.5 bg-[#8B1A1A] text-white text-sm font-bold rounded-lg hover:bg-[#701515] transition-colors disabled:opacity-60 cursor-pointer">
                                {saving ? "Đang lưu..." : (editingId ? "Cập nhật" : "Lưu địa chỉ")}
                            </button>
                            <button onClick={() => setShowForm(false)}
                                className="px-5 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                Huỷ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ DELETE CONFIRM MODAL ═══════ */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 text-center">
                        <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-2">Xoá địa chỉ này?</h3>
                        <p className="text-sm text-gray-500 mb-6">Thao tác này không thể hoàn tác.</p>
                        <div className="flex gap-3">
                            <button onClick={() => handleDelete(deletingId)} disabled={deleting}
                                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer">
                                {deleting ? "Đang xoá..." : "Xoá"}
                            </button>
                            <button onClick={() => setDeletingId(null)}
                                className="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                Huỷ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
