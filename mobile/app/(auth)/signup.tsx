import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Keyboard,
    KeyboardEvent
} from "react-native";
import React, { useState, useEffect } from "react";
import styles from "../../assets/styles/signup.styles";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { Link } from "expo-router";
import { useAuthStore } from "../../store/authContext";
import { useUIStore } from "../../store/uiStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardScreen from "../../components/KeyboardScreen";

export default function Signup() {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const { isLoading, register } = useAuthStore();
    const { showAlert } = useUIStore();

    const handleSignup = async () => {
        if (isLoading) return;

        if (!email || !username || !password || !confirmPassword) {
            return showAlert({ title: "Error", message: "All fields are required", type: "error" });
        }

        if (password !== confirmPassword) {
            return showAlert({ title: "Error", message: "Passwords do not match", type: "error" });
        }

        if (password.length < 6) {
            return showAlert({ title: "Error", message: "Password must be at least 6 characters", type: "error" });
        }

        const result = await register(email.trim().toLowerCase(), username.trim(), password.trim());

        if (!result?.success) {
            showAlert({ title: "Error", message: result?.error || "Signup failed", type: "error" });
        }
    };

    return (
        <KeyboardScreen
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            style={{ backgroundColor: COLORS.background }}
        >
            <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join Readsphere community</Text>
                    </View>

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
                            <Text style={styles.label}>Username</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Choose a username"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={username}
                                    onChangeText={setUsername}
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
                                    placeholder="Create a password"
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

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm your password"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    autoComplete="off"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account?</Text>
                            <Link href="/(auth)" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.link}>Sign In</Text>
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
