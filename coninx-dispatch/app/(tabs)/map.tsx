import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import EventSource from "react-native-sse";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

interface Trip {
  id: number;
  dispatch_id: number;
  destination: string;
  status: string;
  latitude: number;
  longitude: number;
  recipient_name: string;
}

interface DropoffMarker {
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  isCurrent?: boolean;
}

export default function MapScreen() {
  /* ---------- Params ---------- */
  const rawParams = useLocalSearchParams();
  const destination = Array.isArray(rawParams.destination)
    ? rawParams.destination[0]
    : rawParams.destination;
  const dispatchId = Array.isArray(rawParams.dispatchId)
    ? rawParams.dispatchId[0]
    : rawParams.dispatchId;

  /* ---------- State ---------- */
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destCoords, setDestCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [allDropoffs, hisetAllDropoffs] = useState<DropoffMarker[]>([]);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [receiverPhone, setReceiverPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStage, setOtpStage] = useState<"phone" | "code">("phone");
  const [loadingAction, setLoadingAction] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true); // only for the very first spinner

  const mapRef = useRef<MapView>(null);
  const sseRef = useRef<EventSource | null>(null);
  const hasFetchedRoute = useRef(false);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);

  /* ---------- Load driverId ---------- */
  useEffect(() => {
    const load = async () => {
      const id = await AsyncStorage.getItem("driverId");
      if (id) setDriverId(id);
    };
    load();
  }, []);

  /* ---------- Device GPS (fallback) ---------- */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location access is required.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setDriverLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // keep watching
      locationWatcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (pos) => {
          setDriverLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      );
    })();

    return () => {
      locationWatcher.current?.remove();
    };
  }, []);

  /* ---------- Backend trip location (polling) ---------- */
  useEffect(() => {
    if (!dispatchId) return;

    const fetchTrip = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/dispatches/${dispatchId}/trips`);
        const trips: Trip[] = await res.json();
        const active = trips.find((t) => t.status !== "completed");
        if (active?.latitude && active?.longitude) {
          setDriverLocation({
            latitude: active.latitude,
            longitude: active.longitude,
          });
        }
      } catch (_) { }
    };

    fetchTrip();
    const id = setInterval(fetchTrip, 8000);
    return () => clearInterval(id);
  }, [dispatchId]);

  /* ---------- SSE real-time updates ---------- */
  useEffect(() => {
    if (!dispatchId) return;

    const url = `${BACKEND_URL}/events`;
    sseRef.current = new EventSource(url);

    sseRef.current.addEventListener("message", (ev) => {
      try {
        const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
        if (
          data.type === "location_update" &&
          data.trip.dispatch_id === parseInt(dispatchId)
        ) {
          setDriverLocation({
            latitude: data.trip.latitude,
            longitude: data.trip.longitude,
          });
        }
      } catch (_) { }
    });

    return () => sseRef.current?.close();
  }, [dispatchId]);

  /* ---------- Animate map to driver ---------- */
  useEffect(() => {
    if (!driverLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      800
    );
  }, [driverLocation]);

  /* ---------- Geocode current destination ---------- */
  useEffect(() => {
    if (!destination) return;
    const geocode = async () => {
      try {
        const r = await fetch(
          `https://maps.googleapis.com/maps/api/geocoding/json?address=${encodeURIComponent(
            destination
          )}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const j = await r.json();
        if (j.results?.[0]) {
          const { lat, lng } = j.results[0].geometry.location;
          setDestCoords({ latitude: lat, longitude: lng });
        }
      } catch (_) { }
    };
    geocode();
  }, [destination]);

  /* ---------- Load ALL driver trips & geocode drop-offs ---------- */
  useEffect(() => {
    if (!driverId) return;

    const load = async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/admin/drivers/${driverId}/trips`);
        const trips: Trip[] = await r.json();

        const markers: DropoffMarker[] = [];
        for (const t of trips) {
          if (!t.destination) continue;
          try {
            const g = await fetch(
              `https://maps.googleapis.com/maps/api/geocoding/json?address=${encodeURIComponent(
                t.destination
              )}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const j = await g.json();
            if (j.results?.[0]) {
              const { lat, lng } = j.results[0].geometry.location;
              markers.push({
                latitude: lat,
                longitude: lng,
                title: t.recipient_name || "Drop-off",
                description: t.destination,
                isCurrent: t.dispatch_id === parseInt(dispatchId || "0"),
              });
            }
          } catch (_) { }
        }
        hisetAllDropoffs(markers);
      } catch (_) { }
    };
    load();
  }, [driverId, dispatchId]);

  /* ---------- Directions to current destination ---------- */
  useEffect(() => {
    if (!driverLocation || !destCoords || hasFetchedRoute.current) return;

    const fetchDir = async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${destCoords.latitude},${destCoords.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const r = await fetch(url);
        const j = await r.json();

        if (j.routes?.[0]) {
          const points = decodePolyline(j.routes[0].overview_polyline.points);
          setRouteCoords(points);

          const leg = j.routes[0].legs[0];
          setEta(leg.duration.text);
          setDistance(leg.distance.text);

          if (mapRef.current && points.length) {
            mapRef.current.fitToCoordinates(points, {
              edgePadding: { top: 120, left: 80, bottom: 120, right: 80 },
              animated: true,
            });
          }
          hasFetchedRoute.current = true;
        }
      } catch (_) { }
    };
    fetchDir();
  }, [driverLocation, destCoords]);

  const decodePolyline = (t: string) => {
    const points: { latitude: number; longitude: number }[] = [];
    let index = 0,
      lat = 0,
      lng = 0;
    while (index < t.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  /* ---------- OTP Handlers (unchanged) ---------- */
  const sendOTP = async () => {
    if (!receiverPhone.trim()) return Alert.alert("Error", "Enter phone number");
    setLoadingAction(true);
    try {
      const r = await fetch(`${BACKEND_URL}/dispatches/${dispatchId}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: receiverPhone }),
      });
      const d = await r.json();
      if (r.ok) {
        Alert.alert("OTP Sent", "Check the receiver's phone.");
        setOtpStage("code");
      } else {
        Alert.alert("Error", d.message || "Failed");
      }
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoadingAction(false);
    }
  };

  const verifyOTP = async () => {
    if (!otpCode.trim()) return Alert.alert("Error", "Enter OTP");
    setLoadingAction(true);
    try {
      const r = await fetch(`${BACKEND_URL}/dispatches/${dispatchId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode }),
      });
      const d = await r.json();
      if (r.ok) {
        Alert.alert("Success", "Delivery confirmed!", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
        setOtpModalVisible(false);
      } else {
        Alert.alert("Invalid", d.message || "Wrong OTP");
      }
    } catch {
      Alert.alert("Error", "Verification failed");
    } finally {
      setLoadingAction(false);
    }
  };

  /* ---------- First-load spinner (only once) ---------- */
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoad(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (initialLoad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, color: "#555" }}>Loading map…</Text>
      </View>
    );
  }

  /* ---------- Main render ---------- */
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider="google"
        style={styles.map}
        showsUserLocation={false}
        initialRegion={{
          latitude: driverLocation?.latitude ?? -1.286389,
          longitude: driverLocation?.longitude ?? 36.817223,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Driver marker */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="You are here"
            pinColor="#2563eb"
          />
        )}

        {/* Current destination (red) */}
        {destCoords && (
          <Marker
            coordinate={destCoords}
            title="Current Drop-off"
            description={destination}
            pinColor="red"
          />
        )}

        {/* Other drop-offs (orange) */}
        {allDropoffs
          .filter((d) => !d.isCurrent)
          .map((d, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: d.latitude, longitude: d.longitude }}
              title={d.title}
              description={d.description}
              pinColor="orange"
            />
          ))}

        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#2563eb"
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* ETA / Distance */}
      {(eta || distance) && (
        <View style={styles.etaBox}>
          <Text style={styles.etaText}>
            ETA: {eta} | {distance}
          </Text>
        </View>
      )}

      {/* End-Trip button */}
      <TouchableOpacity
        style={styles.endTripButton}
        onPress={() => setOtpModalVisible(true)}
      >
        <Text style={styles.endTripText}>End Trip</Text>
      </TouchableOpacity>

      {/* OTP Modal */}
      <Modal transparent visible={otpModalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {otpStage === "phone" ? (
              <>
                <Text style={styles.modalTitle}>Receiver Phone</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="+254..."
                  keyboardType="phone-pad"
                  value={receiverPhone}
                  onChangeText={setReceiverPhone}
                />
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    loadingAction && { opacity: 0.6 },
                  ]}
                  onPress={sendOTP}
                  disabled={loadingAction}
                >
                  <Text style={styles.verifyText}>
                    {loadingAction ? "Sending…" : "Send OTP"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Enter OTP</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="123456"
                  keyboardType="numeric"
                  value={otpCode}
                  onChangeText={setOtpCode}
                />
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    loadingAction && { opacity: 0.6 },
                  ]}
                  onPress={verifyOTP}
                  disabled={loadingAction}
                >
                  <Text style={styles.verifyText}>
                    {loadingAction ? "Verifying…" : "Verify"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={() => {
                setOtpModalVisible(false);
                setOtpStage("phone");
                setReceiverPhone("");
                setOtpCode("");
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* No-driver-location overlay (rare) */}
      {!driverLocation && (
        <View style={styles.noLocationOverlay}>
          <Text style={styles.noLocationText}>
            Waiting for your location…
          </Text>
        </View>
      )}
    </View>
  );
}

/* ---------- Styles (unchanged + tiny additions) ---------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  etaBox: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  etaText: { fontWeight: "600", color: "#2563eb" },
  endTripButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 5 },
    }),
  },
  endTripText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 15 },
  otpInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    width: "80%",
    padding: 10,
    textAlign: "center",
    fontSize: 16,
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  verifyText: { color: "#fff", fontWeight: "600" },
  cancelText: { color: "#dc2626", marginTop: 12 },
  noLocationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  noLocationText: { fontSize: 16, color: "#555" },
});