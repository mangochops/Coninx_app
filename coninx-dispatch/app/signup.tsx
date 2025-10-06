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

export default function SignupScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [IDNumber, setIDNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(""); // ✅ New state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (!firstName || !lastName || !IDNumber || !phoneNumber || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/driver/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            idNumber: parseInt(IDNumber, 10),
            phoneNumber: parseInt(phoneNumber, 10),
            password,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to register");
      }

      const message = await response.text();
      Alert.alert("Success", message, [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : String(error));
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
        <Text style={styles.title}>Driver Signup</Text>

        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#999"
          value={firstName}
          onChangeText={setFirstName}
        />

        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#999"
          value={lastName}
          onChangeText={setLastName}
        />

        <TextInput
          style={styles.input}
          placeholder="ID Number"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={IDNumber}
          onChangeText={setIDNumber}
        />

        {/* ✅ Phone Number Input */}
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
            <Text style={{ fontSize: 18, color: '#999' }}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword((prev) => !prev)}
            style={styles.eyeButton}
          >
            <Text style={{ fontSize: 18, color: '#999' }}>
              {showConfirmPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing Up..." : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Already have an account?{" "}
          <Text style={styles.link} onPress={() => router.push("/login")}>
            Log in
          </Text>
        </Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  eyeButton: {
    padding: 8,
    marginLeft: -40,
    zIndex: 1,
  },
  button: {
    backgroundColor: "#eec332",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  footerText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 14,
    color: "#555",
  },
  link: {
    color: "#007AFF",
    fontWeight: "600",
  },
});


