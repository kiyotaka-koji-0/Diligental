export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 flex overflow-hidden bg-black text-white">
            {/* Gradient Background Elements */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
            <div className="absolute bottom-20 left-20 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {children}
            </main>
        </div>
    );
}
