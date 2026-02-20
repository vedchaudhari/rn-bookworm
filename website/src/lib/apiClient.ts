import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-bookworm.backend-portfolio-api.online";

class ApiClient {
    private instance: AxiosInstance;
    private authToken: string | null = null;
    private unauthorizedCallback: (() => void) | null = null;

    constructor() {
        this.instance = axios.create({
            baseURL: API_URL,
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request: Attach Bearer token
        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                if (this.authToken) {
                    config.headers.set("Authorization", `Bearer ${this.authToken}`);
                }
                return config;
            },
            (error: AxiosError) => Promise.reject(error)
        );

        // Response: Unwrap data + handle 401 refresh
        this.instance.interceptors.response.use(
            (response: AxiosResponse) => response.data,
            async (error: AxiosError | any) => {
                const originalRequest = error.config;

                // 401: Try token refresh (but not for login itself)
                if (
                    error.response?.status === 401 &&
                    !originalRequest._retry &&
                    !originalRequest.url?.includes("/login")
                ) {
                    originalRequest._retry = true;

                    try {
                        const refreshToken = localStorage.getItem("refresh_token");
                        if (!refreshToken) throw new Error("No refresh token");

                        const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
                        const { accessToken, refreshToken: newRefreshToken } = res.data;

                        localStorage.setItem("refresh_token", newRefreshToken);
                        this.setAuthToken(accessToken);

                        // Update auth store token in memory
                        try {
                            const { useAuthStore } = await import("@/store/authStore");
                            useAuthStore.setState({ token: accessToken });
                        } catch (e) { }

                        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
                        return this.instance(originalRequest);
                    } catch (refreshError) {
                        if (this.unauthorizedCallback) this.unauthorizedCallback();
                        return Promise.reject(new Error("Session expired. Please log in again."));
                    }
                }

                // Extract error message
                if (error.response?.data) {
                    const message =
                        (error.response.data as any).message ||
                        (error.response.data as any).error ||
                        "Unable to complete request.";
                    const enhanced: any = new Error(message);
                    enhanced.status = error.response.status;
                    enhanced.response = error.response;
                    return Promise.reject(enhanced);
                }

                return Promise.reject(error);
            }
        );
    }

    setAuthToken(token: string | null) {
        this.authToken = token;
    }

    registerUnauthorizedCallback(cb: () => void) {
        this.unauthorizedCallback = cb;
    }

    async get<T>(endpoint: string, params: Record<string, any> = {}, options = {}): Promise<T> {
        return this.instance.get<T, T>(endpoint, { ...options, params });
    }

    async post<T>(endpoint: string, body?: any, options = {}): Promise<T> {
        const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
        const config: any = { ...options };
        if (isFormData) {
            config.headers = { ...(config.headers || {}), "Content-Type": "multipart/form-data" };
        }
        return this.instance.post<T, T>(endpoint, body, config);
    }

    async put<T>(endpoint: string, body?: any, options = {}): Promise<T> {
        const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
        const config: any = { ...options };
        if (isFormData) {
            config.headers = { ...(config.headers || {}), "Content-Type": "multipart/form-data" };
        }
        return this.instance.put<T, T>(endpoint, body, config);
    }

    async patch<T>(endpoint: string, body?: any, options = {}): Promise<T> {
        return this.instance.patch<T, T>(endpoint, body, options);
    }

    async delete<T>(endpoint: string, options = {}): Promise<T> {
        return this.instance.delete<T, T>(endpoint, options);
    }
}

export const apiClient = new ApiClient();
export default apiClient;
