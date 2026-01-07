import { View, StyleSheet } from 'react-native';
import React from 'react';
import COLORS from '../constants/colors';

const GlassCard = ({ children, style, variant = 'default' }) => {
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
        borderRadius: 20,
        borderColor: COLORS.glassBorder,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
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
