import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import React, { useState, useEffect } from 'react';
import COLORS from '../constants/colors';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authContext';

export default function FollowButton({ userId, initialFollowing = false, onFollowChange, style = {}, compact = false }) {
    // We can rely directly on the store's state since it's now optimistic
    const { toggleFollow, followedUsers, checkFollowStatus } = useSocialStore();
    const { token } = useAuthStore();

    // Derived state from store
    const isFollowing = followedUsers.has(userId);

    // Initial sync effect - only if needed or for first load consistency
    useEffect(() => {
        let isMounted = true;
        const syncStatus = async () => {
            if (!followedUsers.has(userId) && initialFollowing === undefined) {
                await checkFollowStatus(userId, token);
            }
        };
        syncStatus();
        return () => { isMounted = false; };
    }, [userId, initialFollowing, token, followedUsers]); // Keep deps to ensure check happens if needed

    const handleFollow = () => {
        // Trigger action - store updates optimistically immediately
        toggleFollow(userId, token).then(result => {
            if (result.success && onFollowChange) {
                onFollowChange(result.following);
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
