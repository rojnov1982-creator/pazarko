import { Tabs } from "expo-router/js-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider, useStore } from "../lib/store";
import { Paywall } from "../Paywall";
import { C } from "../ui";

const icon = (emoji: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
);

function AppTabs() {
  const { basket, t } = useStore();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t("tabBasket"), tabBarIcon: icon("🧺"), tabBarBadge: basket.length || undefined }}
      />
      <Tabs.Screen name="deals" options={{ title: t("tabDeals"), tabBarIcon: icon("🔥") }} />
      <Tabs.Screen name="catalog" options={{ title: t("tabProducts"), tabBarIcon: icon("🔎") }} />
      <Tabs.Screen name="result" options={{ title: t("tabSavings"), tabBarIcon: icon("💶") }} />
      <Tabs.Screen name="settings" options={{ title: t("tabSettings"), tabBarIcon: icon("⚙️") }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <AppTabs />
        <Paywall />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
