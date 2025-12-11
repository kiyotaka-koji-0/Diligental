"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { ChevronDown, Hash, Plus, Settings, LogOut, Check, UserPlus, MoreVertical, Bell, Edit2, Trash2, Volume2, Moon, Sun } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import api, { Notification } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/theme-context";
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

            ws.current.onerror = (e: Event) => {
                const wsEvent = e as any;
                console.error("Notification WS Error - Code:", wsEvent.code || 'unknown', "Reason:", wsEvent.reason || 'No reason provided');
            };

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
        <div className="w-64 hidden md:flex flex-col h-full border-r border-white/10 select-none text-sm font-outfit glass-bg-1 glass-shadow-lg z-20">
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
                    <Menu className="w-6 h-6 text-white dark:text-gray-100" />
                </div>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r border-white/10 dark:border-white/5 glass-bg-1 w-72 text-white border-none">
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
                    <button className="h-14 hover:bg-white/10 dark:hover:bg-white/5 transition-colors flex items-center px-4 font-bold text-white w-full border-b border-white/10 dark:border-white/5 outline-none shrink-0">
                        <span className="truncate flex-1 text-left text-lg font-semibold">
                            {currentWorkspace?.name || "Loading..."}
                        </span>
                        <ChevronDown className="w-5 h-5 text-white/70" />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="w-72 bg-white dark:bg-[#2b2d31] rounded-lg shadow-xl text-gray-900 dark:text-gray-100 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden p-2 border border-gray-200 dark:border-gray-700"
                        align="start"
                        sideOffset={5}
                    >
                        <DropdownMenu.Label className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2 uppercase">
                            Workspaces
                        </DropdownMenu.Label>

                        <div className="max-h-64 overflow-y-auto">
                            {workspaces.map(ws => (
                                <DropdownMenu.Item
                                    key={ws.id}
                                    onSelect={() => handleWorkspaceChange(ws.id)}
                                    className="flex items-center px-4 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 outline-none cursor-pointer"
                                >
                                    <span className={cn("truncate flex-1 font-medium", ws.id === currentWorkspaceId ? "text-gray-900 dark:text-white font-semibold" : "text-gray-700 dark:text-gray-300")}>{ws.name}</span>
                                    {ws.id === currentWorkspaceId && <Check className="w-4 h-4 ml-2 text-green-600 dark:text-green-500" />}
                                </DropdownMenu.Item>
                            ))}
                        </div>

                        <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

                        <div className="space-y-1">
                            <DropdownMenu.Item
                                onSelect={() => setIsCreateOpen(true)}
                                className="flex items-center px-4 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 outline-none cursor-pointer text-gray-700 dark:text-gray-300"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Workspace
                            </DropdownMenu.Item>

                            <JoinWorkspaceDialog />
                        </div>

                        <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

                        <div>
                            <InviteUserDialog workspaceId={currentWorkspaceId} trigger={
                                <DropdownMenu.Item
                                    onSelect={(e) => e.preventDefault()}
                                    className="flex items-center px-4 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 outline-none cursor-pointer text-gray-700 dark:text-gray-300"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Invite People
                                </DropdownMenu.Item>
                            } />
                        </div>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Channels Section */}
            <div className="flex-1 overflow-y-auto py-4 px-3">
                {/* Channel Group */}
                <div>
                    {/* Channels Header with Context Menu */}
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <div className="px-2 mb-1 flex items-center justify-between group cursor-default hover:bg-white/10 dark:hover:bg-white/5 rounded transition-colors py-1">
                                <span className="text-white/70 dark:text-gray-400 font-semibold text-sm">
                                    Channels
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCreateChannelOpen(true);
                                    }}
                                    className="text-white/50 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-white dark:bg-[#2b2d31] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-1 w-48">
                            <ContextMenuItem
                                className="flex items-center px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none text-sm"
                                onSelect={() => setIsCreateChannelOpen(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Channel
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>

                    {/* Channel List */}
                    <div className="space-y-0.5">
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
                                                    "flex items-center px-2 py-1 rounded transition-colors group",
                                                    isActive
                                                        ? "bg-[#1164a3] dark:bg-[#404249] text-white"
                                                        : "text-white/70 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/5"
                                                )}
                                            >
                                                {channel.type === 'voice' ? (
                                                    <Volume2 className="w-4 h-4 mr-2" />
                                                ) : (
                                                    <Hash className="w-4 h-4 mr-2" />
                                                )}
                                                <span className={cn("truncate font-normal text-[15px]", isActive && "font-semibold")}>
                                                    {channel.name}
                                                </span>

                                                {hasUnread && (
                                                    <div className="ml-auto w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </Link>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent className="bg-white dark:bg-[#2b2d31] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-1 w-48">
                                            <ContextMenuItem
                                                className="flex items-center px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none text-sm"
                                                onSelect={() => {
                                                    setChannelToRename(channel);
                                                    setIsRenameDialogOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-4 h-4 mr-2" />
                                                Edit Channel
                                            </ContextMenuItem>
                                            <ContextMenuItem
                                                className="flex items-center px-3 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 cursor-pointer outline-none text-sm"
                                                onSelect={() => {
                                                    setChannelToDelete(channel);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete Channel
                                            </ContextMenuItem>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                )
                            })}
                    </div>
                </div>

                {/* Direct Messages Group */}
                <div className="mt-6">
                    <div className="px-2 mb-1 flex items-center justify-between group cursor-default hover:bg-white/10 dark:hover:bg-white/5 rounded transition-colors py-1">
                        <span className="text-white/70 dark:text-gray-400 font-semibold text-sm">
                            Direct Messages
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateDMOpen(true);
                            }}
                            className="text-white/50 dark:text-gray-500 hover:text-white dark:hover:text-gray-300 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-0.5">
                        {channels
                            .filter(c => c.type === 'dm')
                            .map((channel, idx) => {
                                const isActive = pathname?.includes(`/${channel.id}`);
                                let displayName = channel.name;
                                let statusColor = "bg-gray-400";

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
                                            "flex items-center px-2 py-1 rounded transition-colors group",
                                            isActive
                                                ? "bg-[#1164a3] dark:bg-[#404249] text-white"
                                                : "text-white/70 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/5"
                                        )}
                                    >
                                        <div className="relative mr-2 shrink-0">
                                            <div className="w-6 h-6 rounded bg-gray-600 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-white">
                                                {displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#3f0e40] dark:border-[#2b2d31]", statusColor)} />
                                        </div>

                                        <span className={cn("truncate font-normal text-[15px]", isActive && "font-semibold")}>
                                            {displayName}
                                        </span>
                                    </Link>
                                )
                            })}
                    </div>
                </div>
            </div>

            {/* Footer / User Profile & Notifications */}
            <div className="p-3 border-t border-white/10 dark:border-white/5 flex items-center gap-2">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <div className="flex-1 flex items-center p-2 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-colors cursor-pointer min-w-0">
                            <div className="w-8 h-8 rounded bg-gray-600 dark:bg-gray-700 mr-2 flex items-center justify-center text-sm font-semibold text-white shrink-0 relative">
                                {currentUser?.username?.charAt(0).toUpperCase() || "?"}
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#3f0e40] dark:border-[#2b2d31] rounded-full" />
                            </div>
                            <div className="flex flex-col overflow-hidden min-w-0">
                                <span className="text-sm font-semibold text-white truncate">
                                    {currentUser?.username || "Guest"}
                                </span>
                            </div>
                        </div>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            className="w-56 bg-white dark:bg-[#2b2d31] rounded-lg shadow-xl text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 z-50 p-2 mb-2"
                            side="right"
                            align="end"
                        >
                            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                                <p className="text-sm font-semibold">{currentUser?.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser?.email}</p>
                            </div>

                            <DropdownMenu.Item className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 outline-none cursor-pointer">
                                <Settings className="w-4 h-4 mr-2" />
                                Preferences
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

                            <DropdownMenu.Item
                                onSelect={handleLogout}
                                className="flex items-center px-3 py-2 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900/20 outline-none cursor-pointer text-red-600 dark:text-red-400"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Log Out
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications Bell */}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className="relative w-9 h-9 flex items-center justify-center rounded hover:bg-white/10 dark:hover:bg-white/5 text-white transition-colors outline-none shrink-0">
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            )}
                        </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            className="w-80 bg-white dark:bg-[#2b2d31] rounded-lg shadow-xl text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 z-50 p-0 mb-2 overflow-hidden flex flex-col"
                            side="right"
                            align="end"
                            sideOffset={10}
                        >
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <h4 className="font-semibold text-sm">Notifications</h4>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-gray-400">
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleMarkRead(notif.id)}
                                            className={cn(
                                                "p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors",
                                                !notif.is_read && "bg-blue-50 dark:bg-blue-900/20"
                                            )}
                                        >
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <p className={cn("text-sm", !notif.is_read ? "font-medium" : "text-gray-600 dark:text-gray-400")}>
                                                        {notif.content}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(notif.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                                {!notif.is_read && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />
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

// Theme Toggle Component
function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    
    return (
        <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded hover:bg-white/10 dark:hover:bg-white/5 text-white transition-colors outline-none shrink-0"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? (
                <Moon className="w-5 h-5" />
            ) : (
                <Sun className="w-5 h-5" />
            )}
        </button>
    );
}
