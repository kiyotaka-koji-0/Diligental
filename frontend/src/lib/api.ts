const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

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
            const params = new URLSearchParams(data).toString();
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

    const response = await fetch(`${API_URL}${endpoint}`, config);

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
    getMe: () => api.get('/users/me'),

    // Workspaces
    createWorkspace: (name: string) => api.post<Workspace>('/workspaces/', { name }),

    getWorkspaceInvite: (workspaceId: string) => api.get<{ invite_code: string }>(`/workspaces/${workspaceId}/invite`),
    regenerateInviteCode: (workspaceId: string) => api.post<{ invite_code: string }>(`/workspaces/${workspaceId}/invite-code`),

    joinWorkspace: (inviteCode: string) => api.post<Workspace>('/workspaces/join', { invite_code: inviteCode }),

    getWorkspaces: () => api.get('/workspaces/'),
    getWorkspace: (id: string) => api.get(`/workspaces/${id}`),

    // Channels (Updated to be workspace-aware later if needed, but currently ID based)
    // Channels
    getChannels: (workspaceId: string) => baseApiFetch('GET', '/channels/', { workspace_id: workspaceId }),
    createChannel: (workspaceId: string, name: string, description?: string) => api.post('/channels/', { workspace_id: workspaceId, name, description }),
    deleteChannel: (channelId: string) => api.delete(`/channels/${channelId}`),
    updateChannel: (channelId: string, name: string) => baseApiFetch('PATCH', `/channels/${channelId}`, { name }),

    // Messages
    getMessages: (channelId: string) => api.get(`/channels/${channelId}/messages`),

    // WebSocket
    getWebSocketUrl: (channelId: string) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = 'localhost:8001'; // Hardcoded for now, should use env
        const token = localStorage.getItem('token');
        return `${protocol}//${host}/ws/${channelId}/${token}`;
    }
};

export default api;
