"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    username: string;
    email: string;
}

interface CreateDMDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    onSuccess: () => void;
}

export function CreateDMDialog({ open, onOpenChange, workspaceId, onSuccess }: CreateDMDialogProps) {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        if (open && workspaceId) {
            setLoading(true);
            api.getWorkspaceMembers(workspaceId).then((members) => {
                // Determine if members is array of objects with user property or flat user objects
                // Based on backend, it returns WorkspaceMemberOut which has .user
                const userList = members.map((m: any) => m.user).filter((u: any) => u); // Filter out nulls
                setUsers(userList);
                setLoading(false);
            }).catch(e => {
                console.error(e);
                setLoading(false);
            });
        }
    }, [open, workspaceId]);

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        if (!selectedUser) return;
        try {
            const channel = await api.createDM(workspaceId, selectedUser.id);
            onOpenChange(false);
            onSuccess();
            router.push(`/client/${workspaceId}/${channel.id}`);
        } catch (e) {
            console.error("Failed to create DM", e);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
                <Dialog.Content className="fixed left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-6">
                        <Dialog.Title className="text-xl font-bold text-white">Direct Message</Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="text-neutral-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <input
                                placeholder="Find a user..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500/50 transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                            {loading ? (
                                <div className="text-center text-neutral-500 py-4">Loading users...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center text-neutral-500 py-4">No users found</div>
                            ) : (
                                filteredUsers.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className={cn(
                                            "flex items-center p-3 rounded-lg cursor-pointer transition-colors border border-transparent",
                                            selectedUser?.id === user.id ? "bg-red-500/10 border-red-500/30" : "hover:bg-white/5"
                                        )}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mr-3 text-xs font-bold text-neutral-400">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className={cn("text-sm font-medium", selectedUser?.id === user.id ? "text-red-400" : "text-white")}>{user.username}</p>
                                            <p className="text-xs text-neutral-500">{user.email}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleCreate}
                                disabled={!selectedUser}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Start Chat
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
