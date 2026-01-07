import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import React, { useState, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import COLORS from '../constants/colors';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authContext';

export default function FollowButton({ userId, initialFollowing = false, onFollowChange }) {
    const [following, setFollowing] = useState(initialFollowing);
    const [isLoading, setIsLoading] = useState(false);
    const { toggleFollow } = useSocialStore();
    const { token } = useAuthStore();
    const scale = useSharedValue(1);

    useEffect(() => {
        setFollowing(initialFollowing);
    }, [initialFollowing]);

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
        flex: 1,
    },
    button: {
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    followButton: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    followingButton: {
        backgroundColor: COLORS.surfaceHighlight,
        borderColor: COLORS.border,
    },
    buttonText: {
        fontWeight: '700',
        fontSize: 14,
    },
    followText: {
        color: COLORS.white,
    },
    followingText: {
        color: COLORS.textMuted,
    },
});
