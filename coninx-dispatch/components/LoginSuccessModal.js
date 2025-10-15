// components/SuccessModal.js
import React, { useEffect } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";

export default function LoginSuccessModal({ visible, message, onFinish }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onFinish, 2500); // auto close after 2.5s
      return () => clearTimeout(timer);
    }
  }, [visible, onFinish]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LottieView
            source={require("../assets/Success.json")} // ✅ Add your success animation here
            autoPlay
            loop={false}
            style={{ width: 150, height: 150 }}
          />
          <Text style={styles.textTitle}>Welcome back!</Text>
          
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "80%",
  },
  textTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginTop: 10,
  },
  textMessage: {
    textAlign: "center",
    fontSize: 16,
    color: "#555",
    marginTop: 6,
  },
});
