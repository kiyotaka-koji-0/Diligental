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
            <main className="flex-1 flex overflow-hidden bg-[#313338]">
                {children}
            </main>
        </div>
    );
}
