// Вкладка «Оферти» → «Брошури»: предложения из седмичните брошури на веригите.

import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { track } from "./lib/analytics";
import {
  kzpCheck,
  offerStatus,
  shortDate,
  todayIso,
  unitPriceLabel,
  visibleChains,
} from "./lib/brochures";
import { productName, sizeLabel, splitName } from "./lib/i18n";
import { itemKey, pinFromBrochure } from "./lib/pins";
import { useStore } from "./lib/store";
import type { BrochureOffer } from "./lib/types";
import type { TKey } from "./lib/i18n";
import { chainColor, Icon, OfferCard } from "./components";
import {
  C,
  CAT_EMOJI,
  Chip,
  money,
  productEmoji,
  qtyLabel,
  s,
  useK,
} from "./ui";

const fold = (t: string) =>
  t.toLowerCase().replace(/ъ/g, "а").replace(/ё/g, "е");

/** Разделы брошюр (поле `a`, 1–17) для фильтра по категориям; «Храни» = 1–12 */
const CATS: {
  id: string;
  emoji: string;
  label: TKey;
  full: TKey;
  a: number[];
}[] = [
  {
    id: "food",
    emoji: "🛒",
    label: "bcatFood",
    full: "bcatFood",
    a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  { id: "meat", emoji: "🥩", label: "bcatMeatS", full: "bcatMeat", a: [4, 5] },
  {
    id: "dairy",
    emoji: "🧀",
    label: "bcatDairy",
    full: "bcatDairy",
    a: [2, 3],
  },
  { id: "veg", emoji: "🥕", label: "bcatVegS", full: "bcatVeg", a: [6, 9] },
  { id: "bread", emoji: "🍞", label: "bcatBreadS", full: "bcatBread", a: [1] },
  { id: "sweet", emoji: "🍫", label: "bcatSweet", full: "bcatSweet", a: [7] },
  {
    id: "pantry",
    emoji: "🥫",
    label: "bcatPantryS",
    full: "bcatPantry",
    a: [8],
  },
  {
    id: "drinks",
    emoji: "☕",
    label: "bcatDrinksS",
    full: "bcatDrinks",
    a: [10, 11],
  },
  {
    id: "alcohol",
    emoji: "🍷",
    label: "bcatAlcohol",
    full: "bcatAlcohol",
    a: [12],
  },
  {
    id: "home",
    emoji: "🧴",
    label: "bcatHomeS",
    full: "bcatHome",
    a: [13, 14],
  },
  {
    id: "other",
    emoji: "🏠",
    label: "bcatOtherS",
    full: "bcatOther",
    a: [15, 16, 17],
  },
  { id: "all", emoji: "🏷️", label: "bcatAll", full: "bcatAll", a: [] },
];

export function BrochureList({ header }: { header: React.ReactElement }) {
  const st = useStore();
  const { t, brochures: bro } = st;
  const today = todayIso();
  const [chain, setChain] = useState<number | null>(null);
  const [q, setQ] = useState("");
  // по умолчанию — все храни; можно выбрать раздел или «Всички» (вкл. дом, животни, техника)
  const [cat, setCat] = useState<string>("food");
  const inCat = useMemo(() => {
    const c = CATS.find((x) => x.id === cat);
    return (o: BrochureOffer) => !c || c.id === "all" || c.a.includes(o.a ?? 0);
  }, [cat]);

  // сети, которые есть в городе и не исключены в настройках
  const visible = useMemo(
    () => visibleChains(bro, st.baseCity, st.excludedEiks),
    [bro, st.baseCity, st.excludedEiks],
  );
  const active = useMemo(
    () =>
      (bro?.offers ?? []).filter(
        (o) => visible[o.c] && offerStatus(o, today) !== "expired",
      ),
    [bro, visible, today],
  );
  // счётчики: сети — в выбранном разделе, разделы — в выбранной сети
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const o of active) if (inCat(o)) m.set(o.c, (m.get(o.c) ?? 0) + 1);
    return m;
  }, [active, inCat]);
  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of active) {
      if (chain != null && o.c !== chain) continue;
      for (const c of CATS)
        if (c.id === "all" || c.a.includes(o.a ?? 0))
          m.set(c.id, (m.get(c.id) ?? 0) + 1);
    }
    return m;
  }, [active, chain]);
  const list = useMemo(() => {
    const fq = fold(q.trim());
    const res = active.filter(
      (o) =>
        (chain == null || o.c === chain) &&
        inCat(o) &&
        (!fq ||
          fold(o.n).includes(fq) ||
          (!!o.b && fold(o.b).includes(fq)) ||
          fold(bro!.types[o.y] ?? "").includes(fq)),
    );
    // сначала действующие, потом «скоро»; внутри — по размеру скидки (так уже отсортировано в файле)
    return [
      ...res.filter((o) => offerStatus(o, today) === "now"),
      ...res.filter((o) => offerStatus(o, today) === "soon"),
    ];
  }, [active, chain, inCat, q, bro, today]);

  const filters = (
    <View style={{ gap: 8, marginBottom: 4 }}>
      {header}
      {bro && (
        <>
          <View
            style={[
              s.row,
              {
                backgroundColor: "#EFEAE0",
                borderRadius: 16,
                paddingHorizontal: 14,
                minHeight: 50,
                gap: 10,
              },
            ]}
          >
            <Icon name="search-outline" size={20} color={C.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t("brochuresSearch")}
              placeholderTextColor={C.muted}
              accessibilityLabel={t("brochuresSearch")}
              style={{
                flex: 1,
                fontSize: 16,
                color: C.ink,
                paddingVertical: 11,
              }}
            />
          </View>
          {/* 1) раздел — главный фильтр: плитки, все видны сразу */}
          <CategoryGrid
            value={cat}
            counts={catCounts}
            onChange={(id) => {
              setCat(cat === id && id !== "food" ? "food" : id);
              track("brochure_category_filter", { category: id });
            }}
          />
          {/* 2) сеть — по желанию */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Chip
              label={t("allChains")}
              active={chain == null}
              onPress={() => setChain(null)}
            />
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
      ListEmptyComponent={
        <Text style={s.muted}>
          {bro ? t("brochuresEmpty") : t("brochuresNone")}
        </Text>
      }
      ListFooterComponent={
        bro && list.length ? (
          <Text style={[s.muted, { fontSize: 12, marginTop: 12 }]}>
            {t("brochuresNote")}
          </Text>
        ) : undefined
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <OfferRow o={item} today={today} />}
    />
  );
}

function CategoryGrid({
  value,
  counts,
  onChange,
}: {
  value: string;
  counts: Map<string, number>;
  onChange: (id: string) => void;
}) {
  const { t, settings } = useStore();
  const k = useK();
  const cols = settings.easy ? 3 : 4;
  const items = CATS.filter((c) => counts.get(c.id));
  const rows: (typeof CATS)[] = [];
  for (let i = 0; i < items.length; i += cols)
    rows.push(items.slice(i, i + cols));
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      {rows.map((r) => (
        <View key={r[0].id} style={{ flexDirection: "row", gap: 8 }}>
          {r.map((c) => {
            const on = value === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => onChange(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${t(c.full)}, ${counts.get(c.id)}`}
                style={{
                  flex: 1,
                  minHeight: 64 * k,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 6,
                  paddingHorizontal: 2,
                  backgroundColor: on ? C.green : C.card,
                  borderWidth: 1,
                  borderColor: on ? C.green : C.line,
                }}
              >
                <Text style={{ fontSize: 22 * k }}>{c.emoji}</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12.5 * k,
                    fontWeight: "700",
                    color: on ? "#fff" : C.ink,
                    marginTop: 2,
                  }}
                >
                  {t(c.label)}
                </Text>
              </Pressable>
            );
          })}
          {Array.from({ length: cols - r.length }, (_, i) => (
            <View key={`pad${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function OfferRow({ o, today }: { o: BrochureOffer; today: string }) {
  const st = useStore();
  const { t, lang, brochures: bro } = st;
  const soon = offerStatus(o, today) === "soon";
  const chain = bro?.chains[o.c]?.name ?? "";
  const pin = bro && o.p != null ? pinFromBrochure(o, bro) : null;
  const pinKey = pin ? `pin:${pin.id}` : "";
  const inBasket = pinKey
    ? st.basket.find((b) => itemKey(b) === pinKey)
    : undefined;
  const perKg = !!pin?.perKg;
  const group = o.g ? st.productById.get(o.g) : undefined;
  const emoji = group ? productEmoji(group) : (CAT_EMOJI[o.a ?? 0] ?? "🏷️");
  // проверка по КЗП: та же сеть и город, цена за эталонную фасовку группы
  const kc = kzpCheck(o, bro, st.city);
  const refSize = group
    ? group.byWeight
      ? { unit: "kg" as const, size: 1 }
      : (group.ref ?? group.std)
    : undefined;
  const ref = refSize
    ? t("perSize", { size: sizeLabel(refSize, t, lang) })
    : "";
  // «обикновено» — самая низкая обычная цена этой марки (или группы) в сети по КЗП, не цена того же артикула
  const what =
    kc?.brand && o.b
      ? o.b
      : group
        ? splitName(productName(group, lang), lang)[0].toLowerCase()
        : "";
  const check = kc
    ? kc.real >= 5
      ? {
          text: t("kzpGood", {
            chain,
            what,
            price: money(kc.regular, lang),
            ref,
            pct: kc.real,
          }),
          tone: "good" as const,
        }
      : {
          text: t("kzpWeak", {
            chain,
            what,
            price: money(kc.regular, lang),
            ref,
          }),
          tone: "weak" as const,
        }
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
      dateLabel={
        soon
          ? `${t("validFrom", { date: shortDate(o.f) })} · ${t("soon")}`
          : t("validTo", { date: shortDate(o.t) })
      }
      card={!!o.k}
      condition={o.w}
      check={check}
      qty={inBasket?.qty}
      qtyLabel={inBasket ? qtyLabel(inBasket.qty, perKg, t, lang) : undefined}
      onAdd={
        pin
          ? () => {
              track("brochure_added", {
                group: o.g,
                chain,
                product: o.n,
                pct: o.d,
                soon,
                id: o.i ?? "",
              });
              st.addPinned(pin, o.g && st.productById.has(o.g) ? o.g : 0);
            }
          : undefined
      }
      onMinus={() =>
        inBasket &&
        st.setQty(
          pinKey,
          Math.round((inBasket.qty - (perKg ? 0.5 : 1)) * 10) / 10,
        )
      }
      onPlus={() =>
        inBasket &&
        st.setQty(
          pinKey,
          Math.round((inBasket.qty + (perKg ? 0.5 : 1)) * 10) / 10,
        )
      }
    />
  );
}

/** Фильтр по сети: цветная метка + название (без логотипов сетей) */
export function ChainChip({
  name,
  count,
  active,
  onPress,
}: {
  name: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[s.chip, s.row, { gap: 6 }, active && s.chipActive]}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: active ? "#fff" : chainColor(name),
        }}
      />
      <Text style={[s.chipText, active && { color: "#fff" }]}>
        {name}
        {count != null ? ` · ${count}` : ""}
      </Text>
    </Pressable>
  );
}
