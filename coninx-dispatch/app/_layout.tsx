import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useEffect, useRef } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const hasRedirected = useRef(false); // ✅ keep track of whether we redirected

useEffect(() => {
  if (!navigationState?.key || hasRedirected.current) return;

  if (segments.length === 1 && segments[0] === '(tabs)') {
    hasRedirected.current = true;
    setTimeout(() => {
      router.replace('/signup');
    }, 0);
  }
}, [segments, navigationState]);



  if (!loaded) {
    return null; // wait for fonts
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

