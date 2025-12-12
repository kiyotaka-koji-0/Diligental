"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import { Message, Channel, User, Attachment } from "@/lib/api";
import api from "@/lib/api";
import { Send, Hash, Users, Monitor, Bot, MessageCircle, Phone, Video, Bell, BellOff, Smile, Plus, Paperclip, X, FileIcon } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageModal } from "@/components/ui/image-modal";
import { ThreadView } from "@/components/chat/thread-view";
import { CallOverlay } from "@/components/chat/call-overlay";
import { VoiceChannel } from "@/components/chat/voice-channel";
import { MobileSidebar } from "@/components/layout/sidebar";
import { RichTextEditor } from "@/components/chat/rich-text-editor";
import { RichTextRenderer } from "@/components/chat/rich-text-renderer";
import { useWebRTC } from "@/hooks/use-webrtc";

export default function ChannelPage({
    params,
}: {
    params: Promise<{ workspaceId: string; channelId: string }>;
}) {
    const { workspaceId, channelId } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [channel, setChannel] = useState<Channel | null>(null);
    const [channelMembers, setChannelMembers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    // Threading State
    const [activeThread, setActiveThread] = useState<Message | null>(null);
    const [threadMessages, setThreadMessages] = useState<Message[]>([]);

    // Typing State
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [threadTypingUsers, setThreadTypingUsers] = useState<Record<string, string[]>>({});
    const lastTypedRef = useRef<number>(0);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Image Modal State
    const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);

    // Aesthetics
    const messageFontSize = "text-lg"; // Increased from text-[15px]
    const glassBorder = "border-white/20"; // Brighter border

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const notificationWsRef = useRef<WebSocket | null>(null);  // For cross-channel call signals
    // Ref to access activeThread inside WebSocket callback without triggering re-connection
    const activeThreadRef = useRef<Message | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const file = files[0]; // Handle one file for now, or loop for multiple
            const uploadedFile = await api.uploadFile(file);
            setAttachments(prev => [...prev, uploadedFile]);
        } catch (error) {
            console.error("File upload failed:", error);
            // Ideally show a toast notification here
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeAttachment = (attachmentId: string) => {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    };

    // Sync activeThread state to ref
    useEffect(() => {
        activeThreadRef.current = activeThread;
    }, [activeThread]);

    // Target user ID for DM calls
    const [targetUserId, setTargetUserId] = useState<string | undefined>(undefined);

    // Call handling state
    const [isCallActive, setIsCallActive] = useState(false);
    const [isIncomingCall, setIsIncomingCall] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    // WebRTC Hook
    const {
        startCall,
        answerCall,
        endCall,
        handleSignal,
        localStream: webrtcLocalStream,
        remoteStream: webrtcRemoteStream,
        isCallActive: webrtcCallActive,
        incomingCall: webrtcIncomingCall,
        toggleAudio,
        toggleVideo,
        isAudioEnabled,
        isVideoEnabled
    } = useWebRTC({
        user: currentUser,
        channelId,
        socket: wsRef.current,
        targetUserId: targetUserId,  // Pass target user ID for cross-channel calls
        onIncomingCall: (senderId, senderName) => {
            console.log("Incoming call from", senderName);
            // Show incoming call notification
            showNotification(`Incoming call from ${senderName}`, {
                body: 'Tap to answer or dismiss',
                tag: `call-${senderId}`,
                requireInteraction: true
            });
            handleIncomingCall();
        }
    });

    // We need a ref to handleSignal to access the latest version inside the effect
    const handleSignalRef = useRef(handleSignal);
    useEffect(() => {
        handleSignalRef.current = handleSignal;
    }, [handleSignal]);

    // Notification handling function
    const playNotificationSound = () => {
        if (notificationsEnabled) {
            try {
                const audio = new Audio("data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==");
                audio.play().catch(() => {});
            } catch (e) {
                console.log("Notification sound not available");
            }
        }
    };

    const showNotification = (title: string, options?: NotificationOptions) => {
        if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    icon: '/favicon.ico',
                    ...options
                });
            } catch (e) {
                console.log("Notifications not available");
            }
        }
        playNotificationSound();
    };

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = await api.getMe();
                setCurrentUser(user);

                const ch = await api.getChannel(channelId);
                setChannel(ch);

                // Extract channel members for mention suggestions
                const hasChannelMembers = ch.members && Array.isArray(ch.members) && ch.members.length > 0;
                
                if (hasChannelMembers && Array.isArray(ch.members)) {
                    const members = ch.members.map((m: any) => ({
                        id: m.user?.id || m.user_id,
                        username: m.user?.username || "Unknown",
                        email: m.user?.email || ""
                    }));
                    setChannelMembers(members);
                } else {
                    // For regular channels, fetch workspace members as fallback for mentions
                    try {
                        const workspaceMembers = await api.getWorkspaceMembers(workspaceId);
                        const members = workspaceMembers.map((m: any) => ({
                            id: m.user?.id || m.user_id,
                            username: m.user?.username || "Unknown",
                            email: m.user?.email || ""
                        }));
                        setChannelMembers(members);
                    } catch (err) {
                        console.error("Error fetching workspace members:", err);
                    }
                }

                // Extract target user ID for DM channels
                if (ch.type === 'dm' && ch.members && Array.isArray(ch.members)) {
                    const otherMember = ch.members.find((m: any) => m.user.id !== user.id);
                    if (otherMember) {
                        setTargetUserId(otherMember.user.id);
                    }
                }

                const hist = await api.getMessages(channelId);
                // Ensure messages are sorted by date
                const sorted = hist.sort((a: Message, b: Message) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                setMessages(sorted);
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };
        fetchData();
    }, [workspaceId, channelId]);

    // Load Thread Messages when activeThread changes
    useEffect(() => {
        if (!activeThread) {
            setThreadMessages([]);
            return;
        }

        const fetchThread = async () => {
            try {
                const replies = await api.getMessages(channelId, activeThread.id);
                const sorted = replies.sort((a: Message, b: Message) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                setThreadMessages(sorted);
            } catch (err) {
                console.error("Error fetching thread:", err);
            }
        };
        fetchThread();
    }, [activeThread, channelId]);

    // WebSocket Connection
    useEffect(() => {
        if (!currentUser) return;

        const url = api.getWebSocketUrl(channelId);
        console.log("Connecting WS to:", url);

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WS Connected");
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle Signaling
                if (['call_offer', 'call_answer', 'ice_candidate', 'call_end'].includes(data.type)) {
                    // If voice channel, let VoiceChannel component handle it (it adds its own listener)
                    if (channel?.type === 'voice') return;

                    handleSignalRef.current(data);
                    return;
                }

                if (data.type === 'typing') {
                    console.log("DEBUG: Received typing:", data);
                    const isThread = !!data.parent_id;
                    // Handle typing indicator
                    // If parent_id is set, it belongs to a thread, handle if needed or pass to ThreadView
                    // For now, only show in root if parent_id is null/undefined
                    if (isConnected && data.username) {
                        if (!data.parent_id) {
                            // Main Channel Typing
                            setTypingUsers(prev => {
                                if (prev.includes(data.username)) return prev;
                                return [...prev, data.username];
                            });
                            // Clear after 3 seconds
                            setTimeout(() => {
                                setTypingUsers(prev => prev.filter(u => u !== data.username));
                            }, 3000);
                        } else {
                            // Thread Typing
                            const pid = data.parent_id;
                            setThreadTypingUsers(prev => {
                                const current = prev[pid] || [];
                                if (current.includes(data.username)) return prev;
                                return { ...prev, [pid]: [...current, data.username] };
                            });
                            // Clear after 3 seconds
                            setTimeout(() => {
                                setThreadTypingUsers(prev => ({
                                    ...prev,
                                    [pid]: (prev[pid] || []).filter(u => u !== data.username)
                                }));
                            }, 3000);
                        }
                    }
                    return;
                }

                if (data.type === 'reaction_add') {
                    setMessages(prev => prev.map(msg => {
                        if (msg.id === data.message_id) {
                            const newReaction = {
                                id: Date.now().toString(), // Temporary ID
                                message_id: data.message_id,
                                user_id: data.user_id,
                                emoji: data.emoji,
                                created_at: new Date().toISOString(),
                                user: { id: data.user_id, username: data.username, email: '' }
                            };
                            return { ...msg, reactions: [...(msg.reactions || []), newReaction] };
                        }
                        return msg;
                    }));
                    setThreadMessages(prev => prev.map(msg => {
                        if (msg.id === data.message_id) {
                             const newReaction = {
                                id: Date.now().toString(),
                                message_id: data.message_id,
                                user_id: data.user_id,
                                emoji: data.emoji,
                                created_at: new Date().toISOString(),
                                user: { id: data.user_id, username: data.username, email: '' }
                            };
                            return { ...msg, reactions: [...(msg.reactions || []), newReaction] };
                        }
                        return msg;
                    }));
                    return;
                }

                if (data.type === 'reaction_remove') {
                    setMessages(prev => prev.map(msg => {
                        if (msg.id === data.message_id) {
                            return { ...msg, reactions: (msg.reactions || []).filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji)) };
                        }
                        return msg;
                    }));
                    setThreadMessages(prev => prev.map(msg => {
                        if (msg.id === data.message_id) {
                            return { ...msg, reactions: (msg.reactions || []).filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji)) };
                        }
                        return msg;
                    }));
                    return;
                }

                if (data.parent_id) {
                    // It's a reply
                    if (activeThreadRef.current && activeThreadRef.current.id === data.parent_id) {
                        setThreadMessages(prev => {
                            if (prev.some(m => m.id === data.id)) return prev;
                            return [...prev, data];
                        });
                        // Show notification for thread reply
                        if (data.user_id !== currentUser?.id) {
                            showNotification(`New reply from ${data.user?.username || 'Someone'}`, {
                                body: data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''),
                                tag: `reply-${data.id}`
                            });
                            setUnreadCount(prev => prev + 1);
                        }
                    }
                } else {
                    // It's a root message
                    setMessages(prev => {
                        if (prev.some(m => m.id === data.id)) return prev;
                        return [...prev, data];
                    });
                    // Show notification for new message
                    if (data.user_id !== currentUser?.id && data.content) {
                        showNotification(`New message from ${data.user?.username || 'Someone'}`, {
                            body: data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''),
                            tag: `message-${data.id}`
                        });
                        setUnreadCount(prev => prev + 1);
                    }
                }
            } catch (e) {
                console.error("WS Message Parse Error:", e);
            }
        };

        ws.onclose = () => {
            console.log("WS Disconnected");
            setIsConnected(false);
        };

        ws.onerror = (err: Event) => {
            const wsEvent = err as any;
            console.error("WS Error - Code:", wsEvent.code || 'unknown', "Reason:", wsEvent.reason || 'No reason provided');
        };

        return () => {
            ws.close();
        };
    }, [channelId, currentUser, channel?.type]); // Added channel?.type to deps

    // Notification WebSocket for cross-channel call signals
    useEffect(() => {
        if (!currentUser) return;

        const notifUrl = api.getWebSocketUrl("notifications");
        console.log("Connecting Notification WS for cross-channel calls:", notifUrl);

        const notifWs = new WebSocket(notifUrl);
        notificationWsRef.current = notifWs;

        notifWs.onopen = () => {
            console.log("✅ Notification WS Connected (for cross-channel calls)");
        };

        notifWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle call signals received via notification WebSocket
                if (['call_offer', 'call_answer', 'ice_candidate', 'call_end'].includes(data.type)) {
                    console.log("📞 Received call signal via notification WS:", data.type);
                    // Only handle if it's NOT from current channel (to avoid duplicates)
                    // The channel WS already handles same-channel calls
                    if (data.channel_id && data.channel_id !== channelId) {
                        console.log("✅ Processing cross-channel call from:", data.channel_id);
                        handleSignalRef.current(data);
                    } else if (!data.channel_id) {
                        // No channel_id means direct targeted call - always handle
                        console.log("✅ Processing direct targeted call");
                        handleSignalRef.current(data);
                    } else {
                        console.log("⏭️  Ignoring same-channel signal (handled by channel WS)");
                    }
                    // If data.channel_id === channelId, ignore (channel WS handles it)
                }
            } catch (e) {
                console.error("❌ Notification WS Message Parse Error:", e);
            }
        };

        notifWs.onclose = (event) => {
            console.log("❌ Notification WS Disconnected - Code:", event.code, "Reason:", event.reason || "No reason");
        };

        notifWs.onerror = (err: Event) => {
            console.error("❌ Notification WS Error:", err);
        };

        return () => {
            if (notifWs.readyState === WebSocket.OPEN || notifWs.readyState === WebSocket.CONNECTING) {
                notifWs.close();
            }
        };
    }, [currentUser, channelId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleReaction = (messageId: string, emoji: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        // Check if already reacted (check both main messages and thread messages)
        const msg = messages.find(m => m.id === messageId) || threadMessages.find(m => m.id === messageId);
        const existing = msg?.reactions?.find(r => r.user_id === currentUser?.id && r.emoji === emoji);
        
        if (existing) {
             wsRef.current.send(JSON.stringify({
                type: "reaction_remove",
                message_id: messageId,
                emoji: emoji
            }));
        } else {
            wsRef.current.send(JSON.stringify({
                type: "reaction_add",
                message_id: messageId,
                emoji: emoji
            }));
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!newMessage.trim() && attachments.length === 0) || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const payload = {
            content: newMessage,
            attachment_ids: attachments.map(a => a.id)
            // parent_id is null for main chat
        };

        wsRef.current.send(JSON.stringify(payload));
        setNewMessage("");
        setAttachments([]);
    };

    const handleSendReply = (content: string, parentId: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const payload = {
            content: content,
            parent_id: parentId
        };

        wsRef.current.send(JSON.stringify(payload));
    };

    const handleTyping = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const now = Date.now();
        if (now - lastTypedRef.current > 2000) { // Throttle 2s
            lastTypedRef.current = now;
            console.log("DEBUG: Sending typing event");
            wsRef.current.send(JSON.stringify({
                type: "typing",
                parent_id: null
            }));
        }
    };

    const handleThreadTyping = (parentId: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const now = Date.now();
        if (now - lastTypedRef.current > 2000) {
            lastTypedRef.current = now;
            console.log("DEBUG: Sending THREAD typing event");
            wsRef.current.send(JSON.stringify({
                type: "typing",
                parent_id: parentId
            }));
        }
    };

    // Check if message is from current user
    const isSelf = (msg: Message) => {
        if (!currentUser) return false;
        if (msg.user_id === currentUser.id) return true;
        if (msg.sender && msg.sender.id === currentUser.id) return true;
        return false;
    };

    const handleIncomingCall = () => {
        setIsIncomingCall(true);
    };

    const handleStartCall = async () => {
        if (!currentUser || !channelId) return;

        console.log("Starting call as:", currentUser.username);
        try {
            await startCall();
        } catch (err) {
            console.error("Failed to start call:", err);
        }
    };

    if (channel?.type === 'voice') {
        return (
            <VoiceChannel
                channelId={channelId}
                workspaceId={workspaceId}
                user={currentUser}
                socket={wsRef.current}
            />
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col glass-bg-3 overflow-hidden text-gray-900 dark:text-white">

            <CallOverlay
                localStream={webrtcLocalStream}
                remoteStream={webrtcRemoteStream}
                onEndCall={endCall}
                isActive={webrtcCallActive}
                isIncoming={webrtcIncomingCall ? true : false}
                onAnswer={answerCall}
                callerName={webrtcIncomingCall?.senderName || "User Name"}
                toggleAudio={toggleAudio}
                toggleVideo={toggleVideo}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
            />

            {/* Header */}
            <div className="flex-none h-16 border-b border-white/10 dark:border-white/5 flex items-center justify-between px-4 md:px-6 glass-bg-2 glass-shadow z-20">
                <div className="flex items-center gap-3 flex-1">
                    <div className="md:hidden">
                        <MobileSidebar currentWorkspaceId={workspaceId} />
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-white/5 dark:bg-white/10 flex items-center justify-center border border-white/10 dark:border-white/5 shadow-lg">
                        {channel?.type === 'dm' ? <Users className="h-4 w-4 text-zinc-400 dark:text-gray-400" /> : <Hash className="h-4 w-4 text-zinc-400 dark:text-gray-400" />}
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {(() => {
                                if (channel?.type === 'dm' && channel.members && currentUser) {
                                    const otherMember = channel.members.find((m: any) => m.user.id !== currentUser.id);
                                    if (otherMember) return otherMember.user.username;
                                    return "Direct Message"; // Fallback
                                }
                                return channel?.name || "Loading...";
                            })()}
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-medium text-gray-600 dark:text-gray-400 tracking-wider">
                                {channel?.type === 'dm' ? 'DM' : 'BETA'}
                            </span>
                        </h2>
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                            {isConnected ? "Connected" : "Connecting..."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Unread Badge */}
                    {unreadCount > 0 && (
                        <div className="px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-medium text-red-300 flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            {unreadCount}
                        </div>
                    )}

                    {/* Notification Toggle */}
                    <Button
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${notificationsEnabled ? 'text-green-400 hover:bg-green-500/10' : 'text-zinc-500 hover:bg-red-500/10'}`}
                        title={notificationsEnabled ? "Notifications enabled" : "Notifications disabled"}
                    >
                        {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </Button>

                    {channel?.type !== 'dm' && (
                        <div className="flex -space-x-2 mr-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-6 w-6 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[10px] text-zinc-500">
                                    U{i}
                                </div>
                            ))}
                        </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10">
                        <Users className="h-4 w-4" />
                    </Button>

                    {/* Call Button - New */}
                    <Button
                        onClick={handleStartCall}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-400 hover:bg-green-500/10"
                        title="Start Call"
                    >
                        <Phone className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content Area (Chat + Thread) */}
            <div className="flex-1 flex min-h-0 overflow-hidden relative">

                {/* Chat Column */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* Messages List */}
                    <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar p-6 space-y-6">

                        <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                            <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center mb-4 shadow-2xl">
                                {channel?.type === 'dm' ? <Users className="h-8 w-8 text-zinc-500" /> : <Hash className="h-8 w-8 text-zinc-500" />}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                {(() => {
                                    if (channel?.type === 'dm' && channel.members && currentUser) {
                                        const otherMember = channel.members.find((m: any) => m.user.id !== currentUser.id);
                                        return `Conversation with ${otherMember?.user.username || "Unknown"}`;
                                    }
                                    return `Welcome to #${channel?.name || "channel"}`;
                                })()}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                                {channel?.type === 'dm'
                                    ? "This is the start of your direct message history."
                                    : "This is the start of your conversation. Messages are encrypted and stored securely."
                                }
                            </p>
                        </div>

                        {messages.map((msg, index) => {
                            const isMe = isSelf(msg);
                            const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id;

                            return (
                                <div
                                    key={msg.id || index}
                                    className={`flex gap-4 ${isMe ? "flex-row-reverse" : "flex-row"} group`}
                                >
                                    <div className={`flex-none w-10 ${!showAvatar && "invisible"}`}>
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-medium shadow-lg border border-white/10 dark:border-white/5 ${isMe
                                            ? "bg-linear-to-br from-red-600 to-red-900 text-white"
                                            : "bg-linear-to-br from-zinc-800 to-zinc-950 dark:from-gray-700 dark:to-gray-800 text-zinc-300 dark:text-gray-200"
                                            }`}>
                                            {isMe ? "Me" : (msg.user?.username?.[0]?.toUpperCase() || "U")}
                                        </div>
                                    </div>

                                    <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                                        {showAvatar && (
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                                                    {isMe ? "You" : (msg.user?.username || "Unknown")}
                                                </span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-500">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}

                                        <div className={`relative px-4 py-3 rounded-2xl ${messageFontSize} leading-relaxed glass-shadow transition-all ${isMe
                                            ? "glass-medium bg-red-500/20! border-red-500/30! text-gray-900 dark:text-white rounded-tr-sm"
                                            : "glass-light text-gray-900 dark:text-white rounded-tl-sm hover:bg-white/10 dark:hover:bg-white/5"
                                            }`}>
                                            <RichTextRenderer 
                                                content={msg.content}
                                                mentions={msg.mentioned_users || []}
                                                className="break-words"
                                            />

                                            {/* Attachments */}
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {msg.attachments.map(att => (
                                                        <div key={att.id} className="group relative">
                                                            {att.file_type.startsWith('image/') ? (
                                                                <div 
                                                                    className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-white/30 transition-colors"
                                                                    onClick={() => setSelectedImage({ src: `${process.env.NEXT_PUBLIC_API_URL}${att.file_path}`, alt: att.filename })}
                                                                >
                                                                    <img 
                                                                        src={`${process.env.NEXT_PUBLIC_API_URL}${att.file_path}`} 
                                                                        alt={att.filename} 
                                                                        className="max-w-xs max-h-60 object-cover hover:opacity-80 transition-opacity"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <a 
                                                                    href={`${process.env.NEXT_PUBLIC_API_URL}${att.file_path}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                                                >
                                                                    <FileIcon className="w-5 h-5 text-blue-400" />
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium text-gray-200">{att.filename}</span>
                                                                        <span className="text-[10px] text-gray-400 uppercase">{att.filename.split('.').pop()}</span>
                                                                    </div>
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Reactions Display */}
                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                                                {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                                                    const count = msg.reactions?.filter(r => r.emoji === emoji).length;
                                                    const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === currentUser?.id);
                                                    return (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => handleReaction(msg.id, emoji)}
                                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                                                hasReacted 
                                                                    ? "bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400" 
                                                                    : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10"
                                                            }`}
                                                        >
                                                            <span>{emoji}</span>
                                                            <span className="text-[10px]">{count}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Thread Reply Indicator & Actions */}
                                        <div className={`mt-1 flex gap-2 items-center ${isMe ? "justify-end" : "justify-start"}`}>
                                            {msg.reply_count && msg.reply_count > 0 && (
                                                <button
                                                    onClick={() => setActiveThread(msg)}
                                                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass-light hover:glass-medium transition-all text-blue-400 dark:text-blue-300 hover:text-blue-300 border border-blue-500/20"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">{msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}</span>
                                                </button>
                                            )}
                                            
                                            {/* Reaction Picker Trigger */}
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger asChild>
                                                    <button className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                                                        <Smile className="w-3 h-3" />
                                                    </button>
                                                </DropdownMenu.Trigger>
                                                <DropdownMenu.Portal>
                                                    <DropdownMenu.Content className="bg-white dark:bg-[#1e1f22] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2 flex gap-1 z-50 animate-in zoom-in-95 duration-100">
                                                        {["👍", "❤️", "😂", "😮", "😢", "😡", "✅", "👀"].map(emoji => (
                                                            <DropdownMenu.Item 
                                                                key={emoji}
                                                                onSelect={() => handleReaction(msg.id, emoji)}
                                                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 p-1.5 rounded text-lg outline-none transition-transform hover:scale-110"
                                                            >
                                                                {emoji}
                                                            </DropdownMenu.Item>
                                                        ))}
                                                    </DropdownMenu.Content>
                                                </DropdownMenu.Portal>
                                            </DropdownMenu.Root>

                                            <button
                                                onClick={() => setActiveThread(msg)}
                                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <MessageCircle className="w-3 h-3" />
                                                Reply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="flex-none p-4 bg-transparent z-20 relative">
                        {/* Typing Indicator */}
                        {typingUsers.length > 0 && (
                            <div className="absolute -top-6 left-8 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex gap-1 bg-black/40 px-2 py-1 rounded-full border border-white/10">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"></span>
                                </div>
                                <span className="text-xs text-zinc-400 font-medium">
                                    {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
                                </span>
                            </div>
                        )}
                        <div className="max-w-4xl mx-auto w-full">
                            {/* Attachment Preview */}
                            {attachments.length > 0 && (
                                <div className="flex gap-2 p-2 mb-2 overflow-x-auto">
                                    {attachments.map(att => (
                                        <div key={att.id} className="relative group flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/10">
                                            <FileIcon className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs text-white truncate max-w-[100px]">{att.filename}</span>
                                            <button 
                                                type="button"
                                                onClick={() => removeAttachment(att.id)}
                                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form
                                onSubmit={handleSendMessage}
                                className="relative flex flex-col gap-2 p-4 rounded-2xl glass-premium glass-shadow-lg focus-within:border-red-500/30 focus-within:ring-1 focus-within:ring-red-500/20 transition-all duration-300"
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                />

                                <RichTextEditor
                                    value={newMessage}
                                    onChange={setNewMessage}
                                    onSubmit={handleSendMessage}
                                    onTyping={handleTyping}
                                    placeholder={`Message #${channel?.name || "channel"}...`}
                                    users={channelMembers}
                                    isUploading={isUploading}
                                >
                                    <div className="flex items-center gap-1 mt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="h-8 w-8 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
                                            title="Attach file"
                                        >
                                            <Paperclip className="h-4 w-4" />
                                        </Button>

                                        {newMessage.trim() && (
                                            <Button
                                                type="submit"
                                                size="icon"
                                                className="h-8 w-8 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-900/20 transition-all duration-300 animate-in zoom-in-50 ml-auto"
                                                title="Send (Ctrl+Enter)"
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </RichTextEditor>

                                {/* Attachments Preview */}
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {attachments.map(att => (
                                            <div 
                                                key={att.id} 
                                                className="relative group p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                                            >
                                                <span className="text-xs text-gray-400">{att.filename.substring(0, 20)}...</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeAttachment(att.id)}
                                                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>

                {/* Thread Sidebar (Conditional) */}
                {activeThread && currentUser && (
                    <ThreadView
                        channelId={channelId}
                        parentMessage={activeThread}
                        messages={threadMessages}
                        currentUser={currentUser}
                        onClose={() => setActiveThread(null)}
                        onSendMessage={handleSendReply}
                        onTyping={() => handleThreadTyping(activeThread.id)}
                        typingUsers={threadTypingUsers[activeThread.id] || []}
                    />
                )}

                {/* Image Modal */}
                <ImageModal
                    src={selectedImage?.src || ""}
                    alt={selectedImage?.alt || ""}
                    isOpen={!!selectedImage}
                    onClose={() => setSelectedImage(null)}
                />
            </div>
        </div>
    );
}
