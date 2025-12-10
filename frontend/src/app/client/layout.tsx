export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 flex overflow-hidden bg-transparent">
            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {children}
            </main>
        </div>
    );
}
