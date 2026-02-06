import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authContext';
import ProgressiveImage from './ProgressiveImage';
import React from 'react';
import { formatMemberSince } from '../lib/utils';
import COLORS from '../constants/colors';
import { SPACING, FONT_SIZE } from '../constants/styleConstants';

export default function ProfileHeader() {
    const { user } = useAuthStore();

    if (!user) return null;

    return (
        <View style={styles.profileHeader}>
            <ProgressiveImage
                source={{ uri: user.profileImage || 'https://via.placeholder.com/150/1a1a2e/00e5ff?text=User' }}
                style={styles.profileImage}
            />

            <View style={styles.profileInfo}>
                <Text style={styles.username}>{user.username || 'User'}</Text>
                <Text style={styles.email}>{user.email || ''}</Text>
                <Text style={styles.memberSince}>Joined {formatMemberSince(user.createdAt)}</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        marginBottom: SPACING.lg,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: SPACING.md,
    },
    profileInfo: {
        flex: 1,
    },
    username: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    email: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    memberSince: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textMuted,
    },
});
