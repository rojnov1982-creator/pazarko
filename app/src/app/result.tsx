import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IS_DEMO } from "../lib/data";
import { brandLabel, productName, splitName } from "../lib/i18n";
import { optimizeBasket } from "../lib/optimize";
import { FREE_MAX_STORES } from "../lib/premium";
import { bestPromo, excludedIndexes } from "../lib/prices";
import { useStore } from "../lib/store";
import { Button, C, Card, Chip, DemoBanner, H, mono, money, PromoBadge, qtyLabel, s } from "../ui";

export default function ResultScreen() {
  const st = useStore();
  const { city, basket, settings, t, lang } = st;
  const m = (n: number) => money(n, lang);

  // без Premium план ограничен FREE_MAX_STORES магазинами
  const maxStores =
    st.can("moreStores") || (settings.maxStores > 0 && settings.maxStores <= FREE_MAX_STORES) ? settings.maxStores : FREE_MAX_STORES;
  const excluded = useMemo(
    () => excludedIndexes(city, settings.excludedChains, settings.onlyGrocery),
    [city, settings.excludedChains, settings.onlyGrocery],
  );

  const result = useMemo(() => {
    if (!city || !basket.length) return null;
    return optimizeBasket(city, basket, {
      maxStores,
      usePromo: settings.usePromo,
      extraStoreCost: settings.extraStoreCost,
      excludedChains: [...excluded],
    });
  }, [city, basket, settings, maxStores, excluded]);

  if (!city || !result) {
    return (
      <SafeAreaView style={s.screen} edges={["top"]}>
        <View style={s.pad}>
          <Text style={s.title}>{t("tabSavings")}</Text>
          <Card style={{ gap: 10 }}>
            <Text style={s.body}>{t("emptyBasket")}</Text>
            <Button title={t("toBasket")} onPress={() => router.push("/")} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const { plan, bestSingle, savings, savingsPct, singles, ideal } = result;
  const chainName = (i: number) => city.chains[i]?.name ?? "?";
  const name = (id: number) => splitName(productName(st.productById.get(id), lang), lang)[0];
  const maxTotal = Math.max(plan.total, ...singles.map((x) => x.total));
  const extraSaving = Math.round((plan.total - ideal.total) * 100) / 100;
  const limits = [
    { v: 1, label: t("oneStore") },
    { v: 2, label: "2" },
    { v: 3, label: "3" },
    { v: 0, label: t("anyNumber") },
  ];

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 32 }]}>
        <Text style={s.title}>{t("tabSavings")}</Text>
        {IS_DEMO && <DemoBanner />}

        <H>{t("howManyStores")}</H>
        <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
          {limits.map((l) => {
            const locked = !st.can("moreStores") && (l.v === 0 || l.v > FREE_MAX_STORES);
            return (
              <Chip
                key={l.v}
                label={locked ? `${l.label} 🔒` : l.label}
                active={maxStores === l.v}
                onPress={() => (locked ? st.openPaywall() : st.updateSettings({ maxStores: l.v }))}
              />
            );
          })}
        </View>

        {/* Итог */}
        <View style={{ backgroundColor: C.green, borderRadius: 22, padding: 20, gap: 6 }}>
          <Text style={{ color: "#CFE6D6", fontWeight: "700", letterSpacing: 1, fontSize: 12, textTransform: "uppercase" }}>
            {t("optimalBasket")} · {t("storesCount", { n: plan.stores.length })}
          </Text>
          <Text style={{ color: "#fff", fontSize: 40, fontWeight: "800", fontFamily: mono }}>{m(plan.total)}</Text>
          {plan.missing.length > 0 && (
            <Text style={{ color: "#CFE6D6", fontSize: 13, marginTop: -4 }}>
              {t("forItems", { n: basket.length - plan.missing.length, total: basket.length })}
            </Text>
          )}
          <Text style={{ color: "#fff", fontSize: 15 }}>
            {bestSingle && savings > 0.004
              ? t("savingsText", { amount: m(savings), pct: lang === "bg" ? String(savingsPct).replace(".", ",") : savingsPct, chain: chainName(bestSingle.chain) })
              : t("allInOne", { chain: bestSingle ? ` — ${chainName(bestSingle.chain)}` : "" })}
          </Text>
          {plan.missing.length > 0 && (
            <Text style={{ color: "#FFE1D8", fontSize: 13, marginTop: 4 }}>
              {t(st.area.mode === "city" ? "notFound" : "notFoundArea", { list: plan.missing.map(name).join(", ") })}
            </Text>
          )}
        </View>

        {maxStores !== 0 && extraSaving > 0.5 && (
          <Card style={{ backgroundColor: "#FFF8E8", borderColor: "#F0DFA8" }}>
            <Text style={s.body}>
              💡 {t("idealHint", { total: m(ideal.total), extra: m(extraSaving), n: ideal.stores.length })}
            </Text>
          </Card>
        )}

        {plan.missing.length > ideal.missing.length && (
          <Card style={{ backgroundColor: "#FFF1EC", borderColor: "#F3C9BB" }}>
            <Text style={s.body}>
              ⚠️ {t("coverageHint", { n: plan.missing.length - ideal.missing.length, k: Math.max(maxStores + 1, 2) })}
            </Text>
          </Card>
        )}

        {/* План по магазинам */}
        <H style={{ marginTop: 6 }}>{t("whatWhere")}</H>
        {plan.stores.map((sp, n) => (
          <Card key={sp.chain} style={{ padding: 0 }}>
            <View style={[s.row, { padding: 14, justifyContent: "space-between" }]}>
              <View style={[s.row, { gap: 10, flex: 1 }]}>
                <View
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: C.green, fontWeight: "800" }}>{n + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.body, { fontWeight: "800", fontSize: 17 }]}>{chainName(sp.chain)}</Text>
                  <Text style={s.muted}>
                    {city.chains[sp.chain]?.label
                      ? `${sp.lines.length} · ${city.chains[sp.chain]?.label}`
                      : t("itemsAndStores", { items: sp.lines.length, stores: city.chains[sp.chain]?.stores ?? 0 })}
                  </Text>
                </View>
              </View>
              <Text style={[s.num, { fontSize: 17, fontWeight: "800" }]}>{m(sp.subtotal)}</Text>
            </View>
            {sp.lines.map((l) => {
              const p = st.productById.get(l.productId);
              const brand = basket.find((b) => b.productId === l.productId)?.brand;
              // супер оферта: другая марка по акции минимум на 20% дешевле выбранной
              const promo = brand && settings.showDeals && settings.usePromo ? bestPromo(city, l.productId, excluded) : null;
              const deal = promo && promo.price <= l.offer.price * 0.8 ? promo : null;
              return (
                <View key={l.productId} style={{ borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <Text style={[s.body, { flex: 1, fontWeight: "600" }]} numberOfLines={1}>
                      {name(l.productId)}
                      {brand ? <Text style={{ color: C.green }}> · {brandLabel(brand, t)}</Text> : null}
                    </Text>
                    <Text style={[s.num, { fontWeight: "700" }]}>{m(l.cost)}</Text>
                  </View>
                  <View style={[s.row, { gap: 6, marginTop: 2 }]}>
                    <Text style={[s.muted, { flex: 1 }]} numberOfLines={1}>
                      {p?.byWeight ? qtyLabel(l.qty, true, t, lang) : l.qty} × {m(l.offer.price)}
                      {l.offer.isPromo && <Text style={{ textDecorationLine: "line-through" }}> {m(l.offer.regular)}</Text>}
                      {"  ·  "}
                      {l.offer.product}
                      {l.offer.packPrice ? ` (${t("pack", { price: m(l.offer.packPrice) })})` : ""}
                    </Text>
                    {l.offer.isPromo && <PromoBadge />}
                  </View>
                  {!!l.offer.store && l.offer.isPromo && (
                    <Text style={[s.muted, { fontSize: 11 }]}>{t("inStore", { store: l.offer.store })}</Text>
                  )}
                  {deal && (
                    <View style={{ marginTop: 8, backgroundColor: C.promoSoft, borderRadius: 12, padding: 10, gap: 6 }}>
                      <Text style={{ color: C.promo, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 }}>🔥 {t("superDeal").toUpperCase()}</Text>
                      <Text style={[s.body, { fontSize: 13 }]}>
                        {t("superDealText", {
                          product: deal.product,
                          chain: city.chains[deal.chain]?.name ?? "",
                          price: m(deal.price),
                          pct: Math.round((1 - deal.price / l.offer.price) * 100),
                        })}
                      </Text>
                      <Pressable
                        onPress={() => {
                          // переключаемся на марку из оферты (если узнали её), иначе — на «любую марку»
                          const g = city.brands?.[String(l.productId)] ?? {};
                          const b = Object.keys(g).find((k) => g[k].some((t) => t[5] === deal.product || t[2] === deal.product));
                          st.setBrand(l.productId, b);
                        }}
                        style={{ alignSelf: "flex-start" }}
                      >
                        <Text style={{ color: C.promo, fontWeight: "800" }}>{t("takeIt")} →</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        ))}

        {/* Сравнение */}
        <H style={{ marginTop: 6 }}>{t("ifOneStore")}</H>
        <Card style={{ gap: 14 }}>
          <CompareRow
            label={t("optimalPlan")}
            total={plan.total}
            max={maxTotal}
            highlight
            note={t("storesCount", { n: plan.stores.length })}
            fmt={m}
          />
          {singles.map((x) => (
            <CompareRow
              key={x.chain}
              label={city.chains[x.chain]?.label ? `${chainName(x.chain)} · ${city.chains[x.chain]?.label}` : chainName(x.chain)}
              total={x.total}
              max={maxTotal}
              fmt={m}
              note={
                x.missing.length
                  ? t("missingOf", { n: x.missing.length, total: basket.length }) + (x.overpay > 0.004 ? ` · +${m(x.overpay)}` : "")
                  : x.overpay > 0.004
                    ? t("overpay", { amount: m(x.overpay) })
                    : t("same")
              }
              warn={x.missing.length > 0}
            />
          ))}
          <Text style={[s.muted, { fontSize: 12 }]}>{t("compareNote")}</Text>
          <Text style={[s.muted, { fontSize: 12 }]}>{t("sizeNote")}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function CompareRow({
  label,
  total,
  max,
  note,
  highlight,
  warn,
  fmt,
}: {
  label: string;
  total: number;
  max: number;
  note: string;
  highlight?: boolean;
  warn?: boolean;
  fmt: (n: number) => string;
}) {
  return (
    <View style={{ gap: 5 }}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text
          style={[s.body, { flex: 1, marginRight: 10, fontWeight: highlight ? "800" : "600", color: highlight ? C.green : C.ink }]}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Text style={[s.num, { flexShrink: 0, fontWeight: "700", color: highlight ? C.green : C.ink }]}>{fmt(total)}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: "#EEE8DC", overflow: "hidden" }}>
        <View
          style={{
            width: `${Math.max(4, (total / (max || 1)) * 100)}%`,
            height: "100%",
            borderRadius: 4,
            backgroundColor: highlight ? C.green : warn ? "#D9B8A8" : "#B9C4B5",
          }}
        />
      </View>
      <Text style={[s.muted, { fontSize: 12, color: warn ? C.promo : C.muted }]}>{note}</Text>
    </View>
  );
}
