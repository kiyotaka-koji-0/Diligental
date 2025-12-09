"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Check } from "lucide-react";

interface InviteUserDialogProps {
    workspaceId: string;
    trigger?: React.ReactNode;
}

export function InviteUserDialog({ workspaceId, trigger }: InviteUserDialogProps) {
    const [inviteCode, setInviteCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [hasCopiedCode, setHasCopiedCode] = useState(false);
    const [hasCopiedLink, setHasCopiedLink] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen && workspaceId) {
            loadInviteCode();
        }
    }, [isOpen, workspaceId]);

    const loadInviteCode = async () => {
        setIsLoading(true);
        try {
            const data = await api.getWorkspaceInvite(workspaceId);
            setInviteCode(data.invite_code);
        } catch (error) {
            console.error("Failed to load invite code", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerate = async () => {
        if (!confirm("Are you sure you want to regenerate the invite code? The old code will stop working.")) {
            return;
        }
        setIsRegenerating(true);
        try {
            const data = await api.regenerateInviteCode(workspaceId);
            setInviteCode(data.invite_code);
            // toast.success("Invite code regenerated!");
        } catch (error) {
            console.error("Failed to regenerate code", error);
            // toast.error("Failed to regenerate code");
        } finally {
            setIsRegenerating(false);
        }
    };

    const copyToClipboard = (text: string, isLink: boolean) => {
        navigator.clipboard.writeText(text);
        if (isLink) {
            setHasCopiedLink(true);
            setTimeout(() => setHasCopiedLink(false), 2000);
        } else {
            setHasCopiedCode(true);
            setTimeout(() => setHasCopiedCode(false), 2000);
        }
    };

    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}` : '';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Invite People</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md glass border-none text-white bg-black/80 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold tracking-tight">Invite People to Workspace</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Invite Link</Label>
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={inviteLink}
                                className="bg-white/5 border-white/10 text-gray-300 focus-visible:ring-red-500/50"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(inviteLink, true)}
                                className="border-white/10 hover:bg-white/10 hover:text-white"
                            >
                                {hasCopiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Invite Code</Label>
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={isLoading ? "Loading..." : inviteCode}
                                className="bg-white/5 border-white/10 text-gray-300 focus-visible:ring-red-500/50 font-mono tracking-widest text-center text-lg"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => copyToClipboard(inviteCode, false)}
                                className="border-white/10 hover:bg-white/10 hover:text-white"
                            >
                                {hasCopiedCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleRegenerate}
                                disabled={isRegenerating || isLoading}
                                className="border-white/10 hover:bg-white/10 hover:text-red-400"
                                title="Regenerate Code"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Anyone with this code or link can join this workspace.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
