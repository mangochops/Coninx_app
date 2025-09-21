
import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const webViewRef = useRef<WebView>(null);
  const ws = useRef<WebSocket | null>(null);

  // Send location to WebView to center the map
  useEffect(() => {
    if (location && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ center: location })
      );
    }
  }, [location]);
  // Replace this with your actual WebSocket base URL, e.g., 'example.com'
    const wsBase = "your.websocket.base.url";
    const WS_URL = `wss://${wsBase}/ws/admin/trips`;


  // Send driver location to backend
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permission to access location was denied");
        return;
      }

      // Open WebSocket connection

      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log("Connected to WebSocket");
      };

      ws.current.onmessage = (event) => {
        // Incoming: live locations of all drivers
        if (webViewRef.current) {
          webViewRef.current.postMessage(event.data); // forward to WebView
        }
      };

      ws.current.onerror = (event) => {
        // WebSocket onerror provides an Event, not an Error object
        console.error("WebSocket error event:", event);
        console.error(
          "WebSocket failed to connect: Backend may not support WebSocket upgrades or endpoint is incorrect. Check backend deployment and ws endpoint."
        );
      };

      // Watch location changes
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setLocation(coords);

          // Send location to backend
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ driverId: "driver123", ...coords }));
          }
        }
      );
    })();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

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

          var driverMarkers = {};


          // Handle incoming driver locations and center updates
          document.addEventListener("message", function(event) {
            var data = JSON.parse(event.data);

            if (data.center) {
              map.setView([data.center.latitude, data.center.longitude], 13);
              return;
            }

            // If it's a list of drivers
            if (Array.isArray(data)) {
              data.forEach(function(driver) {
                updateDriverMarker(driver.driverId, driver.latitude, driver.longitude);
              });
            } else {
              // Single driver (fallback)
              updateDriverMarker(data.driverId, data.latitude, data.longitude);
            }
          });

          function updateDriverMarker(driverId, lat, lng) {
            if (!driverMarkers[driverId]) {
              driverMarkers[driverId] = L.marker([lat, lng]).addTo(map)
                .bindPopup("Driver: " + driverId);
            } else {
              driverMarkers[driverId].setLatLng([lat, lng]);
            }
          }
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
      {!location && (
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

