import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";

export default function MapScreen() {
  const rawParams = useLocalSearchParams();
  const destination = Array.isArray(rawParams.destination)
    ? rawParams.destination[0]
    : rawParams.destination;
  const dispatchId = Array.isArray(rawParams.dispatchId)
    ? rawParams.dispatchId[0]
    : rawParams.dispatchId;

  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  // 🔁 Poll driver location every 5 seconds
  useEffect(() => {
    if (!dispatchId) return;
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
        console.log("Driver location fetch error:", err);
      }
    };

    fetchDriverLocation();
    interval = setInterval(fetchDriverLocation, 5000);

    return () => clearInterval(interval);
  }, [dispatchId]);

  // 🎯 Fetch destination coordinates once
  useEffect(() => {
    if (!destination) return;
    const fetchDest = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`
        );
        const data = await res.json();
        if (data.length > 0) {
          setDestCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      } catch (err) {
        console.log("Destination fetch error:", err);
      }
    };
    fetchDest();
  }, [destination]);

  // 🚀 Send updates to WebView
  useEffect(() => {
    if (webViewRef.current && driverLocation && destCoords) {
      webViewRef.current.postMessage(JSON.stringify({ driverLocation, destCoords }));
    }
  }, [driverLocation, destCoords]);

  // 🌍 Leaflet HTML
  const leafletHTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
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
      .car-icon {
        transform-origin: center;
        transition: transform 0.5s linear;
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

      var driverMarker, destMarker, routeLine, cachedRoute = null;
      var lastLatLng = null;

      // Calculate heading
      function computeHeading(lat1, lon1, lat2, lon2) {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
        const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
                  - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      }

      // Smooth transition
      function interpolateLatLng(start, end, fraction) {
        const lat = start.lat + (end.lat - start.lat) * fraction;
        const lng = start.lng + (end.lng - start.lng) * fraction;
        return { lat, lng };
      }

      async function smoothMoveMarker(marker, start, end, duration) {
        const steps = 60; // smoother animation
        const interval = duration / steps;
        let currentStep = 0;

        const animate = setInterval(() => {
          currentStep++;
          const fraction = currentStep / steps;
          const newPos = interpolateLatLng(start, end, fraction);
          marker.setLatLng([newPos.lat, newPos.lng]);

          if (currentStep >= steps) clearInterval(animate);
        }, interval);
      }

      async function fetchRoute(start, end) {
        if (cachedRoute) return cachedRoute;
        const url = \`https://routing.openstreetmap.de/routed-car/route/v1/driving/\${start.lng},\${start.lat};\${end.lng},\${end.lat}?overview=full&geometries=geojson\`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal }).catch(() => null);
        clearTimeout(timeout);

        if (!res) {
          document.getElementById('etaBox').innerHTML = '⚠️ Route request timed out. Try again.';
          return null;
        }

        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          cachedRoute = data.routes[0];
          return cachedRoute;
        } else {
          document.getElementById('etaBox').innerHTML = '⚠️ No route found.';
        }
        return null;
      }

      document.addEventListener("message", async function(event) {
        const data = JSON.parse(event.data);
        if (!data.driverLocation || !data.destCoords) return;

        const { latitude, longitude } = data.driverLocation;
        const { lat: destLat, lng: destLng } = data.destCoords;
        const currentLatLng = { lat: latitude, lng: longitude };

        if (!lastLatLng) lastLatLng = currentLatLng;
        const heading = computeHeading(lastLatLng.lat, lastLatLng.lng, latitude, longitude);

        // Driver marker
        if (!driverMarker) {
          const carIcon = L.divIcon({
            html: '<img src="https://cdn-icons-png.flaticon.com/512/447/447031.png" width="35" height="35" class="car-icon" id="carIcon"/>',
            iconSize: [35, 35],
            className: ''
          });
          driverMarker = L.marker([latitude, longitude], { icon: carIcon }).addTo(map);
        } else {
          smoothMoveMarker(driverMarker, lastLatLng, currentLatLng, 2000); // 2s smooth move
          const iconEl = document.getElementById('carIcon');
          if (iconEl) iconEl.style.transform = 'rotate(' + heading + 'deg)';
        }

        // Destination marker
        if (!destMarker) {
          destMarker = L.marker([destLat, destLng], {
            icon: L.icon({
              iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
              iconSize: [35, 35],
              iconAnchor: [17, 34]
            })
          }).addTo(map).bindPopup("Destination");
        }

        // Fetch route once
        if (!cachedRoute) {
          const route = await fetchRoute({ lat: latitude, lng: longitude }, { lat: destLat, lng: destLng });
          if (route) {
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            routeLine = L.polyline(coords, { color: '#2563eb', weight: 5 }).addTo(map);

            const km = (route.distance / 1000).toFixed(1);
            const mins = Math.round(route.duration / 60);
            document.getElementById('etaBox').innerHTML = \`📍 ETA: \${mins} min | Distance: \${km} km\`;

            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
          }
        }

        lastLatLng = currentLatLng;
      });
    </script>
  </body>
  </html>
  `;

  return (
    <View style={styles.container}>
      <WebView ref={webViewRef} originWhitelist={["*"]} source={{ html: leafletHTML }} style={{ flex: 1 }} />
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






