import { useState, useEffect } from "react";
import { adminService, type InternalUser } from "../../services/adminService";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<InternalUser[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<InternalUser | null>(null);
    const [form, setForm] = useState({ FullName: "", Email: "", Password: "", Role: "STAFF" });
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const pageSize = 20;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await adminService.getUsers({ search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, page, pageSize });
            setUsers(res.Users);
            setTotalItems(res.TotalItems);
        } catch { setUsers([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, [page, search, roleFilter, statusFilter]);

    const handleToggleStatus = async (user: InternalUser) => {
        try {
            await adminService.toggleUserStatus(user.Id, !user.IsActive);
            fetchUsers();
        } catch { /* ignore */ }
    };

    const openCreate = () => {
        setEditingUser(null);
        setForm({ FullName: "", Email: "", Password: "", Role: "STAFF" });
        setErrorMsg("");
        setShowModal(true);
    };

    const openEdit = (user: InternalUser) => {
        setEditingUser(user);
        setForm({ FullName: user.FullName, Email: user.Email, Password: "", Role: user.Role });
        setErrorMsg("");
        setShowModal(true);
    };

    const handleSave = async () => {
        setErrorMsg("");
        setSaving(true);
        try {
            if (editingUser) {
                await adminService.updateUser(editingUser.Id, { FullName: form.FullName, Role: form.Role });
            } else {
                await adminService.createUser(form);
            }
            setShowModal(false);
            fetchUsers();
        } catch (err: any) { 
            setErrorMsg(err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Lưu thất bại. Kiểm tra lại thông tin (pass > 6 ký tự).");
        }
        finally { setSaving(false); }
    };

    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
                    <p className="text-sm text-gray-500">Quản lý tài khoản Admin và Staff</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Thêm người dùng
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, email..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
                />
                <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                    <option value="">Tất cả vai trò</option>
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                </select>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Vô hiệu</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr className="text-left text-xs text-gray-400 uppercase">
                            <th className="px-4 py-3 font-medium">Họ tên</th>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Vai trò</th>
                            <th className="px-4 py-3 font-medium">Trạng thái</th>
                            <th className="px-4 py-3 font-medium">Ngày tạo</th>
                            <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Không có dữ liệu</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.Id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-medium text-gray-900">{user.FullName}</td>
                                <td className="px-4 py-3 text-gray-500">{user.Email}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.Role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                        {user.RoleLabel || user.Role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <button onClick={() => handleToggleStatus(user)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${user.IsActive ? "bg-emerald-500" : "bg-gray-300"}`}>
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${user.IsActive ? "translate-x-4.5" : "translate-x-0.5"}`} />
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(user.CreatedAt).toLocaleDateString("vi-VN")}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => openEdit(user)} className="text-gray-400 hover:text-[#8B1A1A] transition-colors cursor-pointer p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <span className="text-xs text-gray-400">Trang {page} / {totalPages} ({totalItems} người dùng)</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Trước</button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Sau</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">{editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}</h2>
                        {errorMsg && <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 rounded-lg">{errorMsg}</div>}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Họ tên</label>
                                <input type="text" value={form.FullName} onChange={e => setForm({ ...form, FullName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>
                            {!editingUser && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                        <input type="email" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Mật khẩu</label>
                                        <input type="password" value={form.Password} onChange={e => setForm({ ...form, Password: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Vai trò</label>
                                <select value={form.Role} onChange={e => setForm({ ...form, Role: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm cursor-pointer">
                                    <option value="ADMIN">Admin</option>
                                    <option value="STAFF">Staff</option>
                                </select>
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
