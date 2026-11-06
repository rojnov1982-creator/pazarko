// Вкладка «Оферти» → «Брошури»: предложения из седмичните брошури на веригите.

import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { track } from "./lib/analytics";
import { kzpCheck, offerStatus, shortDate, todayIso, unitPriceLabel, visibleChains } from "./lib/brochures";
import { productName, sizeLabel, splitName } from "./lib/i18n";
import { itemKey, pinFromBrochure } from "./lib/pins";
import { useStore } from "./lib/store";
import type { BrochureOffer } from "./lib/types";
import { chainColor, Icon, OfferCard } from "./components";
import { C, CAT_EMOJI, Chip, money, productEmoji, qtyLabel, s } from "./ui";

const fold = (t: string) => t.toLowerCase().replace(/ъ/g, "а").replace(/ё/g, "е");

export function BrochureList({ header }: { header: React.ReactElement }) {
  const st = useStore();
  const { t, brochures: bro } = st;
  const today = todayIso();
  const [chain, setChain] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [food, setFood] = useState(true);

  // сети, которые есть в городе и не исключены в настройках
  const visible = useMemo(() => visibleChains(bro, st.baseCity, st.excludedEiks), [bro, st.baseCity, st.excludedEiks]);
  const active = useMemo(() => (bro?.offers ?? []).filter((o) => visible[o.c] && offerStatus(o, today) !== "expired"), [bro, visible, today]);
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const o of active) if (!food || (o.a ?? 0) <= 12) m.set(o.c, (m.get(o.c) ?? 0) + 1);
    return m;
  }, [active, food]);
  const list = useMemo(() => {
    const fq = fold(q.trim());
    const res = active.filter(
      (o) =>
        (chain == null || o.c === chain) &&
        (!food || (o.a ?? 0) <= 12) &&
        (!fq || fold(o.n).includes(fq) || (!!o.b && fold(o.b).includes(fq)) || fold(bro!.types[o.y] ?? "").includes(fq)),
    );
    // сначала действующие, потом «скоро»; внутри — по размеру скидки (так уже отсортировано в файле)
    return [...res.filter((o) => offerStatus(o, today) === "now"), ...res.filter((o) => offerStatus(o, today) === "soon")];
  }, [active, chain, food, q, bro, today]);

  const filters = (
    <View style={{ gap: 8, marginBottom: 4 }}>
      {header}
      {bro && (
        <>
          <View style={[s.row, { backgroundColor: "#EFEAE0", borderRadius: 16, paddingHorizontal: 14, minHeight: 50, gap: 10 }]}>
            <Icon name="search-outline" size={20} color={C.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t("brochuresSearch")}
              placeholderTextColor={C.muted}
              accessibilityLabel={t("brochuresSearch")}
              style={{ flex: 1, fontSize: 16, color: C.ink, paddingVertical: 11 }}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label={`🥦 ${t("onlyFood")}`} active={food} onPress={() => setFood(!food)} />
            <Chip label={t("all")} active={chain == null} onPress={() => setChain(null)} />
            {bro.chains.map((ch, i) =>
              counts.get(i) ? (
                <ChainChip
                  key={ch.name}
                  name={ch.name}
                  count={counts.get(i)}
                  active={chain === i}
                  onPress={() => {
                    setChain(chain === i ? null : i);
                    track("brochure_chain_filter", { chain: ch.name });
                  }}
                />
              ) : null,
            )}
          </ScrollView>
        </>
      )}
    </View>
  );

  return (
    <FlatList
      data={list}
      keyExtractor={(o, i) => `${o.c}-${i}-${o.n}`}
      contentContainerStyle={[s.pad, { paddingBottom: 32 }]}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={12}
      windowSize={7}
      ListHeaderComponent={filters}
      ListEmptyComponent={<Text style={s.muted}>{bro ? t("brochuresEmpty") : t("brochuresNone")}</Text>}
      ListFooterComponent={bro && list.length ? <Text style={[s.muted, { fontSize: 12, marginTop: 12 }]}>{t("brochuresNote")}</Text> : undefined}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <OfferRow o={item} today={today} />}
    />
  );
}

function OfferRow({ o, today }: { o: BrochureOffer; today: string }) {
  const st = useStore();
  const { t, lang, brochures: bro } = st;
  const soon = offerStatus(o, today) === "soon";
  const chain = bro?.chains[o.c]?.name ?? "";
  const pin = bro && o.p != null ? pinFromBrochure(o, bro) : null;
  const pinKey = pin ? `pin:${pin.id}` : "";
  const inBasket = pinKey ? st.basket.find((b) => itemKey(b) === pinKey) : undefined;
  const perKg = !!pin?.perKg;
  const group = o.g ? st.productById.get(o.g) : undefined;
  const emoji = group ? productEmoji(group) : CAT_EMOJI[o.a ?? 0] ?? "🏷️";
  // проверка по КЗП: та же сеть и город, цена за эталонную фасовку группы
  const kc = kzpCheck(o, bro, st.city);
  const refSize = group ? (group.byWeight ? { unit: "kg" as const, size: 1 } : group.ref ?? group.std) : undefined;
  const ref = refSize ? t("perSize", { size: sizeLabel(refSize, t, lang) }) : "";
  // «обикновено» — самая низкая обычная цена этой марки (или группы) в сети по КЗП, не цена того же артикула
  const what = kc?.brand && o.b ? o.b : group ? splitName(productName(group, lang), lang)[0].toLowerCase() : "";
  const check = kc
    ? kc.real >= 5
      ? { text: t("kzpGood", { chain, what, price: money(kc.regular, lang), ref, pct: kc.real }), tone: "good" as const }
      : { text: t("kzpWeak", { chain, what, price: money(kc.regular, lang), ref }), tone: "weak" as const }
    : undefined;
  return (
    <OfferCard
      emoji={emoji}
      chain={chain}
      title={o.n}
      detail={[o.b, unitPriceLabel(o.u, lang)].filter(Boolean).join(" · ")}
      price={o.p}
      regular={o.r}
      pct={o.d}
      soon={soon}
      dateLabel={soon ? `${t("validFrom", { date: shortDate(o.f) })} · ${t("soon")}` : t("validTo", { date: shortDate(o.t) })}
      card={!!o.k}
      condition={o.w}
      check={check}
      qty={inBasket?.qty}
      qtyLabel={inBasket ? qtyLabel(inBasket.qty, perKg, t, lang) : undefined}
      onAdd={
        pin
          ? () => {
              track("brochure_added", { group: o.g, chain, product: o.n, pct: o.d, soon, id: o.i ?? "" });
              st.addPinned(pin, o.g && st.productById.has(o.g) ? o.g : 0);
            }
          : undefined
      }
      onMinus={() => inBasket && st.setQty(pinKey, Math.round((inBasket.qty - (perKg ? 0.5 : 1)) * 10) / 10)}
      onPlus={() => inBasket && st.setQty(pinKey, Math.round((inBasket.qty + (perKg ? 0.5 : 1)) * 10) / 10)}
    />
  );
}

/** Фильтр по сети: цветная метка + название (без логотипов сетей) */
export function ChainChip({ name, count, active, onPress }: { name: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[s.chip, s.row, { gap: 6 }, active && s.chipActive]}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: active ? "#fff" : chainColor(name) }} />
      <Text style={[s.chipText, active && { color: "#fff" }]}>
        {name}
        {count != null ? ` · ${count}` : ""}
      </Text>
    </Pressable>
  );
}
