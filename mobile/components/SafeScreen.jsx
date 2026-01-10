import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import COLORS from '../constants/colors';

export default function SafeScreen({ children, top = true, bottom = true }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[
            styles.container,
            {
                paddingTop: top ? insets.top + 50 : 0,
                paddingBottom: bottom ? insets.bottom : 0
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