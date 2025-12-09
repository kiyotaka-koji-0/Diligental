"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRight } from "lucide-react";

export function JoinWorkspaceDialog() {
    const [inviteCode, setInviteCode] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const workspace = await api.joinWorkspace(inviteCode);
            setIsOpen(false);
            setInviteCode("");
            router.push(`/client/${workspace.id}`);
            router.refresh();
        } catch (error) {
            console.error("Failed to join workspace", error);
            alert("Invalid invite code or already a member.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-white/10 flex items-center gap-2 cursor-pointer transition-colors duration-200">
                    <PlusCircle className="w-4 h-4" />
                    Join Workspace
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md glass border-none text-white bg-black/80 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold tracking-tight">Join a Workspace</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleJoin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Enter Invite Code"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                            required
                        />
                        <p className="text-xs text-gray-400">
                            Ask your workspace admin for the invite code.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/10 text-gray-300 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all duration-300"
                        >
                            {isLoading ? "Joining..." : "Join Workspace"}
                            {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
