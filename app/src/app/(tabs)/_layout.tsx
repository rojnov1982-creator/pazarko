// Основные вкладки: Кошница · Продукти · Оферти · План. Настройки — отдельный экран поверх (шестерёнка в заголовке).
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import { useStore } from "../../lib/store";
import { C } from "../../ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
/** Единый набор иконок для вкладок (вместо разных системных emoji) */
const icon =
  (on: IconName, off: IconName) =>
  // eslint-disable-next-line react/display-name -- функция отрисовки иконки вкладки, не самостоятельный компонент
  ({ focused, color }: { focused: boolean; color: unknown }) => <Ionicons name={focused ? on : off} size={26} color={String(color ?? C.muted)} />;

export default function TabsLayout() {
  const { basket, t, settings } = useStore();
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
    </Tabs>
  );
}

