import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { authService } from "../services/authService";
import { FiMail } from "react-icons/fi";

export default function ForgotPasswordSuccessPage() {
    const location = useLocation();
    const email = (location.state as { email?: string })?.email || "";

    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [resendMsg, setResendMsg] = useState<string | null>(null);

    useEffect(() => {
        if (countdown <= 0) {
            setCanResend(true);
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleResend = async () => {
        if (!canResend || !email) return;
        setResendMsg(null);
        try {
            await authService.forgotPassword(email);
            setResendMsg("Đã gửi lại mã OTP!");
        } catch {
            setResendMsg("Không thể gửi lại. Vui lòng thử lại.");
        }
        setCountdown(60);
        setCanResend(false);
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F9F7F2] font-sans overflow-hidden px-4">
            {/* ───── Decorative Background Patterns ───── */}
            {/* Cloud - top left */}
            <svg
                className="absolute -top-10 -left-20 w-[500px] h-[400px] text-[#EDE9DF] opacity-60"
                viewBox="0 0 500 400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <ellipse cx="180" cy="200" rx="180" ry="120" />
                <ellipse cx="300" cy="220" rx="140" ry="100" />
                <ellipse cx="220" cy="160" rx="120" ry="90" />
            </svg>

            {/* Leaf - top right */}
            <svg
                className="absolute -top-6 -right-10 w-[350px] h-[350px] text-[#EDE9DF] opacity-50"
                viewBox="0 0 350 350"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path d="M175 20 C280 80, 320 200, 175 340 C30 200, 70 80, 175 20Z" />
            </svg>

            {/* Flower - right mid */}
            <svg
                className="absolute right-10 top-1/2 -translate-y-1/2 w-[200px] h-[200px] text-[#EDE9DF] opacity-40"
                viewBox="0 0 200 200"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <ellipse cx="100" cy="60" rx="35" ry="55" />
                <ellipse cx="100" cy="140" rx="35" ry="55" />
                <ellipse cx="60" cy="100" rx="55" ry="35" />
                <ellipse cx="140" cy="100" rx="55" ry="35" />
                <circle cx="100" cy="100" r="20" />
            </svg>

            {/* Cloud - bottom */}
            <svg
                className="absolute -bottom-16 -left-16 w-[450px] h-[300px] text-[#EDE9DF] opacity-50"
                viewBox="0 0 450 300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <ellipse cx="200" cy="160" rx="200" ry="110" />
                <ellipse cx="330" cy="180" rx="120" ry="90" />
            </svg>

            {/* Cloud - bottom right */}
            <svg
                className="absolute -bottom-20 right-20 w-[400px] h-[280px] text-[#EDE9DF] opacity-40"
                viewBox="0 0 400 280"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <ellipse cx="200" cy="150" rx="180" ry="100" />
                <ellipse cx="300" cy="170" rx="100" ry="70" />
            </svg>

            {/* ───── Card ───── */}
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white px-10 py-12 shadow-xl text-center">
                {/* Envelope Icon */}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-red-50">
                    <FiMail className="w-8 h-8 text-red-700" />
                </div>

                {/* Title */}
                <h1 className="mb-3 font-serif text-2xl italic text-red-800">
                    Đã Gửi Yêu Cầu
                </h1>

                {/* Description */}
                <p className="mb-8 text-sm leading-relaxed text-gray-500">
                    Lộc Xuân đã gửi liên kết khôi phục mật khẩu đến địa chỉ email của
                    bạn. Vui lòng kiểm tra hộp thư (bao gồm cả thư mục Spam).
                </p>

                {/* Resend success/error msg */}
                {resendMsg && (
                    <p className="mb-4 text-xs text-gray-500">{resendMsg}</p>
                )}

                {/* Go to Reset Password */}
                <Link
                    to="/reset-password"
                    state={{ email }}
                    className="block w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white uppercase tracking-wider shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-center"
                >
                    Đặt lại mật khẩu
                </Link>

                {/* Resend Link */}
                <p className="mt-6 text-sm text-gray-500">
                    Chưa nhận được email?{" "}
                    {canResend ? (
                        <button
                            type="button"
                            onClick={handleResend}
                            className="font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                        >
                            Gửi lại
                        </button>
                    ) : (
                        <span className="font-semibold text-red-600">
                            Gửi lại ({countdown}s)
                        </span>
                    )}
                </p>
            </div>

            {/* ───── Footer ───── */}
            <p className="relative z-10 mt-8 text-xs text-gray-400">
                © 2026 LỘC XUÂN — QUÀ TẾT CAO CẤP. ALL RIGHTS RESERVED.
            </p>
        </div>
    );
}
