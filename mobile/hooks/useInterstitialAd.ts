import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { AD_FREQUENCY, ADMOB_CONFIG } from '../constants/monetization';
import { useSubscriptionStore } from '../store/subscriptionStore';

// Note: In a real app, you'd use 'react-native-google-mobile-ads'
// This is a simulation hook since we are in a managed environment
export const useInterstitialAd = () => {
    const { isPro } = useSubscriptionStore();
    const [chaptersReadSinceLastAd, setChaptersReadSinceLastAd] = useState(0);
    const [lastAdTimestamp, setLastAdTimestamp] = useState(0);

    const showAdIfEligible = async () => {
        if (isPro) return false;

        const now = Date.now();
        const timeSinceLastAd = now - lastAdTimestamp;

        const enoughChapters = chaptersReadSinceLastAd >= AD_FREQUENCY.CHAPTERS_BETWEEN_ADS;
        const enoughTime = timeSinceLastAd >= AD_FREQUENCY.MINIMUM_TIME_BETWEEN_ADS_MS;

        if (enoughChapters && enoughTime) {
            console.log('Showing Interstitial Ad...');

            // Simulation of ad showing
            const success = await simulateAd();

            if (success) {
                setChaptersReadSinceLastAd(0);
                setLastAdTimestamp(Date.now());
                return true;
            }
        } else {
            setChaptersReadSinceLastAd(prev => prev + 1);
        }

        return false;
    };

    const simulateAd = (): Promise<boolean> => {
        return new Promise((resolve) => {
            // In development, we just log it. 
            // In a real production build, you'd call AdManager.show()
            console.log('--- AD PLAYING ---');
            setTimeout(() => {
                console.log('--- AD FINISHED ---');
                resolve(true);
            }, 2000);
        });
    };

    return { showAdIfEligible };
};
