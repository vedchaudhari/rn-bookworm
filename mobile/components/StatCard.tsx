import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import COLORS from '../constants/colors';
import { FONT_SIZE, SPACING } from '../constants/styleConstants';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    style?: ViewStyle;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, style }) => {
    return (
        <GlassCard style={[styles.container, style] as any}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View>
                <Text style={[styles.value, { color: COLORS.textPrimary }]}>{value}</Text>
                <Text style={styles.label}>{label}</Text>
            </View>
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: SPACING.md,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    value: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        marginBottom: 2,
    },
    label: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: '600',
    }
});

export default StatCard;
