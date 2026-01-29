import { Redirect } from "expo-router";
import { useAuthStore } from "../store/authContext";
import { View, ActivityIndicator } from "react-native";
import COLORS from "../constants/colors";

export default function Index() {
    const { user, token, isCheckingAuth, hasCompletedOnboarding } = useAuthStore();

    if (isCheckingAuth) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!hasCompletedOnboarding) {
        return <Redirect href="/onboarding" />;
    }

    if (user && token) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/(auth)" />;
}
