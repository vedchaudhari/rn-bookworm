import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { useNotificationStore } from '../store/notificationStore';

interface AppHeaderProps {
    showBack?: boolean;
    showSearch?: boolean;
    rightElement?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({ showBack, showSearch, rightElement }) => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { logout } = useAuthStore();
    const { unreadCount } = useNotificationStore();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>
                {/* Left Side */}
                <View style={styles.leftContainer}>
                    {showBack ? (
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    ) : (showSearch !== false && (
                        <TouchableOpacity onPress={() => router.push('/search' as any)} style={styles.iconButton}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={styles.iconButton}>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        zIndex: 100,
    },
    content: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
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
    logo: {
        width: 120,
        height: 40,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: COLORS.error,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.surface,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: 'bold',
    },
});

export default AppHeader;
