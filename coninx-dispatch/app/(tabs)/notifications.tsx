import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Bell, CheckCircle2, AlertTriangle, Clock } from "lucide-react-native";

const notifications = [
  {
    id: "1",
    type: "trip",
    title: "New Trip Assigned",
    message: "You have been assigned a delivery to Nairobi CBD.",
    time: "5m ago",
  },
  {
    id: "2",
    type: "success",
    title: "Trip Completed",
    message: "Your delivery to Westlands has been marked complete.",
    time: "30m ago",
  },
  {
    id: "3",
    type: "warning",
    title: "Pending Confirmation",
    message: "Please confirm pickup for order #4531.",
    time: "1h ago",
  },
  {
    id: "4",
    type: "reminder",
    title: "Upcoming Trip",
    message: "You have a delivery scheduled at 3:00 PM today.",
    time: "2h ago",
  },
];

const getIcon = (type: string) => {
  switch (type) {
    case "trip":
      return <Bell size={22} color="#2563eb" />;
    case "success":
      return <CheckCircle2 size={22} color="#16a34a" />;
    case "warning":
      return <AlertTriangle size={22} color="#facc15" />;
    case "reminder":
      return <Clock size={22} color="#f97316" />;
    default:
      return <Bell size={22} color="#64748b" />;
  }
};

export default function NotificationsScreen() {
  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.icon}>{getIcon(item.type)}</View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // ✅ Platform-specific shadows
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: "#888",
  },
});




