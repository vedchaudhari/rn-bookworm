import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../store/uiStore';
import COLORS from '../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const Toast = () => {
    const { toast, hideToast } = useUIStore();
    const insets = useSafeAreaInsets();
    const animatedValue = React.useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (toast) {
            // Animate In
            Animated.spring(animatedValue, {
                toValue: insets.top + 10,
                useNativeDriver: true,
                tension: 65,
                friction: 10
            }).start();
        } else {
            // Animate Out
            Animated.timing(animatedValue, {
                toValue: -150,
                duration: 300,
                useNativeDriver: true
            }).start();
        }
    }, [toast]);

    if (!toast) return null;

    const getIcon = () => {
        switch (toast?.type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'alert-circle';
            case 'message': return 'chatbubble-ellipses';
            default: return 'notifications';
        }
    };

    const getColor = () => {
        switch (toast?.type) {
            case 'success': return COLORS.success;
            case 'error': return COLORS.error;
            case 'message': return COLORS.primary;
            default: return COLORS.accent;
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: animatedValue }],
                    borderColor: getColor() + '40'
                }
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={hideToast}
                style={styles.content}
            >
                <View style={[styles.iconBox, { backgroundColor: getColor() + '20' }]}>
                    <Ionicons name={getIcon()} size={22} color={getColor()} />
                </View>
                <View style={styles.textBox}>
                    {toast?.title && (
                        <Text style={[styles.title, { color: getColor() }]}>{toast.title}</Text>
                    )}
                    <Text style={styles.message} numberOfLines={2}>
                        {toast?.message}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        backgroundColor: COLORS.surface + 'E6',
        borderRadius: 20,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        zIndex: 9999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.44,
        shadowRadius: 10.32,
        elevation: 16,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textBox: {
        flex: 1,
    },
    title: {
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    message: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
    },
});

export default Toast;
