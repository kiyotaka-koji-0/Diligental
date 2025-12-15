"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

interface CreateCategoryDialogProps {
    workspaceId: string;
    onSuccess?: () => void;
    onClose: () => void;
}

export function CreateCategoryDialog({ workspaceId, onSuccess, onClose }: CreateCategoryDialogProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Category name is required");
            return;
        }

        setLoading(true);
        try {
            await api.createCategory(workspaceId, name.trim());
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to create category");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md glass-premium rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Category</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="category-name">Category Name</Label>
                        <Input
                            id="category-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Development, Marketing"
                            className="bg-white/10 dark:bg-white/5 border-white/20"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                    )}

                    <div className="flex gap-3 justify-end pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? "Creating..." : "Create Category"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
