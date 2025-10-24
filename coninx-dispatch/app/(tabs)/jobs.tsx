import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";

export default function MapScreen() {
  const { id } = useLocalSearchParams();
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch dispatch details and geocode destination
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchDispatchAndGeocode = async (dispatchId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/admin/dispatches/${dispatchId}`);
      if (!res.ok) throw new Error("Failed to fetch dispatch");
      const dispatch = await res.json();

      // Geocode the location string to lat/lon
      const geoQuery = encodeURIComponent(dispatch.location || "");
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${geoQuery}`
      );
      if (!geoRes.ok) throw new Error("Failed to geocode location");
      const geoData = await geoRes.json();

      if (geoData.length === 0) {
        throw new Error("Could not find coordinates for location");
      }

      const destLat = parseFloat(geoData[0].lat);
      const destLon = parseFloat(geoData[0].lon);
      setDestination({ lat: destLat, lon: destLon, name: dispatch.location });

      // Calculate distance once current location is available
      let dist: number | null = null;
      if (currentLocation) {
        dist = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          destLat,
          destLon
        );
        setDistance(dist);
      }

      // Post to WebView
      if (webViewRef.current && currentLocation) {
        webViewRef.current.postMessage(
          JSON.stringify({
            center: currentLocation,
            destination: { lat: destLat, lon: destLon, name: dispatch.location },
            distance: dist || 0,
          })
        );
      }
    } catch (err) {
      Alert.alert("Error", String(err));
    }
  };

  // Get current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission denied", "Cannot show your location on the map.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const userLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrentLocation(userLocation);

      // Fetch dispatch and geocode after getting location
      if (id) {
        await fetchDispatchAndGeocode(id as string);
      }

      setLoading(false);
    })();
  }, [id, fetchDispatchAndGeocode]);

  // Update distance and post to WebView when destination changes
  useEffect(() => {
    if (currentLocation && destination && !distance) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        destination.lat,
        destination.lon
      );
      setDistance(dist);

      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            center: currentLocation,
            destination,
            distance: dist,
          })
        );
      }
    }
  }, [currentLocation, destination, distance]);

  const leafletHTML = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        #map { height: 100vh; width: 100%; }
        #distance { position: absolute; top: 10px; left: 10px; background: white; padding: 10px; border-radius: 5px; z-index: 1000; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="distance"></div>
      <script>
        var map = L.map('map').setView([0,0], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        var currentLocationMarker = null;
        var destinationMarker = null;
        var routeLine = null;

        // Handle messages from React Native
        document.addEventListener("message", function(event) {
          var data = JSON.parse(event.data);

          if (data.center) {
            // Current location marker (driver position)
            if (currentLocationMarker) {
              map.removeLayer(currentLocationMarker);
            }
            currentLocationMarker = L.marker(
              [data.center.latitude, data.center.longitude],
              { icon: L.icon({
                  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png", // blue dot
                  iconSize: [30, 30],
                  iconAnchor: [15, 30]
                })
              }
            ).addTo(map).bindPopup("Driver Location");

            map.setView([data.center.latitude, data.center.longitude], 13);
          }

          if (data.destination && data.distance !== undefined) {
            // Destination marker
            if (destinationMarker) {
              map.removeLayer(destinationMarker);
            }
            destinationMarker = L.marker([data.destination.lat, data.destination.lon], {
              icon: L.icon({
                iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // red pin
                iconSize: [30, 30],
                iconAnchor: [15, 30]
              })
            }).addTo(map).bindPopup(
              '<b>Destination:</b> ' + data.destination.name + 
              '<br><b>Distance:</b> ' + data.distance.toFixed(2) + ' km'
            );

            // Draw route line
            if (currentLocationMarker && routeLine) {
              map.removeLayer(routeLine);
            }
            if (currentLocationMarker) {
              var driverPos = currentLocationMarker.getLatLng();
              var destPos = destinationMarker.getLatLng();
              routeLine = L.polyline([driverPos, destPos], { color: 'blue', dashArray: '5, 10' }).addTo(map);
              map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
            }

            // Update distance overlay
            document.getElementById('distance').innerHTML = 
              '<strong>Distance to Destination:</strong> ' + data.distance.toFixed(2) + ' km';
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


