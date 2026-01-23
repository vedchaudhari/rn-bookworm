import React, { useEffect, ReactNode } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate
} from 'react-native-reanimated';
import COLORS from '../constants/colors';
import { BORDER_RADIUS, BORDER_WIDTH, SHADOWS } from '../constants/styleConstants';

const { width } = Dimensions.get('window');

interface GlazedViewProps {
    children: ReactNode;
    style?: ViewStyle | ViewStyle[];
    containerStyle?: ViewStyle | ViewStyle[];
}

const GlazedView = ({ children, style, containerStyle }: GlazedViewProps) => {
    const shimmerValue = useSharedValue(0);

    useEffect(() => {
        shimmerValue.value = withRepeat(
            withTiming(1, { duration: 4500 }),
            -1,
            false
        );
    }, []);

    const animatedGlaze = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateX: interpolate(shimmerValue.value, [0, 1], [-width, width * 2])
                },
                { rotate: '30deg' }
            ],
        };
    });

    return (
        <View style={[styles.card, style, containerStyle]}>
            <View style={styles.topHighlight} />
            <View style={styles.leftHighlight} />

            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Animated.View style={[styles.shimmer, animatedGlaze]} />
            </View>

            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xxxl,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.surfaceLight,
        overflow: 'hidden',
        ...SHADOWS.strong,
    },
    topHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        zIndex: 10,
    },
    leftHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        zIndex: 10,
    },
    shimmer: {
        width: 120,
        height: '400%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        position: 'absolute',
        top: '-150%',
    },
});

export default GlazedView;
