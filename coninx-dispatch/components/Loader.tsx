// components/Loader.tsx
import React from "react";
import { View, StyleSheet, Image } from "react-native";
import Spinner from "react-native-animated-spinkit";

const Loader = ({ visible = false }) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Image
        source={require("@/assets/images/ConinxLogo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Spinner type="Wave" size={60} color="#FACC15" /> 
      {/* Brand Yellow */}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)", // Brand black overlay
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
});

export default Loader;
