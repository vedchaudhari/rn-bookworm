import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/colors';

export interface ChatTheme {
    backgroundColor: string;
    myBubbleColor: string;
    theirBubbleColor: string;
    myTextColor: string;
    theirTextColor: string;
    auraColor: string;
}

const DEFAULT_THEME: ChatTheme = {
    backgroundColor: COLORS.background,
    myBubbleColor: COLORS.primary,
    theirBubbleColor: COLORS.surfaceSilk,
    myTextColor: '#FFFFFF',
    theirTextColor: '#FFFFFF',
    auraColor: COLORS.primary,
};

interface ChatThemeState {
    themes: { [userId: string]: ChatTheme };
    setTheme: (userId: string, theme: Partial<ChatTheme>) => void;
    resetTheme: (userId: string) => void;
    getTheme: (userId: string) => ChatTheme;
}

export const useChatThemeStore = create<ChatThemeState>()(
    persist(
        (set, get) => ({
            themes: {},
            setTheme: (userId, theme) => set((state) => ({
                themes: {
                    ...state.themes,
                    [userId]: { ...(state.themes[userId] || DEFAULT_THEME), ...theme }
                }
            })),
            resetTheme: (userId) => set((state) => {
                const newThemes = { ...state.themes };
                delete newThemes[userId];
                return { themes: newThemes };
            }),
            getTheme: (userId) => get().themes[userId] || DEFAULT_THEME,
        }),
        {
            name: 'chat-theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
