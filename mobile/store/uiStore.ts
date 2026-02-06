import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
    message: string;
    type?: AlertType | 'message';
    title?: string;
    duration?: number;
    relatedScreen?: string;
    relatedChatId?: string;
}

interface AlertOptions {
    title: string;
    message: string;
    type?: AlertType;
    onConfirm?: () => void | Promise<void>;
    confirmText?: string;
    onConfirm2?: () => void | Promise<void>;
    confirmText2?: string;
    cancelText?: string;
    showCancel?: boolean;
    loading?: boolean;
}

interface UIState {
    alert: AlertOptions | null;
    toast: ToastOptions | null;
    isAlertLoading: boolean;
    activeScreen: string | null;
    activeChatId: string | null;
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
    setAlertLoading: (loading: boolean) => void;
    setActiveScreen: (screen: string | null) => void;
    setActiveChatId: (chatId: string | null) => void;
    showToast: (options: ToastOptions) => void;
    hideToast: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
    alert: null,
    toast: null,
    isAlertLoading: false,
    activeScreen: null,
    activeChatId: null,
    showAlert: (options) => set({ alert: options, isAlertLoading: false }),
    hideAlert: () => set({ alert: null, isAlertLoading: false }),
    setAlertLoading: (loading) => set({ isAlertLoading: loading }),
    setActiveScreen: (screen) => set({ activeScreen: screen }),
    setActiveChatId: (chatId) => set({ activeChatId: chatId }),
    showToast: (options) => {
        const { activeScreen, activeChatId } = get();
        const { relatedScreen, relatedChatId } = options;

        // Suppress toast ONLY if user is on same screen AND same chat (if chat-related)
        if (
            relatedScreen &&
            relatedScreen === activeScreen &&
            (!relatedChatId || relatedChatId === activeChatId)
        ) {

            return;
        }

        // Otherwise show toast normally
        set({ toast: options });
        // Auto-hide after duration
        setTimeout(() => {
            set({ toast: null });
        }, options.duration || 3000);
    },
    hideToast: () => set({ toast: null }),
}));
