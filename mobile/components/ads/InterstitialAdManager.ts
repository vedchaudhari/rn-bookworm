import { Platform } from 'react-native';
import Constants from 'expo-constants';
// import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { ADMOB_CONFIG, AD_FREQUENCY } from '../../constants/monetization';

/**
 * Interstitial Ad Manager (Singleton)
 * Manages interstitial ads shown between chapters
 * Implements frequency capping to avoid annoying users
 */
class InterstitialAdManager {
    private ad: any = null;
    private isLoaded: boolean = false;
    private lastShownTime: number | null = null;
    private chapterViewCount: number = 0;

    constructor() {
        // Initialization moved to lazy or guarded
    }

    private initialize(): void {
        // Skip if in Expo Go - native module will never be there
        if (Constants.appOwnership === 'expo') {
            this.ad = null;
            return;
        }

        try {
            const { InterstitialAd, AdEventType, TestIds } = require('react-native-google-mobile-ads');
            const adUnitId = __DEV__
                ? TestIds.INTERSTITIAL
                : Platform.OS === 'android'
                    ? ADMOB_CONFIG.INTERSTITIAL.android
                    : ADMOB_CONFIG.INTERSTITIAL.ios;

            this.ad = InterstitialAd.createForAdRequest(adUnitId, {
                requestNonPersonalizedAdsOnly: false,
            });

            // Pre-load the ad
            this.ad.addAdEventListener(AdEventType.LOADED, () => {
                this.isLoaded = true;
                console.log('Interstitial ad loaded');
            });

            this.ad.addAdEventListener(AdEventType.ERROR, (error: Error) => {
                this.isLoaded = false;
                console.error('Interstitial ad error:', error);
            });

            this.ad.addAdEventListener(AdEventType.CLOSED, () => {
                this.isLoaded = false;
                // Pre-load the next ad
                this.ad?.load();
            });

            // Initial load
            this.ad.load();
        } catch (error) {
            this.ad = null;
        }
    }

    /**
     * Check if enough time has passed since last ad
     */
    private canShowAd(): boolean {
        if (!this.lastShownTime) return true;

        const timeSinceLastAd = Date.now() - this.lastShownTime;
        return timeSinceLastAd >= AD_FREQUENCY.MINIMUM_TIME_BETWEEN_ADS_MS;
    }

    /**
     * Increment chapter view count
     * Show ad if threshold reached and time constraint met
     * 
     * @param isPro - Is user a Pro subscriber
     * @returns true if ad was shown
     */
    async onChapterView(isPro: boolean = false): Promise<boolean> {
        // Don't show ads to Pro users
        if (isPro) return false;

        this.chapterViewCount++;

        // Check if we should show an ad based on frequency
        const shouldShowAd =
            this.chapterViewCount >= AD_FREQUENCY.CHAPTERS_BETWEEN_ADS &&
            this.canShowAd();

        if (shouldShowAd) {
            // Lazy initialization if not already done
            if (!this.ad && Constants.appOwnership !== 'expo') {
                this.initialize();
            }

            if (this.isLoaded && this.ad) {
                try {
                    await this.ad.show();
                    this.chapterViewCount = 0; // Reset counter
                    this.lastShownTime = Date.now();
                    return true;
                } catch (error) {
                    console.error('Error showing interstitial ad:', error);
                    return false;
                }
            }
        }

        return false;
    }

    /**
     * Reset the chapter count (e.g., when switching books)
     */
    reset(): void {
        this.chapterViewCount = 0;
    }
}

// Export singleton instance
export default new InterstitialAdManager();
