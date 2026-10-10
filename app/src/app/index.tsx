import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IS_DEMO } from "../lib/data";
import { brandLabel, OWN_BRAND, productDetail, productName, splitName } from "../lib/i18n";
import { brandsInCity, cheapest, excludedIndexes } from "../lib/prices";
import { PRESETS, useStore } from "../lib/store";
import { Button, C, CAT_EMOJI, Card, DemoBanner, H, money, PromoBadge, qtyLabel, s, Stepper } from "../ui";

/** «гр. София» → «София» / «Sofia» */
const cityLabel = (name: string, nameEn: string, lang: string) =>
  lang === "en" && nameEn ? nameEn : name.replace(/^(гр|с)\. /, "");

export default function BasketScreen() {
  const st = useStore();
  const { t, lang } = st;
  const [picker, setPicker] = useState(false);
  const [brandFor, setBrandFor] = useState<number | null>(null);
  const excluded = useMemo(
    () => excludedIndexes(st.city, st.settings.excludedChains, st.settings.onlyGrocery),
    [st.city, st.settings.excludedChains, st.settings.onlyGrocery],
  );

  if (!st.ready) {
    return (
      <View style={[s.screen, { justifyContent: "center" }]}>
        <ActivityIndicator color={C.green} />
      </View>
    );
  }

  const cur = st.index?.cities.find((c) => c.ekatte === st.ekatte);
  const estimate = st.basket.reduce((sum, b) => {
    const c = cheapest(st.city, b.productId, st.settings.usePromo, excluded);
    return sum + (c ? c.price * b.qty : 0);
  }, 0);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 120 }]}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.title}>{t("appName")}</Text>
          <Pressable onPress={() => setPicker(true)} style={[s.chip, s.row, { gap: 6 }]}>
            <Text>📍</Text>
            <Text style={s.chipText}>{cur ? cityLabel(cur.name, cur.nameEn, lang) : t("chooseCity")}</Text>
            <Text style={{ color: C.muted }}>▾</Text>
          </Pressable>
        </View>
        <Text style={s.muted}>
          {t("pricesOn", { date: st.index?.date ?? "—" })} · {st.city ? t("chainsInCity", { n: st.city.chains.filter((c) => !st.settings.onlyGrocery || !c.kind || c.kind === "grocery").length }) : t("loading")}
        </Text>
        {IS_DEMO && <DemoBanner />}
        {st.error && (
          <Text style={{ color: C.promo }}>
            {t("error")}: {st.error}
          </Text>
        )}

        {st.basket.length === 0 ? (
          <>
            <Card style={{ gap: 8 }}>
              <Text style={[s.body, { fontWeight: "700", fontSize: 17 }]}>{t("buildBasket")}</Text>
              <Text style={s.muted}>{t("buildBasketHint")}</Text>
              <Button title={t("pickProducts")} onPress={() => router.push("/catalog")} style={{ marginTop: 6 }} />
            </Card>
            <H style={{ marginTop: 8 }}>{t("readyBaskets")}</H>
            {PRESETS.map((p) => (
              <Pressable key={p.id} onPress={() => st.loadPreset(p.items)}>
                <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, { fontWeight: "700" }]}>{t(p.title)}</Text>
                    <Text style={s.muted}>{t("nItems", { n: p.items.length })}</Text>
                  </View>
                  <Text style={{ color: C.green, fontWeight: "700" }}>{t("take")}</Text>
                </Card>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <View style={[s.row, { justifyContent: "space-between", marginTop: 4 }]}>
              <H>{t("nItems", { n: st.basket.length })}</H>
              <Pressable onPress={st.clearBasket} hitSlop={8}>
                <Text style={{ color: C.promo, fontWeight: "600" }}>{t("clear")}</Text>
              </Pressable>
            </View>
            <Card style={{ padding: 0 }}>
              {st.basket.map((b, i) => {
                const p = st.productById.get(b.productId);
                if (!p) return null;
                const name = splitName(productName(p, lang), lang)[0];
                const detail = productDetail(p, lang, t);
                const c = cheapest(st.city, b.productId, st.settings.usePromo, excluded, b.brand);
                const step = st.qtyStep(b.productId);
                const canBrand = p.hasBrands && !!st.city?.brands?.[String(p.id)];
                return (
                  <View key={b.productId}>
                    {i > 0 && <View style={s.divider} />}
                    <View style={[s.row, { padding: 14 }]}>
                      <Text style={{ fontSize: 22 }}>{CAT_EMOJI[p.cat] ?? "🛒"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.body, { fontWeight: "600" }]} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={s.muted} numberOfLines={1}>
                          {c
                            ? `${t("from", { price: money(c.price, lang) })}${p.byWeight ? t("perKg") : ""} · ${t("chainsShort", { n: c.chains })}`
                            : t("notInCity")}
                          {detail ? ` · ${detail}` : ""}
                        </Text>
                        {canBrand && (
                          <Pressable
                            onPress={() => (st.can("brandMode") ? setBrandFor(p.id) : st.openPaywall())}
                            hitSlop={6}
                            style={[s.chip, { alignSelf: "flex-start", marginTop: 6, paddingVertical: 4, flexDirection: "row", gap: 4 }]}
                          >
                            <Text style={[s.chipText, { fontSize: 12, color: b.brand ? C.green : C.muted }]}>
                              🏷️ {b.brand ? brandLabel(b.brand, t) : t("anyBrand")} ▾{st.can("brandMode") ? "" : " 🔒"}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <Stepper
                        value={b.qty}
                        label={qtyLabel(b.qty, p.byWeight, t, lang)}
                        onMinus={() => st.setQty(b.productId, Math.round((b.qty - step) * 10) / 10)}
                        onPlus={() => st.setQty(b.productId, Math.round((b.qty + step) * 10) / 10)}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>
            <Button title={t("addProducts")} kind="ghost" onPress={() => router.push("/catalog")} />
          </>
        )}
      </ScrollView>

      {st.basket.length > 0 && (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
          <Pressable
            onPress={() => router.push("/result")}
            style={({ pressed }) => [
              s.btn,
              { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[s.btnText, { flexShrink: 1 }]} numberOfLines={1}>
              {t("findBest")}
            </Text>
            <Text style={[s.btnText, { fontWeight: "400", fontSize: 14, flexShrink: 0, marginLeft: 8 }]} numberOfLines={1}>
              {t("from", { price: money(estimate, lang) })}
            </Text>
          </Pressable>
        </View>
      )}

      <Modal visible={brandFor != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBrandFor(null)}>
        <View style={[s.screen, s.pad]}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { fontSize: 22 }]}>{t("chooseBrand")}</Text>
              <Text style={s.muted} numberOfLines={1}>
                {brandFor != null ? splitName(productName(st.productById.get(brandFor), lang), lang)[0] : ""}
              </Text>
            </View>
            <Pressable onPress={() => setBrandFor(null)} hitSlop={10}>
              <Text style={{ color: C.green, fontWeight: "700" }}>{t("done")}</Text>
            </Pressable>
          </View>
          {brandFor != null && (
            <FlatList
              data={[null, ...brandsInCity(st.city, brandFor, st.settings.usePromo, excluded)]}
              keyExtractor={(x) => x?.brand ?? "__any"}
              ItemSeparatorComponent={() => <View style={s.divider} />}
              renderItem={({ item }) => {
                const cur = st.basket.find((b) => b.productId === brandFor)?.brand;
                const active = (item?.brand ?? undefined) === cur;
                const any = item ? null : cheapest(st.city, brandFor, st.settings.usePromo, excluded);
                return (
                  <Pressable
                    onPress={() => {
                      st.setBrand(brandFor, item?.brand);
                      setBrandFor(null);
                    }}
                    style={[s.row, { paddingVertical: 14 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.body, { fontWeight: active ? "800" : "600" }]}>{item ? brandLabel(item.brand, t) : t("anyBrand")}</Text>
                      <Text style={s.muted}>
                        {item
                          ? (item.brand === OWN_BRAND ? `${t("ownBrandSub")} · ` : "") + t("brandFrom", { price: money(item.price, lang), n: item.chains })
                          : `${t("anyBrandSub")}${any ? ` · ${t("from", { price: money(any.price, lang) })}` : ""}`}
                      </Text>
                    </View>
                    {item?.promo && <PromoBadge />}
                    {active && <Text style={{ color: C.green, fontSize: 18 }}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Modal>

      <Modal visible={picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(false)}>
        <View style={[s.screen, s.pad]}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={[s.title, { fontSize: 22 }]}>{t("city")}</Text>
            <Pressable onPress={() => setPicker(false)} hitSlop={10}>
              <Text style={{ color: C.green, fontWeight: "700" }}>{t("done")}</Text>
            </Pressable>
          </View>
          <FlatList
            data={st.index?.cities ?? []}
            keyExtractor={(c) => c.ekatte}
            ItemSeparatorComponent={() => <View style={s.divider} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  st.selectCity(item.ekatte);
                  setPicker(false);
                }}
                style={[s.row, { paddingVertical: 14 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.body, { fontWeight: item.ekatte === st.ekatte ? "800" : "500" }]}>
                    {cityLabel(item.name, item.nameEn, lang)}
                  </Text>
                  <Text style={s.muted}>{t("cityStats", { chains: st.settings.onlyGrocery ? item.grocery ?? item.chains : item.chains, stores: item.stores, promos: item.promos })}</Text>
                </View>
                {item.ekatte === st.ekatte && <Text style={{ color: C.green, fontSize: 18 }}>✓</Text>}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
