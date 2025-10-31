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
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapView, { Marker, Polyline } from "react-native-maps";
import EventSource from "react-native-sse";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  const rawParams = useLocalSearchParams();
  const destination = Array.isArray(rawParams.destination)
    ? rawParams.destination[0]
    : rawParams.destination;
  const dispatchId = Array.isArray(rawParams.dispatchId)
    ? rawParams.dispatchId[0]
    : rawParams.dispatchId;

  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [allDropoffs, setAllDropoffs] = useState<DropoffMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [receiverPhone, setReceiverPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStage, setOtpStage] = useState<"phone" | "code">("phone");
  const [loadingAction, setLoadingAction] = useState(false);

  const mapRef = useRef<MapView>(null);
  const sseRef = useRef<EventSource | null>(null);
  const hasFetchedRoute = useRef(false);

  // Load driverId
  useEffect(() => {
    const loadDriverId = async () => {
      const storedId = await AsyncStorage.getItem("driverId");
      if (storedId) setDriverId(storedId);
    };
    loadDriverId();
  }, []);

  // Poll active trip location
  useEffect(() => {
    if (!dispatchId) return;
    let interval: ReturnType<typeof setInterval>;

    const fetchTripLocation = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/dispatches/${dispatchId}/trips`);
        const trips = await res.json();
        if (trips.length > 0 && trips[0].latitude && trips[0].longitude) {
          const loc = { latitude: trips[0].latitude, longitude: trips[0].longitude };
          setDriverLocation(loc);
          if (loc.latitude !== 0 && loc.longitude !== 0) {
            setLoading(false);
          }
        }
      } catch (err) {
        console.log("Trip location fetch error:", err);
      }
    };

    fetchTripLocation();
    interval = setInterval(fetchTripLocation, 5000);
    return () => clearInterval(interval);
  }, [dispatchId]);

  // SSE for real-time updates
  useEffect(() => {
    if (!dispatchId) return;

    const sseUrl = `${BACKEND_URL}/events`;
    sseRef.current = new EventSource(sseUrl);

    sseRef.current.addEventListener("message", (event) => {
      try {
        if (!event.data) return;
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "location_update" && data.trip.dispatch_id === parseInt(dispatchId)) {
          setDriverLocation({
            latitude: data.trip.latitude,
            longitude: data.trip.longitude,
          });
        }
      } catch (err) {
        console.log("SSE parse error:", err);
      }
    });

    return () => {
      sseRef.current?.close();
    };
  }, [dispatchId]);

  // Animate to driver
  useEffect(() => {
    if (!driverLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      1000
    );
  }, [driverLocation]);

  // Geocode current destination
  useEffect(() => {
    if (!destination) return;
    const fetchDest = async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocoding/json?address=${encodeURIComponent(
            destination
          )}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        if (data.results?.[0]) {
          const loc = data.results[0].geometry.location;
          setDestCoords({ latitude: loc.lat, longitude: loc.lng });
        }
      } catch (err) {
        console.log("Geocode error:", err);
      }
    };
    fetchDest();
  }, [destination]);

  // Fetch ALL trips for this driver and geocode drop-offs
  useEffect(() => {
    if (!driverId) return;

    const fetchAllTrips = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/admin/drivers/${driverId}/trips`);
        const trips: Trip[] = await res.json();

        const geocodedDropoffs: DropoffMarker[] = [];

        for (const trip of trips) {
          if (!trip.destination) continue;

          try {
            const geoRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocoding/json?address=${encodeURIComponent(
                trip.destination
              )}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const geoData = await geoRes.json();
            if (geoData.results?.[0]) {
              const loc = geoData.results[0].geometry.location;
              geocodedDropoffs.push({
                latitude: loc.lat,
                longitude: loc.lng,
                title: trip.recipient_name || "Drop-off",
                description: trip.destination,
                isCurrent: trip.dispatch_id === parseInt(dispatchId || "0"),
              });
            }
          } catch (err) {
            console.log(`Geocode failed for ${trip.destination}:`, err);
          }
        }

        setAllDropoffs(geocodedDropoffs);
      } catch (err) {
        console.log("Fetch trips error:", err);
      }
    };

    fetchAllTrips();
  }, [driverId, dispatchId]);

  // Fetch route to current destination
  useEffect(() => {
    if (!driverLocation || !destCoords || hasFetchedRoute.current) return;

    const fetchRoute = async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${destCoords.latitude},${destCoords.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes[0]) {
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoords(points);

          const leg = data.routes[0].legs[0];
          setEta(leg.duration.text);
          setDistance(leg.distance.text);

          if (mapRef.current && points.length > 0) {
            mapRef.current.fitToCoordinates(points, {
              edgePadding: { top: 100, left: 100, bottom: 100, right: 100 },
              animated: false,
            });
          }

          hasFetchedRoute.current = true;
        }
      } catch (err) {
        console.log("Route fetch error:", err);
      }
    };
    fetchRoute();
  }, [driverLocation, destCoords]);

  const decodePolyline = (t: string) => {
    let points: any[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < t.length) {
      let b, shift = 0, result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0; result = 0;
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

  // OTP Handlers (unchanged)
  const handleSendOTP = async () => {
    if (!receiverPhone.trim()) return Alert.alert("Error", "Enter phone number");
    setLoadingAction(true);
    try {
      const res = await fetch(`${BACKEND_URL}/dispatches/${dispatchId}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: receiverPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("OTP Sent", "Check the receiver's phone.");
        setOtpStage("code");
      } else {
        Alert.alert("Error", data.message || "Failed");
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) return Alert.alert("Error", "Enter OTP");
    setLoadingAction(true);
    try {
      const res = await fetch(`${BACKEND_URL}/dispatches/${dispatchId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "Delivery confirmed!", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
        setOtpModalVisible(false);
      } else {
        Alert.alert("Invalid", data.message || "Wrong OTP");
      }
    } catch (err) {
      Alert.alert("Error", "Verification failed");
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Loading map & drop-offs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider="google"
        style={styles.map}
        initialRegion={{
          latitude: driverLocation?.latitude || 0,
          longitude: driverLocation?.longitude || 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Driver Marker */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="You are here"
            pinColor="blue"
          />
        )}

        {/* Current Destination (Red) */}
        {destCoords && (
          <Marker
            coordinate={destCoords}
            title="Current Drop-off"
            description={destination}
            pinColor="red"
          />
        )}

        {/* All Other Drop-offs (Yellow) */}
        {allDropoffs
          .filter((d) => !d.isCurrent)
          .map((dropoff, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
              title={dropoff.title}
              description={dropoff.description}
              pinColor="orange"
            />
          ))}

        {/* Route to Current Destination */}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#2563eb" strokeWidth={5} />
        )}
      </MapView>

      {/* ETA Box */}
      {(eta || distance) && (
        <View style={styles.etaBox}>
          <Text style={styles.etaText}>
            ETA: {eta} | {distance}
          </Text>
        </View>
      )}

      {/* End Trip Button */}
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
                  style={[styles.verifyButton, loadingAction && { opacity: 0.6 }]}
                  onPress={handleSendOTP}
                  disabled={loadingAction}
                >
                  <Text style={styles.verifyText}>
                    {loadingAction ? "Sending..." : "Send OTP"}
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
                  style={[styles.verifyButton, loadingAction && { opacity: 0.6 }]}
                  onPress={handleVerifyOTP}
                  disabled={loadingAction}
                >
                  <Text style={styles.verifyText}>
                    {loadingAction ? "Verifying..." : "Verify"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={() => {
                setOtpModalVisible(false);
                setOtpStage("phone");
                setOtpCode("");
                setReceiverPhone("");
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles unchanged
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, width: '100%', height: '100%' },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  etaBox: {
    position: "absolute",
    top: 40,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 3,
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
    elevation: 5,
  },
  endTripText: { color: "white", fontWeight: "700", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "white",
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
  verifyText: { color: "white", fontWeight: "600" },
  cancelText: { color: "#dc2626", marginTop: 10 },
});