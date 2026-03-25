import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import { authService } from "../services/authService";
import { FiLock, FiMail, FiEye, FiEyeOff, FiLoader, FiChevronLeft } from "react-icons/fi";

const resetPasswordSchema = Yup.object({
    otp: Yup.string()
        .required("Vui lòng nhập mã OTP")
        .matches(/^\d{6}$/, "Mã OTP gồm 6 chữ số"),
    newPassword: Yup.string()
        .required("Vui lòng nhập mật khẩu mới")
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmNewPassword: Yup.string()
        .required("Vui lòng xác nhận mật khẩu")
        .oneOf([Yup.ref("newPassword")], "Mật khẩu không khớp"),
});

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = (location.state as { email?: string })?.email || "";

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    // Redirect if no email provided
    useEffect(() => {
        if (!email) navigate("/forgot-password", { replace: true });
    }, [email, navigate]);

    const formik = useFormik({
        initialValues: { otp: "", newPassword: "", confirmNewPassword: "" },
        validationSchema: resetPasswordSchema,
        onSubmit: async (values) => {
            setServerError(null);
            setIsLoading(true);
            try {
                const response = await authService.resetPassword({
                    email,
                    otp: values.otp,
                    newPassword: values.newPassword,
                });
                console.log(response);
                if (response.Success) {
                    navigate("/login", {
                        state: { message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập." },
                    });
                } else {
                    setServerError(response.Message || "Đặt lại mật khẩu thất bại.");
                }
            } catch (error: unknown) {
                const axiosErr = error as { response?: { data?: { Message?: string } }; message?: string };
                const msg = axiosErr?.response?.data?.Message || axiosErr?.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
                setServerError(msg);
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F9F7F2] font-sans overflow-hidden px-4">
            {/* ───── Decorative Background Patterns ───── */}
            <svg
                className="absolute -top-10 -left-20 w-[500px] h-[400px] text-[#EDE9DF] opacity-60"
                viewBox="0 0 500 400"
                fill="currentColor"
            >
                <ellipse cx="180" cy="200" rx="180" ry="120" />
                <ellipse cx="300" cy="220" rx="140" ry="100" />
                <ellipse cx="220" cy="160" rx="120" ry="90" />
            </svg>

            <svg
                className="absolute -top-6 -right-10 w-[350px] h-[350px] text-[#EDE9DF] opacity-50"
                viewBox="0 0 350 350"
                fill="currentColor"
            >
                <path d="M175 20 C280 80, 320 200, 175 340 C30 200, 70 80, 175 20Z" />
            </svg>

            <svg
                className="absolute right-10 top-1/2 -translate-y-1/2 w-[200px] h-[200px] text-[#EDE9DF] opacity-40"
                viewBox="0 0 200 200"
                fill="currentColor"
            >
                <ellipse cx="100" cy="60" rx="35" ry="55" />
                <ellipse cx="100" cy="140" rx="35" ry="55" />
                <ellipse cx="60" cy="100" rx="55" ry="35" />
                <ellipse cx="140" cy="100" rx="55" ry="35" />
                <circle cx="100" cy="100" r="20" />
            </svg>

            <svg
                className="absolute -bottom-16 -left-16 w-[450px] h-[300px] text-[#EDE9DF] opacity-50"
                viewBox="0 0 450 300"
                fill="currentColor"
            >
                <ellipse cx="200" cy="160" rx="200" ry="110" />
                <ellipse cx="330" cy="180" rx="120" ry="90" />
            </svg>

            {/* ───── Card ───── */}
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white px-10 py-12 shadow-xl text-center">
                {/* Icon */}
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-700">
                    <FiLock className="w-7 h-7 text-white" />
                </div>

                {/* Title */}
                <h1 className="mb-3 font-serif text-2xl italic text-red-800">
                    Đặt Lại Mật Khẩu
                </h1>

                {/* Description */}
                <p className="mb-8 text-sm leading-relaxed text-gray-500">
                    Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn.
                </p>

                {/* Server Error */}
                {serverError && (
                    <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-left">
                        {serverError}
                    </div>
                )}

                {/* Form */}
                <form
                    onSubmit={formik.handleSubmit}
                    className="space-y-5 text-left"
                >
                    {/* OTP Code */}
                    <div>
                        <label
                            htmlFor="otp"
                            className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
                        >
                            Mã OTP
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <FiMail className="w-4.5 h-4.5" />
                            </span>
                            <input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="Nhập mã 6 chữ số"
                                {...formik.getFieldProps("otp")}
                                className={`w-full rounded-lg border pl-11 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 tracking-[0.3em] font-mono ${formik.touched.otp && formik.errors.otp
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    }`}
                            />
                        </div>
                        {formik.touched.otp && formik.errors.otp && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.otp}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">Mã OTP đã được gửi đến email của bạn</p>
                    </div>

                    {/* New Password */}
                    <div>
                        <label
                            htmlFor="newPassword"
                            className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
                        >
                            Mật khẩu mới
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <FiLock className="w-4.5 h-4.5" />
                            </span>
                            <input
                                id="newPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...formik.getFieldProps("newPassword")}
                                className={`w-full rounded-lg border pl-11 pr-11 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${formik.touched.newPassword && formik.errors.newPassword
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? (
                                    <FiEyeOff className="w-5 h-5" />
                                ) : (
                                    <FiEye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {formik.touched.newPassword && formik.errors.newPassword && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.newPassword}</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label
                            htmlFor="confirmNewPassword"
                            className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
                        >
                            Xác nhận mật khẩu
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <FiLock className="w-4.5 h-4.5" />
                            </span>
                            <input
                                id="confirmNewPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                {...formik.getFieldProps("confirmNewPassword")}
                                className={`w-full rounded-lg border pl-11 pr-11 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${formik.touched.confirmNewPassword && formik.errors.confirmNewPassword
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showConfirmPassword ? (
                                    <FiEyeOff className="w-5 h-5" />
                                ) : (
                                    <FiEye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {formik.touched.confirmNewPassword && formik.errors.confirmNewPassword && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.confirmNewPassword}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white uppercase tracking-wider shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading && (
                            <FiLoader className="w-4 h-4 animate-spin" />
                        )}
                        {isLoading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                    </button>
                </form>

                {/* Back to login */}
                <Link
                    to="/login"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                    <FiChevronLeft className="w-4 h-4" />
                    Quay lại trang Đăng nhập
                </Link>
            </div>

            {/* ───── Footer ───── */}
            <p className="relative z-10 mt-8 text-xs text-gray-400">
                © 2026 LỘC XUÂN — MÓN QUÀ GỬI TRAO TỪ CÔNG THỨC QUÀ.
            </p>
        </div>
    );
}
