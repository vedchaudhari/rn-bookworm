import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useUIStore } from '../store/uiStore';
import COLORS from '../constants/colors';
import STYLE_CONSTANTS from '../constants/styleConstants';
import GlassCard from './GlassCard';

const { width } = Dimensions.get('window');

export default function GlobalAlert() {
    const { alert, hideAlert, isAlertLoading, setAlertLoading } = useUIStore();

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

    const handleConfirm = async () => {
        if (!alert) return;

        if (alert.onConfirm) {
            const result = alert.onConfirm();
            if (result instanceof Promise) {
                setAlertLoading(true);
                try {
                    await result;
                } catch (error) {
                    console.error('Alert confirm error:', error);
                } finally {
                    setAlertLoading(false);
                }
            }
        }
        hideAlert();
    };

    const handleConfirm2 = async () => {
        if (!alert) return;

        if (alert.onConfirm2) {
            const result = alert.onConfirm2();
            if (result instanceof Promise) {
                setAlertLoading(true);
                try {
                    await result;
                } catch (error) {
                    console.error('Alert confirm2 error:', error);
                } finally {
                    setAlertLoading(false);
                }
            }
        }
        hideAlert();
    };

    const handleCancel = () => {
        if (isAlertLoading) return;
        hideAlert();
    };

    return (
        <Modal transparent visible={!!alert} animationType="none" onRequestClose={handleCancel}>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />

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

                        <View style={[
                            styles.buttonContainer,
                            (alert.confirmText2 || (alert.confirmText && alert.confirmText.length > 15)) ? styles.buttonContainerVertical : styles.buttonContainerHorizontal
                        ]}>
                            {alert.showCancel && (
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        !(alert.confirmText2 || (alert.confirmText && alert.confirmText.length > 15)) && styles.buttonFlex,
                                        styles.cancelButton,
                                        isAlertLoading && { opacity: 0.5 }
                                    ]}
                                    onPress={handleCancel}
                                    disabled={isAlertLoading}
                                >
                                    <Text style={styles.cancelButtonText}>{alert.cancelText || 'Cancel'}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    !(alert.confirmText2 || (alert.confirmText && alert.confirmText.length > 15)) && styles.buttonFlex,
                                    styles.confirmButton,
                                    isAlertLoading && { opacity: 0.9 }
                                ]}
                                onPress={handleConfirm}
                                disabled={isAlertLoading}
                            >
                                {isAlertLoading ? (
                                    <ActivityIndicator color={COLORS.background} size="small" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>{alert.confirmText || 'OK'}</Text>
                                )}
                            </TouchableOpacity>

                            {alert.confirmText2 && (
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.confirmButton2,
                                        isAlertLoading && { opacity: 0.9 }
                                    ]}
                                    onPress={handleConfirm2}
                                    disabled={isAlertLoading}
                                >
                                    {isAlertLoading ? (
                                        <ActivityIndicator color={COLORS.error} size="small" />
                                    ) : (
                                        <Text style={styles.confirmButtonText2}>{alert.confirmText2}</Text>
                                    )}
                                </TouchableOpacity>
                            )}
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
        width: '100%',
    },
    buttonContainerHorizontal: {
        flexDirection: 'row',
        gap: 12,
    },
    buttonContainerVertical: {
        flexDirection: 'column-reverse',
        gap: 12,
    },
    button: {
        minHeight: 52,
        borderRadius: STYLE_CONSTANTS.BORDER_RADIUS.xl,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        width: '100%',
    },
    buttonFlex: {
        flex: 1,
        width: 'auto',
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmButton2: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderWidth: 1,
        borderColor: COLORS.error,
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
    confirmButtonText2: {
        color: COLORS.error,
        fontWeight: '700',
        fontSize: 15,
    },
});
