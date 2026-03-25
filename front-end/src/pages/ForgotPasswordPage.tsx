import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { authService } from "../services/authService";
import type { ApiError } from "../types/auth";
import { FiKey, FiMail, FiLoader, FiChevronLeft } from "react-icons/fi";

const forgotPasswordSchema = Yup.object({
    email: Yup.string()
        .required("Vui lòng nhập địa chỉ email")
        .email("Email không hợp lệ"),
});

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const formik = useFormik({
        initialValues: { email: "" },
        validationSchema: forgotPasswordSchema,
        onSubmit: async (values) => {
            setServerError(null);
            setIsLoading(true);
            try {
                const response = await authService.forgotPassword(values.email);
                if (response.Success) {
                    navigate("/forgot-password/success", {
                        state: { email: values.email },
                    });
                } else {
                    setServerError(response.Message || "Không thể gửi email khôi phục.");
                }
            } catch (error) {
                const apiError = error as ApiError;
                setServerError(apiError.message || "Không thể gửi email khôi phục. Vui lòng thử lại.");
            } finally {
                setIsLoading(false);
            }
        },
    });
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F9F7F2] font-sans overflow-hidden px-4">
            {/* ───── Decorative Background Patterns ───── */}
            {/* Cloud - top left */}
            <svg
                className="absolute -top-10 -left-20 w-[500px] h-[400px] text-[#EDE9DF] opacity-60"
                viewBox="0 0 500 400"
                fill="currentColor"
            >
                <ellipse cx="180" cy="200" rx="180" ry="120" />
                <ellipse cx="300" cy="220" rx="140" ry="100" />
                <ellipse cx="220" cy="160" rx="120" ry="90" />
            </svg>

            {/* Leaf - top right */}
            <svg
                className="absolute -top-6 -right-10 w-[350px] h-[350px] text-[#EDE9DF] opacity-50"
                viewBox="0 0 350 350"
                fill="currentColor"
            >
                <path d="M175 20 C280 80, 320 200, 175 340 C30 200, 70 80, 175 20Z" />
            </svg>

            {/* Flower - right mid */}
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

            {/* Cloud - bottom left */}
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
                {/* Key Icon */}
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-600">
                    <FiKey className="w-7 h-7 text-white" />
                </div>

                {/* Title */}
                <h1 className="mb-3 font-serif text-2xl italic text-red-800">
                    Quên Mật Khẩu
                </h1>

                {/* Description */}
                <p className="mb-8 text-sm leading-relaxed text-gray-500">
                    Vui lòng nhập địa chỉ Email đã đăng ký. Lộc Xuân sẽ gửi liên kết để
                    bạn có thể đặt lại mật khẩu mới.
                </p>

                {/* Server Error */}
                {serverError && (
                    <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-left">
                        {serverError}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={formik.handleSubmit}>
                    {/* Email Input */}
                    <div className="text-left mb-5">
                        <label
                            htmlFor="email"
                            className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
                        >
                            Địa chỉ Email
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <FiMail className="w-4.5 h-4.5" />
                            </span>
                            <input
                                id="email"
                                type="email"
                                placeholder="ten.nguoidung@example.com"
                                {...formik.getFieldProps("email")}
                                className={`w-full rounded-lg border pl-11 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-1 ${formik.touched.email && formik.errors.email
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                    : "border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    }`}
                            />
                        </div>
                        {formik.touched.email && formik.errors.email && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.email}</p>
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
                        {isLoading ? "Đang gửi..." : "Gửi liên kết khôi phục"}
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
                © 2026 LỘC XUÂN — BẢN QUYỀN THUỘC VỀ LỘC XUÂN
            </p>
        </div>
    );
}
