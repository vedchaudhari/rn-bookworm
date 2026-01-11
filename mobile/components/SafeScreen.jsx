import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import COLORS from '../constants/colors';

export default function SafeScreen({ children, top = true, bottom = true, isTabScreen = false }) {
    const insets = useSafeAreaInsets();

    // Tab bar height calculation matching TabLayout
    const TAB_BAR_HEIGHT = 64;
    const TAB_BAR_BOTTOM = Math.max(insets.bottom, 16);
    const TAB_BAR_SPACE = isTabScreen ? TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + 20 : insets.bottom;

    return (
        <View style={[
            styles.container,
            {
                paddingTop: top ? insets.top : 0,
                paddingBottom: bottom ? TAB_BAR_SPACE : 0
            }
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