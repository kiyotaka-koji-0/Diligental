export default async function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
    await params; // Ensure it's consumed if needed, or just type it correctly
    return (
        <div className="flex flex-col h-full w-full bg-[#313338] text-white">
            <div className="flex items-center justify-center h-full text-white/50">
                <p>Select a channel to start chatting</p>
            </div>
        </div>
    );
}
