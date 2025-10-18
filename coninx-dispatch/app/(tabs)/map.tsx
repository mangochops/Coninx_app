import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";

export default function MapScreen() {
  const { destination, dispatchId } = useLocalSearchParams();
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);


  // <-- Replace with your local or deployed Go server

  // 🔁 Poll backend for updated driver location every few seconds
  useEffect(() => {
    let interval: any;

    const fetchDriverLocation = async () => {
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/driver/${dispatchId}/location`);
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setDriverLocation({ latitude: data.latitude, longitude: data.longitude });
          setLoading(false);
        }
      } catch (err) {
        console.log("Location fetch error:", err);
      }
    };

    fetchDriverLocation(); // initial fetch
    interval = setInterval(fetchDriverLocation, 5000); // repeat every 5s

    return () => clearInterval(interval);
  }, [dispatchId]);

  // 📤 Send data to Leaflet when location or destination changes
  useEffect(() => {
    if (webViewRef.current && driverLocation && destination) {
      webViewRef.current.postMessage(
        JSON.stringify({ driverLocation, destination })
      );
    }
  }, [driverLocation, destination]);

  // 🧭 Leaflet map logic
  const leafletHTML = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet.smooth_marker_bouncing/dist/bundle.js"></script>
      <style>
        html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
        .eta-box {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255,255,255,0.9);
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 999;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="eta-box" id="etaBox">Fetching route...</div>

      <script>
        var map = L.map('map').setView([0,0], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        var driverMarker, destMarker, routeLine;
        var cachedRoute = null;

        async function fetchRoute(start, end) {
          if (cachedRoute) return cachedRoute;
          const url = \`https://router.project-osrm.org/route/v1/driving/\${start.lng},\${start.lat};\${end.lng},\${end.lat}?overview=full&geometries=geojson\`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            cachedRoute = data.routes[0];
            return cachedRoute;
          }
          return null;
        }

        // Receive messages from React Native
        document.addEventListener("message", async function(event) {
          const data = JSON.parse(event.data);
          if (!data.driverLocation || !data.destination) return;

          const { latitude, longitude } = data.driverLocation;
          map.setView([latitude, longitude], 14);

          // 🧍‍♂️ Add or update driver marker
          if (!driverMarker) {
            driverMarker = L.marker([latitude, longitude], {
              icon: L.icon({
                iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png",
                iconSize: [35, 35],
                iconAnchor: [17, 34]
              }),
              bounceOnAdd: true,
              bounceOnAddOptions: { duration: 800, height: 50 }
            }).addTo(map).bindPopup("Driver");
          } else {
            driverMarker.setLatLng([latitude, longitude]);
          }

          // 🎯 Fetch destination coordinates dynamically via Nominatim
          const geoRes = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(data.destination)}\`);
          const geoData = await geoRes.json();
          if (geoData.length === 0) return;

          const destLat = parseFloat(geoData[0].lat);
          const destLng = parseFloat(geoData[0].lon);

          // Add destination marker
          if (!destMarker) {
            destMarker = L.marker([destLat, destLng], {
              icon: L.icon({
                iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                iconSize: [35, 35],
                iconAnchor: [17, 34]
              })
            }).addTo(map).bindPopup("Destination");
          }

          // 🛣️ Fetch and draw route if not cached
          const route = await fetchRoute({ lat: latitude, lng: longitude }, { lat: destLat, lng: destLng });
          if (route) {
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            if (routeLine) map.removeLayer(routeLine);
            routeLine = L.polyline(coords, { color: '#2563eb', weight: 5 }).addTo(map);

            const km = (route.distance / 1000).toFixed(1);
            const mins = Math.round(route.duration / 60);
            document.getElementById('etaBox').innerHTML = \`📍 ETA: \${mins} min | Distance: \${km} km\`;

            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
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
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});



