"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

interface CreateChannelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    workspaceId: string
    onSuccess?: () => void
}

export function CreateChannelDialog({
    open,
    onOpenChange,
    workspaceId,
    onSuccess
}: CreateChannelDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsLoading(true)
        setError("")

        try {
            await api.createChannel(workspaceId, name, description)

            // Reset form
            setName("")
            setDescription("")

            onOpenChange(false)
            router.refresh()
            onSuccess?.()
        } catch (err: any) {
            setError(err.message || "Failed to create channel")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#0a0a0a] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Create New Channel</DialogTitle>
                    <DialogDescription>
                        Channels are where your team communicates. They're best when organized around a topic — #marketing, for example.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4 py-4">
                    {error && (
                        <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-neutral-300">Channel Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            placeholder="e.g. plan-budget"
                            disabled={isLoading}
                            className="bg-white/5 border-white/10 text-white focus:border-red-500/50"
                        />
                        <p className="text-[10px] text-neutral-500">Names must be lowercase, without spaces or periods.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-neutral-300">Description <span className="text-neutral-500">(Optional)</span></Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this channel about?"
                            disabled={isLoading}
                            className="bg-white/5 border-white/10 text-white focus:border-red-500/50"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="text-neutral-400 hover:text-white hover:bg-white/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isLoading ? "Creating..." : "Create Channel"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
