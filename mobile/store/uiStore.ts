import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

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
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    alert: null,
    showAlert: (options) => set({ alert: options }),
    hideAlert: () => set({ alert: null }),
}));
