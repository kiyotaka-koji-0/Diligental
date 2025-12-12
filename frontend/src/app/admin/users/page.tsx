"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Trash2, Edit2, Plus, Users, CheckCircle, AlertCircle } from "lucide-react";

interface User {
    id: string;
    email: string;
    username: string;
    full_name?: string;
    role: string;
    created_at: string;
    tailnet_ip?: string | null;
}

const createUserSchema = z.object({
    email: z.string().email("Invalid email address"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    fullName: z.string().optional(),
    tailnetIp: z.string().optional(),
    role: z.enum(["user", "admin"]),
});

const editUserSchema = z.object({
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    username: z.string().min(3, "Username must be at least 3 characters").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
    fullName: z.string().optional().or(z.literal("")),
    tailnetIp: z.string().optional().or(z.literal("")),
    role: z.enum(["user", "admin"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type EditUserValues = z.infer<typeof editUserSchema>;

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        watch,
    } = useForm<CreateUserValues | EditUserValues>({
        resolver: zodResolver(editingUser ? editUserSchema : createUserSchema),
        defaultValues: {
            role: "user",
        }
    });

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

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
            showNotification('error', 'Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const onSubmit = async (data: CreateUserValues | EditUserValues) => {
        setIsCreating(true);
        try {
            if (editingUser) {
                // Update existing user - only send fields that were actually changed
                const payload: any = {
                    role: data.role,
                };

                // Only include fields if they are provided (not empty strings)
                if (data.email && data.email.trim()) {
                    payload.email = data.email;
                }
                if (data.username && data.username.trim()) {
                    payload.username = data.username;
                }
                if (data.password && data.password.trim()) {
                    payload.password = data.password;
                }
                if (data.fullName && data.fullName.trim()) {
                    payload.full_name = data.fullName;
                }
                if (data.tailnetIp && data.tailnetIp.trim()) {
                    payload.tailnet_ip = data.tailnetIp;
                }

                await api.put(`/users/${editingUser.id}`, payload);
                showNotification('success', 'User updated successfully');
            } else {
                // Create new user - require email, username, and password
                if (!data.email || !data.email.trim()) {
                    throw new Error("Email is required");
                }
                if (!data.username || !data.username.trim()) {
                    throw new Error("Username is required");
                }
                if (!data.password || !data.password.trim()) {
                    throw new Error("Password is required for new users");
                }

                const payload: any = {
                    email: data.email,
                    username: data.username,
                    password: data.password,
                    full_name: data.fullName || data.username,
                    role: data.role,
                };

                if (data.tailnetIp) {
                    payload.tailnet_ip = data.tailnetIp;
                }

                await api.post("/users/", payload);
                showNotification('success', 'User created successfully');
            }

            reset();
            setIsDialogOpen(false);
            setEditingUser(null);
            await fetchUsers();
        } catch (error) {
            console.error("Failed to save user", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            showNotification('error', `Failed to save user: ${message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (userId: string) => {
        try {
            await api.delete(`/users/${userId}`);
            showNotification('success', 'User deleted successfully');
            setDeleteConfirm(null);
            await fetchUsers();
        } catch (error) {
            console.error("Failed to delete user", error);
            showNotification('error', 'Failed to delete user');
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsDialogOpen(true);
    };

    const handleOpenNewUser = () => {
        setEditingUser(null);
        reset({
            email: "",
            username: "",
            password: "",
            fullName: "",
            tailnetIp: "",
            role: "user",
        });
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg z-50 ${
                    notification.type === 'success' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {notification.message}
                    </span>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                                <p className="text-gray-600 mt-1">Manage system users and permissions</p>
                            </div>
                        </div>
                        <Button 
                            onClick={handleOpenNewUser}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            Add User
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total Users</p>
                                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                            </div>
                            <Users className="w-12 h-12 text-blue-100" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Admins</p>
                                <p className="text-3xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
                            </div>
                            <Users className="w-12 h-12 text-purple-100" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Regular Users</p>
                                <p className="text-3xl font-bold text-gray-900">{users.filter(u => u.role === 'user').length}</p>
                            </div>
                            <Users className="w-12 h-12 text-green-100" />
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">IP Address</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No users found. Create one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <p className="font-medium text-gray-900">{user.username}</p>
                                                    <p className="text-sm text-gray-600">{user.full_name || "N/A"}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    user.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {user.tailnet_ip || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                {deleteConfirm === user.id ? (
                                                    <div className="inline-flex gap-2">
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="text-red-600 hover:text-red-700 font-medium"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="text-gray-600 hover:text-gray-700"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirm(user.id)}
                                                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add/Edit User Dialog */}
                {isDialogOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    {editingUser ? 'Edit User' : 'Add New User'}
                                </h2>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email {editingUser && <span className="text-gray-500">(optional)</span>}
                                            </label>
                                            <Input 
                                                type="email"
                                                {...register("email")} 
                                                className="w-full"
                                                placeholder={editingUser ? "Leave empty to keep current" : ""}
                                            />
                                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Username {editingUser && <span className="text-gray-500">(optional)</span>}
                                            </label>
                                            <Input 
                                                {...register("username")} 
                                                className="w-full"
                                                placeholder={editingUser ? "Leave empty to keep current" : ""}
                                            />
                                            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Password {editingUser && <span className="text-gray-500">(optional)</span>}
                                            </label>
                                            <Input 
                                                type="password"
                                                {...register("password")} 
                                                className="w-full"
                                                placeholder={editingUser ? "Leave empty to keep current" : ""}
                                            />
                                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                            <Input 
                                                {...register("fullName")} 
                                                className="w-full"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tailnet IP</label>
                                            <Input 
                                                {...register("tailnetIp")} 
                                                placeholder="100.x.x.x"
                                                className="w-full"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                            <select 
                                                {...register("role")} 
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 ring-offset-0 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-6">
                                        <Button 
                                            type="submit" 
                                            disabled={isCreating}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {isCreating ? "Saving..." : editingUser ? "Update User" : "Create User"}
                                        </Button>
                                        <Button 
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsDialogOpen(false);
                                                setEditingUser(null);
                                                reset();
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
