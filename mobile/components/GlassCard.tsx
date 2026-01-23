import { View, StyleSheet, ViewStyle } from 'react-native';
import React, { ReactNode } from 'react';
import COLORS from '../constants/colors';
import { BORDER_RADIUS, RADIUS, SHADOWS, BORDER_WIDTH } from '../constants/styleConstants';

interface GlassCardProps {
    children: ReactNode;
    style?: ViewStyle | ViewStyle[];
    variant?: 'default' | 'light' | 'flat';
}

const GlassCard = ({ children, style, variant = 'default' }: GlassCardProps) => {
    return (
        <View style={[
            styles.card,
            variant === 'light' && styles.cardLight,
            variant === 'flat' && styles.cardFlat,
            style
        ]}>
            {/* Top Highlight for "Glass" feel */}
            <View style={styles.highlight} />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.card.medium,
        borderColor: COLORS.glassBorder,
        borderWidth: BORDER_WIDTH.thin,
        overflow: 'hidden',
        position: 'relative',
        ...SHADOWS.medium,
    },
    cardLight: {
        backgroundColor: COLORS.surfaceLight,
    },
    cardFlat: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
    },
    highlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 10,
    }
});

export default GlassCard;
