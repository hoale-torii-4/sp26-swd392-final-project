import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../services/authService";
import type { ApiError } from "../types/auth";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = (location.state as { email?: string })?.email || "";

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Redirect if no email provided
    useEffect(() => {
        if (!email) navigate("/register", { replace: true });
    }, [email, navigate]);

    // Countdown timer for resend
    useEffect(() => {
        if (cooldown <= 0) {
            setCanResend(true);
            return;
        }
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    // Auto-focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    /* ── OTP Input Handling ── */

    const handleChange = (index: number, value: string) => {
        // Only accept digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setServerError(null);

        // Move to next input
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all digits are filled
        if (value && index === OTP_LENGTH - 1 && newOtp.every((d) => d !== "")) {
            handleSubmit(newOtp.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (!pasted) return;
        const newOtp = [...otp];
        for (let i = 0; i < pasted.length; i++) {
            newOtp[i] = pasted[i];
        }
        setOtp(newOtp);
        // Focus the next empty or last input
        const nextEmpty = newOtp.findIndex((d) => d === "");
        inputRefs.current[nextEmpty >= 0 ? nextEmpty : OTP_LENGTH - 1]?.focus();
        // Auto-submit if all filled
        if (newOtp.every((d) => d !== "")) {
            handleSubmit(newOtp.join(""));
        }
    };

    /* ── Submit ── */

    const handleSubmit = async (otpCode?: string) => {
        const code = otpCode || otp.join("");
        if (code.length !== OTP_LENGTH) {
            setServerError("Vui lòng nhập đủ 6 chữ số.");
            return;
        }
        setServerError(null);
        setIsLoading(true);
        try {
            const response = await authService.verifyOtp({ email, otp: code });
            if (response.Success) {
                navigate("/login", {
                    state: { message: "Xác thực email thành công! Vui lòng đăng nhập." },
                });
            } else {
                setServerError(response.Message || "Mã OTP không đúng.");
                setOtp(Array(OTP_LENGTH).fill(""));
                inputRefs.current[0]?.focus();
            }
        } catch (error) {
            const apiError = error as ApiError;
            setServerError(apiError.message || "Xác thực thất bại. Vui lòng thử lại.");
            setOtp(Array(OTP_LENGTH).fill(""));
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Resend OTP ── */

    const handleResend = async () => {
        if (!canResend) return;
        setServerError(null);
        setSuccessMsg(null);
        try {
            const response = await authService.resendOtp(email);
            if (response.Success) {
                setSuccessMsg("Đã gửi lại mã OTP. Vui lòng kiểm tra email.");
                setCooldown(RESEND_COOLDOWN);
                setCanResend(false);
                setOtp(Array(OTP_LENGTH).fill(""));
                inputRefs.current[0]?.focus();
            } else {
                setServerError(response.Message || "Không thể gửi lại mã OTP.");
            }
        } catch (error) {
            const apiError = error as ApiError;
            setServerError(apiError.message || "Không thể gửi lại mã OTP.");
        }
    };

    /* ── Mask email ── */
    const maskedEmail = email
        ? email.replace(/^(.{2})(.*)(@.*)$/, (_m, start, middle, end) => start + "*".repeat(middle.length) + end)
        : "";

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FDF6F0] via-white to-[#FFF5F5] flex items-center justify-center px-4 py-12 font-sans">
            <div className="w-full max-w-md">
                {/* Back link */}
                <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 text-sm text-[#8B1A1A] hover:text-[#701515] transition-colors mb-6"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Quay lại đăng ký
                </Link>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-lg shadow-black/5 p-8 lg:p-10">
                    {/* Icon */}
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#8B1A1A]/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                        Xác thực email
                    </h1>
                    <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
                        Chúng tôi đã gửi mã xác thực gồm 6 chữ số đến
                        <br />
                        <span className="font-semibold text-gray-700">{maskedEmail}</span>
                    </p>

                    {/* Error */}
                    {serverError && (
                        <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            {serverError}
                        </div>
                    )}

                    {/* Success */}
                    {successMsg && (
                        <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {successMsg}
                        </div>
                    )}

                    {/* OTP Input Grid */}
                    <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-200
                                    ${digit
                                        ? "border-[#8B1A1A] bg-[#8B1A1A]/5 text-[#8B1A1A]"
                                        : "border-gray-200 bg-gray-50 text-gray-900"
                                    }
                                    focus:border-[#8B1A1A] focus:bg-white focus:ring-2 focus:ring-[#8B1A1A]/20
                                `}
                                disabled={isLoading}
                            />
                        ))}
                    </div>

                    {/* Submit button */}
                    <button
                        onClick={() => handleSubmit()}
                        disabled={isLoading || otp.some((d) => d === "")}
                        className="w-full py-3 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Đang xác thực...
                            </>
                        ) : (
                            "Xác thực"
                        )}
                    </button>

                    {/* Resend */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 mb-1">Không nhận được mã?</p>
                        {canResend ? (
                            <button
                                onClick={handleResend}
                                className="text-sm font-semibold text-[#8B1A1A] hover:text-[#701515] hover:underline cursor-pointer transition-colors"
                            >
                                Gửi lại mã OTP
                            </button>
                        ) : (
                            <p className="text-sm text-gray-400">
                                Gửi lại sau{" "}
                                <span className="font-semibold text-[#8B1A1A]">{cooldown}s</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer note */}
                <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Mã xác thực có hiệu lực trong 5 phút
                </div>
            </div>
        </div>
    );
}
