import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/driver/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber,
            password,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Invalid credentials");
      }

      // ✅ Expect JSON with driverId and message
      const data = await response.json();

      // Save driverId in AsyncStorage
      await AsyncStorage.setItem("driverId", String(data.driverId));

      Alert.alert("Success", data.message || "Login successful");

      // 🚀 Go to Home (tabs navigation)
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert("Login failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Driver Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
          >
            <Text style={{ fontSize: 18, color: "#999" }}>
              {showPassword ? "🙈" : "👁️"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Don’t have an account?{" "}
          <Text style={styles.link} onPress={() => router.push("/signup")}>
            Sign up
          </Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, backgroundColor: "#f5f7fa" },
  card: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 24, elevation: 5 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 24, textAlign: "center", color: "#222" },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: "#ddd", marginBottom: 15, paddingHorizontal: 15, fontSize: 16, backgroundColor: "#fafafa" },
  passwordContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  eyeButton: { padding: 8, marginLeft: -40, zIndex: 1 },
  button: { backgroundColor: "#eec332", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  footerText: { marginTop: 20, textAlign: "center", fontSize: 14, color: "#555" },
  link: { color: "#007AFF", fontWeight: "600" },
});






