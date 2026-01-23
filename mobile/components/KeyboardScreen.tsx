import React, { ReactNode } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    Keyboard,
    View,
    ScrollView,
    ViewStyle,
    StyleProp
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';

interface KeyboardScreenProps {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    withScrollView?: boolean;
    headerHeight?: number;
}

/**
 * A robust wrapper for screens with inputs.
 * Ensures inputs are never hidden by the keyboard.
 * Works consistently on iOS and Android.
 */
export default function KeyboardScreen({
    children,
    style,
    contentContainerStyle,
    withScrollView = true,
    headerHeight = 0
}: KeyboardScreenProps) {
    const insets = useSafeAreaInsets();

    const Content = withScrollView ? ScrollView : View;
    const scrollProps = withScrollView ? {
        contentContainerStyle: [styles.scrollContent, contentContainerStyle],
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: 'handled' as const,
    } : {};

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, style]}
            keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Content {...scrollProps} style={withScrollView ? styles.scrollView : styles.flexView}>
                    {children}
                </Content>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    flexView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
});
