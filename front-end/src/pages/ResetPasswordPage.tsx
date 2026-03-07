import { useState } from "react";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";

const resetPasswordSchema = Yup.object({
    newPassword: Yup.string()
        .required("Vui lòng nhập mật khẩu mới")
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmNewPassword: Yup.string()
        .required("Vui lòng xác nhận mật khẩu")
        .oneOf([Yup.ref("newPassword")], "Mật khẩu không khớp"),
});

export default function ResetPasswordPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const formik = useFormik({
        initialValues: { newPassword: "", confirmNewPassword: "" },
        validationSchema: resetPasswordSchema,
        onSubmit: (values) => {
            console.log("Reset password:", values);
            // TODO: call reset password API
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
                    <svg
                        className="w-7 h-7 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h1 className="mb-3 font-serif text-2xl italic text-red-800">
                    Đặt Lại Mật Khẩu
                </h1>

                {/* Description */}
                <p className="mb-8 text-sm leading-relaxed text-gray-500">
                    Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn.
                </p>

                {/* Form */}
                <form
                    onSubmit={formik.handleSubmit}
                    className="space-y-5 text-left"
                >
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
                                <svg
                                    className="w-4.5 h-4.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                    />
                                </svg>
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
                                <svg
                                    className="w-4.5 h-4.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                    />
                                </svg>
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
                        {formik.touched.confirmNewPassword && formik.errors.confirmNewPassword && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.confirmNewPassword}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white uppercase tracking-wider shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors cursor-pointer"
                    >
                        Cập nhật mật khẩu
                    </button>
                </form>

                {/* Back to login */}
                <Link
                    to="/login"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    Quay lại trang Đăng nhập
                </Link>
            </div>

            {/* ───── Footer ───── */}
            <p className="relative z-10 mt-8 text-xs text-gray-400">
                © 2024 LỘC XUÂN — MÓN QUÀ GỬI TRAO TỪ CÔNG THỨC QUÀ.
            </p>
        </div>
    );
}
