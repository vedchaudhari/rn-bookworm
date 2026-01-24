import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            {/* Gradient Background */}
            <LinearGradient
                colors={['#0A0908', '#1a1410', '#0A0908']}
                style={styles.gradientBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Floating Book Icons */}
            <View style={styles.floatingIcon1}>
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                    <Ionicons name="book" size={40} color={COLORS.primary} style={{ opacity: 0.15 }} />
                </Animated.View>
            </View>
            <View style={styles.floatingIcon2}>
                <Animated.View entering={FadeInUp.delay(400).springify()}>
                    <Ionicons name="library" size={50} color={COLORS.secondary} style={{ opacity: 0.1 }} />
                </Animated.View>
            </View>
            <View style={styles.floatingIcon3}>
                <Animated.View entering={FadeInDown.delay(300).springify()}>
                    <Ionicons name="bookmark" size={35} color={COLORS.gold} style={{ opacity: 0.12 }} />
                </Animated.View>
            </View>

            <KeyboardScreen
                contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Ionicons name="book-outline" size={50} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>Join Readsphere</Text>
                        <Text style={styles.subtitle}>Start your literary journey today 📚</Text>
                    </Animated.View>

                    {/* Form Card */}
                    <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.card}>
                        <View style={styles.formContainer}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="mail-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="your@email.com"
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
                                    <Ionicons name="person-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
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
                                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
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
                                            size={20}
                                            color={COLORS.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
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
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.secondary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.buttonGradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.buttonText}>Create Account</Text>
                                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                                        </View>
                                    )}
                                </LinearGradient>
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
                    </Animated.View>

                    {/* Trust Indicators */}
                    <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.trustIndicators}>
                        <View style={styles.trustItem}>
                            <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
                            <Text style={styles.trustText}>Secure</Text>
                        </View>
                        <View style={styles.trustDot} />
                        <View style={styles.trustItem}>
                            <Ionicons name="lock-closed" size={16} color={COLORS.success} />
                            <Text style={styles.trustText}>Encrypted</Text>
                        </View>
                        <View style={styles.trustDot} />
                        <View style={styles.trustItem}>
                            <Ionicons name="people" size={16} color={COLORS.success} />
                            <Text style={styles.trustText}>10K+ Readers</Text>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardScreen>
        </View>
    );
}
