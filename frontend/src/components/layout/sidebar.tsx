"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { ChevronDown, Hash, Plus, Settings, LogOut, Check, UserPlus } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { RenameChannelDialog } from "@/components/channel/rename-channel-dialog";
import { DeleteChannelDialog } from "@/components/channel/delete-channel-dialog";
import { JoinWorkspaceDialog } from "@/components/workspace/join-workspace-dialog";
import { InviteUserDialog } from "@/components/workspace/invite-user-dialog";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Trash2, Edit2 } from "lucide-react";

interface Workspace {
    id: string;
    name: string;
}

interface Channel {
    id: string;
    name: string;
    workspace_id: string;
}

export function Sidebar({ currentWorkspaceId }: { currentWorkspaceId: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Channel Action States
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [channelToRename, setChannelToRename] = useState<Channel | null>(null);
    const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);

    const fetchData = async () => {
        try {
            const [wsList, channelsList] = await Promise.all([
                api.getWorkspaces(),
                api.getChannels(currentWorkspaceId)
            ]);

            setWorkspaces(wsList as Workspace[]);
            setChannels(channelsList as Channel[]);

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

    const handleWorkspaceChange = (workspaceId: string) => {
        router.push(`/client/${workspaceId}`);
    };

    return (
        <div className="w-60 flex flex-col h-full border-r border-[#27272a] select-none text-sm font-outfit bg-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
            {/* Header / Workspace Switcher */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="h-14 hover:bg-white/5 transition-all duration-300 flex items-center px-4 font-bold text-white w-full border-b border-[#27272a] outline-none group glass-panel rounded-none border-x-0 border-t-0">
                        <span className="truncate flex-1 text-left tracking-wide group-hover:text-red-500 transition-colors">{currentWorkspace?.name || "Loading..."}</span>
                        <ChevronDown className="w-4 h-4 opacity-50 ml-2 group-hover:text-red-500 transition-colors" />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="w-56 bg-[#0a0a0a] border border-[#27272a] rounded-xl shadow-2xl shadow-black/80 text-white z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                        align="start"
                        sideOffset={5}
                    >
                        <DropdownMenu.Label className="text-[10px] font-bold text-neutral-500 px-3 py-2 uppercase tracking-widest">
                            Switch Workspace
                        </DropdownMenu.Label>

                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                            {workspaces.map(ws => (
                                <DropdownMenu.Item
                                    key={ws.id}
                                    onSelect={() => handleWorkspaceChange(ws.id)}
                                    className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-white/5 outline-none cursor-pointer focus:bg-white/5 focus:text-red-400 transition-colors group"
                                >
                                    <span className="truncate flex-1 font-medium">{ws.name}</span>
                                    {ws.id === currentWorkspaceId && <Check className="w-3 h-3 ml-2 text-red-500 animate-pulse" />}
                                </DropdownMenu.Item>
                            ))}
                        </div>

                        <DropdownMenu.Separator className="h-[1px] bg-[#27272a] my-1" />

                        <div className="p-1">
                            <DropdownMenu.Item
                                onSelect={() => setIsCreateOpen(true)}
                                className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-white/5 outline-none cursor-pointer focus:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Workspace
                            </DropdownMenu.Item>

                            <JoinWorkspaceDialog />
                        </div>

                        <DropdownMenu.Separator className="h-[1px] bg-[#27272a] my-1" />

                        <div className="p-1">
                            <InviteUserDialog workspaceId={currentWorkspaceId} trigger={
                                <DropdownMenu.Item
                                    onSelect={(e) => e.preventDefault()}
                                    className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-white/5 outline-none cursor-pointer focus:bg-white/5 text-neutral-400 hover:text-white transition-colors"
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
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                <div className="px-2 mb-3 flex items-center justify-between group">
                    <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-widest group-hover:text-neutral-300 transition-colors">
                        Channels
                    </span>
                    <button className="text-neutral-500 hover:text-red-500 transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100 duration-300">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    {/* Note: Actual add channel functionality needs to be wired up here or below */}
                </div>

                <div className="space-y-0.5">
                    {channels.map(channel => {
                        const isActive = pathname?.includes(`/${channel.id}`);

                        return (
                            <ContextMenu key={channel.id}>
                                <ContextMenuTrigger>
                                    <Link
                                        href={`/client/${currentWorkspaceId}/${channel.id}`}
                                        className={cn(
                                            "flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative overflow-hidden",
                                            isActive
                                                ? "bg-red-500/10 text-red-100 shadow-[0_0_15px_rgba(220,38,38,0.15)] border border-red-500/10"
                                                : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_10px_#ef4444]" />}
                                        <Hash className={cn("w-4 h-4 mr-3 transition-colors", isActive ? "text-red-500" : "opacity-40 group-hover:opacity-70")} />
                                        <span className={cn("truncate font-medium", isActive && "text-red-50")}>{channel.name}</span>
                                    </Link>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="bg-[#0a0a0a] border border-[#27272a] text-neutral-200 rounded-xl shadow-2xl p-1 w-48 animate-in fade-in zoom-in-95 duration-200">
                                    <ContextMenuItem
                                        className="flex items-center px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white outline-none"
                                        onSelect={() => {
                                            setChannelToRename(channel);
                                            setIsRenameDialogOpen(true);
                                        }}
                                    >
                                        <Edit2 className="w-4 h-4 mr-2 text-neutral-400" />
                                        Edit Channel
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        className="flex items-center px-2 py-2 rounded-lg hover:bg-red-950/30 text-red-500 hover:text-red-400 cursor-pointer focus:bg-red-950/30 focus:text-red-400 outline-none mt-1"
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

            <CreateWorkspaceDialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onWorkspaceCreated={fetchData}
            />

            {channelToRename && (
                <RenameChannelDialog
                    open={isRenameDialogOpen}
                    onOpenChange={setIsRenameDialogOpen}
                    channelId={channelToRename.id}
                    currentName={channelToRename.name}
                    onSuccess={fetchData}
                />
            )}

            {channelToDelete && (
                <DeleteChannelDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    channelId={channelToDelete.id}
                    channelName={channelToDelete.name}
                    onSuccess={fetchData}
                />
            )}
        </div>
    )
}
