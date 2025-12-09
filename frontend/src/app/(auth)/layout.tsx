import React from "react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Diligental
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        A secure, open-source team communication platform.
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
