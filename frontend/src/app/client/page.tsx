"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function ClientPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkWorkspaces = async () => {
            try {
                // We need to implement getWorkspaces in api client if it returns strict types, 
                // but for now relying on it returning 'any' or 'Workspace[]'
                const workspaces: any = await api.getWorkspaces();

                if (workspaces && workspaces.length > 0) {
                    // Redirect to the first workspace
                    // Use a hard redirect or replace to avoid back button issues? Push is fine.
                    router.push(`/client/${workspaces[0].id}`);
                } else {
                    // User has no workspaces? This shouldn't happen for new users,
                    // but could handle manually or prompt creation.
                    // For now, let's stop loading so the "Welcome" screen shows (or a "Create" button)
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to fetch workspaces", error);
                setLoading(false);
            }
        };

        checkWorkspaces();
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full text-white/50">
                <p>Loading workspaces...</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full w-full text-white/50">
            <div className="text-center">
                <h2 className="text-xl font-medium text-white mb-2">No Workspace Found</h2>
                <p>Please contact an administrator or create a new workspace.</p>
                {/* 
                  TODO: Add Create Workspace Button here if appropriate 
                  Actually, if we have the dialog, we could trigger it. 
                */}
            </div>
        </div>
    )
}
