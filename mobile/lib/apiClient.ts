// mobile/lib/apiClient.ts
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authContext';
import { Alert } from 'react-native';

interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean>;
}

class ApiClient {
    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { params, headers: customHeaders, ...restOptions } = options;

        // 1. Build URL with query params
        let url = `${API_URL}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const query = searchParams.toString();
            if (query) url += `?${query}`;
        }

        // 2. Prepare headers
        const headers = new Headers(customHeaders);
        if (!headers.has('Content-Type') && !(restOptions.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }

        // 3. Inject Auth Token
        const token = useAuthStore.getState().token;
        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        try {
            const response = await fetch(url, {
                ...restOptions,
                headers,
            });

            // 4. Handle common status codes
            if (response.status === 401) {
                // Unauthorized: Global logout if token expired
                console.warn('[ApiClient] 401 Unauthorized detected. Logging out...');
                useAuthStore.getState().logout();
                throw new Error('Unauthorized. Please log in again.');
            }

            const data = await response.json();

            if (!response.ok) {
                const message = data.message || data.error || 'Request failed';
                throw new Error(message);
            }

            return data as T;
        } catch (error: any) {
            console.error(`[ApiClient Error] ${options.method || 'GET'} ${endpoint}:`, error.message);
            throw error;
        }
    }

    async get<T>(endpoint: string, params?: Record<string, string | number | boolean>, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET', params });
    }

    async post<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    async put<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    async patch<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: body instanceof FormData ? body : JSON.stringify(body),
        });
    }

    async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
export default apiClient;
