import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Keyboard
} from "react-native";
import React, { useState, useEffect } from "react";
import styles from "../../assets/styles/signup.styles";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { useRouter, Link } from "expo-router";
import { useAuthStore } from "../../store/authContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeScreen from "../../components/SafeScreen";

export default function Signup() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const { isLoading, register } = useAuthStore();
  const router = useRouter();

  const handleSignup = async () => {
    if (isLoading) return;

    if (!username || !email || !password) {
      return Alert.alert("Error", "All fields required");
    }

    const result = await register(
      email.trim().toLowerCase(),
      username.trim().toLowerCase(),
      password.trim()
    );

    if (!result?.success) {
      return Alert.alert("Error", result?.error || "Signup failed");
    }

    router.replace("/(tabs)");
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeScreen>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingBottom: keyboardHeight ? keyboardHeight + 20 : insets.bottom + 20
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: COLORS.background }}
        >
          <View style={[styles.container, { paddingTop: 20 }]}>
            <View>
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.title}>BookWorm 🐛</Text>
                  <Text style={styles.subtitle}>Create your account</Text>
                </View>

                <View style={styles.formContainer}>
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
                        autoComplete="off"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

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
                        autoComplete="off"
                        autoCapitalize="none"
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
                    <Text style={styles.footerText}>Already have account?</Text>
                    <Link href="/(auth)" asChild>
                      <TouchableOpacity>
                        <Text style={styles.link}>Sign In</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </View>
              </View>
            </View>
            {/* Scroll Buffer */}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeScreen>
    </View>
  );
}
