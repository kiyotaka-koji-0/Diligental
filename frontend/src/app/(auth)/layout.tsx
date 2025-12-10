import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col relative text-white selection:bg-red-500/30">
            {/* Header with back button */}
            <header className="fixed top-0 w-full z-50 glass border-b-0 border-[#27272a]/40 bg-black/20 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/">
                        <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <ArrowLeft className="w-5 h-5 text-red-500" />
                            <div className="text-xl font-bold bg-linear-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                                Diligental
                            </div>
                        </div>
                    </Link>
                    <div className="text-xs text-gray-400">Secure Team Communication</div>
                </div>
            </header>

            {/* Main content */}
            <div className="grow flex flex-col items-center justify-center pt-32 pb-20 px-6 relative z-10">
                <div className="w-full max-w-md">
                    {/* Branding */}
                    <div className="text-center mb-8">
                        <p className="text-sm text-gray-400 uppercase tracking-wide">Welcome to</p>
                        <h1 className="text-4xl font-extrabold text-white mt-2 mb-2">
                            Diligental
                        </h1>
                        <p className="text-sm text-gray-400">
                            A secure, open-source team communication platform.
                        </p>
                    </div>
                    
                    {/* Form Container */}
                    <div className="mt-8 space-y-6 glass p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                        {children}
                    </div>
                </div>
            </div>

            {/* Footer Glow */}
            <div className="fixed bottom-0 left-0 right-0 h-96 bg-linear-to-t from-red-900/20 to-transparent pointer-events-none z-0" />
        </div>
    );
}
