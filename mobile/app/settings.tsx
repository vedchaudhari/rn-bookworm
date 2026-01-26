import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';
import { SPACING, BORDER_RADIUS, FONT_SIZE, TYPOGRAPHY } from '../constants/styleConstants';
import { useAuthStore } from '../store/authContext';
import { useUIStore } from '../store/uiStore';
import { apiClient } from '../lib/apiClient';

export default function SettingsScreen() {
    const router = useRouter();
    const { user, token, logout } = useAuthStore();
    const { showAlert, showToast } = useUIStore();

    // Local State
    const [username, setUsername] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [isUpdating, setIsUpdating] = useState(false);

    // Notifications Settings
    const [pushEnabled, setPushEnabled] = useState(user?.notificationsEnabled !== false);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [readingReminders, setReadingReminders] = useState(true);

    const handlePushToggle = async (value: boolean) => {
        setPushEnabled(value);
        try {
            await apiClient.put('/api/users/profile', { notificationsEnabled: value });
            useAuthStore.setState({ user: { ...user, notificationsEnabled: value } } as any);
        } catch (error) {
            console.error('Failed to update push preference:', error);
        }
    };

    const handleUpdateProfile = async () => {
        if (!username.trim()) {
            showAlert({ title: 'Error', message: 'Username cannot be empty', type: 'error' });
            return;
        }

        setIsUpdating(true);
        try {
            const response = await apiClient.put<any>('/api/users/profile', {
                username: username.trim(),
                bio: bio.trim()
            });

            if (response) {
                useAuthStore.setState({ user: { ...user, ...response } });
                showToast({ title: 'Success', message: 'Profile updated successfully', type: 'success' });
            }
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.message || 'Failed to update profile', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = () => {
        showAlert({
            title: 'Logout',
            message: 'Are you sure you want to log out?',
            showCancel: true,
            confirmText: 'Logout',
            type: 'warning',
            onConfirm: () => {
                logout();
                router.replace('/(auth)');
            }
        });
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={{ width: 40 }} />
        </View>
    );

    const SettingRow = ({ icon, label, value, onToggle, isLast = false }: any) => (
        <View style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]}>
            <View style={styles.settingIconContainer}>
                <Ionicons name={icon} size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.settingLabel}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary + '50' }}
                thumbColor={value ? COLORS.primary : COLORS.textTertiary}
            />
        </View>
    );

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ headerShown: false }} />
            {renderHeader()}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <Text style={styles.sectionTitle}>Account Profile</Text>
                <GlassCard style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Your username"
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell the world about your reading habits..."
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.updateBtn, isUpdating && { opacity: 0.7 }]}
                        onPress={handleUpdateProfile}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                            <Text style={styles.updateBtnText}>Update Profile</Text>
                        )}
                    </TouchableOpacity>
                </GlassCard>

                {/* Notifications Section */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <GlassCard style={styles.card}>
                    <SettingRow
                        icon="notifications-outline"
                        label="Push Notifications"
                        value={pushEnabled}
                        onToggle={handlePushToggle}
                    />
                    <SettingRow
                        icon="mail-outline"
                        label="Email Reports"
                        value={emailEnabled}
                        onToggle={setEmailEnabled}
                    />
                    <SettingRow
                        icon="alarm-outline"
                        label="Reading Reminders"
                        value={readingReminders}
                        onToggle={setReadingReminders}
                        isLast={true}
                    />
                </GlassCard>

                {/* Account Section */}
                <Text style={styles.sectionTitle}>Privacy & Security</Text>
                <GlassCard style={styles.card}>
                    <TouchableOpacity style={styles.actionRow}>
                        <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.actionText}>Change Password</Text>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionRow, { borderBottomWidth: 0 }]}
                        onPress={() => router.push('/privacy-policy')}
                    >
                        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.actionText}>Privacy Policy</Text>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </GlassCard>

                {/* Danger Zone */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Bookworm v1.0.4 Premium</Text>
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        ...TYPOGRAPHY.h4,
        color: COLORS.textPrimary,
    },
    scrollContent: {
        padding: SPACING.xl,
        paddingBottom: 40,
    },
    sectionTitle: {
        ...TYPOGRAPHY.label,
        color: COLORS.textTertiary,
        marginBottom: SPACING.md,
        marginTop: SPACING.xl,
        marginLeft: 4,
    },
    card: {
        padding: SPACING.xl,
        marginBottom: SPACING.lg,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.md,
        padding: 12,
        color: COLORS.textPrimary,
        fontSize: 15,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    updateBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    updateBtnText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '800',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    settingIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    actionText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginLeft: 12,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.error + '10',
        paddingVertical: 16,
        borderRadius: BORDER_RADIUS.xl,
        marginTop: SPACING.xxxl,
        borderWidth: 1,
        borderColor: COLORS.error + '30',
        gap: 8,
    },
    logoutText: {
        color: COLORS.error,
        fontSize: 16,
        fontWeight: '800',
    },
    versionText: {
        textAlign: 'center',
        color: COLORS.textMuted,
        fontSize: 12,
        marginTop: 32,
        fontWeight: '600',
    }
});
