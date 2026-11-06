// «План»: 1) сумма, полнота, число магазинов → 2) варианты («По-ниска цена», «В един магазин»…) →
// 3) объяснение экономии и база сравнения → 4) список покупок по магазинам → 5) подробное сравнение.
// Неполные корзины не выдаются за лучший полный вариант. Порядок магазинов — не маршрут.

import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DataStatus, Icon, itemName, PurchaseLine, ScreenHeader } from "../components";
import { AreaPicker } from "../AreaPicker";
import { track } from "../lib/analytics";
import { bestBrochureOffer, shortDate, visibleChains } from "../lib/brochures";
import { IS_DEMO } from "../lib/data";
import type { Plan } from "../lib/optimize";
import { itemKey } from "../lib/pins";
import { FREE_MAX_STORES } from "../lib/premium";
import { bestPromo } from "../lib/prices";
import { useStore } from "../lib/store";
import type { BrochureOffer, CityFile } from "../lib/types";
import { usePlan } from "../lib/usePlan";
import { Button, C, Card, Chip, DemoBanner, H, mono, money, useK, useS } from "../ui";

type Option = { id: string; kind: "cheapest" | "one" | "alt"; plan: Plan };

export default function PlanScreen() {
  const st = useStore();
  const { basket, settings, t, lang } = st;
  const s = useS();
  const kf = useK();
  const easy = settings.easy === true;
  const m = (n: number) => money(n, lang);
  const P = usePlan();
  const { result, maxStores, excluded, today } = P;
  const city = st.city;
  const [selected, setSelected] = useState("cheapest");
  const [areaOpen, setAreaOpen] = useState(false);
  const chainName = (i: number) => city?.chains[i]?.name ?? "?";
  const byKey = useMemo(() => new Map(basket.map((b) => [itemKey(b), b])), [basket]);
  const name = (key: string) => itemName(byKey.get(key), lang, st.productById);

  // Варианты покупки: самый дешёвый план, «в один магазин» (полный), другие наборы магазинов
  const options = useMemo<Option[]>(() => {
    if (!result) return [];
    const out: Option[] = [{ id: "cheapest", kind: "cheapest", plan: result.plan }];
    const one = result.singles.find((x) => x.missing.length === 0) ?? result.bestSingle;
    if (one && result.plan.stores.length > 1) {
      out.push({
        id: `one-${one.chain}`,
        kind: "one",
        plan: { stores: [{ chain: one.chain, lines: one.lines, subtotal: one.total }], total: one.total, missing: one.missing, approx: one.lines.some((l) => l.approx) },
      });
    }
    for (const a of result.alternatives) {
      const sameAsOne = a.stores.length === 1 && out.some((o) => o.kind === "one" && o.plan.stores[0].chain === a.stores[0].chain);
      if (!sameAsOne) out.push({ id: `alt-${a.stores.map((x) => x.chain).join("-")}`, kind: "alt", plan: a });
    }
    // полные корзины — раньше неполных; затем «По-ниска цена», «В един магазин», остальные по цене
    const rank = { cheapest: 0, one: 1, alt: 2 } as const;
    return out.sort((a, b) => a.plan.missing.length - b.plan.missing.length || rank[a.kind] - rank[b.kind] || a.plan.total - b.plan.total);
  }, [result]);
  const sel = options.find((o) => o.id === selected) ?? options[0];
  const cheapest = options.find((o) => o.kind === "cheapest");

  // Брошюры: товар группы на 5–60% дешевле цены в плане — подсказка (не в «Лесен режим»)
  const visibleBro = useMemo(() => visibleChains(st.brochures, st.baseCity, st.excludedEiks), [st.brochures, st.baseCity, st.excludedEiks]);
  const broHints = useMemo(() => {
    const h = new Map<string, BrochureOffer>();
    if (!sel || !st.brochures || easy || !settings.showDeals || !settings.usePromo) return h;
    for (const sp of sel.plan.stores)
      for (const l of sp.lines) {
        const b = byKey.get(l.key);
        if (!b || b.pin) continue;
        const o = bestBrochureOffer(st.brochures, l.productId, visibleBro, today, b.brand);
        if (o && o.rp! < l.offer.price * 0.95 && o.rp! >= l.offer.price * 0.4) h.set(l.key, o);
      }
    return h;
  }, [sel, st.brochures, easy, settings.showDeals, settings.usePromo, byKey, visibleBro, today]);

  // Статистика: итог плана, когда экран открыт
  const planKey = result ? `${basket.length}|${maxStores}|${settings.usePromo}|${result.plan.total}|${st.area.mode}|${broHints.size}` : "";
  useFocusEffect(
    useCallback(() => {
      if (!result || !city) return;
      const id = setTimeout(() => {
        track("plan_viewed", {
          items: basket.length,
          found: P.found,
          pinned: basket.filter((b) => b.pin).length,
          brand_items: basket.filter((b) => b.brand).length,
          max_stores: maxStores,
          use_promo: settings.usePromo,
          area_mode: st.area.mode,
          plan_stores: result.plan.stores.length,
          plan_chains: result.plan.stores.map((x) => chainName(x.chain)),
          missing: result.plan.missing.length,
          approx: result.plan.approx,
          total: result.plan.total,
          best_single_chain: result.bestSingle ? chainName(result.bestSingle.chain) : undefined,
          savings: result.savings,
          savings_pct: result.savingsPct,
          options: options.length,
          brochure_hints: broHints.size,
        });
      }, 1500);
      return () => clearTimeout(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planKey]),
  );

  const limits = [
    { v: 1, label: t("oneStore") },
    { v: 2, label: "2" },
    { v: 3, label: "3" },
    { v: 0, label: t("anyNumber") },
  ];

  const header = (
    <>
      <ScreenHeader title={t("tabPlan")} />
      <DataStatus onOpenArea={() => setAreaOpen(true)} />
      {IS_DEMO && <DemoBanner />}
    </>
  );

  if (!basket.length || !result || !city || !sel) {
    return (
      <SafeAreaView style={s.screen} edges={["top"]}>
        <ScrollView contentContainerStyle={s.pad}>
          {header}
          <Card style={{ gap: 10 }}>
            <Text style={s.body}>{!basket.length ? t("emptyBasket") : t("calculating")}</Text>
            {!basket.length && <Button title={t("toBasket")} onPress={() => router.push("/")} />}
          </Card>
        </ScrollView>
        <AreaPicker visible={areaOpen} onClose={() => setAreaOpen(false)} />
      </SafeAreaView>
    );
  }

  const plan = sel.plan;
  const total = basket.length;
  const found = total - plan.missing.length;
  const fullSingle = result.singles.find((x) => x.missing.length === 0);
  const optTitle = (o: Option) => (o.kind === "cheapest" ? t("optCheapest") : o.kind === "one" ? t("optOneStore") : t("optAlt"));

  // 3) экономия и её база
  const explain: string[] = [];
  let saved = 0;
  if (plan.stores.length > 1) {
    if (fullSingle && plan.missing.length === 0 && fullSingle.total - plan.total > 0.004) {
      saved = fullSingle.total - plan.total;
      explain.push(t("saveExplain", { amount: m(saved), chain: chainName(fullSingle.chain) }));
    } else if (result.bestSingle && result.bestSingle.overpay > 0.004 && sel.kind === "cheapest") {
      saved = result.bestSingle.overpay;
      explain.push(t("saveExplainPartial", { amount: m(saved), chain: chainName(result.bestSingle.chain) }));
    } else explain.push(t("saveNone"));
    // сколько даёт последний добавленный магазин — если это не та же сумма, что и экономия выше
    const extra = sel.kind === "cheapest" && P.fewerStores ? P.fewerStores.total - plan.total : 0;
    if (extra > 0.004 && Math.abs(extra - saved) > 0.01)
      explain.push(t(plan.stores.length === 2 ? "extraStoreSaves" : "extraStoresSave", { amount: m(extra) }));
  }
  if (sel.kind === "cheapest" && P.noStoreCost && P.noStoreCost.stores.length > plan.stores.length && P.noStoreCost.total < plan.total - 0.004)
    explain.push(t("storeCostNote", { cost: m(settings.extraStoreCost), total: m(P.noStoreCost.total), n: P.noStoreCost.stores.length }));

  const reasonFor = (key: string) => {
    const b = byKey.get(key);
    if (!b?.pin) return "";
    const status = P.pinStatuses.get(key);
    if (status === "expired") return b.pin.source === "kzp" ? t("pinEnded") : t("pinExpired", { date: shortDate(b.pin.to ?? "") });
    if (status === "soon") return t("pinSoon", { date: shortDate(b.pin.from ?? "") });
    if (status === "unavailable") return t("pinUnavailable");
    return "";
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 32 }]}>
        {header}

        {/* 1) Общая стоимость, полнота корзины, число магазинов */}
        <View style={{ backgroundColor: C.green, borderRadius: 22, padding: 20, gap: 4 }} accessible accessibilityRole="summary">
          <Text style={{ color: "#CFE6D6", fontWeight: "700", fontSize: 15 * kf }}>
            {t("planTotal")} · {optTitle(sel)}
          </Text>
          <Text style={{ color: "#fff", fontSize: 42 * kf, fontWeight: "800", fontFamily: mono }}>
            {plan.approx ? "≈ " : ""}
            {m(plan.total)}
          </Text>
          <Text style={{ color: plan.missing.length ? "#FFE1D8" : "#fff", fontSize: 17 * kf, fontWeight: "700" }}>
            {plan.missing.length ? t("planIncomplete", { n: found, total }) : t("planComplete", { total })}
          </Text>
          <Text style={{ color: "#fff", fontSize: 16 * kf }}>
            {plan.stores.length === 1 ? t("planStore1") : t("planStores", { n: plan.stores.length })}: {plan.stores.map((x) => chainName(x.chain)).join(", ")}
          </Text>
        </View>

        {/* 2) Варианты покупки */}
        {!easy && (
          <>
            <H style={{ marginTop: 4 }}>{t("howManyStores")}</H>
            <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
              {limits.map((l) => {
                const locked = !st.can("moreStores") && (l.v === 0 || l.v > FREE_MAX_STORES);
                return (
                  <Chip
                    key={l.v}
                    label={locked ? `${l.label} 🔒` : l.label}
                    active={maxStores === l.v}
                    onPress={() => {
                      setSelected("cheapest");
                      if (locked) st.openPaywall();
                      else st.updateSettings({ maxStores: l.v });
                    }}
                  />
                );
              })}
            </View>
          </>
        )}
        {options.length > 1 && (
          <>
            <H style={{ marginTop: 4 }}>{t("planOptions")}</H>
            {options.map((o) => (
              <OptionCard
                key={o.id}
                title={optTitle(o)}
                plan={o.plan}
                city={city}
                base={cheapest?.plan}
                active={o.id === sel.id}
                total={total}
                onPress={() => {
                  setSelected(o.id);
                  track("option_selected", { kind: o.kind, stores: o.plan.stores.length });
                }}
              />
            ))}
          </>
        )}

        {/* 3) Пояснение экономии и база сравнения */}
        {(explain.length > 0 || plan.approx) && (
          <Card style={{ gap: 8, backgroundColor: "#FFF8E8", borderColor: "#F0DFA8" }}>
            {explain.map((e, i) => (
              <Text key={i} style={s.body}>
                💡 {e}
              </Text>
            ))}
            {plan.approx && <Text style={[s.body, { color: "#8A5A00" }]}>≈ {t("approxPlan")}</Text>}
          </Card>
        )}

        {/* 4) Список покупок по магазинам (порядок — не маршрут) */}
        <H style={{ marginTop: 6 }}>{t("shoppingList")}</H>
        {plan.stores.map((sp) => (
          <Card key={sp.chain} style={{ gap: 14 }}>
            <View style={{ gap: 2 }}>
              <Text style={[s.body, { fontWeight: "800", fontSize: 22 * kf }]} accessibilityRole="header">
                {t("buyAt", { chain: chainName(sp.chain) })}
              </Text>
              {!!city.chains[sp.chain]?.label && <Text style={s.muted}>📍 {city.chains[sp.chain]?.label}</Text>}
            </View>
            {sp.lines.map((l) => {
              const hint = broHints.get(l.key);
              const b = byKey.get(l.key);
              const promo = !easy && b && !b.pin && b.brand && settings.showDeals && settings.usePromo ? bestPromo(city, l.productId, excluded) : null;
              const deal = promo && promo.price <= l.offer.price * 0.8 ? promo : null;
              return (
                <View key={l.key} style={{ gap: 8 }}>
                  <PurchaseLine line={l} item={b} />
                  {hint && (
                    <View style={{ backgroundColor: "#FFF8E8", borderRadius: 12, padding: 10, marginLeft: 40 * kf }}>
                      <Text style={[s.body, { fontSize: 14 }]}>
                        {t("brochureHint", {
                          chain: st.brochures?.chains[hint.c]?.name ?? "",
                          product: hint.n,
                          price: hint.p != null ? m(hint.p) : "",
                          card: hint.k ? t("brochureCard") : "",
                          valid: t("validTo", { date: shortDate(hint.t) }),
                        })}
                      </Text>
                    </View>
                  )}
                  {deal && (
                    <View style={{ backgroundColor: C.promoSoft, borderRadius: 12, padding: 10, gap: 6, marginLeft: 40 * kf }}>
                      <Text style={[s.body, { fontSize: 14 }]}>
                        🔥{" "}
                        {t("superDealText", {
                          product: deal.product,
                          chain: chainName(deal.chain),
                          price: m(deal.price),
                          pct: Math.round((1 - deal.price / l.offer.price) * 100),
                        })}
                      </Text>
                      <Pressable
                        onPress={() => {
                          const g = city.brands?.[String(l.productId)] ?? {};
                          const br = Object.keys(g).find((k) => g[k].some((x) => x[5] === deal.product || x[2] === deal.product));
                          track("superdeal_taken", { group: l.productId, from_brand: b?.brand, to_brand: br ?? "any", chain: chainName(deal.chain) });
                          st.setBrand(l.key, br);
                        }}
                        accessibilityRole="button"
                        style={{ alignSelf: "flex-start" }}
                      >
                        <Text style={{ color: C.promo, fontWeight: "800" }}>{t("takeIt")} →</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={s.divider} />
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.muted}>{t("storeTotal")}</Text>
              <Text style={[s.body, s.num, { fontWeight: "800" }]}>{m(sp.subtotal)}</Text>
            </View>
          </Card>
        ))}

        {plan.missing.length > 0 && (
          <Card style={{ gap: 8, backgroundColor: "#FFF1EC", borderColor: "#F3C9BB" }}>
            <Text style={[s.body, { fontWeight: "800" }]}>⚠️ {t("missingTitle")}</Text>
            {plan.missing.map((k) => (
              <Text key={k} style={s.body}>
                • {name(k)}
                {reasonFor(k) ? <Text style={s.muted}> — {reasonFor(k)}</Text> : null}
              </Text>
            ))}
          </Card>
        )}

        {/* 5) Подробное сравнение: полные и неполные корзины раздельно */}
        {!easy && result.singles.length > 1 && (
          <>
            <H style={{ marginTop: 6 }}>{t("compareTitle")}</H>
            <CompareBlock title={t("compareFull")} rows={result.singles.filter((x) => !x.missing.length)} base={plan.total} city={city} />
            <CompareBlock title={t("compareNotFull")} rows={result.singles.filter((x) => x.missing.length)} base={plan.total} city={city} incomplete />
            <Text style={[s.muted, { fontSize: 13 }]}>{t("sizeNote")}</Text>
          </>
        )}
      </ScrollView>
      <AreaPicker visible={areaOpen} onClose={() => setAreaOpen(false)} />
    </SafeAreaView>
  );
}

/** Карточка варианта: сумма, магазины, разница с самым дешёвым, пометка «непълна» */
function OptionCard({
  title,
  plan,
  city,
  base,
  active,
  total,
  onPress,
}: {
  title: string;
  plan: Plan;
  city: CityFile;
  base?: Plan;
  active: boolean;
  total: number;
  onPress: () => void;
}) {
  const { t, lang } = useStore();
  const s = useS();
  const kf = useK();
  const m = (n: number) => money(n, lang);
  const more = base ? Math.round((plan.total - base.total) * 100) / 100 : 0;
  const incomplete = plan.missing.length > 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: active }}>
      <Card style={{ gap: 4, borderColor: active ? C.green : C.line, borderWidth: active ? 2.5 : 1 }}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
          <View style={[s.row, { gap: 8, flex: 1 }]}>
            <Icon name={active ? "radio-button-on" : "radio-button-off"} size={24 * kf} color={active ? C.green : C.muted} />
            <Text style={[s.body, { fontWeight: "800", fontSize: 18 * kf, flexShrink: 1 }]}>{title}</Text>
          </View>
          <Text style={[s.body, s.num, { fontWeight: "800", fontSize: 20 * kf }]}>
            {plan.approx ? "≈ " : ""}
            {m(plan.total)}
          </Text>
        </View>
        <Text style={[s.body, { fontWeight: "600" }]}>{plan.stores.map((x) => city.chains[x.chain]?.name ?? "?").join(" + ")}</Text>
        {incomplete ? (
          <Text style={[s.muted, { color: C.promo, fontWeight: "700" }]}>
            {t("optIncomplete")}: {t("estimateOf", { n: total - plan.missing.length, total })}
          </Text>
        ) : more > 0.004 ? (
          <Text style={[s.muted, { color: C.promo, fontWeight: "700" }]}>{t("optionMore", { amount: m(more) })}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function CompareBlock({
  title,
  rows,
  base,
  city,
  incomplete,
}: {
  title: string;
  rows: { chain: number; total: number; missing: string[]; overpay: number }[];
  base: number;
  city: CityFile;
  incomplete?: boolean;
}) {
  const { t, lang } = useStore();
  const s = useS();
  if (!rows.length) return null;
  const m = (n: number) => money(n, lang);
  const max = Math.max(base, ...rows.map((x) => x.total));
  return (
    <Card style={{ gap: 12 }}>
      <Text style={[s.body, { fontWeight: "800" }]}>{title}</Text>
      {rows.map((x) => (
        <View key={x.chain} style={{ gap: 5 }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={[s.body, { flex: 1, marginRight: 10, fontWeight: "600" }]}>
              {city.chains[x.chain]?.label ? `${city.chains[x.chain]?.name} · ${city.chains[x.chain]?.label}` : city.chains[x.chain]?.name}
            </Text>
            <Text style={[s.num, { flexShrink: 0, fontWeight: "700", fontSize: 16 }]}>{m(x.total)}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: "#EEE8DC", overflow: "hidden" }}>
            <View style={{ width: `${Math.max(4, (x.total / (max || 1)) * 100)}%`, height: "100%", borderRadius: 4, backgroundColor: incomplete ? "#D9B8A8" : "#B9C4B5" }} />
          </View>
          <Text style={[s.muted, { fontSize: 13, color: incomplete ? C.promo : C.muted }]}>
            {incomplete ? t("missingN", { n: x.missing.length }) : x.overpay > 0.004 ? t("overpay", { amount: m(x.overpay) }) : t("same")}
          </Text>
        </View>
      ))}
    </Card>
  );
}
