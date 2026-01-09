import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import React, { useState, useEffect } from 'react';
import COLORS from '../constants/colors';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authContext';

export default function FollowButton({ userId, initialFollowing = false, onFollowChange, style = {}, compact = false }) {
    const [following, setFollowing] = useState(initialFollowing);
    const [isLoading, setIsLoading] = useState(false);
    const { toggleFollow, followedUsers, checkFollowStatus } = useSocialStore();
    const { token } = useAuthStore();

    // Unified effect to sync follow status
    useEffect(() => {
        let isMounted = true;

        const syncFollowStatus = async () => {
            // Priority: Trust global store as source of truth
            // This handles the case where a user un-follows someone (removing from store)
            // but the parent component (like Explore) still passes a stale initialFollowing=true.
            const isFollowingInStore = followedUsers.has(userId);

            if (isMounted) {
                setFollowing(isFollowingInStore);
            }

            // Only fetch if we really need to (e.g. if we don't trust our store completeness)
            // But since we hydrate, we trust the store 'false' means 'false'.
            // However, for robustness, if we wanted to double check:
            // if (!isFollowingInStore && initialFollowing === undefined) { ... fetch ... }

            // For now, let's keep it simple and trust the store if it's populated.
            // If the store is empty (new install), and we rely on props?

            // Refined Hybrid:
            // If store has it -> TRUE.
            // If store misses it -> 
            //    If initialFollowing matches store (false) -> FALSE
            //    If initialFollowing conflicts (true) -> 
            //       If we assume store is perfect -> FALSE
            //       If we assume props are fresh -> TRUE

            // To be safe, let's stick to the Store for now as it fixes the immediate bug.
            if (!isFollowingInStore && initialFollowing === undefined) {
                const status = await checkFollowStatus(userId, token);
                if (isMounted) setFollowing(status);
            }
        };

        syncFollowStatus();

        return () => {
            isMounted = false;
        };
    }, [userId, initialFollowing, followedUsers]);

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
            disabled={isLoading}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
                styles.button,
                following ? styles.followingButton : styles.followButton,
                compact && styles.compactButton,
                style,
            ]}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={following ? COLORS.primary : '#fff'} />
            ) : (
                <Text style={[styles.buttonText, following ? styles.followingText : styles.followText]}>
                    {following ? 'Following' : 'Follow'}
                </Text>
            )}
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
