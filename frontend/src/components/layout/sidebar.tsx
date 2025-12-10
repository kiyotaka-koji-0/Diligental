"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { ChevronDown, Hash, Plus, Settings, LogOut, Check, UserPlus, MoreVertical, Bell, Edit2, Trash2, Volume2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import api, { Notification } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { RenameChannelDialog } from "@/components/channel/rename-channel-dialog";
import { DeleteChannelDialog } from "@/components/channel/delete-channel-dialog";
import { JoinWorkspaceDialog } from "@/components/workspace/join-workspace-dialog";
import { InviteUserDialog } from "@/components/workspace/invite-user-dialog";
import { CreateChannelDialog } from "@/components/channel/create-channel-dialog";
import { CreateDMDialog } from "@/components/channel/create-dm-dialog";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"

interface Workspace {
    id: string;
    name: string;
}

interface Channel {
    id: string;
    name: string;
    workspace_id: string;
    type?: 'public' | 'private' | 'dm' | 'voice';
    members?: { user: User }[];
}

interface User {
    id: string;
    username: string;
    email: string;
}

// Logic Hook extracted for reusability

function useSidebarLogic(currentWorkspaceId: string) {
    const router = useRouter();
    const pathname = usePathname();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const ws = useRef<WebSocket | null>(null);

    const fetchData = async () => {
        try {
            const [wsList, channelsList, userProfile] = await Promise.all([
                api.getWorkspaces(),
                api.getChannels(currentWorkspaceId),
                api.getMe()
            ]);

            setWorkspaces(wsList as Workspace[]);
            setChannels(channelsList as Channel[]);
            setCurrentUser(userProfile as User);

            const current = (wsList as Workspace[]).find(w => w.id === currentWorkspaceId);
            if (current) setCurrentWorkspace(current);
        } catch (error) {
            console.error("Failed to fetch sidebar data", error);
        }
    };

    useEffect(() => {
        if (currentWorkspaceId) {
            fetchData();
        }
    }, [currentWorkspaceId]);

    // Notification Logic
    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data = await api.getNotifications();
                setNotifications(data);
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }
        };
        fetchNotifs();

        try {
            const url = api.getWebSocketUrl("notifications");
            ws.current = new WebSocket(url);

            ws.current.onopen = () => {
                console.log("Notification WS Connected");
            };

            ws.current.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === 'notification') {
                        setNotifications(prev => [payload.data, ...prev]);
                    }
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            ws.current.onerror = (e) => console.error("Notification WS Error", e);

        } catch (e) {
            console.error("Error setting up Notification WS", e);
        }

        return () => {
            ws.current?.close();
        };
    }, []);

    const handleMarkRead = async (id: string) => {
        try {
            await api.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) { console.error(e); }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleWorkspaceChange = (workspaceId: string) => {
        router.push(`/client/${workspaceId}`);
    };

    const handleLogout = () => {
        api.logout();
    };

    return {
        workspaces,
        currentWorkspace,
        channels,
        currentUser,
        notifications,
        unreadCount,
        handleWorkspaceChange,
        handleLogout,
        handleMarkRead,
        fetchData
    };
}

export function Sidebar({ currentWorkspaceId }: { currentWorkspaceId: string }) {
    const {
        workspaces,
        currentWorkspace,
        channels,
        currentUser,
        notifications,
        unreadCount,
        handleWorkspaceChange,
        handleLogout,
        handleMarkRead,
        fetchData
    } = useSidebarLogic(currentWorkspaceId);


    return (
        <div className="w-64 hidden md:flex flex-col h-full border-r border-white/10 select-none text-sm font-outfit bg-black/40 backdrop-blur-xl transition-all duration-300 shadow-[5px_0_30px_rgba(0,0,0,0.5)] z-20">
            <SidebarContent
                currentWorkspaceId={currentWorkspaceId}
                currentWorkspace={currentWorkspace}
                workspaces={workspaces}
                currentUser={currentUser}
                channels={channels}
                notifications={notifications}
                unreadCount={unreadCount}
                handleWorkspaceChange={handleWorkspaceChange}
                handleLogout={handleLogout}
                handleMarkRead={handleMarkRead}
                fetchData={fetchData}
            />
        </div>
    );
}

export function MobileSidebar({ currentWorkspaceId }: { currentWorkspaceId: string }) {
    const {
        workspaces,
        currentWorkspace,
        channels,
        currentUser,
        notifications,
        unreadCount,
        handleWorkspaceChange,
        handleLogout,
        handleMarkRead,
        fetchData
    } = useSidebarLogic(currentWorkspaceId);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <div className="md:hidden mr-2 p-2 rounded-lg hover:bg-white/10 cursor-pointer">
                    <Menu className="w-6 h-6 text-white" />
                </div>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r border-white/10 bg-black/95 w-72 text-white border-none">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SheetDescription className="sr-only">Main Navigation</SheetDescription>
                <SidebarContent
                    currentWorkspaceId={currentWorkspaceId}
                    currentWorkspace={currentWorkspace}
                    workspaces={workspaces}
                    currentUser={currentUser}
                    channels={channels}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    handleWorkspaceChange={handleWorkspaceChange}
                    handleLogout={handleLogout}
                    handleMarkRead={handleMarkRead}
                    fetchData={fetchData}
                />
            </SheetContent>
        </Sheet>
    );
}

// Extracted Content Component for Reusability (Mobile Sheet)
export function SidebarContent({
    currentWorkspaceId,
    currentWorkspace,
    workspaces,
    currentUser,
    channels,
    notifications,
    unreadCount,
    handleWorkspaceChange,
    handleLogout,
    handleMarkRead,
    fetchData
}: {
    currentWorkspaceId: string;
    currentWorkspace: Workspace | null;
    workspaces: Workspace[];
    currentUser: User | null;
    channels: Channel[];
    notifications: Notification[];
    unreadCount: number;
    handleWorkspaceChange: (id: string) => void;
    handleLogout: () => void;
    handleMarkRead: (id: string) => void;
    fetchData: () => Promise<void>;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
    const [isCreateDMOpen, setIsCreateDMOpen] = useState(false);

    // Channel Action States
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [channelToRename, setChannelToRename] = useState<Channel | null>(null);
    const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header / Workspace Switcher */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="h-16 hover:bg-white/5 transition-all duration-300 flex items-center px-4 font-bold text-white w-full border-b border-white/10 outline-none group relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center mr-3 shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
                            <span className="text-sm font-bold">{currentWorkspace?.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="truncate flex-1 text-left tracking-wide text-sm font-semibold group-hover:text-red-400 transition-colors relative z-10 font-outfit">
                            {currentWorkspace?.name || "Loading..."}
                        </span>
                        <ChevronDown className="w-4 h-4 text-neutral-500 group-hover:text-red-400 transition-colors relative z-10" />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="w-64 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] text-white z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden ml-2 p-1"
                        align="start"
                        sideOffset={5}
                    >
                        <DropdownMenu.Label className="text-[10px] font-bold text-neutral-500 px-3 py-2 uppercase tracking-widest bg-white/5 rounded-t-lg mx-[-4px] mt-[-4px] mb-1">
                            Switch Workspace
                        </DropdownMenu.Label>

                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                            {workspaces.map(ws => (
                                <DropdownMenu.Item
                                    key={ws.id}
                                    onSelect={() => handleWorkspaceChange(ws.id)}
                                    className="flex items-center px-3 py-2.5 text-sm rounded-lg hover:bg-white/5 outline-none cursor-pointer overflow-hidden group border border-transparent hover:border-white/5 transition-all relative"
                                >
                                    <div className={cn("w-2 h-8 absolute left-0 top-1/2 -translate-y-1/2 bg-red-500 rounded-r-full transition-transform duration-200", ws.id === currentWorkspaceId ? "translate-x-0" : "-translate-x-full")} />
                                    <span className={cn("truncate flex-1 font-medium transition-colors ml-2", ws.id === currentWorkspaceId ? "text-white" : "text-neutral-400 group-hover:text-neutral-200")}>{ws.name}</span>
                                    {ws.id === currentWorkspaceId && <Check className="w-3.5 h-3.5 ml-2 text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />}
                                </DropdownMenu.Item>
                            ))}
                        </div>

                        <DropdownMenu.Separator className="h-[1px] bg-white/10 my-1 mx-2" />

                        <div className="p-1 space-y-0.5">
                            <DropdownMenu.Item
                                onSelect={() => setIsCreateOpen(true)}
                                className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-white/5 outline-none cursor-pointer text-neutral-400 hover:text-white transition-colors group"
                            >
                                <div className="p-1 rounded bg-white/5 mr-2 group-hover:bg-white/10 transition-colors border border-white/5">
                                    <Plus className="w-3.5 h-3.5" />
                                </div>
                                Create Workspace
                            </DropdownMenu.Item>

                            <JoinWorkspaceDialog />
                        </div>

                        <DropdownMenu.Separator className="h-[1px] bg-white/10 my-1 mx-2" />

                        <div className="p-1">
                            <InviteUserDialog workspaceId={currentWorkspaceId} trigger={
                                <DropdownMenu.Item
                                    onSelect={(e) => e.preventDefault()}
                                    className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-red-500/10 outline-none cursor-pointer text-neutral-400 hover:text-red-400 transition-colors group"
                                >
                                    <div className="p-1 rounded bg-white/5 mr-2 group-hover:bg-red-500/20 transition-colors border border-white/5 group-hover:border-red-500/20">
                                        <UserPlus className="w-3.5 h-3.5" />
                                    </div>
                                    Invite People
                                </DropdownMenu.Item>
                            } />
                        </div>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Channels Section */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 custom-scrollbar scroll-smooth">
                {/* Channel Group */}
                <div>
                    {/* Channels Header with Context Menu */}
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <div className="px-3 mb-2 flex items-center justify-between group cursor-default hover:bg-white/5 rounded-md transition-colors py-1">
                                <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-widest group-hover:text-neutral-300 transition-colors">
                                    Channels
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCreateChannelOpen(true);
                                    }}
                                    className="text-neutral-600 hover:text-white transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100 duration-200"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-[#0a0a0a]/95 backdrop-blur-md border border-white/10 text-neutral-200 rounded-xl shadow-2xl p-1 w-48 animate-in fade-in zoom-in-95 duration-100">
                            <ContextMenuItem
                                className="flex items-center px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white outline-none text-xs font-medium"
                                onSelect={() => setIsCreateChannelOpen(true)}
                            >
                                <Plus className="w-3.5 h-3.5 mr-2 text-neutral-400" />
                                Create Channel
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>

                    {/* Channel List */}
                    <div className="space-y-[2px]">
                        {channels
                            .filter(c => c.type !== 'dm') // Filter out DMs
                            .map((channel, idx) => {
                                const isActive = pathname?.includes(`/${channel.id}`);
                                const hasUnread = !isActive && idx % 3 === 0;

                                return (
                                    <ContextMenu key={channel.id}>
                                        <ContextMenuTrigger asChild>
                                            <Link
                                                href={`/client/${currentWorkspaceId}/${channel.id}`}
                                                className={cn(
                                                    "flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative overflow-hidden",
                                                    isActive
                                                        ? "bg-gradient-to-r from-red-600/10 to-transparent text-red-50"
                                                        : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                                                )}
                                            >
                                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-red-500 rounded-r-full shadow-[0_0_8px_#ef4444]" />}

                                                {channel.type === 'voice' ? (
                                                    <Volume2 className={cn("w-4 h-4 mr-3 transition-colors shrink-0", isActive ? "text-red-500" : "opacity-40 group-hover:opacity-70")} />
                                                ) : (
                                                    <Hash className={cn("w-4 h-4 mr-3 transition-colors shrink-0", isActive ? "text-red-500" : "opacity-40 group-hover:opacity-70")} />
                                                )}
                                                <span className={cn("truncate font-medium text-[14px]", isActive ? "text-white font-semibold" : hasUnread ? "text-neutral-200 font-medium" : "")}>
                                                    {channel.name}
                                                </span>

                                                {hasUnread && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white group-hover:bg-red-400 transition-colors shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                                                )}

                                                {/* Hover Glow Effect */}
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            </Link>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent className="bg-[#0a0a0a]/95 backdrop-blur-md border border-white/10 text-neutral-200 rounded-xl shadow-2xl p-1 w-48 animate-in fade-in zoom-in-95 duration-100">
                                            <ContextMenuItem
                                                className="flex items-center px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white outline-none text-xs font-medium"
                                                onSelect={() => {
                                                    setChannelToRename(channel);
                                                    setIsRenameDialogOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-3.5 h-3.5 mr-2 text-neutral-400" />
                                                Edit Channel
                                            </ContextMenuItem>
                                            <ContextMenuItem
                                                className="flex items-center px-2 py-2 rounded-lg hover:bg-red-500/10 text-red-500 hover:text-red-400 cursor-pointer focus:bg-red-500/10 focus:text-red-400 outline-none mt-0.5 text-xs font-medium border border-transparent focus:border-red-500/20"
                                                onSelect={() => {
                                                    setChannelToDelete(channel);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                Delete Channel
                                            </ContextMenuItem>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                )
                            })}
                    </div>
                </div>

                {/* Direct Messages Group */}
                <div>
                    <div className="px-3 mb-2 flex items-center justify-between group cursor-default hover:bg-white/5 rounded-md transition-colors py-1">
                        <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-widest group-hover:text-neutral-300 transition-colors">
                            Direct Messages
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateDMOpen(true);
                            }}
                            className="text-neutral-600 hover:text-white transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100 duration-200"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="space-y-[2px]">
                        {channels
                            .filter(c => c.type === 'dm')
                            .map((channel, idx) => {
                                const isActive = pathname?.includes(`/${channel.id}`);
                                let displayName = channel.name;
                                let statusColor = "bg-neutral-500";

                                if (channel.type === 'dm' && channel.members && currentUser) {
                                    const otherMember = channel.members.find((m: any) => m.user.id !== currentUser.id);
                                    if (otherMember) {
                                        displayName = otherMember.user.username;
                                        statusColor = "bg-green-500";
                                    } else {
                                        displayName = "Unknown User";
                                    }
                                }

                                return (
                                    <Link
                                        key={channel.id}
                                        href={`/client/${currentWorkspaceId}/${channel.id}`}
                                        className={cn(
                                            "flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative overflow-hidden",
                                            isActive
                                                ? "bg-gradient-to-r from-red-600/10 to-transparent text-red-50"
                                                : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                                        )}
                                    >
                                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-red-500 rounded-r-full shadow-[0_0_8px_#ef4444]" />}

                                        <div className="relative mr-3 shrink-0">
                                            <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] font-bold text-neutral-300">
                                                {displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#0a0a0a]", statusColor)} />
                                        </div>

                                        <span className={cn("truncate font-medium text-[14px]", isActive ? "text-white font-semibold" : "")}>
                                            {displayName}
                                        </span>
                                    </Link>
                                )
                            })}
                    </div>
                </div>
            </div>

            {/* Footer / User Profile & Notifications */}
            <div className="p-3 border-t border-white/10 bg-black/40 backdrop-blur-md flex items-center gap-2">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <div className="flex-1 flex items-center p-2 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer group border border-transparent hover:border-white/5 relative overflow-hidden min-w-0">
                            {/* Gradient glow on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-white/10 mr-3 flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0 relative">
                                {currentUser?.username?.charAt(0).toUpperCase() || "?"}
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#1a1b26] rounded-full shadow-[0_0_4px_#10b981]" />
                            </div>
                            <div className="flex flex-col overflow-hidden relative z-10 min-w-0">
                                <span className="text-xs font-bold text-white truncate group-hover:text-red-300 transition-colors">
                                    {currentUser?.username || "Guest"}
                                </span>
                                <span className="text-[10px] text-neutral-500 truncate group-hover:text-neutral-400">
                                    Online
                                </span>
                            </div>
                        </div>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            className="w-56 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] text-white z-50 animate-in slide-in-from-bottom-2 duration-200 p-1 mb-2 ml-2"
                            side="right"
                            align="end"
                        >
                            <div className="px-3 py-2 border-b border-white/5 mb-1">
                                <p className="text-xs font-bold text-white">{currentUser?.username}</p>
                                <p className="text-[10px] text-neutral-500 truncate">{currentUser?.email}</p>
                            </div>

                            <DropdownMenu.Item className="flex items-center px-2 py-2 text-xs font-medium rounded-lg hover:bg-white/5 outline-none cursor-pointer text-neutral-300 hover:text-white transition-colors">
                                <Settings className="w-3.5 h-3.5 mr-2" />
                                Preferences
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="h-[1px] bg-white/10 my-1" />

                            <DropdownMenu.Item
                                onSelect={handleLogout}
                                className="flex items-center px-2 py-2 text-xs font-medium rounded-lg hover:bg-red-500/10 outline-none cursor-pointer text-red-500 hover:text-red-400 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5 mr-2" />
                                Log Out
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>

                {/* Notifications Bell */}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 text-neutral-400 hover:text-white transition-colors outline-none shrink-0">
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />
                            )}
                        </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            className="w-80 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] text-white z-50 animate-in slide-in-from-bottom-2 duration-200 p-0 mb-2 ml-2 overflow-hidden flex flex-col"
                            side="right"
                            align="end"
                            sideOffset={10}
                        >
                            <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                                <h4 className="font-bold text-sm">Notifications</h4>
                            </div>

                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-neutral-500 text-xs text-neutral-400 italic">
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleMarkRead(notif.id)}
                                            className={cn(
                                                "p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors relative",
                                                !notif.is_read && "bg-red-500/5 hover:bg-red-500/10"
                                            )}
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-1">
                                                    {notif.type === 'mention' ? (
                                                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_blue]" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <p className={cn("text-xs leading-relaxed", !notif.is_read ? "text-white font-medium" : "text-neutral-400")}>
                                                        {notif.content}
                                                    </p>
                                                    <p className="text-[10px] text-neutral-600">
                                                        {new Date(notif.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                                {!notif.is_read && (
                                                    <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>

            <CreateWorkspaceDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onWorkspaceCreated={fetchData}
            />

            <CreateChannelDialog
                open={isCreateChannelOpen}
                onOpenChange={setIsCreateChannelOpen}
                workspaceId={currentWorkspaceId}
                onSuccess={fetchData}
            />

            <CreateDMDialog
                open={isCreateDMOpen}
                onOpenChange={setIsCreateDMOpen}
                workspaceId={currentWorkspaceId}
                onSuccess={fetchData}
            />


            {
                channelToRename && (
                    <RenameChannelDialog
                        open={isRenameDialogOpen}
                        onOpenChange={setIsRenameDialogOpen}
                        channelId={channelToRename.id}
                        currentName={channelToRename.name}
                        onSuccess={fetchData}
                    />
                )
            }

            {
                channelToDelete && (
                    <DeleteChannelDialog
                        open={isDeleteDialogOpen}
                        onOpenChange={setIsDeleteDialogOpen}
                        channelId={channelToDelete.id}
                        channelName={channelToDelete.name}
                        onSuccess={fetchData}
                    />
                )
            }
        </div >
    )
}
