"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

interface StatusSelectorProps {
    currentStatus?: string;
    customStatus?: string;
    onStatusChange: (status: string, customStatus?: string) => Promise<void>;
    isLoading?: boolean;
}

const STATUS_OPTIONS = [
    { value: "online", label: "Online", color: "bg-green-500" },
    { value: "away", label: "Away", color: "bg-yellow-500" },
    { value: "dnd", label: "Do Not Disturb", color: "bg-red-500" },
    { value: "offline", label: "Offline", color: "bg-gray-500" },
];

export function StatusSelector({
    currentStatus = "online",
    customStatus,
    onStatusChange,
    isLoading = false,
}: StatusSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customText, setCustomText] = useState(customStatus || "");

    const currentOption = STATUS_OPTIONS.find(s => s.value === currentStatus);
    const statusColor = currentOption?.color || "bg-gray-500";

    const handleStatusChange = async (status: string) => {
        console.log(`StatusSelector: Changing status to ${status}`);
        try {
            await onStatusChange(status, customText || undefined);
            console.log(`StatusSelector: Status changed successfully`);
            setIsOpen(false);
        } catch (error) {
            console.error("StatusSelector: Failed to update status", error);
        }
    };

    const handleCustomStatusChange = async () => {
        console.log(`StatusSelector: Setting custom status: ${customText}`);
        try {
            await onStatusChange(currentStatus, customText || undefined);
            console.log(`StatusSelector: Custom status set successfully`);
            setIsOpen(false);
        } catch (error) {
            console.error("StatusSelector: Failed to update custom status", error);
        }
    };

    return (
        <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-colors outline-none text-sm">
                    <div className={cn("w-2 h-2 rounded-full", statusColor)} />
                    <span className="text-xs text-gray-300 capitalize">{currentStatus}</span>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="w-56 bg-white dark:bg-[#2b2d31] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-2"
                    side="top"
                    align="start"
                >
                    {/* Status Options */}
                    <div className="space-y-1 mb-2">
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleStatusChange(option.value)}
                                disabled={isLoading}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded text-sm outline-none cursor-pointer transition-colors",
                                    currentStatus === option.value
                                        ? "bg-blue-500 text-white"
                                        : "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                            >
                                <div className={cn("w-2 h-2 rounded-full", option.color)} />
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

                    {/* Custom Status Input */}
                    <div className="px-3 py-2 space-y-2">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            Custom Status
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., In a meeting"
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            disabled={isLoading}
                            maxLength={30}
                            className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handleCustomStatusChange}
                            disabled={isLoading}
                            className="w-full px-2 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white outline-none transition-colors disabled:opacity-50"
                        >
                            Set Status
                        </button>
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
