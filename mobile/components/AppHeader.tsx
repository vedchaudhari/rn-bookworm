import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { useNotificationStore } from '../store/notificationStore';
import { useMessageStore } from '../store/messageStore';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS, TYPOGRAPHY } from '../constants/styleConstants';

interface AppHeaderProps {
    showBack?: boolean;
    showSearch?: boolean;
    title?: string;
    rightElement?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({ showBack, showSearch, title, rightElement }) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { unreadCount: notificationUnreadCount } = useNotificationStore();
    const { user } = useAuthStore();

    return (
        <View style={[styles.outerContainer, { paddingTop: insets.top }]}>
            {/* God Level Glass Effect */}
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

            {/* Subtle Gradient Overlay for richness */}
            <LinearGradient
                colors={['rgba(25, 227, 209, 0.05)', 'transparent']}
                style={StyleSheet.absoluteFill}
            />

            {/* Diamond Rim - Elevated Edge Lighting */}
            <View style={styles.diamondRim} />

            <View style={styles.content}>
                {/* Left Side - Logo or Back */}
                <View style={styles.leftContainer}>
                    {showBack ? (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    ) : (
                        <Image
                            source={require('../assets/images/icon.png')}
                            style={styles.logo}
                            contentFit="contain"
                        />
                    )}
                </View>

                {/* Right Side - Actions */}
                <View style={styles.rightContainer}>
                    <View style={styles.rightActions}>
                        {showSearch !== false && (
                            <TouchableOpacity
                                onPress={() => router.push('/search' as any)}
                                style={styles.iconButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="search" size={20} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={() => router.push('/notifications' as any)}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
                            {notificationUnreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/profile')}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            {user?.profileImage ? (
                                <Image
                                    source={{ uri: user.profileImage }}
                                    style={{ width: '100%', height: '100%', borderRadius: BORDER_RADIUS.circular }}
                                    contentFit="cover"
                                />
                            ) : (
                                <Ionicons name="person-circle-outline" size={24} color={COLORS.textPrimary} />
                            )}
                        </TouchableOpacity>
                        {rightElement}
                    </View>
                </View>
            </View>

            {/* Subtle glass rim at the bottom */}
            <View style={styles.bottomBorder} />
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        backgroundColor: 'transparent',
        zIndex: 1000,
        // ...SHADOWS.godLevel, // Removed heavy shadow, transparency handles separation
    },
    diamondRim: {
        height: 1.2,
        backgroundColor: COLORS.diamondRim,
        width: '100%',
        position: 'absolute',
        top: 0,
        zIndex: 1001,
    },
    topGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    content: {
        height: 70,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
    },
    leftContainer: {
        flex: 1,
        alignItems: 'flex-start',
    },
    logoContainer: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    logo: {
        width: 120,
        height: 40,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        // Removed heavy container styling for a cleaner, professional feel
        // We rely on the icon itself. If they need a hit slop, the size handles it.
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: COLORS.primary,
        borderRadius: 6,
        minWidth: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.surfaceSilk, // Match background to create a 'cutout' effect
    },
    badgeText: {
        color: '#000',
        fontSize: 9,
        fontWeight: '900',
    },
    bottomBorder: {
        height: 3,
        backgroundColor: 'rgba(0,0,0,0.85)', // Deep shadow cavity
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.12)', // Subtle chrome highlight
    },
    titleText: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
        fontWeight: '800',
    },
});

export default AppHeader;
