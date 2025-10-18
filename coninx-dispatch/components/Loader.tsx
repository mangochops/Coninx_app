import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

export default function Loader() {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const rotateZ = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const rotateY = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* Main rotated square */}
      <Animated.View style={[styles.loader, { transform: [{ rotateZ }] }]} />

      {/* Second animated overlay (like :after) */}
      <Animated.View
        style={[
          styles.loader,
          styles.loaderAfter,
          { transform: [{ rotateY }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  loader: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#000",
  },
  loaderAfter: {
    backgroundColor: "#eec332",
  },
});

