import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import React, { useState } from 'react'
import styles from '../../assets/styles/signup.styles';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authContext';

export default function Signup() {

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();


  const { user, isLoading, register } = useAuthStore();

  const handleSignup = async () => {
    try {
      if (!username || !email || !password) {
        return Alert.alert("Error", "All fields are required");
      }

      const result = await register(
        email.trim().toLowerCase(),
        username.trim().toLowerCase(),
        password
      );

      if (!result?.success) {
        Alert.alert("Error", result?.error || "Registration failed");
        return;
      }

      Alert.alert(
        "Success 🎉",
        "Account created successfully",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(tabs)")
          }
        ]
      );

    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };



  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.container}>


        {/*Card*/}
        <View style={styles.card}>

          {/*Header*/}
          <View style={styles.header}>
            <Text style={styles.title}>BookWorm🐛</Text>
            <Text style={styles.subtitle}>Share your favourite reads</Text>
          </View>


          {/*Form*/}
          <View style={styles.formContainer} >

            {/*Full Name*/}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="johndoe123"
                  placeholderTextColor={COLORS.placeholderText}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase())}
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>
            </View>


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
                  placeholder="johndoe@gmail.com"
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

            {/*Sign up */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleSignup}
              disabled={isLoading}
            >
              {
                isLoading ?
                  <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Sign Up</Text>
              }
            </TouchableOpacity>

            {/*CARD FOOTER*/}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>

              <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.link}>Login</Text>
              </TouchableOpacity>

            </View>

          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}