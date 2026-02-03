// mobile/components/EmptyState.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { SHADOWS } from '../constants/styleConstants';

interface Props {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onRetry?: () => void;
    retryText?: string;
}

const EmptyState: React.FC<Props> = ({
    icon = 'document-text-outline',
    title,
    subtitle,
    onRetry,
    retryText = 'Try Again'
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.iconCircle}>
                <Ionicons name={icon} size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            {onRetry && (
                <TouchableOpacity style={styles.button} onPress={onRetry}>
                    <Text style={styles.buttonText}>{retryText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 300 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 18,
        ...SHADOWS.aura,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    buttonText: { color: "#000", fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }
});

export default EmptyState;
