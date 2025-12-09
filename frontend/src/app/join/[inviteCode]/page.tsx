"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function JoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
    const resolvedParams = use(params);
    const inviteCode = resolvedParams.inviteCode;
    const router = useRouter();

    // State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState<"verifying" | "ready" | "success">("ready");

    const handleJoin = async () => {
        setIsLoading(true);
        setError("");
        try {
            const workspace = await api.joinWorkspace(inviteCode);
            setStatus("success");
            // Add a small delay for the user to see the success state
            setTimeout(() => {
                router.push(`/client/${workspace.id}`);
            }, 1000);
        } catch (err: any) {
            console.error("Join failed", err);
            setError(err.message || "Invalid invite code or unable to join.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md glass-panel p-8 flex flex-col items-center text-center space-y-6 animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                    <ArrowRight className="w-8 h-8 text-red-500" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Join Workspace</h1>
                    <p className="text-gray-400">
                        You've been invited to join a workspace on Diligental.
                    </p>
                </div>

                {error && (
                    <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                        {/* Option to go home if failed */}
                    </div>
                )}

                {status === "success" ? (
                    <div className="flex flex-col items-center gap-2 text-green-400 animate-fade-in-up">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                        <p>Welcome aboard! Redirecting...</p>
                    </div>
                ) : (
                    <Button
                        size="lg"
                        onClick={handleJoin}
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all duration-300 group"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            <>
                                Accept Invitation
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </Button>
                )}

                <div className="pt-4 border-t border-white/5 w-full">
                    <p className="text-xs text-gray-500">
                        By joining, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
}
