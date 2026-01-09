import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import React, { useState, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import COLORS from '../constants/colors';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authContext';

export default function FollowButton({ userId, initialFollowing = false, onFollowChange, style = {}, compact = false }) {
    const [following, setFollowing] = useState(initialFollowing);
    const [isLoading, setIsLoading] = useState(false);
    const { toggleFollow, followedUsers, checkFollowStatus } = useSocialStore();
    const { token } = useAuthStore();
    const scale = useSharedValue(1);

    // Check follow status on mount
    useEffect(() => {
        const initFollowStatus = async () => {
            const isFollowingUser = await checkFollowStatus(userId, token);
            setFollowing(isFollowingUser);
        };

        // Only check if not already set from initial prop
        if (!initialFollowing && !followedUsers.has(userId)) {
            initFollowStatus();
        }
    }, [userId]);

    // Sync with initial prop changes
    useEffect(() => {
        setFollowing(initialFollowing);
    }, [initialFollowing]);

    // Sync with global store state
    useEffect(() => {
        const isFollowingInStore = followedUsers.has(userId);
        if (isFollowingInStore !== following) {
            setFollowing(isFollowingInStore);
        }
    }, [followedUsers, userId]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => { scale.value = withSpring(0.95); };
    const handlePressOut = () => { scale.value = withSpring(1); };

    const handleFollow = async () => {
        if (isLoading) return;
        const newFollowing = !following;
        setFollowing(newFollowing);
        setIsLoading(true);
        const result = await toggleFollow(userId, token);
        setIsLoading(false);

        if (result.success) {
            if (onFollowChange) onFollowChange(result.following);
        } else {
            setFollowing(!newFollowing);
        }
    };

    return (
        <TouchableOpacity
            onPress={handleFollow}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isLoading}
            activeOpacity={0.9}
            style={styles.wrapper}
        >
            <Animated.View style={[
                styles.button,
                following ? styles.followingButton : styles.followButton,
                compact && styles.compactButton,
                style,
                animatedStyle
            ]}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={following ? COLORS.primary : '#fff'} />
                ) : (
                    <Text style={[styles.buttonText, following ? styles.followingText : styles.followText]}>
                        {following ? 'Following' : 'Follow'}
                    </Text>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        minWidth: 100, // Ensure minimum width for text
    },
    button: {
        height: 44,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    followButton: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primaryDark,
    },
    followingButton: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.borderLight,
    },
    compactButton: {
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    buttonText: {
        fontWeight: '800',
        fontSize: 14,
        letterSpacing: 0.3,
    },
    followText: {
        color: COLORS.white,
    },
    followingText: {
        color: COLORS.textSecondary,
    },
});
