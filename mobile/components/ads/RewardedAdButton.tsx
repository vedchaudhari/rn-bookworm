import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
// import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../constants/colors';
import { ADMOB_CONFIG, AD_FREQUENCY } from '../../constants/monetization';

interface RewardedAdButtonProps {
    bookId: string;
    onUnlocked?: () => void;
}

/**
 * Rewarded Ad Button
 * Allows users to watch a video ad to unlock Premium books for 24 hours
 */
const RewardedAdButton = ({ bookId, onUnlocked }: RewardedAdButtonProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [adLoaded, setAdLoaded] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [rewardedAd, setRewardedAd] = useState<any>(null);

    useEffect(() => {
        checkUnlockStatus();
        initializeAd();
    }, [bookId]);

    useEffect(() => {
        if (isUnlocked && timeRemaining && timeRemaining > 0) {
            const interval = setInterval(() => {
                checkUnlockStatus();
            }, 60000); // Check every minute

            return () => clearInterval(interval);
        }
    }, [isUnlocked, timeRemaining]);

    const initializeAd = () => {
        if (Constants.appOwnership === 'expo') {
            setIsLoading(false);
            return;
        }

        try {
            const { RewardedAd, RewardedAdEventType, TestIds } = require('react-native-google-mobile-ads');
            const adUnitId = __DEV__
                ? TestIds.REWARDED
                : Platform.OS === 'android'
                    ? ADMOB_CONFIG.REWARDED.android
                    : ADMOB_CONFIG.REWARDED.ios;

            const ad = RewardedAd.createForAdRequest(adUnitId, {
                requestNonPersonalizedAdsOnly: false,
            });

            ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
                setAdLoaded(true);
                setIsLoading(false);
            });

            ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
                console.log('User earned reward');
                await unlockBook();
            });

            ad.addAdEventListener(RewardedAdEventType.CLOSED, (error?: Error) => {
                console.error('Rewarded ad error:', error);
                setAdLoaded(false);
                setIsLoading(false);
            });

            ad.load();
            setRewardedAd(ad);
        } catch (error) {
            console.warn('AdMob Rewarded native module not available (Expo Go).');
            setIsLoading(false);
        }
    };

    const checkUnlockStatus = async () => {
        try {
            const unlockData = await AsyncStorage.getItem(`book_unlock_${bookId}`);
            if (unlockData) {
                const { unlockedAt } = JSON.parse(unlockData);
                const unlockTime = new Date(unlockedAt).getTime();
                const now = Date.now();
                const timePassed = now - unlockTime;

                if (timePassed < AD_FREQUENCY.PREMIUM_BOOK_UNLOCK_DURATION_MS) {
                    setIsUnlocked(true);
                    const remaining = AD_FREQUENCY.PREMIUM_BOOK_UNLOCK_DURATION_MS - timePassed;
                    setTimeRemaining(remaining);
                } else {
                    // Unlock expired
                    await AsyncStorage.removeItem(`book_unlock_${bookId}`);
                    setIsUnlocked(false);
                    setTimeRemaining(null);
                }
            } else {
                setIsUnlocked(false);
                setTimeRemaining(null);
            }
        } catch (error) {
            console.error('Error checking unlock status:', error);
        }
    };

    const unlockBook = async () => {
        try {
            const unlockData = {
                bookId,
                unlockedAt: new Date().toISOString(),
            };
            await AsyncStorage.setItem(`book_unlock_${bookId}`, JSON.stringify(unlockData));
            setIsUnlocked(true);
            setTimeRemaining(AD_FREQUENCY.PREMIUM_BOOK_UNLOCK_DURATION_MS);

            if (onUnlocked) onUnlocked();

            Alert.alert(
                '🎉 Book Unlocked!',
                'You can now read this book for the next 24 hours.',
                [{ text: 'Start Reading', style: 'default' }]
            );
        } catch (error) {
            console.error('Error unlocking book:', error);
            Alert.alert('Error', 'Failed to unlock book. Please try again.');
        }
    };

    const handleWatchAd = async () => {
        if (!adLoaded || !rewardedAd) {
            Alert.alert('Ad Not Ready', 'Please wait for the ad to load.');
            return;
        }

        try {
            await rewardedAd.show();
        } catch (error) {
            console.error('Error showing rewarded ad:', error);
            Alert.alert('Error', 'Failed to show ad. Please try again.');
        }
    };

    const getTimeRemainingText = (): string => {
        if (!timeRemaining) return '';
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m remaining`;
    };

    if (isUnlocked) {
        return (
            <View style={styles.unlockedContainer}>
                <Ionicons name="lock-open" size={20} color={COLORS.success} />
                <Text style={styles.unlockedText}>Unlocked • {getTimeRemainingText()}</Text>
            </View>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.button, !adLoaded && styles.buttonDisabled]}
            onPress={handleWatchAd}
            disabled={!adLoaded || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
                <>
                    <Ionicons name="play-circle" size={20} color={COLORS.white} />
                    <Text style={styles.buttonText}>Watch Ad to Unlock (24h)</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    unlockedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceHighlight,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: COLORS.success,
    },
    unlockedText: {
        color: COLORS.success,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default RewardedAdButton;
