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
import { User, Mail, Lock, AlertCircle } from "lucide-react";

const registerSchema = z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterValues>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterValues) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await api.register({
                email: data.email,
                username: data.username,
                password: data.password,
                full_name: data.fullName
            }) as { access_token: string; refresh_token: string };

            // Auto-login after successful registration
            localStorage.setItem("token", result.access_token);
            localStorage.setItem("refreshToken", result.refresh_token);
            localStorage.setItem("tokenTimestamp", Date.now().toString());
            
            router.push("/client");
        } catch (err) {
            console.error("Registration failed", err);
            setError(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">Create Account</h2>
                <p className="text-sm text-gray-400 mt-1">Join your team and start collaborating</p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-200 text-sm rounded-xl flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                        Full Name
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                        <Input
                            id="fullName"
                            placeholder="John Doe"
                            {...register("fullName")}
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 hover:bg-white/10 hover:border-white/20 transition-colors"
                        />
                    </div>
                    {errors.fullName && (
                        <p className="mt-2 text-sm text-red-400">{errors.fullName.message}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                        Username
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                        <Input
                            id="username"
                            placeholder="johndoe"
                            {...register("username")}
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 hover:bg-white/10 hover:border-white/20 transition-colors"
                        />
                    </div>
                    {errors.username && (
                        <p className="mt-2 text-sm text-red-400">{errors.username.message}</p>
                    )}
                </div>

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
                            Creating account...
                        </div>
                    ) : (
                        "Create Account"
                    )}
                </Button>
            </form>

            <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400 text-center">
                    Already have an account?{" "}
                    <Link href="/login" className="text-red-400 hover:text-red-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </>
    );
}
