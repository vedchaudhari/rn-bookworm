// mobile/components/TagBadge.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import {
    SPACING,
    FONT_SIZE,
    BORDER_RADIUS,
    COMPONENT_SIZES,
} from '../constants/styleConstants';

interface TagBadgeProps {
    tag: string;
    onPress?: () => void;
    onRemove?: () => void;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
    size?: 'small' | 'medium' | 'large';
    showRemove?: boolean;
}

/**
 * TagBadge
 * Reusable tag/badge component with customizable colors and sizes
 */
export default function TagBadge({
    tag,
    onPress,
    onRemove,
    variant = 'default',
    size = 'medium',
    showRemove = false,
}: TagBadgeProps) {
    const getColors = () => {
        switch (variant) {
            case 'primary':
                return {
                    background: 'rgba(0, 229, 255, 0.1)',
                    text: COLORS.primary,
                };
            case 'success':
                return {
                    background: 'rgba(0, 200, 100, 0.1)',
                    text: COLORS.success,
                };
            case 'warning':
                return {
                    background: 'rgba(255, 159, 10, 0.1)',
                    text: COLORS.warning,
                };
            case 'error':
                return {
                    background: 'rgba(255, 68, 68, 0.1)',
                    text: COLORS.error,
                };
            default:
                return {
                    background: COLORS.surface,
                    text: COLORS.textSecondary,
                };
        }
    };

    const getSizes = () => {
        switch (size) {
            case 'small':
                return {
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: SPACING.xs / 2,
                    fontSize: FONT_SIZE.xs,
                    iconSize: COMPONENT_SIZES.icon.tiny,
                };
            case 'large':
                return {
                    paddingHorizontal: SPACING.lg,
                    paddingVertical: SPACING.sm,
                    fontSize: FONT_SIZE.md,
                    iconSize: COMPONENT_SIZES.icon.small,
                };
            default:
                return {
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.xs,
                    fontSize: FONT_SIZE.sm,
                    iconSize: COMPONENT_SIZES.icon.tiny,
                };
        }
    };

    const colors = getColors();
    const sizes = getSizes();

    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container
            style={[
                styles.badge,
                {
                    backgroundColor: colors.background,
                    paddingHorizontal: sizes.paddingHorizontal,
                    paddingVertical: sizes.paddingVertical,
                },
            ]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            accessibilityRole={onPress ? 'button' : 'text'}
            accessibilityLabel={`Tag: ${tag}`}
        >
            <Text
                style={[
                    styles.text,
                    {
                        color: colors.text,
                        fontSize: sizes.fontSize,
                    },
                ]}
            >
                #{tag}
            </Text>

            {showRemove && onRemove && (
                <TouchableOpacity
                    onPress={onRemove}
                    style={styles.removeButton}
                    accessibilityLabel={`Remove tag ${tag}`}
                    accessibilityRole="button"
                >
                    <Ionicons name="close-circle" size={sizes.iconSize} color={colors.text} />
                </TouchableOpacity>
            )}
        </Container>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.circular,
        alignSelf: 'flex-start',
    },
    text: {
        fontWeight: '700',
    },
    removeButton: {
        marginLeft: SPACING.xs,
        padding: 2,
    },
});
