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
        setError(null); // Keep setError for displaying in the UI
        try {
            const result = await api.login({
                username: data.email, // Check backend auth.py: supports email in username field
                password: data.password
            }) as { access_token: string };

            localStorage.setItem("token", result.access_token);
            router.push("/client"); // Redirect to client root (workspace selection)
        } catch (err) {
            console.error("Login failed", err);
            setError(err instanceof Error ? err.message : "Login failed"); // Use setError for UI display
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 space-y-6 bg-white py-8 px-4 shadow rounded-lg sm:px-10">
            <h2 className="text-center text-xl font-medium text-gray-900">Sign in to your account</h2>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                    {error}
                </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email address
                    </label>
                    <div className="mt-1">
                        <Input id="email" type="email" {...register("email")} />
                        {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <div className="mt-1">
                        <Input id="password" type="password" {...register("password")} />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                    </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in"}
                </Button>
            </form>

            <div className="text-center text-sm">
                <span className="text-gray-500">Don't have an account? </span>
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                    Register
                </Link>
            </div>
        </div>
    );
}
