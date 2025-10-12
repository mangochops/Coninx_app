import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Alert, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function ProfileScreen() {
  const [driver, setDriver] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriverAndTrips = async () => {
      try {
        const idNumber = await AsyncStorage.getItem("idNumber"); // store this at login
        if (!idNumber) {
          Alert.alert("Error", "No ID number found. Please log in again.");
          setLoading(false);
          return;
        }

        const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

        // Fetch driver
        const resDriver = await fetch(`${BASE_URL}/driver/${idNumber}`);
        if (!resDriver.ok) throw new Error("Failed to fetch driver details");
        const driverData = await resDriver.json();
        setDriver(driverData);

        // Fetch trips
        const resTrips = await fetch(`${BASE_URL}/admin/trips`);
        if (!resTrips.ok) throw new Error("Failed to fetch trips");
        const allTrips = await resTrips.json();

        // Filter trips for this driver (match by idNumber)
        const driverTrips = allTrips.filter(
          (trip: any) => trip.driver?.idNumber === idNumber
        );
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
        <Text style={styles.name}>{driver.firstName} {driver.lastName}</Text>
        <Text style={styles.role}>Delivery Driver</Text>
      </View>

      {/* Driver Info */}
      <View style={styles.infoCard}>
        <View style={styles.row}>
               
                <Text style={styles.infoText}>ID Number: {driver.idNumber}</Text>
              </View>
      </View>

      {/* Trips Section */}
      <View style={styles.tripsCard}>
        <Text style={styles.sectionTitle}>My Trips</Text>
        {trips.length === 0 ? (
          <Text style={styles.noTrips}>No active trips found.</Text>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.tripItem}>
                <Text style={styles.tripText}>Destination: {item.destination || "N/A"}</Text>
                <Text style={styles.tripText}>Recipient: {item.recipient_name || "N/A"}</Text>
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
  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#f39c12",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: "#fff", marginBottom: 10,
  },
  name: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  role: { fontSize: 14, color: "#e5e7eb" },
  infoCard: {
    backgroundColor: "#fff", margin: 16, padding: 16,
    borderRadius: 12, elevation: 3,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: { marginLeft: 10, fontSize: 15, color: "#333" },
  tripsCard: {
    backgroundColor: "#fff", margin: 16, padding: 16,
    borderRadius: 12, elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  noTrips: { fontSize: 14, color: "#555" },
  tripItem: {
    borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 10,
  },
  tripText: { fontSize: 14, color: "#333" },
  tripStatus: { fontSize: 13, fontWeight: "bold", color: "#2563eb", marginTop: 4 },
});
