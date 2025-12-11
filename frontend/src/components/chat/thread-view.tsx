"use client"

import { useEffect, useRef, useState } from "react"
import { X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Message, User } from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ThreadViewProps {
    channelId: string
    parentMessage: Message
    messages: Message[]
    currentUser: User
    onClose: () => void
    onSendMessage: (content: string, parentId: string) => void
    onTyping: () => void
    typingUsers: string[]
}

export function ThreadView({
    channelId,
    parentMessage,
    messages,
    currentUser,
    onClose,
    onSendMessage,
    onTyping,
    typingUsers
}: ThreadViewProps) {
    const [inputValue, setInputValue] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        onSendMessage(inputValue, parentMessage.id)
        setInputValue("")
    }

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className="flex flex-col h-full w-full md:w-96 absolute md:static inset-0 z-50 md:z-0 border-l border-white/10 glass-premium">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 flex-none glass-light">
                <h3 className="font-semibold text-gray-900 dark:text-white">Thread</h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar" ref={scrollRef}>
                <div className="p-4 space-y-6">
                    {/* Parent Message */}
                    <div className="pb-4 border-b border-white/5">
                        <div className="flex gap-3">
                            <Avatar className="w-8 h-8 rounded-md mt-1">
                                <AvatarImage src={parentMessage.sender?.avatar_url || parentMessage.user?.avatar_url} />
                                <AvatarFallback className="rounded-md bg-white/10 text-gray-900 dark:text-white text-xs">
                                    {(parentMessage.sender?.username || parentMessage.user?.username || "?")[0].toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                                        {parentMessage.sender?.username || parentMessage.user?.username || "Unknown"}
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                        {formatTime(parentMessage.created_at)}
                                    </span>
                                </div>
                                <p className="text-gray-700 dark:text-white text-sm mt-0.5 leading-relaxed break-words">
                                    {parentMessage.content}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Replies */}
                    <div className="space-y-4">
                        {messages.length === 0 && (
                            <p className="text-xs text-gray-500 dark:text-neutral-500 text-center italic">No replies yet</p>
                        )}

                        {messages.map((msg) => {
                            const isMe = msg.user_id === currentUser.id
                            return (
                                <div key={msg.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <Avatar className="w-8 h-8 rounded-md mt-1">
                                        <AvatarImage src={msg.sender?.avatar_url || msg.user?.avatar_url} />
                                        <AvatarFallback className="rounded-md bg-white/10 text-gray-900 dark:text-white text-xs">
                                            {(msg.sender?.username || msg.user?.username || "?")[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                                                {msg.sender?.username || msg.user?.username || "Unknown"}
                                            </span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 dark:text-white text-sm mt-0.5 leading-relaxed text-wrap">
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 glass-light flex-none relative">
                {/* Thread Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="absolute top-[-20px] left-4 flex items-center gap-2 animate-in fade-in">
                        <div className="flex gap-1 bg-black/60 px-1.5 py-1 rounded-full border border-white/10">
                            <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 bg-red-500 rounded-full animate-bounce"></span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium">
                            {typingUsers.length > 2 ? "Several people are typing..." : `${typingUsers.join(", ")} is typing...`}
                        </span>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="relative">
                    <Input
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value)
                            onTyping()
                        }}
                        placeholder="Reply..."
                        className="glass-medium text-gray-900 dark:text-white pr-10 focus:border-red-500/50"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white"
                        disabled={!inputValue.trim()}
                    >
                        <Send className="w-3.5 h-3.5" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
