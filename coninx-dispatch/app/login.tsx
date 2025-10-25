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
import LoginSuccessModal from "../components/LoginSuccessModal";

export default function LoginScreen() {
  const [IDNumber, setIDNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async () => {
    if (!IDNumber || !password) {
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
          body: JSON.stringify({ IDNumber, password }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Invalid credentials");
      }

      const data = await response.json();
      console.log("Login response:", data);

      // ✅ Use backend's "id" field, not "driverId"
      if (data.id) {
        await AsyncStorage.setItem("driverId", String(data.id));
        console.log("Saved driverId:", data.id);
      } else {
        console.warn("No 'id' found in backend response");
      }

      setSuccessMessage("Login successful!");
      setSuccessVisible(true);

      // Small delay for modal visibility, then redirect
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1200);
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Login Failed", errorMessage);
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
          placeholder="ID Number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={IDNumber}
          onChangeText={setIDNumber}
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
      <LoginSuccessModal
        visible={successVisible}
        message={successMessage}
        onFinish={() => {
          setSuccessVisible(false);
          router.push("/(tabs)");
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#f5f7fa",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#222",
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  eyeButton: { padding: 8, marginLeft: -40, zIndex: 1 },
  button: {
    backgroundColor: "#eec332",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  footerText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 14,
    color: "#555",
  },
  link: { color: "#007AFF", fontWeight: "600" },
});







