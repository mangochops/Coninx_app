


import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
// Polyfill for EventSource in React Native
import EventSource from 'react-native-sse';


export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  // Fetch user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission denied", "Cannot show your location on the map.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setLoading(false);
    })();
  }, []);

  // Live trip feed from Go backend SSE
  useEffect(() => {
    // TODO: Replace with your actual backend base URL
    const API_BASE = "https://coninx-backend.onrender.com";
    const es = new EventSource(`${API_BASE}/admin/trips/stream`);
  let currentTrips: any[] = [];


    // Optionally handle connection event (no-op)

    es.addEventListener('message', (e) => {
      try {
        if (!e.data) return;
        const msg = JSON.parse(e.data);
        if (msg.type === 'trip_created') {
          currentTrips = [...currentTrips, msg.trip];
        } else if (msg.type === 'trip_updated' || msg.type === 'location_update') {
          currentTrips = currentTrips.map(t => t.id === msg.trip.id ? msg.trip : t);
        } else if (msg.type === 'trip_deleted' || msg.type === 'trip_completed') {
          currentTrips = currentTrips.filter(t => t.id !== msg.tripId);
        }
        setTrips([...currentTrips]);
      } catch (err) {
        // Ignore parse errors
      }
    });

    return () => {
      es.close();
    };
  }, []);

  // Send location and trips to WebView
  useEffect(() => {
    if (webViewRef.current) {
      if (location) {
        webViewRef.current.postMessage(JSON.stringify({ center: location }));
      }
      if (trips.length > 0) {
        webViewRef.current.postMessage(JSON.stringify({ trips }));
      }
    }
  }, [location, trips]);

  const leafletHTML = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        #map { height: 100vh; width: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([0,0], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        var tripMarkers = [];
        var currentLocationMarker = null;
        var destinationMarker = null;
        var routeLine = null;

        // Handle messages from React Native
        document.addEventListener("message", function(event) {
          var data = JSON.parse(event.data);

          // --- Current location marker ---
          if (data.center) {
            if (currentLocationMarker) {
              map.removeLayer(currentLocationMarker);
            }
            currentLocationMarker = L.marker(
              [data.center.latitude, data.center.longitude],
              { icon: L.icon({
                  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png", // blue dot marker
                  iconSize: [30, 30],
                  iconAnchor: [15, 30]
                })
              }
            ).addTo(map).bindPopup("You are here");

            map.setView([data.center.latitude, data.center.longitude], 13);
            return;
          }

          // --- Trips (destination) ---
          if (data.trips) {
            tripMarkers.forEach(function(m) { map.removeLayer(m); });
            tripMarkers = [];

            data.trips.forEach(function(trip) {
              if (typeof trip.latitude === 'number' && typeof trip.longitude === 'number') {
                // Destination marker
                if (destinationMarker) {
                  map.removeLayer(destinationMarker);
                }
                destinationMarker = L.marker([trip.latitude, trip.longitude], {
                  icon: L.icon({
                    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // red pin
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                  })
                }).addTo(map)
                  .bindPopup('<b>Destination:</b> ' + (trip.destination || ''));

                tripMarkers.push(destinationMarker);

                // --- Draw route line (if driver location is available) ---
                if (currentLocationMarker) {
                  var driverPos = currentLocationMarker.getLatLng();
                  var destPos = destinationMarker.getLatLng();

                  if (routeLine) {
                    map.removeLayer(routeLine);
                  }
                  routeLine = L.polyline([driverPos, destPos], { color: 'blue', dashArray: '5, 10' }).addTo(map);
                  map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
                }
              }
            });
          }
        });
      </script>
    </body>
  </html>
`;


  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: leafletHTML }}
        style={{ flex: 1 }}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fbbf24" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

