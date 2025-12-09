"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

interface CreateWorkspaceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onWorkspaceCreated: () => void;
}

export function CreateWorkspaceDialog({ isOpen, onClose, onWorkspaceCreated }: CreateWorkspaceDialogProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            await api.createWorkspace(name);
            onWorkspaceCreated();
            onClose();
            setName("");
        } catch (error) {
            console.error("Failed to create workspace", error);
            alert("Failed to create workspace");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <GlassDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Workspace"
        >
            <div className="space-y-4">
                <div>
                    <label className="text-sm text-white/60 mb-1.5 block">Workspace Name</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="bg-black/50 border-white/10 text-white placeholder:text-white/20"
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                        onClick={handleCreate}
                        disabled={isLoading || !name.trim()}
                    >
                        {isLoading ? "Creating..." : "Create Workspace"}
                    </Button>
                </div>
            </div>
        </GlassDialog>
    );
}
