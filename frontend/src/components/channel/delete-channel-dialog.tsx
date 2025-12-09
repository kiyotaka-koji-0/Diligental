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
import { api } from "@/lib/api"

interface DeleteChannelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    channelId: string
    channelName: string
    onSuccess?: () => void
}

export function DeleteChannelDialog({
    open,
    onOpenChange,
    channelId,
    channelName,
    onSuccess
}: DeleteChannelDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleDelete = async () => {
        setIsLoading(true)
        setError("")

        try {
            await api.deleteChannel(channelId)
            onOpenChange(false)
            router.refresh()
            onSuccess?.()
        } catch (err: any) {
            setError(err.message || "Failed to delete channel")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Delete Channel</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span className="font-semibold text-foreground">#{channelName}</span>? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                        {error}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading ? "Deleting..." : "Delete Channel"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
