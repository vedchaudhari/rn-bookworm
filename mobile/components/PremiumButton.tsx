import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { BORDER_RADIUS, FONT_SIZE, SPACING } from '../constants/styleConstants';

interface PremiumButtonProps {
    title: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    variant?: 'primary' | 'secondary' | 'ghost';
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
}

const PremiumButton: React.FC<PremiumButtonProps> = ({
    title,
    onPress,
    icon,
    variant = 'primary',
    style,
    textStyle,
    disabled
}) => {

    if (variant === 'primary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                disabled={disabled}
                style={[styles.container, style, disabled && styles.disabled]}
            >
                <LinearGradient
                    colors={COLORS.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    {icon && <Ionicons name={icon} size={20} color={COLORS.white} style={styles.icon} />}
                    <Text style={[styles.textPrimary, textStyle]}>{title}</Text>
                </LinearGradient>
                {/* Glow Effect */}
                <View style={styles.glow} />
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            disabled={disabled}
            style={[
                styles.container,
                variant === 'secondary' ? styles.secondary : styles.ghost,
                style,
                disabled && styles.disabled
            ]}
        >
            {icon && (
                <Ionicons
                    name={icon}
                    size={20}
                    color={variant === 'secondary' ? COLORS.primary : COLORS.textSecondary}
                    style={styles.icon}
                />
            )}
            <Text style={[
                variant === 'secondary' ? styles.textSecondary : styles.textGhost,
                textStyle
            ]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'visible', // For glow
        position: 'relative',
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: BORDER_RADIUS.lg,
        zIndex: 2,
    },
    secondary: {
        backgroundColor: 'rgba(79, 209, 197, 0.15)', // Low opacity primary
        borderWidth: 1,
        borderColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md - 1, // Compensate for border
        paddingHorizontal: SPACING.xl,
    },
    ghost: {
        backgroundColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
    },
    textPrimary: {
        color: COLORS.white,
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    textSecondary: {
        color: COLORS.primary,
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
    },
    textGhost: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZE.md,
        fontWeight: '500',
    },
    icon: {
        marginRight: SPACING.sm,
    },
    disabled: {
        opacity: 0.5,
    },
    glow: {
        position: 'absolute',
        top: 4,
        left: 4,
        right: 4,
        bottom: -4,
        backgroundColor: COLORS.primary,
        opacity: 0.3,
        borderRadius: BORDER_RADIUS.lg,
        zIndex: 1,
        transform: [{ scale: 0.95 }],
    }
});

export default PremiumButton;
