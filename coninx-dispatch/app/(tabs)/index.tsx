import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import Loader from "@/components/Loader";

interface Dispatch {
  id: number;
  location: string;
  recipient: string;
  invoice: string;
}

interface Trip {
  id: number;
  dispatch_id: number;
  destination?: string;
  status: "pending" | "in_progress" | "completed" | string;
  latitude?: number;
  longitude?: number;
}

interface Driver {
  firstName: string;
  lastName: string;
  idNumber: number;
  phoneNumber?: number;
}

export default function HomeScreen() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const API_URL = useMemo(() => process.env.EXPO_PUBLIC_BACKEND_URL, []);
  const DRIVER_ID = driver?.idNumber;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driverRes, dispatchRes, tripRes] = await Promise.all([
          fetch(`${API_URL}/${DRIVER_ID}`),
          fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/admin/dispatches`),
          fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/admin/trips`),
        ]);

        if (driverRes.ok) {
          const driverData: Driver = await driverRes.json();
          setDriver(driverData);
        }

        const dispatchData: Dispatch[] = await dispatchRes.json();
        const tripData: Trip[] = await tripRes.json();
        setDispatches(dispatchData);
        setTrips(tripData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [API_URL, DRIVER_ID]);

  // location update logic unchanged
  useEffect(() => {
    let locationInterval: number | undefined; // ✅ React Native returns number, not Timeout

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location access is required.");
        return;
      }

      locationInterval = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const activeTrip = trips.find((t) => t.status !== "completed");
          if (activeTrip) {
            await fetch(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/admin/trips/${activeTrip.id}/location`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                }),
              }
            );
          }
        } catch (err) {
          console.error("Location update failed:", err);
        }
      }, 10000); // every 10 seconds
    };

    startTracking();

    // ✅ Clean up properly
    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [trips]);



  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Loader />
      </View>
    );
  }

  const nextDispatch = dispatches.length > 0 ? dispatches[0] : null;

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Hi, {driver?.firstName || "Driver"} 👋</Text>
      <Text style={styles.subtitle}>Here’s your dispatch dashboard</Text>

      <View style={[styles.card, styles.shadow]}>
        <Ionicons name="car-outline" size={28} color="#2563eb" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.cardTitle}>Status: Online</Text>
          <Text style={styles.cardSubtitle}>
            {trips.length} trips assigned today
          </Text>
        </View>
      </View>

      {nextDispatch ? (
        <View style={[styles.assignmentCard, styles.shadow]}>
          <Text style={styles.sectionTitle}>Next Dispatch</Text>
          <Text style={styles.assignmentText}>
            📍 Dropoff: {nextDispatch.location}
          </Text>
          <Text style={styles.assignmentText}>
            👤 Client: {nextDispatch.recipient}
          </Text>
          <Text style={styles.assignmentText}>
            🧾 Invoice No.: INV {nextDispatch.invoice}
          </Text>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() =>
              router.push({
                pathname: "/map",
                params: {
                  dispatchId: nextDispatch.id,
                  destination: nextDispatch.location,
                },
              })
            }
          >
            <Text style={styles.startButtonText}>Start Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noDispatch}>No upcoming dispatches</Text>
      )}

      <Text style={styles.sectionTitle}>Recent Trips</Text>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.tripItem, styles.shadow]}>
            <Ionicons name="location-outline" size={22} color="#eec332" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.tripText}>
                Dispatch #{item.dispatch_id} → {item.destination || "Unknown"}
              </Text>
              <Text
                style={[
                  styles.tripStatus,
                  item.status === "completed"
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
    backgroundColor: "#eec332",
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
  noDispatch: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 25,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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



