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
import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams, router } from "expo-router";
import * as Location from "expo-location"; // Import expo-location for permission handling
import EventSource from "react-native-sse"; // For SSE support

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapScreen() {
  const rawParams = useLocalSearchParams();
  const destination = Array.isArray(rawParams.destination)
    ? rawParams.destination[0]
    : rawParams.destination;
  const dispatchId = Array.isArray(rawParams.dispatchId)
    ? rawParams.dispatchId[0]
    : rawParams.dispatchId;

  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destCoords, setDestCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [receiverPhone, setReceiverPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStage, setOtpStage] = useState<"phone" | "code">("phone");
  const [loadingAction, setLoadingAction] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  const mapRef = useRef<MapView>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Request location permissions on mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to track the driver.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        setLocationPermission(false);
        return;
      }
      setLocationPermission(true);
    })();
  }, []);

  // Poll trip location every 5s (updated to use /dispatches/{dispatchId}/trips)
  useEffect(() => {
    if (!dispatchId || !locationPermission) return;
    let interval: ReturnType<typeof setInterval>;

    const fetchTripLocation = async () => {
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/dispatches/${dispatchId}/trips`
        );
        const trips = await res.json();
        if (trips.length > 0 && trips[0].latitude && trips[0].longitude) {
          setDriverLocation({
            latitude: trips[0].latitude,
            longitude: trips[0].longitude,
          });
        }
      } catch (err) {
        console.log("Trip location fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTripLocation();
    interval = setInterval(fetchTripLocation, 5000);
    return () => clearInterval(interval);
  }, [dispatchId, locationPermission]);

  // Set up SSE for real-time location updates
  useEffect(() => {
    if (!dispatchId || !locationPermission) return;

    const sseUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/events`;
    sseRef.current = new EventSource(sseUrl);

    sseRef.current.addEventListener("message", (event) => {
      try {
        // event.data may be string | null (or already an object depending on implementation).
        // Guard against null and only JSON.parse when it's a string.
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

    sseRef.current.addEventListener("error", (err) => {
      console.log("SSE error:", err);
    });

    return () => {
      sseRef.current?.close();
    };
  }, [dispatchId, locationPermission]);

  // Geocode destination once
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
        if (data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          setDestCoords({ latitude: loc.lat, longitude: loc.lng });
        } else {
          Alert.alert("Error", "Destination not found");
        }
      } catch (err) {
        console.log("Destination fetch error:", err);
      }
    };
    fetchDest();
  }, [destination]);

  // Fetch route + ETA once both coords are known
  useEffect(() => {
    if (!driverLocation || !destCoords) return;
    const fetchRoute = async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${destCoords.latitude},${destCoords.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes.length > 0) {
          const route = data.routes[0];
          const points = decodePolyline(route.overview_polyline.points);
          setRouteCoords(points);

          const leg = route.legs[0];
          setEta(leg.duration.text);
          setDistance(leg.distance.text);

          mapRef.current?.fitToCoordinates(points, {
            edgePadding: { top: 80, bottom: 80, left: 80, right: 80 },
            animated: true,
          });
        } else {
          Alert.alert("Error", "No route found");
        }
      } catch (err) {
        console.log("Route fetch error:", err);
      }
    };
    fetchRoute();
  }, [driverLocation, destCoords]);

  // Decode Google polyline
  const decodePolyline = (t: string) => {
    let points: any[] = [];
    let index = 0,
      lat = 0,
      lng = 0;

    while (index < t.length) {
      let b, shift = 0, result = 0;
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

  // Send OTP
  const handleSendOTP = async () => {
    if (!receiverPhone.trim()) {
      return Alert.alert("Missing Number", "Please enter the receiver’s phone number.");
    }
    setLoadingAction(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/dispatches/${dispatchId}/send-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: receiverPhone }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        Alert.alert("OTP Sent", "An OTP has been sent to the provided phone number.");
        setOtpStage("code");
      } else {
        Alert.alert("Error", data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.log("Send OTP error:", err);
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setLoadingAction(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) return Alert.alert("Error", "Enter the OTP code");
    setLoadingAction(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/dispatches/${dispatchId}/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: otpCode }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Trip Completed ✅", "OTP Verified successfully.", [
          { text: "OK", onPress: () => router.replace("/(tabs)") },
        ]);
        setOtpModalVisible(false);
      } else {
        Alert.alert("Invalid OTP", data.message || "Please try again.");
      }
    } catch (err) {
      console.log("Verify OTP error:", err);
      Alert.alert("Error", "Failed to verify OTP");
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading || locationPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (locationPermission === false) {
    return (
      <View style={styles.center}>
        <Text>Location permission denied. Please enable it to track the driver.</Text>
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
        {driverLocation && (
          <Marker coordinate={driverLocation} title="Driver" pinColor="blue" />
        )}
        {destCoords && (
          <Marker coordinate={destCoords} title="Destination" pinColor="red" />
        )}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#2563eb" strokeWidth={5} />
        )}
      </MapView>

      {/* ETA Box */}
      {(eta || distance) && (
        <View style={styles.etaBox}>
          <Text style={styles.etaText}>📍 ETA: {eta} | Distance: {distance}</Text>
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
                <Text style={styles.modalTitle}>Receiver’s Phone Number</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="e.g. +254712345678"
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
                <Text style={styles.modalTitle}>Enter OTP to Confirm Delivery</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter OTP"
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
                    {loadingAction ? "Verifying..." : "Verify OTP"}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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