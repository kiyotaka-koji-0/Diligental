"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    console.log("No token found, redirecting to login");
                    router.push("/login");
                    return;
                }

                // Fetch current user
                console.log("Fetching current user...");
                const currentUser = await api.get<User>("/users/me");
                console.log("Current user:", currentUser);
                
                if (!currentUser) {
                    console.log("No user data returned");
                    router.push("/login");
                    return;
                }

                if (currentUser.role !== "admin") {
                    console.log("User role is not admin:", currentUser.role);
                    // Don't redirect, just show unauthorized
                    setIsAuthorized(false);
                    return;
                }

                console.log("Admin access verified");
                setUser(currentUser);
                setIsAuthorized(true);
            } catch (error) {
                console.error("Failed to verify admin access:", error);
                setIsAuthorized(false);
            }
        };

        checkAdminAccess();
    }, [router]);

    if (isAuthorized === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-6">You do not have permission to access the admin panel.</p>
                    <Link
                        href="/client"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Back to Workspaces
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center">
                        <div className="flex items-center gap-8">
                            <Link href="/admin/users" className="font-bold text-xl text-gray-800 hover:text-gray-600">
                                Diligental Admin
                            </Link>
                            <div className="hidden sm:flex sm:space-x-1">
                                <Link
                                    href="/admin/users"
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                                >
                                    Users
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
                            <Link
                                href="/client"
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                            >
                                Back to App
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
            <div className="py-10">
                <main>
                    <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">{children}</div>
                </main>
            </div>
        </div>
    );
}
