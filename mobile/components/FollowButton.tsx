import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import React, { useEffect } from 'react';
import COLORS from '../constants/colors';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authContext';

interface FollowButtonProps {
    userId: string;
    initialFollowing?: boolean;
    onFollowChange?: (following: boolean) => void;
    style?: ViewStyle | ViewStyle[];
    compact?: boolean;
}

export default function FollowButton({ userId, initialFollowing, onFollowChange, style = {}, compact = false }: FollowButtonProps) {
    const { toggleFollow, followedUsers, checkFollowStatus, setFollowStatus } = useSocialStore();
    const { token } = useAuthStore();

    // Derived state from store
    const isFollowing = followedUsers.has(userId);

    // Sync effect: Seed store with initialFollowing or check status if unknown
    useEffect(() => {
        if (!token) return;

        if (initialFollowing !== undefined) {
            setFollowStatus(userId, initialFollowing);
        } else if (!followedUsers.has(userId)) {
            // Only check if we have no record and no initial hint
            checkFollowStatus(userId, token);
        }
    }, [userId, initialFollowing, token, setFollowStatus, checkFollowStatus]);

    const handleFollow = () => {
        if (!token) return;

        toggleFollow(userId, token).then(result => {
            if (result.success && onFollowChange) {
                onFollowChange(result.following || false);
            }
        });
    };

    return (
        <TouchableOpacity
            onPress={handleFollow}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
                styles.button,
                isFollowing ? styles.followingButton : styles.followButton,
                compact && styles.compactButton,
                style,
            ]}
        >
            <Text style={[styles.buttonText, isFollowing ? styles.followingText : styles.followText]}>
                {isFollowing ? 'Following' : 'Follow'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
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
        borderColor: COLORS.glassBorderLight,
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
