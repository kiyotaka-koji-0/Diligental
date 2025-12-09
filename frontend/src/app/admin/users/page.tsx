"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    email: string;
    username: string;
    full_name: string;
    role: string;
    created_at: string;
    tailnet_ip?: string | null;
}

const createUserSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3),
    password: z.string().min(6),
    fullName: z.string().optional(),
    tailnetIp: z.string().optional(),
    role: z.enum(["user", "admin"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateUserValues>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            role: "user",
        }
    });

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/login");
                return;
            }
            const data = await api.get<User[]>("/users/");
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const onSubmit = async (data: CreateUserValues) => {
        setIsCreating(true);
        try {
            await api.post("/users/", {
                email: data.email,
                username: data.username,
                password: data.password,
                full_name: data.fullName,
                role: data.role,
                tailnet_ip: data.tailnetIp
            });
            reset();
            fetchUsers(); // Refresh the user list
        } catch (error) {
            console.error("Failed to create user", error);
            alert("Failed to create user: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsCreating(false);
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="md:flex md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        User Management
                    </h2>
                </div>
            </div>

            <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
                <h3 className="text-base font-semibold leading-6 text-gray-900">Add New User</h3>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Email</label>
                        <div className="mt-2">
                            <Input {...register("email")} />
                            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Username</label>
                        <div className="mt-2">
                            <Input {...register("username")} />
                            {errors.username && <p className="text-red-500 text-xs">{errors.username.message}</p>}
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                        <div className="mt-2">
                            <Input type="password" {...register("password")} />
                            {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Full Name</label>
                        <div className="mt-2">
                            <Input {...register("fullName")} />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Tailnet IP</label>
                        <div className="mt-2">
                            <Input {...register("tailnetIp")} placeholder="100.x.x.x" />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Role</label>
                        <div className="mt-2">
                            <select {...register("role")} className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <Button type="submit" disabled={isCreating}>
                            {isCreating ? "Adding..." : "Add User"}
                        </Button>
                    </div>
                </form>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Existing Users</h3>
                    <ul role="list" className="divide-y divide-gray-100">
                        {users.map((user) => (
                            <li key={user.id} className="flex justify-between gap-x-6 py-5">
                                <div className="flex min-w-0 gap-x-4">
                                    <div className="min-w-0 flex-auto">
                                        <p className="text-sm font-semibold leading-6 text-gray-900">{user.username}</p>
                                        <p className="mt-1 truncate text-xs leading-5 text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
                                    <p className="text-sm leading-6 text-gray-900 capitalize">{user.role}</p>
                                    {user.tailnet_ip && <p className="mt-1 text-xs leading-5 text-gray-500">IP: {user.tailnet_ip}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
