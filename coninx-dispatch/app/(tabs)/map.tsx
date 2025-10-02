import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  // Fetch user location and trips
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

      // Fetch trips from backend (one-time)
      try {
        const API_BASE = "https://coninx-backend.onrender.com";
        const response = await fetch(`${API_BASE}/admin/trips`);
        if (response.ok) {
          const fetchedTrips = await response.json();
          setTrips(fetchedTrips);
        } else {
          console.warn("Failed to fetch trips");
        }
      } catch (err) {
        console.error("Error fetching trips:", err);
      }

      setLoading(false);
    })();
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
        var routeLines = []; // Array for multiple routes

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

          // --- Trips (destinations) ---
          if (data.trips) {
            // Clear previous markers and lines
            tripMarkers.forEach(function(m) { map.removeLayer(m); });
            routeLines.forEach(function(l) { map.removeLayer(l); });
            tripMarkers = [];
            routeLines = [];

            data.trips.forEach(function(trip) {
              if (typeof trip.latitude === 'number' && typeof trip.longitude === 'number') {
                // Unique trip marker
                var tripMarker = L.marker([trip.latitude, trip.longitude], {
                  icon: L.icon({
                    iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // red pin
                    iconSize: [30, 30],
                    iconAnchor: [15, 30]
                  })
                }).addTo(map)
                  .bindPopup('<b>Destination:</b> ' + (trip.destination || '') + '<br><b>Recipient:</b> ' + (trip.recipient_name || ''));

                tripMarkers.push(tripMarker);

                // --- Draw route line to this destination (if current location available) ---
                if (currentLocationMarker) {
                  var driverPos = currentLocationMarker.getLatLng();
                  var destPos = tripMarker.getLatLng();

                  var routeLine = L.polyline([driverPos, destPos], { color: 'blue', dashArray: '5, 10' }).addTo(map);
                  routeLines.push(routeLine);
                }
              }
            });

            // Fit map to all markers if trips exist
            if (tripMarkers.length > 0) {
              var group = new L.featureGroup(tripMarkers);
              if (currentLocationMarker) {
                group.addLayer(currentLocationMarker);
              }
              map.fitBounds(group.getBounds(), { padding: [50, 50] });
            }
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

