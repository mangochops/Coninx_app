import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      {/* 🏠 Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />

      {/* 📦 Jobs */}
      {/* <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="briefcase.fill" color={color} />
          ),
        }}
      /> */}

      {/* 🗺 Map */}
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="map.fill" color={color} />
          ),
        }}
      />

      {/* 🔔 Notifications */}


      {/* 👤 Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.crop.circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
