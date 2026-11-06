// «Оферти за теб» — первая вкладка: «Брошури» (главное — седмичните брошури, проверенные по КЗП) и «Днес» —
// самые большие скидки дня в городе по данным КЗП.
// «Добави тази оферта» закрепляет именно это предложение (сеть, цена, срок).

import { useMemo, useState } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrochureList, ChainChip, MyPromosBar } from "../../BrochureList";
import { OfferCard, ScreenHeader, Segmented } from "../../components";
import { track } from "../../lib/analytics";
import { shortDate } from "../../lib/brochures";
import { IS_DEMO } from "../../lib/data";
import { productName, splitName } from "../../lib/i18n";
import { itemKey, pinFromDeal } from "../../lib/pins";
import { excludedIndexes } from "../../lib/prices";
import { useStore } from "../../lib/store";
import { Chip, DemoBanner, productEmoji, qtyLabel, useS } from "../../ui";

export default function DealsScreen() {
  const st = useStore();
  const { city, t, lang, settings } = st;
  const s = useS();
  const excluded = useMemo(
    () => excludedIndexes(city, st.excludedEiks, settings.onlyGrocery),
    [city, st.excludedEiks, settings.onlyGrocery],
  );
  const [mode, setMode] = useState<"today" | "brochures">("brochures");
  const [chain, setChain] = useState<number | null>(null);
  const all = (city?.deals ?? []).filter((d) => !excluded.has(d[1]));
  const deals = all.filter((d) => chain == null || d[1] === chain);
  const chains = [...new Set(all.map((d) => d[1]))];
  const cityName = city
    ? lang === "en" && city.nameEn
      ? city.nameEn
      : city.name.replace(/^(гр|с)\. /, "")
    : "";

  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <ScreenHeader title={t("offersTitle")} />
      <Segmented
        items={[
          { id: "brochures", label: t("dealsBrochures"), icon: "book-outline" },
          { id: "today", label: t("dealsToday") },
        ]}
        value={mode}
        onChange={setMode}
      />
      <Text style={s.muted}>
        {mode === "today"
          ? t("dealsHint", { city: cityName })
          : t("brochuresHintMain", { city: cityName })}
      </Text>
      {IS_DEMO && <DemoBanner />}
    </View>
  );

  if (mode === "brochures") {
    return (
      <SafeAreaView style={s.screen} edges={["top"]}>
        <BrochureList header={header} />
        <MyPromosBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <FlatList
        data={deals}
        keyExtractor={(d, i) => `${d[1]}-${d[0]}-${i}`}
        contentContainerStyle={[s.pad, { paddingBottom: 110 }]}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {header}
            {chains.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <Chip
                  label={t("all")}
                  active={chain == null}
                  onPress={() => setChain(null)}
                />
                {chains.map((ci) => (
                  <ChainChip
                    key={ci}
                    name={city?.chains[ci]?.name ?? ""}
                    active={chain === ci}
                    onPress={() => setChain(chain === ci ? null : ci)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        }
        ListEmptyComponent={<Text style={s.muted}>{t("dealsEmpty")}</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item: d }) => {
          const [gid, ci, product, shelf, promo, pct, stores] = d;
          const p = st.productById.get(gid);
          const pin = city ? pinFromDeal(d, city, !!p?.byWeight) : null;
          const key = pin ? `pin:${pin.id}` : "";
          const inBasket = key
            ? st.basket.find((b) => itemKey(b) === key)
            : undefined;
          const step = p?.byWeight ? 0.5 : 1;
          return (
            <OfferCard
              emoji={productEmoji(p)}
              chain={city?.chains[ci]?.name ?? ""}
              title={product}
              detail={[
                p ? splitName(productName(p, lang), lang)[0] : "",
                t("dealStores", { n: stores }),
              ]
                .filter(Boolean)
                .join(" · ")}
              price={promo}
              regular={shelf}
              pct={pct}
              dateLabel={t("validTo", {
                date: city ? shortDate(city.date) : "",
              })}
              qty={inBasket?.qty}
              qtyLabel={
                inBasket
                  ? p?.byWeight
                    ? qtyLabel(inBasket.qty, true, t, lang)
                    : String(inBasket.qty)
                  : undefined
              }
              onAdd={
                pin
                  ? () => {
                      track("deal_added", {
                        group: gid,
                        chain: city?.chains[ci]?.name,
                        pct,
                        product,
                      });
                      st.addPinned(pin, gid);
                    }
                  : undefined
              }
              onMinus={() =>
                inBasket &&
                st.setQty(key, Math.round((inBasket.qty - step) * 10) / 10)
              }
              onPlus={() =>
                inBasket &&
                st.setQty(key, Math.round((inBasket.qty + step) * 10) / 10)
              }
            />
          );
        }}
      />
      <MyPromosBar />
    </SafeAreaView>
  );
}
