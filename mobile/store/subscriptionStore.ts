import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SubscriptionTier = 'monthly' | 'yearly' | null;

interface SubscriptionState {
    isPro: boolean;
    tier: SubscriptionTier;
    expiryDate: Date | null;
    isLoading: boolean;
    initializeSubscription: () => Promise<void>;
    updateSubscription: (isPro: boolean, tier?: SubscriptionTier, expiryDate?: Date | string | null) => Promise<void>;
    isSubscriptionActive: () => boolean;
    purchaseSubscription: (productId: string) => Promise<{ success: boolean; error?: string }>;
    restorePurchases: () => Promise<{ success: boolean; message?: string; error?: string }>;
    cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
    reset: () => Promise<void>;
}

// Subscription Store for Readsphere Pro
export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
    // Subscription state
    isPro: false,
    tier: null,
    expiryDate: null,
    isLoading: false,

    // Initialize subscription state from storage
    initializeSubscription: async () => {
        try {
            const storedData = await AsyncStorage.getItem('subscription_data');
            if (storedData) {
                const data = JSON.parse(storedData);
                set({
                    isPro: data.isPro || false,
                    tier: data.tier || null,
                    expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
                });
            }
        } catch (error) {
            console.error('Error initializing subscription:', error);
        }
    },

    // Update subscription status
    updateSubscription: async (isPro: boolean, tier: SubscriptionTier = null, expiryDate: Date | string | null = null) => {
        try {
            const subscriptionData = { isPro, tier, expiryDate };
            await AsyncStorage.setItem('subscription_data', JSON.stringify(subscriptionData));
            set({
                isPro,
                tier,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
            });
        } catch (error) {
            console.error('Error updating subscription:', error);
        }
    },

    // Check if subscription is active
    isSubscriptionActive: () => {
        const { isPro, expiryDate } = get();
        if (!isPro) return false;
        if (!expiryDate) return true; // Lifetime subscription
        return new Date() < new Date(expiryDate);
    },

    // Purchase subscription (placeholder - implement with RevenueCat)
    purchaseSubscription: async (productId: string) => {
        set({ isLoading: true });
        try {
            // TODO: Implement RevenueCat purchase flow
            // const offerings = await Purchases.getOfferings();
            // const purchaseResult = await Purchases.purchasePackage(package);

            // For now, simulate purchase (REMOVE IN PRODUCTION)
            console.log('Purchasing subscription:', productId);

            // Simulate successful purchase
            const tier: SubscriptionTier = productId.includes('monthly') ? 'monthly' : 'yearly';
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + (tier === 'monthly' ? 1 : 12));

            await get().updateSubscription(true, tier, expiryDate);

            return { success: true };
        } catch (error: any) {
            console.error('Purchase error:', error);
            return { success: false, error: error.message };
        } finally {
            set({ isLoading: false });
        }
    },

    // Restore purchases
    restorePurchases: async () => {
        set({ isLoading: true });
        try {
            // TODO: Implement RevenueCat restore
            // const customerInfo = await Purchases.restorePurchases();

            console.log('Restoring purchases...');
            return { success: true, message: 'No previous purchases found' };
        } catch (error: any) {
            console.error('Restore error:', error);
            return { success: false, error: error.message };
        } finally {
            set({ isLoading: false });
        }
    },

    // Cancel subscription (revoke locally, actual cancellation happens in store)
    cancelSubscription: async () => {
        try {
            await get().updateSubscription(false, null, null);
            return { success: true };
        } catch (error: any) {
            console.error('Cancel error:', error);
            return { success: false, error: error.message };
        }
    },

    // Reset subscription state
    reset: async () => {
        await AsyncStorage.removeItem('subscription_data');
        set({
            isPro: false,
            tier: null,
            expiryDate: null,
            isLoading: false,
        });
    },
}));
