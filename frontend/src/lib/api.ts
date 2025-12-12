/* eslint-disable @typescript-eslint/no-explicit-any */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";

// This is a placeholder for a more robust API client (e.g., using ky, axios, or a custom fetch wrapper)
// For the purpose of this edit, we'll assume 'api' is an instance of such a client
// that has 'get' and 'post' methods, and can handle headers and body serialization.
// In a real application, you would define or import this 'api' client.
// For now, we'll create a basic mock/wrapper based on the original apiFetch.

interface FetchOptions extends RequestInit {
    token?: string;
    bodySerializer?: (body: any) => string;
}

export interface Workspace {
    id: string;
    name: string;
    owner_id: string;
    invite_code?: string;
}

// Add these missing interfaces if they aren't imported elsewhere, or just keep them minimal as needed
export interface User {
    id: string;
    email: string;
    username: string;
    avatar_url?: string;
}

export interface Channel {
    id: string;
    workspace_id: string;
    name: string;
    description?: string;
    type?: 'public' | 'private' | 'dm' | 'voice';
    members?: { user: User }[];
}

export interface Reaction {
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
    user?: User;
}

export interface Attachment {
    id: string;
    filename: string;
    file_path: string;
    file_type: string;
}

export interface MentionedUser {
    id: string;
    username: string;
}

export interface Message {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user?: User;         // The backend explicitly sends 'user' object in schema
    sender?: User;       // Fallback
    sender_id?: string;  // Fallback
    role?: string;       // Fallback
    parent_id?: string;
    reply_count?: number; // For thread indicators
    reactions?: Reaction[];
    attachments?: Attachment[];
    mentioned_users?: MentionedUser[];  // Users mentioned in this message
}

export type Notification = {
    id: string;
    content: string;
    type: string; // 'mention', 'reply', 'system'
    is_read: boolean;
    created_at: string;
    related_id?: string;
}

async function baseApiFetch<T>(method: string, endpoint: string, data?: any, options: FetchOptions = {}): Promise<T> {
    const { token: providedToken, headers, bodySerializer, ...rest } = options;

    let token = providedToken;
    if (!token && typeof window !== 'undefined') {
        token = localStorage.getItem('token') || undefined;
    }

    const config: RequestInit = {
        method: method.toUpperCase(),
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    };

    if (data) {
        if (config.method === 'GET' || config.method === 'HEAD') {
            const cleanData = Object.fromEntries(
                Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
            );
            const params = new URLSearchParams(cleanData as any).toString();
            endpoint = `${endpoint}?${params}`;
        } else {
            if (bodySerializer) {
                config.body = bodySerializer(data);
            } else if (config.headers && (config.headers as any)['Content-Type'] === 'application/x-www-form-urlencoded') {
                const searchParams = new URLSearchParams();
                for (const key in data) {
                    searchParams.append(key, data[key]);
                }
                config.body = searchParams.toString();
            } else {
                config.body = JSON.stringify(data);
            }
        }
    }

    let response = await fetch(`${API_URL}${endpoint}`, config);

    if (response.status === 401 && endpoint !== '/auth/refresh') {
        // Try to refresh token
        if (typeof window !== 'undefined') {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refresh_token: refreshToken }),
                    });

                    if (refreshResponse.ok) {
                        const newTokens = await refreshResponse.json();
                        localStorage.setItem('token', newTokens.access_token);
                        localStorage.setItem('refreshToken', newTokens.refresh_token);
                        localStorage.setItem('tokenTimestamp', Date.now().toString());

                        // Retry original request with new token
                        const newConfig = { ...config };
                        (newConfig.headers as any)['Authorization'] = `Bearer ${newTokens.access_token}`;
                        response = await fetch(`${API_URL}${endpoint}`, newConfig);
                    } else {
                        throw new Error("Refresh failed");
                    }
                } catch (err) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                        window.location.href = '/login';
                    }
                    throw new Error("Session expired. Please login again.");
                }
            } else {
                localStorage.removeItem('token');
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login';
                }
                throw new Error("Session expired. Please login again.");
            }
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "An error occurred" }));
        throw new Error(error.detail || response.statusText);
    }

    return response.json();
}

export const api = {
    get: <T>(endpoint: string, options?: FetchOptions) => baseApiFetch<T>('GET', endpoint, undefined, options),
    post: <T>(endpoint: string, data?: any, options?: FetchOptions) => baseApiFetch<T>('POST', endpoint, data, options),
    put: <T>(endpoint: string, data?: any, options?: FetchOptions) => baseApiFetch<T>('PUT', endpoint, data, options),
    delete: <T>(endpoint: string, options?: FetchOptions) => baseApiFetch<T>('DELETE', endpoint, undefined, options),

    // Helper to get headers with token
    getAuthHeaders: (token?: string) => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Auth
    login: (data: any) => api.post('/auth/token', data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, bodySerializer: (body) => {
            const searchParams = new URLSearchParams();
            for (const key in body) {
                searchParams.append(key, body[key]);
            }
            return searchParams.toString();
        }
    }),
    register: (data: any) => api.post('/auth/register', data),
    getMe: () => api.get<User>('/users/me'),

    // Workspaces
    createWorkspace: (name: string) => api.post<Workspace>('/workspaces/', { name }),
    getWorkspaceInvite: (workspaceId: string) => api.get<{ invite_code: string }>(`/workspaces/${workspaceId}/invite`),
    regenerateInviteCode: (workspaceId: string) => api.post<{ invite_code: string }>(`/workspaces/${workspaceId}/invite-code`),

    joinWorkspace: (inviteCode: string) => api.post<Workspace>('/workspaces/join', { invite_code: inviteCode }),

    getWorkspaces: () => api.get<Workspace[]>('/workspaces/'),
    getWorkspace: (id: string) => api.get<Workspace>(`/workspaces/${id}`),
    getWorkspaceMembers: (id: string) => api.get<any[]>(`/workspaces/${id}/members`),

    // Channels
    getChannels: (workspaceId: string) => baseApiFetch<Channel[]>('GET', '/channels/', { workspace_id: workspaceId }),
    createChannel: (workspaceId: string, name: string, description?: string, type: 'public' | 'private' | 'voice' = 'public') => api.post<Channel>('/channels/', { workspace_id: workspaceId, name, description, type }),
    createDM: (workspaceId: string, targetUserId: string) => api.post<Channel>('/channels/dm', { workspace_id: workspaceId, target_user_id: targetUserId }),
    deleteChannel: (channelId: string) => baseApiFetch<void>('DELETE', `/channels/${channelId}`, undefined, { headers: {} }).catch(e => { if (e.message !== "Unexpected end of JSON input") throw e; }),
    updateChannel: (channelId: string, name: string) => baseApiFetch<Channel>('PATCH', `/channels/${channelId}`, { name }),
    getChannel: (channelId: string) => api.get<Channel>(`/channels/${channelId}`),

    // Messages
    getMessages: (channelId: string, parentId?: string) => baseApiFetch<Message[]>('GET', `/channels/${channelId}/messages`, { parent_id: parentId }),

    // WebSocket
    getWebSocketUrl: (channelId: string) => {
        let wsRoot;
        if (API_URL) {
            // Derive WS URL from API URL (handles custom ports/domains like Tailscale)
            try {
                const url = new URL(API_URL);
                const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
                wsRoot = `${protocol}//${url.host}`;
            } catch (e) {
                // Fallback if API_URL is invalid
                wsRoot = 'ws://localhost:8005';
            }
        } else {
            // Fallback default
            const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            wsRoot = `${protocol}//${host}:8005`;
        }

        const token = localStorage.getItem('token');
        
        // Handle notification WebSocket differently
        if (channelId === 'notifications') {
            return `${wsRoot}/ws/notifications/${token}`;
        }
        
        return `${wsRoot}/ws/${channelId}/${token}`;
    },

    // Notifications
    getNotifications: () => api.get<Notification[]>('/notifications/'),
    markNotificationRead: (id: string) => api.post<Notification>(`/notifications/${id}/read`),

    // File Upload
    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData
        });
        
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
             throw new Error(errorData.detail || 'Upload failed');
        }
        
        const data = await response.json();
        return {
            id: data.id,
            filename: data.filename,
            file_path: data.file_path,
            file_type: data.file_type
        } as Attachment;
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('tokenTimestamp');
            window.location.href = '/login';
        }
    }
};

export default api;
