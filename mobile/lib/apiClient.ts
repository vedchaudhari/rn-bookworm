import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { API_URL } from '../constants/api';

export interface RequestOptions extends AxiosRequestConfig {
    params?: Record<string, any>;
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
            (error: AxiosError | any) => {
                if (error.response && error.response.status === 401) {
                    if (this.unauthorizedCallback) {
                        this.unauthorizedCallback();
                    }
                    return Promise.reject(new Error('Unauthorized. Please log in again.'));
                }

                if (error.response && error.response.data) {
                    const message = (error.response.data as any).message || (error.response.data as any).error || 'Request failed';
                    return Promise.reject(new Error(message));
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
