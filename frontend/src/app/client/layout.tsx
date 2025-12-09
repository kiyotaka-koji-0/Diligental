export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#1a1b26]">
            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {children}
            </main>
        </div>
    );
}
