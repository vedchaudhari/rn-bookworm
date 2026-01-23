import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { ADMOB_CONFIG } from '../../constants/monetization';

interface BannerAdComponentProps {
    position?: 'top' | 'bottom';
}

/**
 * Banner Ad Component
 * Shows a banner ad at the top or bottom of the screen
 * Automatically hides for Pro subscribers
 */
const BannerAdComponent = ({ position = 'bottom' }: BannerAdComponentProps) => {
    const { isPro } = useSubscriptionStore();
    const [adLoaded, setAdLoaded] = useState(false);
    const [adError, setAdError] = useState(false);

    // Don't show ads for Pro users
    if (isPro) return null;

    const handleAdLoaded = () => {
        setAdLoaded(true);
        setAdError(false);
    };

    const handleAdFailedToLoad = (error: Error) => {
        console.error('Banner ad failed to load:', error);
        setAdError(true);
        setAdLoaded(false);
    };

    // Safety check for native module availability
    try {
        if (Constants.appOwnership === 'expo') return null;

        const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads');

        // Get the appropriate ad unit ID based on platform
        const getAdUnitId = (): string => {
            if (__DEV__) {
                return TestIds.BANNER;
            }
            return Platform.OS === 'android'
                ? ADMOB_CONFIG.BANNER.android
                : ADMOB_CONFIG.BANNER.ios;
        };

        if (!BannerAd) throw new Error("BannerAd module not found");
        return (
            <View style={[
                styles.container,
                position === 'top' && styles.topPosition,
                position === 'bottom' && styles.bottomPosition,
            ]}>
                <BannerAd
                    unitId={getAdUnitId()}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    requestOptions={{
                        requestNonPersonalizedAdsOnly: false,
                    }}
                    onAdLoaded={handleAdLoaded}
                    onAdFailedToLoad={handleAdFailedToLoad}
                />
            </View>
        );
    } catch (error) {
        // Only log once to avoid spamming
        return null;
    }
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topPosition: {
        marginTop: 0,
    },
    bottomPosition: {
        marginBottom: 0,
    },
});

export default BannerAdComponent;
