"use client";

import { useState } from "react";
import { X, Pin } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Message } from "@/lib/api";

interface PinnedMessagesProps {
    messages?: Message[];
    isOpen: boolean;
    onClose: () => void;
    onUnpin?: (messageId: string) => Promise<void>;
    canUnpin?: boolean;
}

export function PinnedMessagesDialog({
    messages,
    isOpen,
    onClose,
    onUnpin,
    canUnpin = false,
}: PinnedMessagesProps) {
    const [unPinningId, setUnPinningId] = useState<string | null>(null);
    const pinnedMessages = messages || [];

    const handleUnpin = async (messageId: string) => {
        if (!onUnpin) return;
        try {
            setUnPinningId(messageId);
            await onUnpin(messageId);
        } catch (error) {
            console.error("Failed to unpin message", error);
        } finally {
            setUnPinningId(null);
        }
    };

    if (pinnedMessages.length === 0) {
        return null;
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-overlay-fade" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white dark:bg-[#2b2d31] border border-gray-200 dark:border-gray-700 shadow-lg p-0 animate-fade-scale-in">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <Pin className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                                Pinned Messages
                            </Dialog.Title>
                        </div>
                        <Dialog.Close asChild>
                            <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 outline-none transition-colors" onClick={onClose}>
                                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2 p-4">
                            {pinnedMessages.map((message) => (
                                <div
                                    key={message.id}
                                    className="p-3 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 group hover:-translate-y-0.5"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {message.user?.username || "Unknown"}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(message.created_at).toLocaleDateString()} {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {canUnpin && (
                                            <button
                                                onClick={() => handleUnpin(message.id)}
                                                disabled={unPinningId === message.id}
                                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 outline-none transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                title="Unpin message"
                                            >
                                                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 overflow-wrap-break-word">
                                        {message.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
