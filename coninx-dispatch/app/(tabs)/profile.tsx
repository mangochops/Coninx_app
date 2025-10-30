import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen() {
  const [driver, setDriver] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriverAndTrips = async () => {
      try {
        const driverId = await AsyncStorage.getItem("driverId"); // ✅ now we use driverId
        if (!driverId) {
          Alert.alert("Error", "No driver ID found. Please log in again.");
          setLoading(false);
          return;
        }

        const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

        // ✅ Fetch driver by ID
        const resDriver = await fetch(`${BASE_URL}/driver/${driverId}`);
        if (!resDriver.ok) throw new Error("Failed to fetch driver details");
        const driverData = await resDriver.json();
        setDriver(driverData);

        // ✅ Fetch trips for this driver only
        const resTrips = await fetch(`${BASE_URL}/admin/drivers/${driverId}/trips`);
        if (!resTrips.ok) throw new Error("Failed to fetch trips");
        const driverTrips = await resTrips.json();

        setTrips(driverTrips);
      } catch (err) {
        Alert.alert("Error", String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDriverAndTrips();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.centered}>
        <Text>No driver found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/profileAvatar.png")}
          style={styles.avatar}
        />
        <Text style={styles.name}>
          {driver.firstName} {driver.lastName}
        </Text>
        <Text style={styles.role}>Delivery Driver</Text>
      </View>

      {/* Driver Info */}
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.infoText}>Driver ID: {driver.id}</Text>
        </View>
        {driver.phoneNumber && (
          <View style={styles.row}>
            <Text style={styles.infoText}>Phone: {driver.phoneNumber}</Text>
          </View>
        )}
      </View>

      {/* Trips Section */}
      <View style={styles.tripsCard}>
        <Text style={styles.sectionTitle}>History</Text>
        {trips.length === 0 ? (
          <Text style={styles.noTrips}>No active trips found.</Text>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.tripItem}>
                <Text style={styles.tripText}>
                  Destination: {item.destination || "N/A"}
                </Text>
                <Text style={styles.tripText}>
                  Recipient: {item.recipient_name || "N/A"}
                </Text>
                <Text style={styles.tripStatus}>Status: {item.status}</Text>
              </View>
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#f39c12",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 10,
  },
  name: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  role: { fontSize: 14, color: "#e5e7eb" },
  infoCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: { fontSize: 15, color: "#333" },
  tripsCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  noTrips: { fontSize: 14, color: "#555" },
  tripItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  tripText: { fontSize: 14, color: "#333" },
  tripStatus: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2563eb",
    marginTop: 4,
  },
});

