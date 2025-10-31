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
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  idNumber?: number;
}

interface Trip {
  id: number;
  destination: string;
  recipient_name: string;
  status: string;
  // any other fields you may receive
}

export default function ProfileScreen() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const driverId = await AsyncStorage.getItem("driverId");
        if (!driverId) {
          Alert.alert("Error", "No driver ID found. Please log in again.");
          return;
        }

        const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

        // 1. Driver details
        const driverRes = await fetch(`${BASE_URL}/driver/${driverId}`);
        if (!driverRes.ok) throw new Error("Failed to fetch driver");
        const driverData = await driverRes.json();
        setDriver(driverData);

        // 2. Driver trips (history)
        const tripsRes = await fetch(`${BASE_URL}/admin/drivers/${driverId}/trips`);
        if (!tripsRes.ok) throw new Error("Failed to fetch trips");
        const tripsData: Trip[] = await tripsRes.json();
        setTrips(tripsData);
      } catch (err: any) {
        Alert.alert("Error", err.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f39c12" />
        <Text style={{ marginTop: 12, color: "#666" }}>Loading profile…</Text>
      </View>
    );
  }

  /* ---------- No driver (fallback) ---------- */
  if (!driver) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#666" }}>No driver profile found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ---------- Orange Header ---------- */}
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

      {/* ---------- Driver Info Card ---------- */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Driver ID:</Text>
          <Text style={styles.infoValue}>{driver.id}</Text>
        </View>

        {driver.phoneNumber && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{driver.phoneNumber}</Text>
          </View>
        )}
      </View>

      {/* ---------- History Section ---------- */}
      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>History</Text>

        {trips.length === 0 ? (
          <Text style={styles.noTrips}>No trips recorded yet.</Text>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.tripItem}>
                <Text style={styles.tripLine}>
                  <Text style={styles.tripLabel}>Destination:</Text>{" "}
                  {item.destination || "N/A"}
                </Text>
                <Text style={styles.tripLine}>
                  <Text style={styles.tripLabel}>Recipient:</Text>{" "}
                  {item.recipient_name || "N/A"}
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

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  /* Header */
  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#f39c12",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  role: {
    fontSize: 14,
    color: "#fef3c7",
    marginTop: 4,
  },

  /* Info Card */
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 15,
    color: "#4b5563",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 15,
    color: "#1f2937",
  },

  /* History Card */
  historyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  noTrips: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },

  /* Trip Item */
  tripItem: {
    paddingVertical: 12,
  },
  tripLine: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  tripLabel: {
    fontWeight: "600",
    color: "#4b5563",
  },
  tripStatus: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2563eb",
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 0,
  },
});

