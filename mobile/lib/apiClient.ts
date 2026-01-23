// mobile/lib/apiClient.ts
import { API_URL } from '../constants/api';

interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean>;
}

export type UnauthorizedCallback = () => void;

class ApiClient {
    private authToken: string | null = null;
    private unauthorizedCallback: UnauthorizedCallback | null = null;

    /**
     * Set the authorization token to be used for all subsequent requests.
     */
    setAuthToken(token: string | null) {
        this.authToken = token;
        console.log('[ApiClient] Auth token updated');
    }

    /**
     * Register a callback to be executed when a 401 Unauthorized response is received.
     */
    registerUnauthorizedCallback(callback: UnauthorizedCallback) {
        this.unauthorizedCallback = callback;
        console.log('[ApiClient] Unauthorized callback registered');
    }

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
        if (this.authToken && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${this.authToken}`);
        }

        try {
            const response = await fetch(url, {
                ...restOptions,
                headers,
            });

            // 4. Handle common status codes
            if (response.status === 401) {
                console.warn('[ApiClient] 401 Unauthorized detected.');
                if (this.unauthorizedCallback) {
                    this.unauthorizedCallback();
                }
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
