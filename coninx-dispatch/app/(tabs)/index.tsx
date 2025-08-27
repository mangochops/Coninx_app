import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
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
      <View style={styles.card}>
        <Ionicons name="car-outline" size={28} color="#007AFF" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.cardTitle}>Status: Online</Text>
          <Text style={styles.cardSubtitle}>2 trips assigned today</Text>
        </View>
      </View>

      {/* Next Assignment */}
      <View style={styles.assignmentCard}>
        <Text style={styles.sectionTitle}>Next Dispatch</Text>
        <Text style={styles.assignmentText}>Pickup: Warehouse A</Text>
        <Text style={styles.assignmentText}>Dropoff: Client E</Text>
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
          <View style={styles.tripItem}>
            <Ionicons name="location-outline" size={22} color="#555" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.tripText}>
                {item.from} → {item.to}
              </Text>
              <Text style={styles.tripStatus}>{item.status}</Text>
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
    backgroundColor: "#f5f7fa",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  welcome: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  assignmentCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#222",
  },
  assignmentText: {
    fontSize: 16,
    marginBottom: 6,
    color: "#444",
  },
  startButton: {
    marginTop: 12,
    backgroundColor: "#007AFF",
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
  },
  tripStatus: {
    fontSize: 14,
    color: "#007AFF",
  },
});

