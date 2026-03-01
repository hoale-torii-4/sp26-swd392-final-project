import { useState } from "react";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import registerBg from "../assets/register-bg.png";

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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const formik = useFormik({
        initialValues: {
            fullname: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        },
        validationSchema: registerSchema,
        onSubmit: (values) => {
            console.log("Register:", values);
            // TODO: call register API
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Trở về trang chủ
                    </Link>

                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1">
                        Đăng Ký Tài Khoản
                    </h2>
                    <p className="text-sm text-gray-500 mb-8">
                        Gia nhập cộng đồng tinh hoa để nhận ưu đãi Tết đặc quyền.
                    </p>

                    {/* Form */}
                    <form onSubmit={formik.handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <label htmlFor="fullname" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Họ và tên
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
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
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
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
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                        </svg>
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
                                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
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

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Xác nhận mật khẩu
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                    </svg>
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
                            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                                <p className="mt-1 text-xs text-red-500">{formik.errors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white uppercase tracking-wider shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors cursor-pointer"
                        >
                            Đăng ký ngay
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
                    <button
                        type="button"
                        className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Tiếp tục với Google
                    </button>

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
