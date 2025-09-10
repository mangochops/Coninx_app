import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";

export default function JobsScreen() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [otpModal, setOtpModal] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [code, setCode] = useState("");
  const router = useRouter();

  // API base URL from env
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  // Fetch jobs from backend
  const fetchJobs = async () => {
    try {
      const res = await fetch(`${BASE_URL}/dispatch`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      Alert.alert("Error fetching jobs", String(err));
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  // Start trip → mark as ongoing locally
  const handleStartTrip = (id: number) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id ? { ...job, status: "Ongoing" } : job
      )
    );
    Alert.alert("Trip Started", "Trip is now ongoing.");
  };

  // Step 1 → Ask backend to send OTP
  const handleComplete = async (job: any) => {
    try {
      const res = await fetch(`${BASE_URL}/dispatch/${job.id}/send-otp`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to send OTP");
      setCurrentJob(job);
      setOtpModal(true);
    } catch (err) {
      Alert.alert("Error", String(err));
    }
  };

  // Step 2 → Verify OTP
  const verifyOtp = async () => {
    if (!currentJob) return;
    try {
      const res = await fetch(`${BASE_URL}/dispatch/${currentJob.id}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        await fetchJobs(); // refresh from backend
        setOtpModal(false);
        setCode("");
        Alert.alert("Trip Completed", "Delivery confirmed ✅");
      } else {
        Alert.alert("Invalid Code", "Please try again.");
      }
    } catch (err) {
      Alert.alert("Error", String(err));
    }
  };

  // Navigate to maps page
  const handleViewTrip = (job: any) => {
    router.push({
      pathname: "/map",
      params: { id: job.id, pickup: job.pickup, dropoff: job.dropoff },
    });
  };

  // Render job card
  const renderJob = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Client:</Text>
        <Text style={styles.value}>{item.recepient || item.pickup}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.value}>{item.location || item.dropoff}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Fare:</Text>
        <Text style={styles.fare}>{item.fare || `Ksh ${item.invoice}`}</Text>
      </View>

      <Text
        style={[
          styles.status,
          item.status === "Ongoing" && { color: "#FFC107" },
          (item.status === "Completed" || item.verified) && { color: "#28a745" },
        ]}
      >
        {item.status || (item.verified ? "Completed" : "Pending")}
      </Text>

      {/* Buttons */}
      {(!item.status || item.status === "Pending") && (
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
            onPress={() => handleComplete(item)}
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
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderJob}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* OTP Modal */}
      <Modal visible={otpModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
              Enter OTP
            </Text>
            <TextInput
              placeholder="Enter code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.button, styles.start]}
              onPress={verifyOtp}
            >
              <Text style={styles.buttonText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.view, { marginTop: 10 }]}
              onPress={() => setOtpModal(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
      web: { boxShadow: "0px 3px 6px rgba(0,0,0,0.1)" },
    }),
  },
  row: { flexDirection: "row", marginBottom: 6 },
  label: { fontWeight: "600", width: 70 },
  value: { flex: 1, color: "#333" },
  fare: { color: "#28a745", fontWeight: "bold" },
  status: { marginTop: 8, fontSize: 12, fontWeight: "600", color: "#f39c12" },
  actions: { flexDirection: "row", marginTop: 12, justifyContent: "space-between" },
  button: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  start: { backgroundColor: "#F5C518" }, // brand yellow
  complete: { backgroundColor: "#dc3545" },
  view: { backgroundColor: "#000" }, // brand black
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 12, width: "80%" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginVertical: 10 },
});


