import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useUIStore } from '../store/uiStore';
import COLORS from '../constants/colors';
import STYLE_CONSTANTS from '../constants/styleConstants';
import GlassCard from './GlassCard';

const { width } = Dimensions.get('window');

export default function GlobalAlert() {
    const { alert, hideAlert } = useUIStore();

    if (!alert) return null;

    const getIcon = () => {
        switch (alert.type) {
            case 'success': return { name: 'checkmark-circle', color: COLORS.success };
            case 'error': return { name: 'alert-circle', color: COLORS.error };
            case 'warning': return { name: 'warning', color: COLORS.warning };
            default: return { name: 'information-circle', color: COLORS.primary };
        }
    };

    const icon = getIcon();

    const handleConfirm = () => {
        if (alert.onConfirm) alert.onConfirm();
        hideAlert();
    };

    return (
        <Modal transparent visible={!!alert} animationType="none" onRequestClose={hideAlert}>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={hideAlert} />

                <Animated.View
                    entering={ZoomIn}
                    exiting={ZoomOut}
                    style={styles.container}
                >
                    <GlassCard style={styles.card}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={icon.name as any} size={48} color={icon.color} />
                        </View>

                        <Text style={styles.title}>{alert.title}</Text>
                        <Text style={styles.message}>{alert.message}</Text>

                        <View style={styles.buttonContainer}>
                            {alert.showCancel && (
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={hideAlert}
                                >
                                    <Text style={styles.cancelButtonText}>{alert.cancelText || 'Cancel'}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.button, styles.confirmButton]}
                                onPress={handleConfirm}
                            >
                                <Text style={styles.confirmButtonText}>{alert.confirmText || 'OK'}</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 400,
    },
    card: {
        padding: 24,
        alignItems: 'center',
        borderRadius: STYLE_CONSTANTS.BORDER_RADIUS.xxl,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: STYLE_CONSTANTS.FONT_SIZE.xl,
        fontWeight: STYLE_CONSTANTS.FONT_WEIGHT.bold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: STYLE_CONSTANTS.FONT_SIZE.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        height: 52,
        borderRadius: STYLE_CONSTANTS.BORDER_RADIUS.xl,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    cancelButtonText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        fontSize: 15,
    },
    confirmButtonText: {
        color: COLORS.background,
        fontWeight: '700',
        fontSize: 15,
    },
});
