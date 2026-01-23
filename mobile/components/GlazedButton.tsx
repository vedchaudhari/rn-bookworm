import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import COLORS from '../constants/colors';
import { COMPONENT_SIZES, BORDER_RADIUS, SHADOWS, FONT_SIZE } from '../constants/styleConstants';
import { LinearGradient } from 'expo-linear-gradient';

interface GlazedButtonProps {
    onPress: () => void;
    title?: string;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
    children?: ReactNode;
    disabled?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}
const GlazedButton = ({ onPress, title, style, textStyle, children, disabled, accessibilityLabel, accessibilityHint }: GlazedButtonProps) => {
    const scale = useSharedValue(1);

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
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.9}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityRole="button"
        >
            <Animated.View style={[styles.buttonContainer, style, animatedStyle]}>
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.05)', 'transparent']}
                    style={styles.shine}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />

                <View style={styles.content}>
                    {children || <Text style={[styles.text, textStyle]}>{title}</Text>}
                </View>

                {/* Subtle Inner Glow Border */}
                <View style={styles.topEdge} />
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        borderRadius: BORDER_RADIUS.xl,
        height: COMPONENT_SIZES.button.large,
        minWidth: 160,
        paddingHorizontal: 24,
        justifyContent: "center",
        alignItems: "center",
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        ...SHADOWS.medium,
        shadowColor: COLORS.primary,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    shine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '45%',
        zIndex: 1,
    },
    topEdge: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        zIndex: 3,
    },
    text: {
        color: COLORS.white,
        fontSize: FONT_SIZE.md, // Slightly smaller for better proportions
        fontWeight: "900", // even bolder for premium feel
        textTransform: 'uppercase',
        letterSpacing: 2, // increased spacing
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});

export default GlazedButton;
