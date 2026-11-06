// Основные вкладки: Оферти · Продукти · Кошница · План. Настройки — отдельный экран поверх (шестерёнка в заголовке).
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../lib/store";
import { C } from "../../ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
/** Единый набор иконок для вкладок (вместо разных системных emoji) */
const icon =
  (on: IconName, off: IconName) =>
  // eslint-disable-next-line react/display-name -- функция отрисовки иконки вкладки, не самостоятельный компонент
  ({ focused, color }: { focused: boolean; color: unknown }) => (
    <Ionicons
      name={focused ? on : off}
      size={24}
      color={String(color ?? C.muted)}
    />
  );

export default function TabsLayout() {
  const { basket, t } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        // высота с учётом нижней безопасной зоны: иначе подписи под «таблеткой» обрезаются
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.line,
          height: 72 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 4,
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 12.5, lineHeight: 16 },
        // активная вкладка — на светло-зелёной «таблетке»
        tabBarActiveBackgroundColor: C.greenSoft,
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 3,
          paddingVertical: 4,
          paddingHorizontal: 0,
        },
      }}
    >
      {/* Вкладки: Оферти (брошюры — главное) · Продукти · Кошница · План; настройки — шестерёнка в заголовке */}
      <Tabs.Screen name="index" options={{ title: t("tabDeals"), tabBarIcon: icon("pricetag", "pricetag-outline") }} />
      <Tabs.Screen name="catalog" options={{ title: t("tabProducts"), tabBarIcon: icon("grid", "grid-outline") }} />
      <Tabs.Screen
        name="basket"
        options={{ title: t("tabBasket"), tabBarIcon: icon("basket", "basket-outline"), tabBarBadge: basket.length || undefined }}
      />
      <Tabs.Screen name="result" options={{ title: t("tabPlan"), tabBarIcon: icon("checkbox", "checkbox-outline") }} />
    </Tabs>
  );
}
