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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Loader from "@/components/Loader";

interface Dispatch {
  id: number;
  location: string;
  recipient: string;
  invoice: number;
}

interface Trip {
  id: number;
  dispatch_id: number;
  destination: string;
  status: "pending" | "started" | "completed" | string;
  latitude: number;
  longitude: number;
  recipient_name: string;
}

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  idNumber: number;
  phoneNumber?: number;
}

export default function HomeScreen() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const API_URL = useMemo(() => process.env.EXPO_PUBLIC_BACKEND_URL, []);

  /* -------------------------------------------------
   *  Load driverId from storage
   * ------------------------------------------------- */
  useEffect(() => {
    const loadDriverId = async () => {
      const storedId = await AsyncStorage.getItem("driverId");
      if (!storedId) {
        Alert.alert("Login required", "Please log in again.");
        router.replace("/login");
        return;
      }
      setDriverId(storedId);
    };
    loadDriverId();
  }, [router]);

  /* -------------------------------------------------
   *  Fetch driver + dispatches + trips
   * ------------------------------------------------- */
  useEffect(() => {
    if (!driverId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const driverRes = await fetch(`${API_URL}/driver/${driverId}`);
        if (!driverRes.ok) throw new Error("Failed to load driver");
        const driverData = await driverRes.json();
        setDriver(driverData);

        const [dispatchRes, tripRes] = await Promise.all([
          fetch(`${API_URL}/admin/drivers/${driverId}/dispatches`),
          fetch(`${API_URL}/admin/drivers/${driverId}/trips`),
        ]);

        if (!dispatchRes.ok || !tripRes.ok)
          throw new Error("Failed to load driver data");

        const dispatchData = await dispatchRes.json();
        const tripData = await tripRes.json();

        setDispatches(dispatchData);
        setTrips(tripData);
      } catch (err) {
        console.error("Error fetching driver data:", err);
        Alert.alert("Error", "Unable to fetch your data. Try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_URL, driverId]);

  /* -------------------------------------------------
   *  Location tracking (unchanged)
   * ------------------------------------------------- */
  useEffect(() => {
    if (!driverId) return;

    let locationInterval: ReturnType<typeof setInterval> | undefined;

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
            await fetch(`${API_URL}/admin/trips/${activeTrip.id}/location`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              }),
            });
          }

          await fetch(`${API_URL}/driver/${driverId}/location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            }),
          });
        } catch (err) {
          console.error("Location update failed:", err);
        }
      }, 10_000);
    };

    startTracking();

    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [trips, driverId, API_URL]);

  /* -------------------------------------------------
   *  Loading UI
   * ------------------------------------------------- */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Loader />
      </View>
    );
  }

  /* -------------------------------------------------
   *  Determine “Next Trip”
   * ------------------------------------------------- */
  const nextTrip = trips.find((t) => t.status !== "completed") ?? null;

  /* -------------------------------------------------
   *  Render
   * ------------------------------------------------- */
  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Hi, {driver?.firstName || "Driver"}</Text>
      <Text style={styles.subtitle}>Here’s your dispatch dashboard</Text>

      {/* STATUS CARD */}
      <View style={[styles.card, styles.shadow]}>
        <Ionicons name="car-outline" size={28} color="#2563eb" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.cardTitle}>Status: Online</Text>
          <Text style={styles.cardSubtitle}>
            {trips.length} trip{trips.length !== 1 ? "s" : ""} assigned today
          </Text>
        </View>
      </View>

      {/* NEXT TRIP CARD */}
      {nextTrip ? (
        <View style={[styles.assignmentCard, styles.shadow]}>
          <Text style={styles.sectionTitle}>Next Trip</Text>
          <Text style={styles.assignmentText}>
            Dropoff: {nextTrip.destination}
          </Text>
          <Text style={styles.assignmentText}>
            Client: {nextTrip.recipient_name}
          </Text>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() =>
              router.push({
                pathname: "/map",
                params: {
                  dispatchId: nextTrip.dispatch_id,
                  destination: nextTrip.destination,
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

      {/* YOUR DROP-OFFS LIST */}
      <Text style={styles.sectionTitle}>Your drop-offs</Text>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isActive = nextTrip?.dispatch_id === item.dispatch_id;

          return (
            <TouchableOpacity
              style={[styles.tripItem, styles.shadow]}
              onPress={() =>
                router.push({
                  pathname: "/map",
                  params: {
                    dispatchId: item.dispatch_id,
                    destination: item.destination,
                  },
                })
              }
            >
              <Ionicons
                name="location-outline"
                size={22}
                color={isActive ? "#2563eb" : "#eec332"}
              />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.tripText}>
                  Dropoff: {item.destination}
                </Text>
                <Text style={styles.tripText}>
                  Client: {item.recipient_name}
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
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          <Text style={styles.noDispatch}>No trips yet</Text>
        )}
      />
    </View>
  );
}

/* -------------------------------------------------
 *  Styles – unchanged except tiny tweaks for icons
 * ------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  welcome: { fontSize: 26, fontWeight: "700", color: "#1f2937" },
  subtitle: { fontSize: 15, color: "#6b7280", marginBottom: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  cardSubtitle: { fontSize: 14, color: "#6b7280" },
  assignmentCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 25,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12, color: "#1f2937" },
  assignmentText: { fontSize: 15, marginBottom: 6, color: "#374151" },
  startButton: {
    marginTop: 14,
    backgroundColor: "#eec332",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tripItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  tripText: { fontSize: 16, fontWeight: "500", color: "#111827" },
  tripStatus: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  noDispatch: { fontSize: 14, color: "#6b7280", marginBottom: 25 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  shadow: {
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
});





