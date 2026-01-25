import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import COLORS from '../constants/colors';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authContext';

interface LikeButtonProps {
    bookId: string;
    initialLiked?: boolean;
    initialCount?: number;
    size?: number;
    showCount?: boolean;
}

export default function LikeButton({
    bookId,
    initialLiked = false,
    initialCount = 0,
    size = 24,
    showCount = true
}: LikeButtonProps) {
    const { toggleLike, syncBookMetrics, bookMetrics } = useSocialStore();
    const { token } = useAuthStore();

    // Subscribe to global metrics for this specific book
    const metrics = bookMetrics[bookId];
    const liked = metrics?.liked ?? initialLiked;
    const likeCount = metrics?.count ?? initialCount;

    const [isLoading, setIsLoading] = useState(false);
    const scale = useSharedValue(1);

    // Register/Sync metrics on mount
    useEffect(() => {
        syncBookMetrics(bookId, initialLiked, initialCount);
    }, [bookId]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handleLike = async () => {
        if (isLoading || !token) return;

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Animate
        scale.value = withSequence(
            withSpring(1.3, { damping: 2, stiffness: 100 }),
            withSpring(1, { damping: 2, stiffness: 100 })
        );

        setIsLoading(true);
        // The store now handles optimistic updates and global sync
        await toggleLike(bookId, token);
        setIsLoading(false);
    };

    return (
        <TouchableOpacity onPress={handleLike} style={styles.container} disabled={isLoading}>
            <Animated.View style={animatedStyle}>
                <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={size}
                    color={liked ? COLORS.error : COLORS.textTertiary}
                />
            </Animated.View>
            {showCount && likeCount > 0 && (
                <Text style={[styles.count, { fontSize: size * 0.6 }]}>{likeCount}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    count: {
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
});
