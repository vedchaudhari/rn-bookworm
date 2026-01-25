import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
    message: string;
    type?: AlertType | 'message';
    title?: string;
    duration?: number;
}

interface AlertOptions {
    title: string;
    message: string;
    type?: AlertType;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
}

interface UIState {
    alert: AlertOptions | null;
    toast: ToastOptions | null;
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
    showToast: (options: ToastOptions) => void;
    hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    alert: null,
    toast: null,
    showAlert: (options) => set({ alert: options }),
    hideAlert: () => set({ alert: null }),
    showToast: (options) => {
        set({ toast: options });
        // Auto-hide after duration
        setTimeout(() => {
            set({ toast: null });
        }, options.duration || 3000);
    },
    hideToast: () => set({ toast: null }),
}));
