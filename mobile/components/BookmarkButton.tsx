import { TouchableOpacity, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import COLORS from '../constants/colors';
import { useBookshelfStore } from '../store/bookshelfStore';
import { useAuthStore } from '../store/authContext';

interface BookmarkButtonProps {
    bookId: string;
    initialBookmarked?: boolean;
    size?: number;
    style?: any;
}

export default function BookmarkButton({
    bookId,
    initialBookmarked = false,
    size = 24,
    style
}: BookmarkButtonProps) {
    const [bookmarked, setBookmarked] = useState(initialBookmarked);
    const [isLoading, setIsLoading] = useState(false);

    const { addBook, items, removeBookByBookId } = useBookshelfStore();
    const { token } = useAuthStore();

    const scale = useSharedValue(1);

    // Sync with initial value if it changes
    useEffect(() => {
        setBookmarked(initialBookmarked);
    }, [initialBookmarked]);

    // Sync with bookshelfStore just in case it was updated elsewhere.
    useEffect(() => {
        const isOnShelf = useBookshelfStore.getState().isBookOnShelf(bookId);
        if (isOnShelf && !bookmarked && !isLoading) {
            setBookmarked(true);
        }
    }, [items, bookId]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handleBookmark = async () => {
        if (isLoading || !token) return;

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Animate
        scale.value = withSequence(
            withSpring(1.2, { damping: 2, stiffness: 100 }),
            withSpring(1, { damping: 2, stiffness: 100 })
        );

        const newBookmarked = !bookmarked;
        setIsLoading(true);

        // Optimistic UI update
        setBookmarked(newBookmarked);

        try {
            if (newBookmarked) {
                // Add to bookshelf (Want to Read)
                await addBook({ bookId, status: 'want_to_read' });
            } else {
                // Remove from bookshelf by Book ID (flexible, doesn't require loaded item)
                await removeBookByBookId(bookId);
            }
        } catch (error) {
            console.error('Bookmark error:', error);
            // Revert on error
            setBookmarked(!newBookmarked);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableOpacity onPress={handleBookmark} style={[styles.container, style]} disabled={isLoading}>
            <Animated.View style={animatedStyle}>
                <Ionicons
                    name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={size}
                    color={bookmarked ? COLORS.primary : COLORS.textTertiary}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 4,
    },
});
