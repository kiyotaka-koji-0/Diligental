"use client";

import { Check, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

interface CustomNotificationProps {
    type?: NotificationType;
    title: string;
    message?: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

const icons = {
    success: Check,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
};

const styles = {
    success: "border-green-500/20 bg-green-500/10 text-green-200",
    error: "border-red-500/20 bg-red-500/10 text-red-200",
    info: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    warning: "border-yellow-500/20 bg-yellow-500/10 text-yellow-200",
};

const iconStyles = {
    success: "text-green-500",
    error: "text-red-500",
    info: "text-blue-500",
    warning: "text-yellow-500",
};

export function CustomNotification({
    type = "info",
    title,
    message,
    isVisible,
    onClose,
    duration = 5000,
}: CustomNotificationProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);
            if (duration > 0) {
                const timer = setTimeout(() => {
                    setIsAnimating(false);
                    setTimeout(onClose, 300); // Wait for exit animation
                }, duration);
                return () => clearTimeout(timer);
            }
        } else {
            setIsAnimating(false);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !isAnimating) return null;

    const Icon = icons[type];

    return (
        <div
            className={cn(
                "fixed top-6 right-6 z-[100] flex w-full max-w-sm overflow-hidden rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)",
                "glass-panel p-0 bg-opacity-70 dark:bg-opacity-70",
                styles[type],
                isAnimating
                    ? "translate-x-0 opacity-100 scale-100"
                    : "translate-x-full opacity-0 scale-95"
            )}
        >
            <div className="flex w-full p-4 items-start gap-4 relaltive overflow-hidden">
                {/* Glow Effect */}
                <div className={cn("absolute -left-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none", iconStyles[type].replace("text-", "bg-"))} />

                <div className={cn("mt-0.5 p-2 rounded-full bg-white/5 border border-white/5 shadow-inner", iconStyles[type])}>
                    <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 pt-0.5">
                    <h4 className="text-sm font-semibold tracking-wide text-white">{title}</h4>
                    {message && <p className="text-sm text-white/60 mt-1 leading-relaxed">{message}</p>}
                </div>

                <button
                    onClick={() => { setIsAnimating(false); setTimeout(onClose, 300); }}
                    className="text-white/40 hover:text-white transition-colors p-1"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Progress Bar (Optional, can be added later) */}
            <div className={cn("h-0.5 w-full bg-white/10")}>
                <div
                    className={cn("h-full origin-left transition-all ease-linear", iconStyles[type].replace("text-", "bg-"))}
                    style={{
                        width: isAnimating ? "0%" : "100%",
                        transitionDuration: `${duration}ms`
                    }}
                />
            </div>

        </div>
    );
}
