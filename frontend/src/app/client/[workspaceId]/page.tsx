"use client";

import { useEffect, useState } from "react";
import { api, Workspace } from "@/lib/api";
import { Hash, Users, Plus, Settings, Sparkles, MessageSquare, Monitor, Command } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchWorkspace = async () => {
            try {
                const resolvedParams = await params;
                const data = await api.getWorkspace(resolvedParams.workspaceId) as Workspace;
                setWorkspace(data);
            } catch (error) {
                console.error("Failed to fetch workspace:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkspace();
    }, [params]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-transparent text-white/50">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            </div>
        );
    }

    if (!workspace) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-transparent text-white/50">
                <p>Workspace not found.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-transparent text-white overflow-y-auto custom-scrollbar p-8 font-outfit relative">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />

            <div className="max-w-4xl mx-auto w-full space-y-12 animate-fade-in-up">

                {/* Hero Section */}
                <div className="space-y-6 text-center pt-10">
                    <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 shadow-2xl backdrop-blur-sm mb-4 group hover:scale-105 transition-transform duration-500">
                        <Monitor className="w-16 h-16 text-red-500/80 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">{workspace.name}</span>
                        </h1>
                        <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                            Your secure, high-performance workspace for collaboration.
                        </p>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Action 1 */}
                    <div className="group relative p-6 rounded-2xl bg-black/40 border border-white/5 hover:border-red-500/30 hover:bg-black/60 transition-all duration-300 backdrop-blur-md overflow-hidden cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(220,38,38,0.1)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <MessageSquare className="w-24 h-24 text-white" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="p-3 bg-red-500/10 rounded-xl w-fit mb-4">
                                <Plus className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">New Channel</h3>
                            <p className="text-sm text-neutral-400 mb-6 flex-grow">Create a new space for your team to discuss specific topics.</p>
                            <span className="text-xs font-medium text-red-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center">
                                Create Channel <Settings className="w-3 h-3 ml-1" />
                            </span>
                        </div>
                    </div>

                    {/* Action 2 */}
                    <div className="group relative p-6 rounded-2xl bg-black/40 border border-white/5 hover:border-blue-500/30 hover:bg-black/60 transition-all duration-300 backdrop-blur-md overflow-hidden cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="w-24 h-24 text-white" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-4">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Invite Team</h3>
                            <p className="text-sm text-neutral-400 mb-6 flex-grow">Bring your colleagues into the workspace to start collaborating.</p>
                            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center">
                                Copy Invite Link <Sparkles className="w-3 h-3 ml-1" />
                            </span>
                        </div>
                    </div>

                    {/* Action 3 */}
                    <div className="group relative p-6 rounded-2xl bg-black/40 border border-white/5 hover:border-emerald-500/30 hover:bg-black/60 transition-all duration-300 backdrop-blur-md overflow-hidden cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Command className="w-24 h-24 text-white" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="p-3 bg-emerald-500/10 rounded-xl w-fit mb-4">
                                <Command className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Shortcuts</h3>
                            <p className="text-sm text-neutral-400 mb-6 flex-grow">Master Diligental with keyboard shortcuts for rapid navigation.</p>
                            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center">
                                View Shortcuts
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50" />
                    <h2 className="text-2xl font-semibold text-white mb-6">About this Workspace</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-neutral-400 text-sm leading-relaxed">
                        <p>
                            This is your primary hub for communication. Workspaces in <strong className="text-white">Diligental</strong> are isolated environments where teams can focus on their specific projects without distraction.
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-3" />
                                Real-time messaging
                            </li>
                            <li className="flex items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3" />
                                Secure invitation system
                            </li>
                            <li className="flex items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-3" />
                                Channel-based organization
                            </li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
}
