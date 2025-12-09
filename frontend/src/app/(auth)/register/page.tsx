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
        setError(null); // Clear previous errors
        try {
            await api.register({
                email: data.email,
                username: data.username,
                password: data.password,
                full_name: data.fullName
            });
            alert("Registration successful! Please login.");
            router.push("/login"); // Redirect to login
        } catch (err) {
            console.error("Registration failed", err);
            setError(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-8 space-y-6 bg-white py-8 px-4 shadow rounded-lg sm:px-10">
            <h2 className="text-center text-xl font-medium text-gray-900">Create an account</h2>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                    {error}
                </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                        Full Name
                    </label>
                    <div className="mt-1">
                        <Input id="fullName" {...register("fullName")} />
                        {errors.fullName && (
                            <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Username
                    </label>
                    <div className="mt-1">
                        <Input id="username" {...register("username")} />
                        {errors.username && (
                            <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                        )}
                    </div>
                </div>

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
                    {isLoading ? "Creating account..." : "Register"}
                </Button>
            </form>

            <div className="text-center text-sm">
                <span className="text-gray-500">Already have an account? </span>
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Sign in
                </Link>
            </div>
        </div>
    );
}
