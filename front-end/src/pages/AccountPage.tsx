import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NotificationModal from "../components/NotificationModal";
import { authService } from "../services/authService";

/* ───── Sidebar Links ───── */
const sidebarLinks = [
    {
        label: "Thông tin tài khoản",
        to: "/account",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
        ),
    },
    {
        label: "Đơn hàng của tôi",
        to: "/orders",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
    },
    {
        label: "Sổ địa chỉ",
        to: "/addresses",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
        ),
    },
    {
        label: "Giỏ quà custom",
        to: "/custom-box",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3.75l7.5 4.125v8.25L12 20.25l-7.5-4.125v-8.25L12 3.75z" />
            </svg>
        ),
    },
];

/* ───── Helper: get stored user data ───── */
function getStoredUser() {
    const user = authService.getUser();
    if (!user) return null;
    return {
        fullName: user.FullName,
        email: user.Email,
        phone: user.Phone || "",
        bankName: user.BankName || "",
        bankAccountNumber: user.BankAccountNumber || "",
        bankAccountName: user.BankAccountName || "",
        createdAt: user.CreatedAt
            ? new Date(user.CreatedAt).toLocaleDateString("vi-VN")
            : "",
    };
}

export default function AccountPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = getStoredUser();

    // Redirect if not logged in
    useEffect(() => {
        if (!authService.isAuthenticated()) {
            navigate("/login");
            return;
        }

    }, [navigate]);

    /* ── Profile form state ── */
    const [fullName, setFullName] = useState(user?.fullName ?? "");
    const [email] = useState(user?.email ?? "");
    const [phone, setPhone] = useState(user?.phone ?? "");
    const [bankName, setBankName] = useState(user?.bankName ?? "");
    const [bankAccountNumber, setBankAccountNumber] = useState(user?.bankAccountNumber ?? "");
    const [bankAccountName, setBankAccountName] = useState(user?.bankAccountName ?? "");
    const [profileMsg, setProfileMsg] = useState("");
    const [profileError, setProfileError] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);


    /* ── Password form — Formik + Yup ── */
    const [pwServerMsg, setPwServerMsg] = useState("");
    const [pwIsSuccess, setPwIsSuccess] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [showReloginModal, setShowReloginModal] = useState(false);

    const passwordSchema = Yup.object({
        oldPassword: Yup.string()
            .required("Vui lòng nhập mật khẩu hiện tại"),
        newPassword: Yup.string()
            .required("Vui lòng nhập mật khẩu mới")
            .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
        confirmPassword: Yup.string()
            .required("Vui lòng xác nhận mật khẩu mới")
            .oneOf([Yup.ref("newPassword")], "Mật khẩu xác nhận không khớp"),
    });

    const passwordFormik = useFormik({
        initialValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
        validationSchema: passwordSchema,
        onSubmit: async (values, { resetForm }) => {
            setPwServerMsg("");
            setPwLoading(true);
            try {
                const res = await authService.changePassword({
                    oldPassword: values.oldPassword,
                    newPassword: values.newPassword,
                });
                if (res.Success) {
                    setPwIsSuccess(true);
                    setPwServerMsg(res.Message || "Đổi mật khẩu thành công!");
                    resetForm();
                    setShowReloginModal(true);
                } else {
                    setPwIsSuccess(false);
                    setPwServerMsg(res.Message || "Đổi mật khẩu thất bại.");
                }
            } catch {
                setPwIsSuccess(false);
                setPwServerMsg("Đổi mật khẩu thất bại. Vui lòng thử lại.");
            } finally {
                setPwLoading(false);
                setTimeout(() => setPwServerMsg(""), 4000);
            }
        },
    });

    const handleReloginConfirm = () => {
        authService.logout();
        navigate("/login", { state: { message: "Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại." } });
    };

    const handleProfileSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setProfileMsg("");
        setProfileError("");
        if (!fullName.trim()) {
            setProfileError("Họ và tên không được để trống.");
            return;
        }

        setProfileLoading(true);
        try {
            const res = await authService.updateProfile({
                fullName,
                phone,
                bankName: bankName || null,
                bankAccountNumber: bankAccountNumber || null,
                bankAccountName: bankAccountName || null,
            });
            if (res.Success) {
                setProfileMsg("Thông tin đã được cập nhật thành công!");
                // Trigger storage event so Header re-renders if name changed
                window.dispatchEvent(new Event("storage"));
            } else {
                setProfileError(res.Message || "Cập nhật thất bại.");
            }
        } catch (err: any) {
            setProfileError(err.response?.data?.Message || "Có lỗi xảy ra, vui lòng thử lại.");
        } finally {
            setProfileLoading(false);
            setTimeout(() => {
                setProfileMsg("");
                setProfileError("");
            }, 3000);
        }
    };

    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    if (!user) return null;

    const initials = user.fullName.charAt(0).toUpperCase();

    return (
        <div className="font-sans bg-[#F5F5F5] min-h-screen flex flex-col">
            <Header />


            <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 lg:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
                    {/* ════════ SIDEBAR ════════ */}
                    <aside className="bg-white rounded-2xl p-6 h-fit shadow-sm">
                        {/* Avatar & Name */}
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto bg-[#1B3022] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3">
                                {initials}
                            </div>
                            <p className="font-serif font-bold text-gray-900">{user.fullName}</p>
                        </div>

                        {/* Nav */}
                        <nav className="space-y-1">
                            {sidebarLinks.map((link) => {
                                const isActive = location.pathname === link.to;
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                            ? "bg-[#8B1A1A]/10 text-[#8B1A1A] font-semibold"
                                            : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        <span className={isActive ? "text-[#8B1A1A]" : "text-gray-400"}>{link.icon}</span>
                                        {link.label}
                                    </Link>
                                );
                            })}

                            {/* Separator */}
                            <div className="border-t border-gray-100 !my-3" />

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-[#8B1A1A] transition-colors w-full cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                </svg>
                                Đăng xuất
                            </button>
                        </nav>
                    </aside>

                    {/* ════════ MAIN CONTENT ════════ */}
                    <div className="space-y-6">
                        {/* Page Title */}
                        <div>
                            <h1 className="text-2xl font-serif font-bold italic text-[#8B1A1A]">
                                Tài khoản của tôi
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Quản lý thông tin cá nhân và cài đặt bảo mật.
                            </p>
                        </div>

                        {/* ── Profile Info Card ── */}
                        <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Full Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Họ và tên
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors"
                                    />
                                </div>
                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                                    />
                                </div>
                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Số điện thoại
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="0909 123 456"
                                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Bank Info Section */}
                            <div className="border-t border-gray-100 pt-5 mt-5">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                    </svg>
                                    Thông tin ngân hàng (hoàn tiền)
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">
                                    Thông tin này được sử dụng để hoàn tiền khi cần thiết. Vui lòng điền đầy đủ để có thể mua sắm.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {/* Bank Name */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Tên ngân hàng
                                        </label>
                                        <input
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            placeholder="VD: Vietcombank"
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors"
                                        />
                                    </div>
                                    {/* Bank Account Number */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Số tài khoản
                                        </label>
                                        <input
                                            type="text"
                                            value={bankAccountNumber}
                                            onChange={(e) => setBankAccountNumber(e.target.value)}
                                            placeholder="VD: 0123456789"
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors"
                                        />
                                    </div>
                                    {/* Bank Account Name */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                            Tên chủ tài khoản
                                        </label>
                                        <input
                                            type="text"
                                            value={bankAccountName}
                                            onChange={(e) => setBankAccountName(e.target.value)}
                                            placeholder="VD: NGUYEN VAN A"
                                            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A] transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {profileMsg && (
                                <p className="mt-4 text-sm text-green-600 font-medium">{profileMsg}</p>
                            )}
                            {profileError && (
                                <p className="mt-4 text-sm text-red-600 font-medium">{profileError}</p>
                            )}

                            <button
                                type="submit"
                                disabled={profileLoading}
                                className="mt-6 px-6 py-2.5 bg-[#8B1A1A] text-white text-xs font-bold tracking-[0.15em] uppercase rounded-lg hover:bg-[#7A1717] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {profileLoading && (
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                )}
                                {profileLoading ? "Đang lưu..." : "Cập nhật thông tin"}
                            </button>
                        </form>

                        {/* ── Change Password Card (Formik + Yup) ── */}
                        <form onSubmit={passwordFormik.handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                            <h2 className="text-lg font-serif font-bold text-gray-900 mb-5">
                                Đổi mật khẩu
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Old Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Mật khẩu hiện tại
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••"
                                        {...passwordFormik.getFieldProps("oldPassword")}
                                        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${passwordFormik.touched.oldPassword && passwordFormik.errors.oldPassword
                                            ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                                            : "border-gray-200 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                                            }`}
                                    />
                                    {passwordFormik.touched.oldPassword && passwordFormik.errors.oldPassword && (
                                        <p className="mt-1 text-xs text-red-500">{passwordFormik.errors.oldPassword}</p>
                                    )}
                                </div>
                                {/* New Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Mật khẩu mới
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••"
                                        {...passwordFormik.getFieldProps("newPassword")}
                                        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${passwordFormik.touched.newPassword && passwordFormik.errors.newPassword
                                            ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                                            : "border-gray-200 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                                            }`}
                                    />
                                    {passwordFormik.touched.newPassword && passwordFormik.errors.newPassword && (
                                        <p className="mt-1 text-xs text-red-500">{passwordFormik.errors.newPassword}</p>
                                    )}
                                </div>
                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Xác nhận mật khẩu
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="••••••"
                                        {...passwordFormik.getFieldProps("confirmPassword")}
                                        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword
                                            ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                                            : "border-gray-200 focus:border-[#8B1A1A] focus:ring-[#8B1A1A]"
                                            }`}
                                    />
                                    {passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword && (
                                        <p className="mt-1 text-xs text-red-500">{passwordFormik.errors.confirmPassword}</p>
                                    )}
                                </div>
                            </div>

                            {/* Server message */}
                            {pwServerMsg && (
                                <p className={`mt-4 text-sm font-medium ${pwIsSuccess ? "text-green-600" : "text-red-600"}`}>
                                    {pwServerMsg}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={pwLoading}
                                className="mt-6 px-6 py-2.5 bg-[#8B1A1A] text-white text-xs font-bold tracking-[0.15em] uppercase rounded-lg hover:bg-[#7A1717] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {pwLoading && (
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                )}
                                {pwLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
                            </button>
                        </form>

                        {/* ── Account Metadata ── */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400 px-1">
                            <span>
                                📅 Ngày tạo tài khoản: <strong className="text-gray-600">{user.createdAt || "—"}</strong>
                            </span>
                            <span>
                                🔹 Trạng thái: <strong className="text-green-600 uppercase">Đang hoạt động</strong>
                            </span>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Re-login prompt after password change */}
            <NotificationModal
                open={showReloginModal}
                type="success"
                title="Đổi mật khẩu thành công!"
                message={"Mật khẩu của bạn đã được thay đổi.\nVui lòng đăng nhập lại để tiếp tục sử dụng."}
                confirmText="Đăng nhập lại"
                onConfirm={handleReloginConfirm}
            />
        </div>
    );
}
