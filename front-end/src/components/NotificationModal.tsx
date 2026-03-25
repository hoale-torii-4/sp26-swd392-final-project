import { useEffect } from "react";
import type { ReactNode } from "react";
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";

export type NotificationType = "success" | "error" | "warning" | "info";

interface NotificationModalProps {
    /** Whether the modal is visible */
    open: boolean;
    /** Visual style */
    type?: NotificationType;
    /** Heading text */
    title: string;
    /** Body message */
    message: string;
    /** Primary action button text (default: "OK") */
    confirmText?: string;
    /** Optional secondary/cancel button text — omit to hide */
    cancelText?: string;
    /** Called when primary button is clicked */
    onConfirm: () => void;
    /** Called when cancel is clicked or overlay is dismissed */
    onCancel?: () => void;
    /** Auto-close after N ms (0 = never) */
    autoCloseMs?: number;
}

const iconByType: Record<NotificationType, ReactNode> = {
    success: <FiCheckCircle className="w-12 h-12 text-green-500" />,
    error: <FiXCircle className="w-12 h-12 text-red-500" />,
    warning: <FiAlertTriangle className="w-12 h-12 text-amber-500" />,
    info: <FiInfo className="w-12 h-12 text-blue-500" />,
};

const confirmBtnColors: Record<NotificationType, string> = {
    success: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
    error: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    warning: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
    info: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
};

export default function NotificationModal({
    open,
    type = "info",
    title,
    message,
    confirmText = "OK",
    cancelText,
    onConfirm,
    onCancel,
    autoCloseMs = 0,
}: NotificationModalProps) {
    // Auto-close timer
    useEffect(() => {
        if (!open || !autoCloseMs) return;
        const timer = setTimeout(onConfirm, autoCloseMs);
        return () => clearTimeout(timer);
    }, [open, autoCloseMs, onConfirm]);

    // Prevent body scroll while open
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
                onClick={onCancel}
            />

            {/* Card */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center animate-[scaleIn_0.25s_ease]">
                {/* Icon */}
                <div className="flex justify-center mb-4">{iconByType[type]}</div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>

                {/* Message */}
                <p className="text-sm text-gray-500 leading-relaxed mb-6 whitespace-pre-line">
                    {message}
                </p>

                {/* Buttons */}
                <div className={`flex gap-3 ${cancelText ? "justify-center" : "justify-center"}`}>
                    {cancelText && (
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmBtnColors[type]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
