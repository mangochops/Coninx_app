import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router"; // ✅ for navigation

export default function JobsScreen() {
  const [jobs, setJobs] = useState([
    {
      id: "1",
      pickup: "123 Main St",
      dropoff: "456 Elm St",
      fare: "$25",
      status: "Pending",
    },
    {
      id: "2",
      pickup: "789 Oak Ave",
      dropoff: "101 Pine Rd",
      fare: "$40",
      status: "Pending",
    },
  ]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Simulate refresh (later replace with API call)
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setJobs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          pickup: "New Pickup",
          dropoff: "New Dropoff",
          fare: "$30",
          status: "Pending",
        },
      ]);
      setRefreshing(false);
    }, 1500);
  };

  const handleStartTrip = (id: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, status: "Ongoing" } : job
      )
    );
    Alert.alert("Trip Started", "Trip is now ongoing.");
  };

  const handleComplete = (id: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, status: "Completed" } : job
      )
    );
    Alert.alert("Trip Completed", "Delivery has been completed.");
  };

  const handleViewTrip = (job: any) => {
    // Navigate to MapsScreen and pass job details
    router.push({
      pathname: "/map",
      params: { id: job.id, pickup: job.pickup, dropoff: job.dropoff },
    });
  };

  const renderJob = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Client:</Text>
        <Text style={styles.value}>{item.pickup}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.value}>{item.dropoff}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Fare:</Text>
        <Text style={styles.fare}>{item.fare}</Text>
      </View>

      <Text
        style={[
          styles.status,
          item.status === "Ongoing" && { color: "#FFC107" },
          item.status === "Completed" && { color: "#28a745" },
        ]}
      >
        {item.status}
      </Text>

      {/* Buttons */}
      {item.status === "Pending" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.start]}
            onPress={() => handleStartTrip(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.complete]}
            onPress={() => handleComplete(item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === "Ongoing" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.view]}
            onPress={() => handleViewTrip(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>View Trip</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Trips</Text>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0px 3px 6px rgba(0,0,0,0.1)",
      },
    }),
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    fontWeight: "600",
    width: 70,
  },
  value: {
    flex: 1,
    color: "#333",
  },
  fare: {
    color: "#28a745",
    fontWeight: "bold",
  },
  status: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#f39c12",
  },
  actions: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  start: {
    backgroundColor: "#FFC107", // yellow
  },
  complete: {
    backgroundColor: "#dc3545", // red
  },
  view: {
    backgroundColor: "#000", // matches your logo black
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});


