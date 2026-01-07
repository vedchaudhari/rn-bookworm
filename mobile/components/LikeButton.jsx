import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import COLORS from '../constants/colors';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authContext';

export default function LikeButton({ bookId, initialLiked = false, initialCount = 0, size = 24 }) {
    const [liked, setLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialCount);
    const [isLoading, setIsLoading] = useState(false);

    const { toggleLike } = useSocialStore();
    const { token } = useAuthStore();

    const scale = useSharedValue(1);

    useEffect(() => {
        setLiked(initialLiked);
        setLikeCount(initialCount);
    }, [initialLiked, initialCount]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handleLike = async () => {
        if (isLoading) return;

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Animate
        scale.value = withSequence(
            withSpring(1.3, { damping: 2, stiffness: 100 }),
            withSpring(1, { damping: 2, stiffness: 100 })
        );

        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

        setIsLoading(true);
        const result = await toggleLike(bookId, token);
        setIsLoading(false);

        if (!result.success) {
            // Revert on error
            setLiked(!newLiked);
            setLikeCount(prev => newLiked ? Math.max(0, prev - 1) : prev + 1);
        }
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
            {likeCount > 0 && (
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
