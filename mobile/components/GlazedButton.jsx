import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    interpolate
} from 'react-native-reanimated';
import COLORS from '../constants/colors';

const GlazedButton = ({ onPress, title, style, textStyle, children, disabled }) => {
    const scale = useSharedValue(1);
    const shimmer = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const onPressIn = () => {
        scale.value = withSpring(0.96);
    };

    const onPressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <TouchableOpacity
            onLongPress={() => { }} // dummy for ripple if needed
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.9}
        >
            <Animated.View style={[styles.button, style, animatedStyle]}>
                {/* Shine highlight */}
                <View style={styles.shine} />
                {children || <Text style={[styles.text, textStyle]}>{title}</Text>}
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        height: 56,
        justifyContent: "center",
        alignItems: "center",
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    shine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 1,
    },
    text: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "800",
        textTransform: 'uppercase',
        letterSpacing: 1,
        zIndex: 2,
    },
});

export default GlazedButton;
