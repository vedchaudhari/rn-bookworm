import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../../constants/api";

export interface RequestOptions extends Record<string, any> {
    params?: Record<string, any>;
    signal?: any;
    headers?: any;
}

export type UnauthorizedCallback = () => void;

class ApiClient {
    private instance: AxiosInstance;
    private authToken: string | null = null;
    private unauthorizedCallback: UnauthorizedCallback | null = null;

    constructor() {
        this.instance = axios.create({
            baseURL: API_URL,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                if (this.authToken) {
                    config.headers.set('Authorization', `Bearer ${this.authToken}`);
                }
                return config;
            },
            (error: AxiosError) => Promise.reject(error)
        );

        this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                return response.data;
            },
            async (error: AxiosError | any) => {
                const originalRequest = error.config;

                // Handle 401 Unauthorized (Token Expired)
                // Ignore 401s from login endpoint (Invalid Credentials)
                if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/login')) {
                    originalRequest._retry = true;

                    try {
                        // 1. Retrieve Refresh Token
                        let refreshToken: string | null = null;
                        if (Platform.OS !== 'web' && await SecureStore.isAvailableAsync()) {
                            refreshToken = await SecureStore.getItemAsync("refresh_token", {
                                keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
                            });
                        }

                        if (!refreshToken) {
                            throw new Error("No refresh token available");
                        }

                        // 2. Call Refresh Endpoint (Use axios direct instance to avoid loop)
                        // Note: We use the base URL explicitly handled by axios instance usually, 
                        // but here we need a fresh call.
                        const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });

                        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;

                        // 3. Update Secure Store with New Refresh Token
                        if (Platform.OS !== 'web' && await SecureStore.isAvailableAsync()) {
                            await SecureStore.setItemAsync("refresh_token", newRefreshToken, {
                                keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
                            });
                        }

                        // 4. Update ApiClient State
                        this.setAuthToken(accessToken);

                        // 5. Update Global Auth Store (to reflect new token in UI/State)
                        try {
                            // Dynamic import to avoid circular dependency
                            const { useAuthStore } = require("../../store/authContext");
                            useAuthStore.setState({ token: accessToken });
                        } catch (storeError) {
                            console.warn("[ApiClient] Failed to update auth store:", storeError);
                        }

                        // 6. Retry Original Request with New Token
                        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

                        // Return the result of the retry
                        // We use this.instance to ensure response interceptors run again if needed (e.g. for data unwrapping),
                        // but since we are unwrapping here, we might need to be careful. 
                        // Actually, this.instance will trigger the *response* interceptor again.
                        // Ideally checking if it unwraps data.
                        return this.instance(originalRequest);

                    } catch (refreshError) {
                        console.error("[ApiClient] Token refresh failed:", refreshError);

                        // Refresh failed (Session expired/revoked) -> Logout
                        if (this.unauthorizedCallback) {
                            this.unauthorizedCallback();
                        }
                        return Promise.reject(new Error('Session expired. Please log in again.'));
                    }
                }

                if (error.response && error.response.status === 429) {
                    try {
                        const { useUIStore } = require("../../store/uiStore");
                        useUIStore.getState().showToast({
                            title: 'Too Many Requests',
                            message: 'You are doing that too fast. Please slow down and try again later.',
                            type: 'error',
                            duration: 4000
                        });
                    } catch (e) { console.error('UI Store access failed', e); }
                }

                if (error.response && error.response.data) {
                    const message = (error.response.data as any).message || (error.response.data as any).error || 'Unable to complete your request. Please try again.';
                    // Create enhanced error that preserves status code
                    const enhancedError: any = new Error(message);
                    enhancedError.response = error.response;
                    enhancedError.status = error.response.status;
                    return Promise.reject(enhancedError);
                }

                if (error.request) {
                    if (error.code === 'ECONNABORTED') {
                        return Promise.reject(new Error('Request timed out. Please check your connection.'));
                    }
                    return Promise.reject(new Error('Network error. Please check your connection.'));
                }

                return Promise.reject(error);
            }
        );
    }

    setAuthToken(token: string | null) {
        this.authToken = token;
    }

    registerUnauthorizedCallback(callback: UnauthorizedCallback) {
        this.unauthorizedCallback = callback;
    }

    async get<T>(endpoint: string, params: Record<string, any> = {}, options: RequestOptions = {}): Promise<T> {
        return this.instance.get<T, T>(endpoint, { ...options, params });
    }

    async post<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
        const isFormData = body instanceof FormData;
        const config = { ...options };
        if (isFormData) {
            config.headers = config.headers || {};
            (config.headers as any)['Content-Type'] = 'multipart/form-data';
        }
        return this.instance.post<T, T>(endpoint, body, config);
    }

    async put<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
        const isFormData = body instanceof FormData;
        const config = { ...options };
        if (isFormData) {
            config.headers = config.headers || {};
            (config.headers as any)['Content-Type'] = 'multipart/form-data';
        }
        return this.instance.put<T, T>(endpoint, body, config);
    }

    async patch<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<T> {
        const isFormData = body instanceof FormData;
        const config = { ...options };
        if (isFormData) {
            config.headers = config.headers || {};
            (config.headers as any)['Content-Type'] = 'multipart/form-data';
        }
        return this.instance.patch<T, T>(endpoint, body, config);
    }

    async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        return this.instance.delete<T, T>(endpoint, options);
    }
}

export const apiClient = new ApiClient();
export default apiClient;
