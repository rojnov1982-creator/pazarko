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
import { isPerKgOffer, itemKey, pinFromBrochure } from "./lib/pins";
import { weeklyPromoBasket } from "./lib/promoBasket";
import { conditionKey, favNameFrom, favoriteOffers, favWords, historyMatches, matchesWords, offerMatches, type HistoryProduct } from "./lib/favorites";
import { router } from "expo-router";
import { useStore } from "./lib/store";
import type { BrochureOffer } from "./lib/types";
import type { TKey } from "./lib/i18n";
import { chainColor, historyLine, Icon, OfferCard } from "./components";
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

  // поиск по прошлым неделям: продукты, у которых есть закончившаяся акция и нет действующей.
  // Сначала все фильтры (сеть, раздел, дата), потом лимит — иначе нужная запись отсекалась бы раньше фильтра
  const past = useMemo(() => {
    if (q.trim().length < 3) return [];
    const chainName = chain != null ? bro?.chains[chain]?.name : undefined;
    return historyMatches(
      st.historyProducts,
      favWords(q),
      (p) => !!p.last && !p.now && (!chainName || p.ch === chainName) && inCat({ a: p.a } as BrochureOffer),
      30,
    );
  }, [q, st.historyProducts, chain, bro, inCat]);

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
          {/* любимые продукты: что из них в акция тази седмица */}
          <FavoritesCard visible={visible} today={today} />
          {/* готовая корзина из лучших акций недели */}
          <WeeklyCard visible={visible} today={today} />
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
      contentContainerStyle={[s.pad, { paddingBottom: 110 }]}
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
        <View style={{ gap: 10, marginTop: 12 }}>
          {past.length > 0 && <PastOffers items={past} />}
          {bro && list.length ? (
            <Text style={[s.muted, { fontSize: 12 }]}>{t("brochuresNote")}</Text>
          ) : null}
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => <OfferRow o={item} today={today} />}
    />
  );
}

/** Прошедшие акции из истории брошюр: где, почём и на каких условиях было; «♡ Следи» — в любимые */
function PastOffers({ items }: { items: HistoryProduct[] }) {
  const st = useStore();
  const { t, lang } = st;
  const k = useK();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "900", fontSize: 18 * k, color: C.ink }} accessibilityRole="header">
        🕘 {t("pastTitle", { n: items.length })}
      </Text>
      <Text style={[s.muted, { fontSize: 14 * k }]}>{t("pastNote")}</Text>
      {items.map((p) => {
        const followed = st.favorites.some((f) => matchesWords(f.words, `${p.n} ${p.b ?? ""}`));
        const g = p.g ? st.productById.get(p.g) : undefined;
        return (
          <View
            key={p.key}
            style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, gap: 6 }}
          >
            <View style={[s.row, { gap: 10, alignItems: "flex-start" }]}>
              <Text style={{ fontSize: 26 * k }}>{g ? productEmoji(g) : (CAT_EMOJI[p.a ?? 0] ?? "🏷️")}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: "700", fontSize: 15.5 * k, color: C.ink }}>{p.n}</Text>
                <Text style={[s.muted, { fontSize: 13.5 * k }]}>{historyLine(p.last!, t, lang, { weeks: p.weeks })}</Text>
                {!!p.next && (
                  <Text style={{ color: C.promo, fontWeight: "700", fontSize: 13.5 * k }}>
                    {t("histNext", { what: historyLine(p.next, t, lang, { chain: false }) })}
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={() => {
                st.addFavorite(favNameFrom(p.n, p.b));
                track("favorite_from_history", { product: p.n });
              }}
              disabled={followed}
              accessibilityRole="button"
              accessibilityLabel={`${followed ? t("favFollowing") : t("favFollow")}: ${p.n}`}
              style={[s.row, { gap: 6, alignSelf: "flex-start", minHeight: 36 }]}
            >
              <Icon name={followed ? "heart" : "heart-outline"} size={20 * k} color={C.promo} />
              <Text style={{ color: C.promo, fontWeight: "800", fontSize: 15 * k }}>
                {followed ? t("favFollowing") : t("favFollow")}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function FavoritesCard({
  visible,
  today,
}: {
  visible: boolean[];
  today: string;
}) {
  const st = useStore();
  const { t, lang, brochures: bro, favorites } = st;
  const k = useK();
  const onSale = useMemo(
    () =>
      favorites
        .map((f) => ({
          f,
          o: favoriteOffers(
            f,
            bro,
            visible,
            (o) => offerStatus(o, today) === "now",
          )[0],
        }))
        .filter((x) => x.o),
    [favorites, bro, visible, today],
  );
  const open = () => router.push("/favorites");
  if (!favorites.length) {
    return (
      <Pressable
        onPress={open}
        accessibilityRole="button"
        style={[
          s.row,
          {
            gap: 10,
            backgroundColor: C.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.line,
            padding: 14,
            minHeight: 56 * k,
          },
        ]}
      >
        <Text style={{ fontSize: 22 * k }}>❤️</Text>
        <Text
          style={{ flex: 1, fontWeight: "800", fontSize: 16 * k, color: C.ink }}
        >
          {t("favPromo")}
        </Text>
        <Icon name="chevron-forward" size={20 * k} color={C.muted} />
      </Pressable>
    );
  }
  return (
    <View
      style={{
        backgroundColor: "#FFF1F0",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#F4C9C4",
        padding: 14,
        gap: 8,
      }}
    >
      <Text
        style={{ fontWeight: "900", fontSize: 18 * k, color: C.ink }}
        accessibilityRole="header"
      >
        ❤️ {t("favCardTitle")} · {onSale.length}/{favorites.length}
      </Text>
      {onSale.length ? (
        onSale.slice(0, 5).map(({ f, o }) => (
          <View key={f.id} style={{ gap: 1 }}>
            <Text
              style={{ fontWeight: "800", fontSize: 15.5 * k, color: C.ink }}
            >
              {f.name}
            </Text>
            <Text
              style={{ color: C.promo, fontWeight: "700", fontSize: 14.5 * k }}
            >
              {bro?.chains[o!.c]?.name} · {money(o!.p ?? 0, lang)}
              {isPerKgOffer(o!) ? t("perKg") : ""}
              {o!.d ? ` (−${o!.d}%)` : ""} ·{" "}
              {t("validTo", { date: shortDate(o!.t) })}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[s.muted, { fontSize: 14.5 * k }]}>
          {t("favCardNone")}
        </Text>
      )}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        hitSlop={6}
        style={[s.row, { gap: 4, minHeight: 40 }]}
      >
        <Text style={{ color: C.green, fontWeight: "800", fontSize: 15 * k }}>
          {t("favCardAll")} ({favorites.length})
        </Text>
        <Icon name="chevron-forward" size={18 * k} color={C.green} />
      </Pressable>
    </View>
  );
}

/** Название любимого продукта из предложения: «Луканка Орехите» (первое слово + марка) */
function favNameFromOffer(o: BrochureOffer) {
  const title = (w: string) =>
    w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "";
  const brand = (o.b ?? "").split(/\s+/)[0] ?? "";
  const first =
    o.n.split(/[\s,;]+/).find((w) => w.length > 2 && w.toUpperCase() !== w) ??
    o.n.split(/\s+/)[0];
  return [first, title(brand)].filter(Boolean).join(" ");
}

function WeeklyCard({ visible, today }: { visible: boolean[]; today: string }) {
  const st = useStore();
  const { t, lang, brochures: bro } = st;
  const k = useK();
  const [open, setOpen] = useState(false);
  const wk = useMemo(
    () =>
      weeklyPromoBasket(bro, visible, today, {
        hasGroup: (id) => st.productById.has(id),
        // семейство = значок продукта (кафе на зърна и мляно — одно ☕)
        family: (id) => productEmoji(st.productById.get(id)),
      }),
    [bro, visible, today, st.productById],
  );
  if (!wk || !bro) return null;
  const m = (n: number) => money(n, lang);
  const names = wk.chains.map((c) => bro.chains[c]?.name ?? "").join(" + ");
  const inBasket = new Set(st.basket.map(itemKey));
  const missing = wk.picks.filter((p) => !inBasket.has(`pin:${p.pin.id}`));
  return (
    <View
      style={{
        borderRadius: 20,
        backgroundColor: C.green,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={[s.row, { gap: 10, alignItems: "flex-start" }]}>
        <Text style={{ fontSize: 34 * k }}>🧺</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{ color: "#fff", fontSize: 20 * k, fontWeight: "900" }}
            accessibilityRole="header"
          >
            {t("weeklyTitle")}
          </Text>
          <Text
            style={{ color: "#E3F0E5", fontSize: 15 * k, fontWeight: "600" }}
          >
            {t("weeklySub", { n: wk.picks.length, chains: names })}
          </Text>
        </View>
      </View>
      <View
        style={[s.row, { gap: 10, flexWrap: "wrap", alignItems: "baseline" }]}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 32 * k,
            fontWeight: "900",
            letterSpacing: -0.5,
          }}
        >
          {m(wk.total)}
        </Text>
        <Text
          style={{
            color: "#CFE3D3",
            fontSize: 16 * k,
            textDecorationLine: "line-through",
          }}
        >
          {t("weeklyUsual", { amount: m(wk.regular) })}
        </Text>
      </View>
      <Text style={{ color: "#fff", fontSize: 16 * k, fontWeight: "800" }}>
        {t("weeklySave", {
          amount: m(Math.round((wk.regular - wk.total) * 100) / 100),
        })}
      </Text>
      <Text
        style={{ fontSize: 22 * k, letterSpacing: 2 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {wk.picks
          .map((p) => productEmoji(st.productById.get(p.productId)))
          .join(" ")}
      </Text>
      {open && (
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 10,
            gap: 6,
          }}
        >
          {wk.picks.map((p) => (
            <View
              key={p.pin.id}
              style={[s.row, { gap: 8, alignItems: "flex-start" }]}
            >
              <Text style={{ fontSize: 16 * k }}>
                {productEmoji(st.productById.get(p.productId))}
              </Text>
              <Text style={{ flex: 1, color: "#fff", fontSize: 14.5 * k }}>
                {p.offer.n}{" "}
                <Text style={{ color: "#CFE3D3" }}>
                  · {bro.chains[p.offer.c]?.name}
                </Text>
              </Text>
              <Text
                style={{ color: "#fff", fontWeight: "800", fontSize: 14.5 * k }}
              >
                {m(p.offer.p!)}
              </Text>
            </View>
          ))}
          <Text style={{ color: "#CFE3D3", fontSize: 13 * k }}>
            {t("weeklyNote", { stores: names })}
          </Text>
        </View>
      )}
      <View style={[s.row, { gap: 10 }]}>
        <Pressable
          onPress={() => {
            if (!missing.length) return router.push("/promos");
            for (const p of missing) st.addPinned(p.pin, p.productId);
            track("weekly_basket_added", {
              items: missing.length,
              chains: names,
              total: wk.total,
            });
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 50 * k,
            borderRadius: 14,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 8,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              color: C.green,
              fontWeight: "900",
              fontSize: 16 * k,
              textAlign: "center",
            }}
          >
            {missing.length
              ? t("weeklyAddAll", { n: missing.length })
              : `✓ ${t("myPromos")} →`}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setOpen(!open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={{
            minHeight: 50 * k,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 * k }}>
            {open ? t("weeklyHide") : t("weeklyShow")}
          </Text>
        </Pressable>
      </View>
    </View>
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
      condition={o.w ?? (conditionKey(o) ? t(conditionKey(o) as TKey) : undefined)}
      check={check}
      onFollow={() => {
        const f = st.addFavorite(favNameFromOffer(o));
        if (f) track("favorite_from_offer", { chain, product: o.n });
      }}
      followed={st.favorites.some((f) => offerMatches(f.words, o))}
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

/** Плашка внизу «Оферти»: сколько акций выбрано и на какую сумму → «Моите акции» */
export function MyPromosBar() {
  const st = useStore();
  const { t, lang } = st;
  const k = useK();
  const pins = st.basket.filter((b) => b.pin);
  if (!pins.length) return null;
  const total =
    Math.round(
      pins.reduce((sum, b) => sum + b.qty * (b.pin?.price ?? 0), 0) * 100,
    ) / 100;
  return (
    <View style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
      <Pressable
        onPress={() => router.push("/promos")}
        accessibilityRole="button"
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 58 * k,
          borderRadius: 18,
          paddingHorizontal: 16,
          backgroundColor: C.ink,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ fontSize: 24 * k }}>🧺</Text>
        <Text
          style={{
            flex: 1,
            color: "#fff",
            fontWeight: "800",
            fontSize: 16.5 * k,
          }}
          numberOfLines={2}
        >
          {t("myPromosBar", { n: pins.length, amount: money(total, lang) })}
        </Text>
        <Icon name="chevron-forward" size={22 * k} color="#fff" />
      </Pressable>
    </View>
  );
}
