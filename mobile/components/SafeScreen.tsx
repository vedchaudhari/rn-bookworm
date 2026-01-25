import { View, StyleSheet, ViewStyle } from 'react-native';
import React, { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';

interface SafeScreenProps {
    children: ReactNode;
    top?: boolean;
    bottom?: boolean;
    isTabScreen?: boolean;
    style?: ViewStyle;
}

export default function SafeScreen({ children, top = true, bottom = true, isTabScreen = false, style }: SafeScreenProps) {
    const insets = useSafeAreaInsets();

    const TAB_BAR_HEIGHT = 64;
    const TAB_BAR_BOTTOM = Math.max(insets.bottom, 16);
    const TAB_BAR_SPACE = isTabScreen ? TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 20 : insets.bottom;

    return (
        <View style={[
            styles.container,
            {
                paddingTop: top ? insets.top : 0,
                paddingBottom: bottom ? TAB_BAR_SPACE : 0
            },
            styles.container,
            style
        ]}>
            {children}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    }
})
