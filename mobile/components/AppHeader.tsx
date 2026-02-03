import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { useNotificationStore } from '../store/notificationStore';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../constants/styleConstants';

interface AppHeaderProps {
    showBack?: boolean;
    showSearch?: boolean;
    rightElement?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({ showBack, showSearch, rightElement }) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { unreadCount } = useNotificationStore();

    return (
        <View style={[styles.outerContainer, { paddingTop: insets.top }]}>
            {/* Diamond Rim - Elevated Edge Lighting */}
            <View style={styles.diamondRim} />

            <LinearGradient
                colors={['rgba(25, 227, 209, 0.15)', 'transparent']}
                style={styles.topGlow}
            />

            <View style={styles.content}>
                {/* Left Side */}
                <View style={styles.leftContainer}>
                    {showBack ? (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    ) : (showSearch !== false && (
                        <TouchableOpacity
                            onPress={() => router.push('/search' as any)}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="search" size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Center Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/images/icon.png')}
                        style={styles.logo}
                        contentFit="contain"
                    />
                </View>

                {/* Right Side */}
                <View style={styles.rightContainer}>
                    <View style={styles.rightActions}>
                        <TouchableOpacity
                            onPress={() => router.push('/notifications' as any)}
                            style={styles.iconButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                </View>
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
        backgroundColor: COLORS.surfaceSilk,
        zIndex: 1000,
        ...SHADOWS.godLevel,
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
        gap: SPACING.lg,
    },
    logo: {
        width: 140,
        height: 48,
        // Neon Teal pop
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 12,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.circular,
        backgroundColor: 'rgba(20, 26, 33, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(25, 227, 209, 0.3)', // Neon Teal edge
        // Deep shadow for buttons
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: COLORS.primary,
        borderRadius: 7,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#111',
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
});

export default AppHeader;
