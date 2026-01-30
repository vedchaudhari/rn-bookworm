import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/styleConstants';
import { apiClient } from '../lib/apiClient';
import { useUIStore } from '../store/uiStore';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const { showAlert, showToast } = useUIStore();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert({ title: 'Error', message: 'All fields are required', type: 'error' });
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert({ title: 'Error', message: 'New passwords do not match', type: 'error' });
            return;
        }

        if (newPassword.length < 6) {
            showAlert({ title: 'Error', message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        if (currentPassword === newPassword) {
            showAlert({ title: 'Error', message: 'New password cannot be the same as old password', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await apiClient.put('/api/auth/change-password', {
                currentPassword,
                newPassword
            });

            showToast({ title: 'Success', message: 'Password changed successfully', type: 'success' });
            router.back();
        } catch (error: any) {
            showAlert({
                title: 'Error',
                message: error.message || 'Failed to change password',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Change Password</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <GlassCard style={styles.card}>
                    <Text style={styles.description}>
                        Your password must be at least 6 characters long and should be different from your previous passwords.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current Password</Text>
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                            placeholder="Enter current password"
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            placeholder="Enter new password"
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            placeholder="Confirm new password"
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.submitBtnText}>Update Password</Text>
                        )}
                    </TouchableOpacity>
                </GlassCard>
            </View>
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
    content: {
        padding: SPACING.xl,
        flex: 1,
    },
    card: {
        padding: SPACING.xl,
    },
    description: {
        color: COLORS.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: SPACING.xl,
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
    submitBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    submitBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800',
    },
});
