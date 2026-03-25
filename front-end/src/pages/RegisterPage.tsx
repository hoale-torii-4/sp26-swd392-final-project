import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";
import { GoogleLogin } from "@react-oauth/google";
import registerBg from "../assets/register-bg.png";
import { authService } from "../services/authService";
import type { ApiError } from "../types/auth";
import { FiChevronLeft, FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiLoader, FiShield } from "react-icons/fi";

const registerSchema = Yup.object({
    fullname: Yup.string()
        .required("Vui lòng nhập họ và tên")
        .min(2, "Họ và tên phải có ít nhất 2 ký tự"),
    email: Yup.string()
        .required("Vui lòng nhập email")
        .email("Email không hợp lệ"),
    phone: Yup.string()
        .required("Vui lòng nhập số điện thoại")
        .matches(/^[0-9]{10,11}$/, "Số điện thoại không hợp lệ (10-11 chữ số)"),
    password: Yup.string()
        .required("Vui lòng nhập mật khẩu")
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: Yup.string()
        .required("Vui lòng xác nhận mật khẩu")
        .oneOf([Yup.ref("password")], "Mật khẩu không khớp"),
});

export default function RegisterPage() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const formik = useFormik({
        initialValues: {
            fullname: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        },
        validationSchema: registerSchema,
        onSubmit: async (values) => {
            setServerError(null);
            setIsLoading(true);
            try {
                await authService.register({
                    email: values.email,
                    password: values.password,
                    fullName: values.fullname,
                    phone: values.phone || null,
                });
                toast.success("Đăng ký thành công!");
                navigate("/verify-email", {
                    state: { email: values.email },
                });
            } catch (error) {
                const apiError = error as ApiError;
                toast.error(apiError.message || "Đăng ký thất bại. Vui lòng thử lại.");
                setServerError(apiError.message || "Đăng ký thất bại. Vui lòng thử lại.");
            } finally {
                setIsLoading(false);
            }
        },
    });

    const fieldClass = (field: keyof typeof formik.values, hasLeftIcon = true) =>
        `w-full rounded-lg border ${hasLeftIcon ? "pl-11" : "pl-4"} pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${formik.touched[field] && formik.errors[field]
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:border-red-500 focus:ring-red-500"
        }`;

    const passwordFieldClass = (field: keyof typeof formik.values) =>
        `w-full rounded-lg border pl-11 pr-11 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${formik.touched[field] && formik.errors[field]
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:border-red-500 focus:ring-red-500"
        }`;

    return (
        <div className="flex min-h-screen font-sans">
            {/* ───── Left Panel: Registration Form ───── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12">
                <div className="w-full max-w-lg">
                    {/* Back to home */}
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors mb-8"
                    >
                        <FiChevronLeft className="w-4 h-4" />
                        Trở về trang chủ
                    </Link>

                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">
                        Đăng Ký Tài Khoản
                    </h2>
                    <p className="text-sm text-gray-500 mb-8">
                        Gia nhập cộng đồng tinh hoa để nhận ưu đãi Tết đặc quyền.
                    </p>

                    {/* Server Error */}
                    {serverError && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {serverError}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={formik.handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <label htmlFor="fullname" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Họ và tên
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <FiUser className="w-4.5 h-4.5" />
                                </span>
                                <input
                                    id="fullname"
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    {...formik.getFieldProps("fullname")}
                                    className={fieldClass("fullname")}
                                />
                            </div>
                            {formik.touched.fullname && formik.errors.fullname && (
                                <p className="mt-1 text-xs text-red-500">{formik.errors.fullname}</p>
                            )}
                        </div>

                        {/* Email + Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <FiMail className="w-4.5 h-4.5" />
                                    </span>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="example@gmail.com"
                                        {...formik.getFieldProps("email")}
                                        className={fieldClass("email")}
                                    />
                                </div>
                                {formik.touched.email && formik.errors.email && (
                                    <p className="mt-1 text-xs text-red-500">{formik.errors.email}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    Số điện thoại
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                        <FiPhone className="w-4.5 h-4.5" />
                                    </span>
                                    <input
                                        id="phone"
                                        type="tel"
                                        placeholder="090 123 4567"
                                        {...formik.getFieldProps("phone")}
                                        className={fieldClass("phone")}
                                    />
                                </div>
                                {formik.touched.phone && formik.errors.phone && (
                                    <p className="mt-1 text-xs text-red-500">{formik.errors.phone}</p>
                                )}
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <FiLock className="w-4.5 h-4.5" />
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...formik.getFieldProps("password")}
                                    className={passwordFieldClass("password")}
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
                            {formik.touched.password && formik.errors.password && (
                                <p className="mt-1 text-xs text-red-500">{formik.errors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Xác nhận mật khẩu
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <FiShield className="w-4.5 h-4.5" />
                                </span>
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...formik.getFieldProps("confirmPassword")}
                                    className={passwordFieldClass("confirmPassword")}
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
                            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                                <p className="mt-1 text-xs text-red-500">{formik.errors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white uppercase tracking-wider shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading && (
                                <FiLoader className="w-4 h-4 animate-spin" />
                            )}
                            {isLoading ? "Đang xử lý..." : "Đăng ký ngay"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-4 text-xs tracking-wide text-gray-400 uppercase">Hoặc</span>
                        </div>
                    </div>

                    {/* Google sign-up */}
                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={async (credentialResponse) => {
                                const idToken = credentialResponse.credential;
                                if (!idToken) {
                                    setServerError("Không nhận được thông tin từ Google.");
                                    return;
                                }
                                setServerError(null);
                                setGoogleLoading(true);
                                try {
                                    const response = await authService.googleLogin(idToken);
                                    if (response.Success) {
                                        navigate("/");
                                    } else {
                                        setServerError(response.Message || "Đăng nhập Google thất bại.");
                                    }
                                } catch (error) {
                                    const apiError = error as ApiError;
                                    setServerError(apiError.message || "Đăng nhập Google thất bại.");
                                } finally {
                                    setGoogleLoading(false);
                                }
                            }}
                            onError={() => {
                                setServerError("Đăng nhập Google thất bại. Vui lòng thử lại.");
                            }}
                            text="signup_with"
                            shape="rectangular"
                            width="400"
                            logo_alignment="center"
                        />
                    </div>
                    {googleLoading && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-3">
                            <FiLoader className="w-4 h-4 animate-spin" />
                            Đang xử lý...
                        </div>
                    )}

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Đã có tài khoản?{" "}
                        <Link to="/login" className="font-semibold text-red-600 hover:text-red-700 transition-colors">
                            Đăng nhập ngay
                        </Link>
                    </p>
                </div>
            </div>

            {/* ───── Right Panel: Branding ───── */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <img src={registerBg} alt="Lộc Xuân background" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />

                <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14 text-white w-full">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-serif font-bold tracking-wide">Lộc Xuân</span>
                        <span className="text-xs tracking-[0.2em] text-white/70 border-l border-white/30 pl-3 uppercase">
                            Tết Premium Gifts
                        </span>
                    </div>

                    <div className="max-w-md">
                        <h1 className="font-serif text-4xl lg:text-5xl leading-tight font-semibold mb-6">
                            Mừng Xuân
                            <br />
                            Giáp Thìn
                        </h1>
                        <p className="text-white/70 text-sm leading-relaxed">
                            Khám phá bộ sưu tập quà Tết cao cấp, đậm đà bản sắc Việt cùng
                            những ưu đãi đặc quyền cho thành viên.
                        </p>
                    </div>

                    <p className="text-xs tracking-[0.3em] text-white/40 uppercase">
                        Tradition &nbsp;•&nbsp; Luxury &nbsp;•&nbsp; Heritage
                    </p>
                </div>
            </div>
        </div>
    );
}
