// Кошница: город и район, состояние данных, позиции (обычные и закреплённые предложения),
// предварительная сумма — тем же расчётом, что и «План».

import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AreaPicker } from "../AreaPicker";
import { DataStatus, Icon, itemName, PinBadge, PinInfo, ScreenHeader } from "../components";
import { ANALYTICS_AVAILABLE } from "../lib/analytics";
import { shortDate } from "../lib/brochures";
import { IS_DEMO } from "../lib/data";
import { brandLabel, OWN_BRAND, productDetail, productName, splitName } from "../lib/i18n";
import { itemKey } from "../lib/pins";
import { brandsInCity, cheapest } from "../lib/prices";
import { PRESETS, useStore } from "../lib/store";
import type { BasketItem } from "../lib/types";
import { usePlan } from "../lib/usePlan";
import { Button, C, Card, DemoBanner, H, money, productEmoji, PromoBadge, qtyLabel, Stepper, useK, useS } from "../ui";

/** «гр. София» → «София» / «Sofia» */
const cityLabel = (name: string, nameEn: string, lang: string) =>
  lang === "en" && nameEn ? nameEn : name.replace(/^(гр|с)\. /, "");

export default function BasketScreen() {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  const kf = useK();
  const easy = st.settings.easy === true;
  const [picker, setPicker] = useState(false);
  const [brandFor, setBrandFor] = useState<string | null>(null);
  const [areaOpen, setAreaOpen] = useState(false);
  const plan = usePlan();
  const { excluded } = plan;

  if (!st.ready) {
    return (
      <View style={[s.screen, { justifyContent: "center" }]}>
        <ActivityIndicator color={C.green} />
      </View>
    );
  }

  const cur = st.index?.cities.find((c) => c.ekatte === st.ekatte);
  const brandItem = brandFor ? st.basket.find((b) => itemKey(b) === brandFor) : undefined;
  const r = plan.result;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 170 }]}>
        <ScreenHeader title={t("appName")} />

        {/* Город и район — первым делом */}
        <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
          <Pressable
            onPress={() => setPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t("city")}: ${cur ? cityLabel(cur.name, cur.nameEn, lang) : t("chooseCity")}`}
            style={[s.chip, s.row, { gap: 6, borderColor: C.green }]}
          >
            <Icon name="location-outline" size={20} color={C.green} />
            <Text style={[s.chipText, { fontWeight: "800" }]}>{cur ? cityLabel(cur.name, cur.nameEn, lang) : t("chooseCity")}</Text>
            <Icon name="chevron-down" size={16} color={C.muted} />
          </Pressable>
          {!easy && (
            <Pressable onPress={() => setAreaOpen(true)} accessibilityRole="button" style={[s.chip, s.row, { gap: 6 }]}>
              <Icon name="storefront-outline" size={20} color={C.ink} />
              <Text style={s.chipText}>
                {st.area.mode === "city"
                  ? t("areaCity")
                  : st.area.mode === "stores"
                    ? `${t("areaMyStores")} (${st.areaStoreCount})`
                    : `${st.area.label} · ${t("km", { n: st.area.radiusKm })}`}
              </Text>
              <Icon name="chevron-down" size={16} color={C.muted} />
            </Pressable>
          )}
        </View>

        <DataStatus onOpenArea={() => setAreaOpen(true)} />
        {IS_DEMO && <DemoBanner />}

        {st.basket.length === 0 ? (
          <>
            {/* Первый запуск: главные действия — продукты и готовые корзины */}
            <Card style={{ gap: 12 }}>
              <Text style={[s.body, { fontWeight: "800", fontSize: 20 * kf }]}>{t("startHere")}</Text>
              <Text style={s.muted}>{t("buildBasketHint")}</Text>
              <Button title={`+ ${t("pickProducts")}`} onPress={() => router.push("/catalog")} />
            </Card>
            <H style={{ marginTop: 4 }}>{t("readyBaskets")}</H>
            {PRESETS.map((p) => (
              <Pressable key={p.id} onPress={() => st.loadPreset(p.items, p.id)} accessibilityRole="button" accessibilityLabel={t(p.title)}>
                <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ fontSize: 34 }} importantForAccessibility="no">
                    {p.emoji}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, { fontWeight: "700" }]}>{t(p.title)}</Text>
                    <Text style={s.muted}>{t("nItems", { n: p.items.length })}</Text>
                  </View>
                  <Text style={{ color: C.green, fontWeight: "800", fontSize: 17 }}>{t("take")}</Text>
                </Card>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <View style={[s.row, { justifyContent: "space-between", marginTop: 4 }]}>
              <H>{t("nItems", { n: st.basket.length })}</H>
              <Pressable onPress={st.clearBasket} hitSlop={8} accessibilityRole="button">
                <Text style={{ color: C.promo, fontWeight: "700", fontSize: 15 }}>{t("clear")}</Text>
              </Pressable>
            </View>
            <Card style={{ padding: 0 }}>
              {st.basket.map((b, i) => (
                <View key={itemKey(b)}>
                  {i > 0 && <View style={s.divider} />}
                  <BasketRow b={b} onBrand={() => setBrandFor(itemKey(b))} status={b.pin ? plan.pinStatuses.get(itemKey(b)) : undefined} excluded={excluded} />
                </View>
              ))}
            </Card>
            <Button title={t("addProducts")} kind="ghost" onPress={() => router.push("/catalog")} />
          </>
        )}

        {/* Необязательные вопросы — ниже основных действий и не мешают работе */}
        {st.settings.easy == null && (
          <Card style={{ gap: 10, backgroundColor: C.greenSoft, borderColor: C.greenSoft }}>
            <Text style={[s.body, { fontWeight: "700" }]}>👓 {t("easyInlineAsk")}</Text>
            <Text style={s.muted}>{t("easyModeSub")}</Text>
            <View style={[s.row, { gap: 10, flexWrap: "wrap" }]}>
              <Button title={t("easyInlineOn")} onPress={() => st.updateSettings({ easy: true })} style={{ flexGrow: 1 }} />
              <Pressable onPress={() => st.updateSettings({ easy: false })} hitSlop={8} accessibilityRole="button" style={{ padding: 10 }}>
                <Text style={{ color: C.muted, fontWeight: "700", fontSize: 16 }}>{t("easyInlineNo")}</Text>
              </Pressable>
            </View>
          </Card>
        )}
        {ANALYTICS_AVAILABLE && st.settings.analytics === null && (
          <Card style={{ gap: 8 }}>
            <Text style={[s.body, { fontWeight: "700" }]}>📊 {t("analyticsAskTitle")}</Text>
            <Text style={s.muted}>{t("analyticsAskText")}</Text>
            <View style={[s.row, { gap: 10, flexWrap: "wrap" }]}>
              <Button title={t("analyticsYes")} kind="ghost" onPress={() => st.updateSettings({ analytics: true })} style={{ flexGrow: 1 }} />
              <Pressable onPress={() => st.updateSettings({ analytics: false })} hitSlop={8} accessibilityRole="button" style={{ padding: 10 }}>
                <Text style={{ color: C.muted, fontWeight: "700", fontSize: 16 }}>{t("analyticsNo")}</Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Предварительная сумма — тот же расчёт, что и в «План», с полнотой корзины */}
      {st.basket.length > 0 && (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
          <Pressable
            onPress={() => router.push("/result")}
            accessibilityRole="button"
            accessibilityLabel={
              r ? `${t("seePlan")}. ${t("estimate")} ${money(r.plan.total, lang)}, ${t("estimateOf", { n: plan.found, total: plan.total })}` : t("seePlan")
            }
            style={({ pressed }) => [s.btn, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[s.btnText, { flexShrink: 1, textAlign: "left" }]}>{t("seePlan")} →</Text>
            {r ? (
              <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                <Text style={{ color: "#CFE6D6", fontSize: 13 * kf, fontWeight: "600" }}>{t("estimate")}</Text>
                <Text style={[s.btnText, { fontSize: 18 * kf }]}>
                  {r.plan.approx ? "≈ " : ""}
                  {money(r.plan.total, lang)}
                </Text>
                <Text style={{ color: plan.found < plan.total ? "#FFE1D8" : "#CFE6D6", fontSize: 13 * kf, fontWeight: "600" }}>
                  {t("estimateOf", { n: plan.found, total: plan.total })}
                </Text>
              </View>
            ) : (
              <Text style={[s.btnText, { fontWeight: "500", fontSize: 15 * kf }]}>{t("calculating")}</Text>
            )}
          </Pressable>
        </View>
      )}

      <AreaPicker visible={areaOpen} onClose={() => setAreaOpen(false)} />

      <Modal visible={!!brandItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBrandFor(null)}>
        <View style={[s.screen, s.pad]}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { fontSize: 22 }]}>{t("chooseBrand")}</Text>
              <Text style={s.muted}>{brandItem ? splitName(productName(st.productById.get(brandItem.productId), lang), lang)[0] : ""}</Text>
            </View>
            <Pressable onPress={() => setBrandFor(null)} hitSlop={10} accessibilityRole="button">
              <Text style={{ color: C.green, fontWeight: "700", fontSize: 17 }}>{t("done")}</Text>
            </Pressable>
          </View>
          {brandItem && (
            <FlatList
              data={[null, ...brandsInCity(st.city, brandItem.productId, st.settings.usePromo, excluded)]}
              keyExtractor={(x) => x?.brand ?? "__any"}
              ItemSeparatorComponent={() => <View style={s.divider} />}
              renderItem={({ item }) => {
                const active = (item?.brand ?? undefined) === brandItem.brand;
                const any = item ? null : cheapest(st.city, brandItem.productId, st.settings.usePromo, excluded);
                return (
                  <Pressable
                    onPress={() => {
                      st.setBrand(brandFor!, item?.brand);
                      setBrandFor(null);
                    }}
                    accessibilityRole="button"
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
                    {active && <Icon name="checkmark" size={22} color={C.green} />}
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
            <Pressable onPress={() => setPicker(false)} hitSlop={10} accessibilityRole="button">
              <Text style={{ color: C.green, fontWeight: "700", fontSize: 17 }}>{t("done")}</Text>
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
                accessibilityRole="button"
                style={[s.row, { paddingVertical: 14 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.body, { fontWeight: item.ekatte === st.ekatte ? "800" : "500" }]}>{cityLabel(item.name, item.nameEn, lang)}</Text>
                  <Text style={s.muted}>
                    {t("cityStats", { chains: st.settings.onlyGrocery ? item.grocery ?? item.chains : item.chains, stores: item.stores, promos: item.promos })}
                  </Text>
                </View>
                {item.ekatte === st.ekatte && <Icon name="checkmark" size={22} color={C.green} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Позиция корзины: название → фасовка → цена → количество; закреплённая акция — с сетью, сроком и условиями */
function BasketRow({ b, onBrand, status, excluded }: { b: BasketItem; onBrand: () => void; status?: string; excluded: Set<number> }) {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  const kf = useK();
  const easy = st.settings.easy === true;
  const key = itemKey(b);
  const p = st.productById.get(b.productId);
  const name = itemName(b, lang, st.productById);
  const byWeight = b.pin ? !!b.pin.perKg : !!p?.byWeight;
  const step = b.pin ? (b.pin.perKg ? 0.5 : 1) : st.qtyStep(b.productId);
  const c = !b.pin && st.city ? cheapest(st.city, b.productId, st.settings.usePromo, excluded, b.brand) : null;
  const detail = !b.pin && p ? productDetail(p, lang, t) : "";
  const canBrand = !b.pin && !easy && p?.hasBrands && !!st.city?.brands?.[String(p.id)];
  const pinProblem =
    b.pin && status && status !== "now"
      ? status === "expired"
        ? b.pin.source === "kzp"
          ? t("pinEnded")
          : t("pinExpired", { date: shortDate(b.pin.to ?? "") })
        : status === "soon"
          ? t("pinSoon", { date: shortDate(b.pin.from ?? "") })
          : t("pinUnavailable")
      : "";

  return (
    <View style={{ padding: 14, gap: 10 }}>
      <View style={[s.row, { alignItems: "flex-start", gap: 12 }]}>
        <Text style={{ fontSize: 30 * kf }} importantForAccessibility="no">
          {b.pin && !p ? "🏷️" : productEmoji(p)}
        </Text>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
            <Text style={[s.body, { fontWeight: "700", fontSize: 18 * kf }]}>{name}</Text>
            {b.pin && <PinBadge />}
          </View>
          {!!detail && <Text style={s.muted}>{detail}</Text>}
          {b.pin ? (
            <>
              <Text style={[s.muted, { color: C.green, fontWeight: "800", fontSize: 16 * kf }]}>
                {money(b.pin.price, lang)}
                {b.pin.perKg ? t("perKg") : ""}
                {b.pin.regular ? <Text style={{ color: C.muted, fontWeight: "500", textDecorationLine: "line-through" }}> {money(b.pin.regular, lang)}</Text> : null}
              </Text>
              <PinInfo pin={b.pin} />
            </>
          ) : (
            <Text style={[s.muted, { color: c ? C.green : st.city ? C.promo : C.muted, fontWeight: "700", fontSize: 16 * kf }]}>
              {!st.city ? t("loading") : c ? `${t("from", { price: money(c.price, lang) })}${p?.byWeight ? t("perKg") : ""}` : t("noPrice")}
            </Text>
          )}
          {!!b.brand && easy && <Text style={s.muted}>🏷️ {brandLabel(b.brand, t)}</Text>}
        </View>
      </View>

      {!!pinProblem && (
        <View style={[s.card, { gap: 8, backgroundColor: "#FFF8E8", borderColor: "#F0DFA8", padding: 12 }]} accessibilityLiveRegion="polite">
          <Text style={s.body}>⚠️ {pinProblem}</Text>
          <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
            {b.productId > 0 && status !== "soon" && (
              <Pressable onPress={() => st.allowSubstitute(key)} accessibilityRole="button" style={[s.chip, { borderColor: C.green }]}>
                <Text style={[s.chipText, { color: C.green }]}>{t("allowSubstitute")}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => st.removeItem(key)} accessibilityRole="button" style={s.chip}>
              <Text style={[s.chipText, { color: C.promo }]}>{t("remove")}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={[s.row, { flexWrap: "wrap", gap: 10 }]}>
        <Stepper
          value={b.qty}
          label={qtyLabel(b.qty, byWeight, t, lang)}
          onMinus={() => st.setQty(key, Math.round((b.qty - step) * 10) / 10)}
          onPlus={() => st.setQty(key, Math.round((b.qty + step) * 10) / 10)}
        />
        {canBrand && (
          <Pressable
            onPress={() => (st.can("brandMode") ? onBrand() : st.openPaywall())}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${t("chooseBrand")}: ${b.brand ? brandLabel(b.brand, t) : t("anyBrand")}`}
            style={[s.chip, { flexDirection: "row", gap: 4 }]}
          >
            <Text style={[s.chipText, { color: b.brand ? C.green : C.muted }]}>
              🏷️ {b.brand ? brandLabel(b.brand, t) : t("brandShort")} ▾{st.can("brandMode") ? "" : " 🔒"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
