import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import React, { useState } from 'react'
import { Image } from "react-native";
import styles from '../../assets/styles/login.styles';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authContext';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { isLoading, login, isCheckingAuth } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        return Alert.alert("Error", "Email and password required");
      }

      const result = await login(email.trim().toLowerCase(), password);

      if (!result?.success) {
        Alert.alert("Error", result?.error || "Login failed");
        return;
      }

      // optional success alert
      // Alert.alert("Success", "Welcome back! 😊");

    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  if (isCheckingAuth) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/*Image*/}
        <View style={styles.topIllustration}>
          <Image
            source={require("../../assets/images/i.png")}
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>


        {/*Card*/}
        <View style={styles.card}>
          {/*Form*/}
          <View style={styles.formContainer} >

            {/*Email*/}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.placeholderText}
                  value={email}
                  onChangeText={(text) => setEmail(text.toLowerCase())}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/*PASSWORD*/}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                {/*LEFT ICON*/}
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.placeholderText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />

                {/*EYE ICON*/}
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>

              </View>
            </View>

            {/*LOGIN*/}
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {
                isLoading ?
                  <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Login</Text>
              }
            </TouchableOpacity>

            {/*CARD FOOTER*/}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>

              <Link href='/signup' asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Sign up</Text>
                </TouchableOpacity>
              </Link>

            </View>

          </View>
        </View>
      </View>
    </KeyboardAvoidingView>

  )
}