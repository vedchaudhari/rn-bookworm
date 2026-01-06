import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import React from 'react'
import { useAuthStore } from '../store/authContext'
import styles from '../assets/styles/profile.styles';
import { Ionicons } from "@expo/vector-icons"
import COLORS from '../constants/colors';

export default function LogoutButton() {
    const { logout, isLoading } = useAuthStore();

    const confirmLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: () => logout(), style: "destructive" },
            ]
        );
    };

    return (
        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} disabled={isLoading}>
            {isLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={styles.logoutText}>Logging out...</Text>
                </View>
            ) : (
                <>
                    <Ionicons
                        name="log-out-outline"
                        size={20}
                        color={COLORS.white}
                    />
                    <Text style={styles.logoutText}>Logout</Text>
                </>
            )}
        </TouchableOpacity>
    )
}