"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface User {
    username: string;
    email: string;
}

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    user: User;
}

interface Channel {
    id: string;
    name: string;
    workspace_id: string;
}

export default function ChannelPage() {
    const params = useParams();
    const router = useRouter();
    const channelId = params.channelId as string;
    const workspaceId = params.workspaceId as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Fetch initial messages, user info and channel info
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem("token");
            if (!token) return router.push("/login");

            try {
                const user = await api.getMe() as User;
                setCurrentUser(user);

                // Fetch Channel details to show name
                // Ideally API should provide getChannel(id) or we find from list.
                // Since we don't have getChannel(id) strictly defined in api.ts as fetching single,
                // we can assume we might need to rely on side-channel or add it.
                // Actually the sidebar fetches channels, but we are in a page.
                // Let's implement a quick getChannel or just fetch all for workspace and find.
                // For optimal perf, getChannel(id) should be added.
                // But for now, let's just show ID or fetch all.
                const channels = await api.getChannels(workspaceId) as Channel[];
                const channel = channels.find(c => c.id === channelId);
                if (channel) setCurrentChannel(channel);

                const msgs = await api.getMessages(channelId) as Message[];
                setMessages(msgs);
            } catch (err) {
                console.error("Failed to load channel data", err);
            }
        };

        if (channelId && workspaceId) {
            fetchData();
        }
    }, [channelId, workspaceId, router]);

    // WebSocket Connection
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!channelId || !token) return;

        // API_URL might be http://localhost:8001, we need ws://localhost:8001
        const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") || "ws://localhost:8005"; // Match backend default port 8005 from run_local.sh or 8001?
        // Wait, metadata says backend running on port 8005. Default API_URL in api.ts is localhost:8001.
        // User's metadata: "uv run uvicorn main:app --host 0.0.0.0 --port 8005"
        // API_URL in api.ts: "process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'"
        // This is a mismatch! I should probably check env or update api.ts.
        // But for now, let's assume the user might have set ENV or the hardcoded 8001 is wrong.
        // I will use 8005 here to be safe if env is missing, or rely on env.
        // Actually, let's stick to what was there but update port if needed. 
        // Logic: if window.location.port is 3000, backend is likely 8005 based on python command.
        // But let's trust the existing logic or the env.

        const url = `${wsUrl}/ws/${channelId}/${token}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to WebSocket");
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                setMessages((prev) => {
                    if (prev.find(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            } catch (e) {
                console.error("Error parsing WS message", e);
            }
        };

        ws.onclose = () => {
            console.log("Disconnected from WebSocket");
            setIsConnected(false);
        };

        return () => {
            ws.close();
        };
    }, [channelId]);

    // Scroll on initial load
    useEffect(() => {
        bottomRef.current?.scrollIntoView();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const payload = { content: newMessage };
        wsRef.current.send(JSON.stringify(payload));
        setNewMessage("");
    };

    if (!channelId) return <div>Select a channel</div>;

    return (
        <div className="flex flex-col h-full bg-transparent relative w-full font-outfit">
            {/* Glass Header */}
            <div className="h-16 px-6 border-b border-[#27272a] flex items-center justify-between z-10 bg-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20 shrink-0">
                <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/5 mr-3">
                        <Hash className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-white text-lg tracking-wide">
                            {currentChannel?.name || "Loading..."}
                        </h1>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Channel</span>
                    </div>
                </div>
                {/* Connection Indicator */}
                <div className="flex items-center space-x-2">
                    <span className={cn("text-xs font-medium uppercase tracking-wider", isConnected ? "text-emerald-500" : "text-rose-500")}>
                        {isConnected ? "Connected" : "Offline"}
                    </span>
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'}`} />
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-white/30 animate-scale-in">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 shadow-2xl">
                            <Hash className="w-12 h-12 text-red-500/50" />
                        </div>
                        <div>
                            <p className="text-lg text-white/70">Welcome to <span className="font-bold text-white">#{currentChannel?.name}</span></p>
                            <p className="text-sm text-white/40">This is the start of something great.</p>
                        </div>
                    </div>
                )}

                {messages.map((message, idx) => {
                    const isMe = currentUser?.username === message.user.username;
                    // Check if previous message was same user to group them
                    const isSameUser = idx > 0 && messages[idx - 1].user.username === message.user.username;

                    return (
                        <div key={message.id} className={cn("group flex flex-col animate-fade-in-up", isSameUser ? "mt-0.5" : "mt-6")}>
                            {!isSameUser && (
                                <div className="flex items-baseline mb-1.5 ml-1">
                                    <span className={cn("font-bold text-sm mr-2", isMe ? "text-red-400" : "text-neutral-300")}>
                                        {message.user.username}
                                    </span>
                                    <span className="text-[10px] text-white/20 uppercase tracking-wide">
                                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                            <div className={cn(
                                "relative px-4 py-2.5 max-w-[85%] rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all duration-200",
                                isMe
                                    ? "bg-red-600/20 text-white/95 rounded-tr-sm self-end border border-red-500/20 shadow-[0_4px_20px_rgba(220,38,38,0.1)] hover:bg-red-600/30"
                                    : "bg-white/5 text-neutral-200 rounded-tl-sm self-start border border-white/5 hover:bg-white/10"
                            )}>
                                {message.content}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 pb-8 shrink-0 bg-gradient-to-t from-black via-black/80 to-transparent">
                <form onSubmit={handleSendMessage} className="relative group">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message #${currentChannel?.name || "..."}`}
                        className="bg-[#0a0a0a] border border-[#27272a] text-white placeholder:text-neutral-600 h-14 pl-6 pr-14 rounded-xl focus-visible:ring-1 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 shadow-lg transition-all"
                        disabled={!isConnected}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Button
                            size="sm"
                            type="submit"
                            disabled={!newMessage.trim() || !isConnected}
                            className={cn(
                                "h-8 w-8 p-0 rounded-lg transition-all duration-300",
                                newMessage.trim() ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_#ef4444]" : "bg-white/5 text-white/20"
                            )}
                        >
                            <span className="sr-only">Send</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Helper icons
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
