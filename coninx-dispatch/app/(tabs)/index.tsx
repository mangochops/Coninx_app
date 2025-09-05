import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const recentTrips = [
    { id: "1", from: "Warehouse A", to: "Client B", status: "Completed" },
    { id: "2", from: "Warehouse C", to: "Client D", status: "Completed" },
    { id: "3", from: "Warehouse A", to: "Client E", status: "In Progress" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.welcome}>Hi, Driver 👋</Text>
      <Text style={styles.subtitle}>Here’s your dispatch dashboard</Text>

      {/* Status Card */}
      <View style={[styles.card, styles.shadow]}>
        <Ionicons name="car-outline" size={28} color="#2563eb" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.cardTitle}>Status: Online</Text>
          <Text style={styles.cardSubtitle}>2 trips assigned today</Text>
        </View>
      </View>

      {/* Next Assignment */}
      <View style={[styles.assignmentCard, styles.shadow]}>
        <Text style={styles.sectionTitle}>Next Dispatch</Text>
        <Text style={styles.assignmentText}>📍 Dropoff: Dagoreti Corner</Text>
        <Text style={styles.assignmentText}>👤 Client: Mbugua Kamau</Text>
        <Text style={styles.assignmentText}>🧾 Invoice No.: INV 003</Text>
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Trips */}
      <Text style={styles.sectionTitle}>Recent Trips</Text>
      <FlatList
        data={recentTrips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.tripItem, styles.shadow]}>
            <Ionicons name="location-outline" size={22} color="#2563eb" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.tripText}>
                {item.from} → {item.to}
              </Text>
              <Text
                style={[
                  styles.tripStatus,
                  item.status === "Completed"
                    ? { color: "#16a34a" }
                    : { color: "#f97316" },
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  welcome: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  assignmentCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1f2937",
  },
  assignmentText: {
    fontSize: 15,
    marginBottom: 6,
    color: "#374151",
  },
  startButton: {
    marginTop: 14,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  tripItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  tripText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  tripStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  // ✅ Cross-platform shadow fix
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});




