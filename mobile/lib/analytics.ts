/**
 * Analytics Helper
 * 
 * Provides a unified interface for tracking analytics events.
 * Can be configured to use Firebase Analytics, Amplitude, or other providers.
 */

type AnalyticsEvent =
    | 'streak_check_in'
    | 'challenge_complete'
    | 'chapter_complete'
    | 'book_complete'
    | 'purchase_inkdrops'
    | 'reward_earned'
    | 'tip_sent'
    | 'book_recommended';

interface EventProperties {
    [key: string]: string | number | boolean;
}

class Analytics {
    private initialized: boolean = false;
    private provider: 'firebase' | 'amplitude' | 'none' = 'none';

    /**
     * Initialize analytics with the selected provider
     */
    async initialize(provider: 'firebase' | 'amplitude' = 'firebase') {
        this.provider = provider;

        try {
            if (provider === 'firebase') {
                // Attempt to dynamically import Firebase Analytics
                // try {
                //     const firebaseAnalytics = await import('@react-native-firebase/analytics');
                //     console.log('[Analytics] Firebase Analytics initialized');
                //     this.initialized = true;
                // } catch (error) {
                //     console.warn('[Analytics] Firebase Analytics not available:', error);
                this.provider = 'none';
                // }
            } else if (provider === 'amplitude') {
                // Future: Amplitude SDK integration
                console.log('[Analytics] Amplitude not yet configured');
                this.provider = 'none';
            }
        } catch (error) {
            console.error('[Analytics] Failed to initialize:', error);
        }
    }

    /**
     * Track an analytics event
     */
    async trackEvent(eventName: AnalyticsEvent, properties?: EventProperties) {
        // Always log to console for development
        console.log(`[Analytics] Event: ${eventName}`, properties);

        if (!this.initialized || this.provider === 'none') {
            return;
        }

        try {
            if (this.provider === 'firebase') {
                // const firebaseAnalytics = await import('@react-native-firebase/analytics');
                // await firebaseAnalytics.default().logEvent(eventName, properties);
                console.log('[Analytics] Firebase logEvent (module not installed):', eventName, properties);
            }
            // Add other providers here as needed
        } catch (error) {
            console.error(`[Analytics] Failed to track event ${eventName}:`, error);
        }
    }

    /**
     * Set user properties
     */
    async setUserProperty(name: string, value: string) {
        if (!this.initialized || this.provider === 'none') {
            return;
        }

        try {
            if (this.provider === 'firebase') {
                // const firebaseAnalytics = await import('@react-native-firebase/analytics');
                // await firebaseAnalytics.default().setUserProperty(name, value);
            }
        } catch (error) {
            console.error(`[Analytics] Failed to set user property ${name}:`, error);
        }
    }

    /**
     * Set user ID for analytics
     */
    async setUserId(userId: string) {
        if (!this.initialized || this.provider === 'none') {
            return;
        }

        try {
            if (this.provider === 'firebase') {
                // const firebaseAnalytics = await import('@react-native-firebase/analytics');
                // await firebaseAnalytics.default().setUserId(userId);
            }
        } catch (error) {
            console.error('[Analytics] Failed to set user ID:', error);
        }
    }
}

// Export singleton instance
export const analytics = new Analytics();

// Initialize on import (will gracefully fail if module not available)
analytics.initialize('firebase').catch(err => {
    console.log('[Analytics] Running without analytics tracking');
});
