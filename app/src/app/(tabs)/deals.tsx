// Оферти: «Днес» — самые большие скидки дня в городе по данным КЗП; «Брошури» — седмичните брошури на веригите.

import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { track } from "../../lib/analytics";
import { IS_DEMO } from "../../lib/data";
import { excludedIndexes } from "../../lib/prices";
import { useStore } from "../../lib/store";
import { BrochureList } from "../../BrochureList";
import { C, Chip, DemoBanner, money, productEmoji, qtyLabel, s, Stepper } from "../../ui";
import { ScreenHeader } from "../../components";
import { shortDate } from "../../lib/brochures";
import { productName, splitName } from "../../lib/i18n";
import { itemKey, pinFromDeal } from "../../lib/pins";

export default function DealsScreen() {
  const st = useStore();
  const { city, t, lang, settings } = st;
  const excluded = useMemo(
    () => excludedIndexes(city, st.excludedEiks, settings.onlyGrocery),
    [city, st.excludedEiks, settings.onlyGrocery],
  );
  const deals = (city?.deals ?? []).filter((d) => !excluded.has(d[1]));
  const cityName = city ? (lang === "en" && city.nameEn ? city.nameEn : city.name.replace(/^(гр|с)\. /, "")) : "";
  const [mode, setMode] = useState<"brochures" | "today">(st.brochures ? "brochures" : "today");

  const header = (
    <View style={{ gap: 8 }}>
      <ScreenHeader title={t("tabDeals")} />
      <View style={[s.row, { gap: 8 }]}>
        <Chip label={`📰 ${t("dealsBrochures")}`} active={mode === "brochures"} onPress={() => setMode("brochures")} />
        <Chip label={`🔥 ${t("dealsToday")}`} active={mode === "today"} onPress={() => setMode("today")} />
      </View>
      <Text style={s.muted}>{mode === "today" ? t("dealsHint", { city: cityName }) : t("brochuresHint", { city: cityName })}</Text>
      {IS_DEMO && <DemoBanner />}
    </View>
  );

  if (mode === "brochures") {
    return (
      <SafeAreaView style={s.screen} edges={["top"]}>
        <BrochureList header={header} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <FlatList
        data={deals}
        keyExtractor={(d, i) => `${d[1]}-${d[0]}-${i}`}
        contentContainerStyle={[s.pad, { paddingBottom: 32 }]}
        ListHeaderComponent={<View style={{ marginBottom: 4 }}>{header}</View>}
        ListEmptyComponent={<Text style={s.muted}>{t("dealsEmpty")}</Text>}
        renderItem={({ item: d }) => {
          const [gid, ci, product, shelf, promo, pct, stores] = d;
          const p = st.productById.get(gid);
          const pin = city ? pinFromDeal(d, city, !!p?.byWeight) : null;
          const key = pin ? `pin:${pin.id}` : "";
          const inBasket = key ? st.basket.find((b) => itemKey(b) === key) : undefined;
          const step = p?.byWeight ? 0.5 : 1;
          // иерархия: название → группа → цена → сеть и магазины → действие; скидка — второстепенно
          return (
            <View style={[s.card, { padding: 14, gap: 6 }]}>
              <View style={[s.row, { alignItems: "flex-start", gap: 12 }]}>
                <Text style={{ fontSize: 30 }} importantForAccessibility="no">
                  {productEmoji(p)}
                </Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[s.body, { fontWeight: "700", fontSize: 18 }]}>{product}</Text>
                  {p && <Text style={s.muted}>{splitName(productName(p, lang), lang)[0]}</Text>}
                  <View style={[s.row, { gap: 8, alignItems: "baseline", flexWrap: "wrap" }]}>
                    <Text style={[s.num, { fontWeight: "800", color: C.ink, fontSize: 22 }]}>{money(promo, lang)}</Text>
                    <Text style={[s.muted, { textDecorationLine: "line-through" }]}>{money(shelf, lang)}</Text>
                    <Text style={[s.muted, { color: C.promo, fontWeight: "700" }]}>−{pct}%</Text>
                  </View>
                  <Text style={s.muted}>
                    {city?.chains[ci]?.name} · {t("dealStores", { n: stores })} · {t("validTo", { date: city ? shortDate(city.date) : "" })}
                  </Text>
                </View>
              </View>
              <View style={[s.row, { justifyContent: "flex-end" }]}>
                {inBasket ? (
                  <View style={[s.row, { gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }]}>
                    <Text style={[s.muted, { color: C.green, fontWeight: "700" }]}>✓ {t("inBasketQty")}</Text>
                    <Stepper
                      value={inBasket.qty}
                      label={qtyLabel(inBasket.qty, !!p?.byWeight, t, lang)}
                      onMinus={() => st.setQty(key, Math.round((inBasket.qty - step) * 10) / 10)}
                      onPlus={() => st.setQty(key, Math.round((inBasket.qty + step) * 10) / 10)}
                    />
                  </View>
                ) : (
                  pin && (
                    <Pressable
                      onPress={() => {
                        track("deal_added", { group: gid, chain: city?.chains[ci]?.name, pct, product });
                        st.addPinned(pin, gid);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("pinAddA11y")}: ${product}`}
                      style={({ pressed }) => [s.btn, { minHeight: 48, paddingVertical: 12, opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Text style={[s.btnText, { fontSize: 16 }]}>+ {t("pinAdd")}</Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  );
}
