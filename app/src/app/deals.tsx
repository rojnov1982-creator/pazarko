// Супер оферти: самые большие скидки дня в городе. Бесплатно для всех.

import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IS_DEMO } from "../lib/data";
import { excludedIndexes } from "../lib/prices";
import { useStore } from "../lib/store";
import { C, CAT_EMOJI, DemoBanner, money, s } from "../ui";

export default function DealsScreen() {
  const st = useStore();
  const { city, t, lang, settings } = st;
  const excluded = useMemo(
    () => excludedIndexes(city, settings.excludedChains, settings.onlyGrocery),
    [city, settings.excludedChains, settings.onlyGrocery],
  );
  const deals = (city?.deals ?? []).filter((d) => !excluded.has(d[1]));
  const cityName = city ? (lang === "en" && city.nameEn ? city.nameEn : city.name.replace(/^(гр|с)\. /, "")) : "";

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <FlatList
        data={deals}
        keyExtractor={(d, i) => `${d[1]}-${d[0]}-${i}`}
        contentContainerStyle={[s.pad, { paddingBottom: 32 }]}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 4 }}>
            <Text style={s.title}>{t("dealsTitle")}</Text>
            <Text style={s.muted}>{t("dealsHint", { city: cityName })}</Text>
            {IS_DEMO && <DemoBanner />}
          </View>
        }
        ListEmptyComponent={<Text style={s.muted}>{t("dealsEmpty")}</Text>}
        renderItem={({ item: d }) => {
          const [gid, ci, product, shelf, promo, pct, stores] = d;
          const p = st.productById.get(gid);
          const inBasket = st.basket.some((b) => b.productId === gid);
          return (
            <View style={[s.card, s.row, { padding: 14, alignItems: "center" }]}>
              <View style={{ width: 54, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 24 }}>{CAT_EMOJI[p?.cat ?? 0] ?? "🛒"}</Text>
                <View style={{ backgroundColor: C.promo, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>−{pct}%</Text>
                </View>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.body, { fontWeight: "700" }]} numberOfLines={2}>
                  {product}
                </Text>
                <Text style={s.muted} numberOfLines={1}>
                  {city?.chains[ci]?.name} · {t("dealStores", { n: stores })}
                </Text>
                <View style={[s.row, { gap: 8 }]}>
                  <Text style={[s.num, { fontWeight: "800", color: C.promo, fontSize: 16 }]}>{money(promo, lang)}</Text>
                  <Text style={[s.muted, { textDecorationLine: "line-through" }]}>{money(shelf, lang)}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => !inBasket && st.addItem(gid)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: inBasket ? C.greenSoft : C.green,
                }}
              >
                <Text style={{ color: inBasket ? C.green : "#fff", fontWeight: "700", fontSize: 13 }}>
                  {inBasket ? `✓ ${t("added")}` : `+ ${t("add")}`}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  );
}
