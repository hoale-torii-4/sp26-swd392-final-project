import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";
import { GoogleLogin } from "@react-oauth/google";
import loginBg from "../assets/login-bg.png";
import { authService } from "../services/authService";
import type { ApiError } from "../types/auth";

const REDIRECT_DEFAULT = "/";

const loginSchema = Yup.object({
    email: Yup.string()
        .required("Vui lòng nhập email hoặc số điện thoại"),
    password: Yup.string()
        .required("Vui lòng nhập mật khẩu")
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const successMessage = (location.state as { message?: string })?.message;

    useEffect(() => {
        if (authService.isAuthenticated()) {
            navigate(REDIRECT_DEFAULT, { replace: true });
        }
    }, [navigate]);
    const redirectTo = (location.state as { from?: string })?.from || REDIRECT_DEFAULT;

    useEffect(() => {
        if (authService.isAuthenticated()) {
            navigate(redirectTo, { replace: true });
        }
    }, [navigate, redirectTo]);

    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const formik = useFormik({
        initialValues: { email: "", password: "" },
        validationSchema: loginSchema,
        onSubmit: async (values) => {
            setServerError(null);
            setIsLoading(true);
            try {
                const response = await authService.login({
                    email: values.email,
                    password: values.password,
                });
                if (response.Success) {
                    // Token & user data are already saved by authService.login()
                    toast.success("Đăng nhập thành công!");
                    navigate("/");
                } else {
                    toast.error(response.Message || "Đăng nhập thất bại.");
                    setServerError(response.Message || "Đăng nhập thất bại.");
                }
            } catch (error) {
                const apiError = error as ApiError;
                toast.error(apiError.message || "Đăng nhập thất bại. Vui lòng thử lại.");
                setServerError(apiError.message || "Đăng nhập thất bại. Vui lòng thử lại.");
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <div className="flex min-h-screen font-sans">
            {/* ───── Left Panel: Branding ───── */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <img
                    src={loginBg}
                    alt="Lộc Xuân background"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />

                <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14 text-white w-full">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-serif font-bold tracking-wide">
                            Lộc Xuân
                        </span>
                        <span className="text-xs tracking-[0.2em] text-white/70 border-l border-white/30 pl-3 uppercase">
                            Tết Premium Gifts
                        </span>
                    </div>

                    <div className="max-w-md">
                        <h1 className="font-serif text-4xl lg:text-5xl leading-tight font-semibold mb-6">
                            Tinh hoa quà Tết,
                            <br />
                            Gói trọn chân tình.
                        </h1>
                        <p className="text-white/70 text-sm leading-relaxed">
                            Khám phá bộ sưu tập quà tặng sang trọng dành riêng cho đối tác và
                            những người thân yêu nhất trong dịp Tết Nguyên Đán.
                        </p>
                    </div>

                    <p className="text-white/40 text-xs">
                        © 2026 Lộc Xuân. All rights reserved.
                    </p>
                </div>
            </div>

            {/* ───── Right Panel: Login Form ───── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Back to home */}
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors mb-8"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Trở về trang chủ
                    </Link>

                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        Chào mừng bạn trở lại
                    </h2>
                    <p className="text-sm text-gray-500 mb-8">
                        Đăng nhập để tiếp tục trải nghiệm dịch vụ quà tặng cao cấp.
                    </p>

                    {/* Success message from register */}
                    {successMessage && (
                        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                            {successMessage}
                        </div>
                    )}

                    {/* Server Error */}
                    {serverError && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {serverError}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={formik.handleSubmit} className="space-y-5">
                        {/* Email / Phone */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email hoặc Số điện thoại
                            </label>
                            <input
                                id="email"
                                type="text"
                                placeholder="example@email.com"
                                {...formik.getFieldProps("email")}
                                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${formik.touched.email && formik.errors.email
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    }`}
                            />
                            {formik.touched.email && formik.errors.email && (
                                <p className="mt-1 text-xs text-red-500">{formik.errors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nhập mật khẩu của bạn"
                                    {...formik.getFieldProps("password")}
                                    className={`w-full rounded-lg border px-4 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${formik.touched.password && formik.errors.password
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
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {formik.touched.password && formik.errors.password && (
                                <p className="mt-1 text-xs text-red-500">{formik.errors.password}</p>
                            )}
                        </div>

                        {/* Remember me + Forgot password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 accent-red-600"
                                />
                                <span className="text-sm text-gray-600">Ghi nhớ đăng nhập</span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                            >
                                Quên mật khẩu?
                            </Link>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading && (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            )}
                            {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-7">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-4 text-xs tracking-wide text-gray-400 uppercase">
                                Hoặc đăng nhập với
                            </span>
                        </div>
                    </div>

                    {/* Google login */}
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
                            text="signin_with"
                            shape="rectangular"
                            width="400"
                            logo_alignment="center"
                        />
                    </div>
                    {googleLoading && (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-3">
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Đang xử lý...
                        </div>
                    )}

                    {/* Register link */}
                    <p className="mt-7 text-center text-sm text-gray-500">
                        Chưa có tài khoản?{" "}
                        <Link to="/register" className="font-semibold text-red-600 hover:text-red-700 transition-colors">
                            Đăng ký ngay
                        </Link>
                    </p>

                    {/* Security badge */}
                    <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        Hệ thống bảo mật tiêu chuẩn quốc tế
                    </div>
                </div>
            </div>
        </div>
    );
}
