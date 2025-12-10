"use client";

import { use } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function WorkspaceLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ workspaceId: string }>;
}) {
    const { workspaceId } = use(params);
    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Sidebar */}
            <Sidebar currentWorkspaceId={workspaceId} />

            {/* Main Content Area */}
            {/* Added flex-col to ensure vertical stacking of children (like ChannelPage) */}
            <main className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
                {children}
            </main>
        </div>
    );
}