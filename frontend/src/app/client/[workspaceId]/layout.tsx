"use client";

import { use, useEffect } from "react";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";

export default function WorkspaceLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ workspaceId: string }>;
}) {
    const { workspaceId } = use(params);

    // Auto-save last visited workspace
    useEffect(() => {
        if (workspaceId) {
            localStorage.setItem("lastWorkspaceId", workspaceId);
        }
    }, [workspaceId]);

    return (
        <div className="flex h-full w-full overflow-hidden bg-black text-white font-outfit">
            {/* Desktop Sidebar (Self-hiding on mobile) */}
            <Sidebar currentWorkspaceId={workspaceId} />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden bg-transparent relative w-full">
                {/* Page Content */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
}