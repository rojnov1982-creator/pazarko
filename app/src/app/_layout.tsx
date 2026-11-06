import { usePathname } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { flush, track } from "../lib/analytics";
import { StoreProvider, useStore } from "../lib/store";
import { Paywall } from "../Paywall";
import { C } from "../ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
/** Единый набор иконок для вкладок (вместо разных системных emoji) */
const icon =
  (on: IconName, off: IconName) =>
  // eslint-disable-next-line react/display-name -- функция отрисовки иконки вкладки, не самостоятельный компонент
  ({ focused, color }: { focused: boolean; color: unknown }) => <Ionicons name={focused ? on : off} size={26} color={String(color ?? C.muted)} />;

function AppTabs() {
  const { basket, t, settings } = useStore();
  const pathname = usePathname();
  useEffect(() => {
    track("$screen", { $screen_name: pathname === "/" ? "basket" : pathname.replace(/^\//, "") });
  }, [pathname]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s !== "active" && flush());
    return () => sub.remove();
  }, []);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 13 },
      }}
    >
      {/* Основные вкладки: Кошница · Продукти · Оферти · План; настройки — шестерёнка в заголовке каждого экрана */}
      <Tabs.Screen
        name="index"
        options={{ title: t("tabBasket"), tabBarIcon: icon("basket", "basket-outline"), tabBarBadge: basket.length || undefined }}
      />
      <Tabs.Screen name="catalog" options={{ title: t("tabProducts"), tabBarIcon: icon("search", "search-outline") }} />
      <Tabs.Screen
        name="deals"
        options={{ title: t("tabDeals"), tabBarIcon: icon("pricetags", "pricetags-outline"), href: settings.easy ? null : undefined }}
      />
      <Tabs.Screen name="result" options={{ title: t("tabPlan"), tabBarIcon: icon("list", "list-outline") }} />
      <Tabs.Screen name="settings" options={{ title: t("tabSettings"), href: null }} />
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
