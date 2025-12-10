"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Mail, Lock, AlertCircle } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(1, { message: "Password is required" }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginValues) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.login({
                username: data.email,
                password: data.password
            }) as { access_token: string; refresh_token: string };

            localStorage.setItem("token", result.access_token);
            localStorage.setItem("refreshToken", result.refresh_token);
            localStorage.setItem("tokenTimestamp", Date.now().toString());
            
            router.push("/client");
        } catch (err) {
            console.error("Login failed", err);
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">Sign In</h2>
                <p className="text-sm text-gray-400 mt-1">Access your account and start collaborating</p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-200 text-sm rounded-xl flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                        Email Address
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            {...register("email")}
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 hover:bg-white/10 hover:border-white/20 transition-colors"
                        />
                    </div>
                    {errors.email && (
                        <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                        Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            {...register("password")}
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 hover:bg-white/10 hover:border-white/20 transition-colors"
                        />
                    </div>
                    {errors.password && (
                        <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 transition-all duration-200 disabled:opacity-50"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in...
                        </div>
                    ) : (
                        "Sign In"
                    )}
                </Button>
            </form>

            <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400 text-center">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-red-400 hover:text-red-300 font-medium transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </>
    );
}
