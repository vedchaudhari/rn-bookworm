import { TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import React from 'react';
import { useAuthStore } from '../store/authContext';
import { Ionicons } from "@expo/vector-icons";
import COLORS from '../constants/colors';

export default function LogoutButton() {
    const { logout, isLoading } = useAuthStore();

    const confirmLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", onPress: () => logout(), style: "destructive" },
            ]
        );
    };

    return (
        <TouchableOpacity style={styles.button} onPress={confirmLogout} disabled={isLoading}>
            {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
            ) : (
                <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
            )}
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
        zIndex: 100,
    },
});
