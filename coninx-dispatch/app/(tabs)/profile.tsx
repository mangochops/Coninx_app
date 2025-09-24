
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Phone, Mail, Star, LogOut, Settings, Edit } from "lucide-react-native";



export default function ProfileScreen() {
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        const id = await AsyncStorage.getItem('driverId');
        if (!id) {
          Alert.alert('Error', 'No driver ID found. Please log in again.');
          setLoading(false);
          return;
        }
        const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
        const res = await fetch(`${BASE_URL}/admin/drivers/${id}`);
        if (!res.ok) throw new Error('Failed to fetch driver details');
        const data = await res.json();
        setDriver(data);
      } catch (err) {
        Alert.alert('Error', String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchDriver();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!driver) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri: driver.photoUrl || "https://randomuser.me/api/portraits/men/32.jpg",
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{driver.firstName} {driver.lastName}</Text>
        <Text style={styles.role}>Delivery Driver</Text>
      </View>

      {/* Driver Info */}
      <View style={styles.infoCard}>
        <View style={styles.row}>
          <User size={20} color="#2563eb" />
          <Text style={styles.infoText}>License ID: {driver.licenseId || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Phone size={20} color="#16a34a" />
          <Text style={styles.infoText}>{driver.phone || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Mail size={20} color="#f59e0b" />
          <Text style={styles.infoText}>{driver.email || 'N/A'}</Text>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{driver.tripsCount ?? 0}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statBox}>
          <Star size={18} color="#facc15" />
          <Text style={styles.statNumber}>{driver.rating ?? 'N/A'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{driver.yearsExperience ?? 0}</Text>
          <Text style={styles.statLabel}>Years</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.edit]}>
          <Edit size={18} color="#fff" />
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.settings]}>
          <Settings size={18} color="#fff" />
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.logout]}>
          <LogOut size={18} color="#fff" />
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#f39c12",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  role: {
    fontSize: 14,
    color: "#e5e7eb",
  },
  infoCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#333",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
  },
  statBox: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2563eb",
  },
  statLabel: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },
  actions: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  edit: {
    backgroundColor: "#2563eb",
  },
  settings: {
    backgroundColor: "#16a34a",
  },
  logout: {
    backgroundColor: "#dc2626",
  },
});
