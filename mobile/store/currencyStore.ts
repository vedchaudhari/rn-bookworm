import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';
import { INK_DROPS_CONFIG } from '../constants/monetization';

interface Transaction {
    _id: string;
    type: 'purchase' | 'tip' | 'reward';
    amount: number;
    createdAt: string;
    [key: string]: any;
}

interface CurrencyState {
    balance: number;
    transactions: Transaction[];
    isLoading: boolean;
    fetchBalance: (token: string) => Promise<{ success: boolean; balance?: number; error?: string }>;
    fetchTransactions: (token: string) => Promise<{ success: boolean; error?: string }>;
    purchaseInkDrops: (productId: string, token: string) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
    sendTip: (recipientUserId: string, amount: number, token: string) => Promise<{ success: boolean; newBalance?: number; serviceFee?: number; authorReceived?: number; error?: string }>;
    addInkDrops: (amount: number) => void;
    deductInkDrops: (amount: number) => void;
    reset: () => void;
}

// Currency Store for Ink Drops (virtual currency)
export const useCurrencyStore = create<CurrencyState>((set, get) => ({
    // State
    balance: 0,
    transactions: [],
    isLoading: false,

    // Initialize balance from backend
    fetchBalance: async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/currency/balance`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set({ balance: data.balance || 0 });
            return { success: true, balance: data.balance };
        } catch (error: any) {
            console.error('Error fetching balance:', error);
            return { success: false, error: error.message };
        }
    },

    // Fetch transaction history
    fetchTransactions: async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/currency/transactions`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            set({ transactions: data.transactions || [] });
            return { success: true };
        } catch (error: any) {
            console.error('Error fetching transactions:', error);
            return { success: false, error: error.message };
        }
    },

    // Purchase Ink Drops (via IAP)
    purchaseInkDrops: async (productId: string, token: string) => {
        set({ isLoading: true });
        try {
            // Dynamically import IAP module to handle cases where it's not installed
            let InAppPurchases;
            try {
                // InAppPurchases = await import('expo-in-app-purchases');
                throw new Error('In-app purchases module not configured. Install expo-in-app-purchases.');
            } catch (importError) {
                throw new Error('In-app purchases module not available. Install expo-in-app-purchases.');
            }

            // Connect to store
            // await InAppPurchases.connectAsync();

            // Find the pricing tier
            const tier = INK_DROPS_CONFIG.PRICING.find(p => p.id === productId);
            if (!tier) throw new Error('Invalid product ID');

            // Record purchase on backend
            const response = await fetch(`${API_URL}/api/currency/purchase`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    amount: tier!.drops,
                    price: tier!.price,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Update local balance
            set(state => ({ balance: state.balance + tier!.drops }));

            return { success: true, newBalance: data.balance };
        } catch (error: any) {
            console.error('Purchase error:', error);
            return { success: false, error: error.message };
        } finally {
            set({ isLoading: false });
        }
    },

    // Send tip to author
    sendTip: async (recipientUserId: string, amount: number, token: string) => {
        const currentBalance = get().balance;

        // Check sufficient balance
        if (currentBalance < amount) {
            return { success: false, error: 'Insufficient Ink Drops' };
        }

        set({ isLoading: true });
        try {
            const response = await fetch(`${API_URL}/api/currency/tip`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientUserId,
                    amount,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Update local balance
            set(state => ({
                balance: state.balance - amount,
                transactions: [data.transaction, ...state.transactions],
            }));

            return {
                success: true,
                newBalance: data.senderBalance,
                serviceFee: data.serviceFee,
                authorReceived: data.authorReceived,
            };
        } catch (error: any) {
            console.error('Tip error:', error);
            return { success: false, error: error.message };
        } finally {
            set({ isLoading: false });
        }
    },

    // Add Ink Drops (for rewards, admin grants, etc.)
    addInkDrops: (amount: number) => {
        set(state => ({ balance: state.balance + amount }));
    },

    // Deduct Ink Drops (for local operations)
    deductInkDrops: (amount: number) => {
        set(state => ({
            balance: Math.max(0, state.balance - amount),
        }));
    },

    // Reset store
    reset: () => {
        set({
            balance: 0,
            transactions: [],
            isLoading: false,
        });
    },
}));
