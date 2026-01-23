import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    ScrollView,
    Keyboard,
    KeyboardEvent
} from "react-native";
import React, { useState, useEffect } from "react";
import { Image } from "react-native";
import styles from "../../assets/styles/login.styles";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { Link } from "expo-router";
import { useAuthStore } from "../../store/authContext";
import { useUIStore } from "../../store/uiStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardScreen from "../../components/KeyboardScreen";
import SafeScreen from "../../components/SafeScreen";

export default function Login() {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const { isLoading, login } = useAuthStore();
    const { showAlert } = useUIStore();

    const handleLogin = async () => {
        if (isLoading) return;

        if (!email || !password) {
            return showAlert({ title: "Error", message: "Email and password required", type: "error" });
        }

        const result = await login(email.trim().toLowerCase(), password.trim());

        if (!result?.success) {
            showAlert({ title: "Error", message: result?.error || "Login failed", type: "error" });
        }
    };

    return (
        <KeyboardScreen
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            style={{ backgroundColor: COLORS.background }}
        >
            <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
                <View style={styles.topIllustration}>
                    <Image
                        source={require("../../assets/images/illustration_icon.png")}
                        style={styles.illustrationImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.welcomeText}>Welcome Back 👋</Text>
                    <Text style={styles.welcomeSubtext}>Sign in to continue</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="off"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoComplete="off"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                                        size={22}
                                        color={COLORS.primary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>No account?</Text>
                            <Link href="/signup" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.link}>Sign Up</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </View>
                <View style={{ height: 40 }} />
            </View>
        </KeyboardScreen>
    );
}
