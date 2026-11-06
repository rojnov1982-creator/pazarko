import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { flush, track } from "../lib/analytics";
import { StoreProvider } from "../lib/store";
import { Paywall } from "../Paywall";
import { C } from "../ui";

/** Статистика экранов и отправка событий при сворачивании */
function Tracking() {
  const pathname = usePathname();
  useEffect(() => {
    track("$screen", { $screen_name: pathname === "/" ? "offers" : pathname.replace(/^\//, "") });
  }, [pathname]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s !== "active" && flush());
    return () => sub.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Tracking />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="shopping" />
          <Stack.Screen name="promos" />
          <Stack.Screen name="favorites" />
        </Stack>
        <Paywall />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
