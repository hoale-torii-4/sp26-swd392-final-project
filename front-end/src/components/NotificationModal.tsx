import { useEffect } from "react";
import type { ReactNode } from "react";

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
    success: (
        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    error: (
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
    ),
    warning: (
        <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
    ),
    info: (
        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
    ),
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
