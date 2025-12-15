"use client";

import { useState } from "react";
import { Pin, MoreVertical } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { Message } from "@/lib/api";

interface MessageActionsProps {
    message: Message;
    onPin?: (messageId: string) => Promise<void>;
    onUnpin?: (messageId: string) => Promise<void>;
    canPin?: boolean;
    isLoading?: boolean;
}

export function MessageActions({
    message,
    onPin,
    onUnpin,
    canPin = false,
    isLoading = false,
}: MessageActionsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handlePin = async () => {
        try {
            if (message.is_pinned && onUnpin) {
                await onUnpin(message.id);
            } else if (!message.is_pinned && onPin) {
                await onPin(message.id);
            }
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update pin status", error);
        }
    };

    return (
        <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger asChild>
                <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 outline-none transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="w-40 bg-white dark:bg-[#2b2d31] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-1"
                    side="top"
                    align="end"
                >
                    {canPin && (
                        <>
                            <DropdownMenu.Item
                                onSelect={handlePin}
                                disabled={isLoading}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm rounded outline-none cursor-pointer transition-colors",
                                    "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                )}
                            >
                                <Pin className="w-4 h-4" />
                                {message.is_pinned ? "Unpin" : "Pin"}
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                        </>
                    )}

                    <DropdownMenu.Item
                        className="flex items-center px-3 py-2 text-sm rounded outline-none cursor-pointer transition-colors text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Copy Link
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        className="flex items-center px-3 py-2 text-sm rounded outline-none cursor-pointer transition-colors text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Edit
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        className="flex items-center px-3 py-2 text-sm rounded outline-none cursor-pointer transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        Delete
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
