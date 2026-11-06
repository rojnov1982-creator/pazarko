// «Продукти»: поиск, разделы, «Често купувани» и все продукты — сеткой (крупный шрифт / Лесен режим — одной колонкой).

import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, ProductTile, ScreenHeader } from "../../components";
import {
  categoryName,
  productDetail,
  productName,
  splitName,
} from "../../lib/i18n";
import { cheapest, excludedIndexes } from "../../lib/prices";
import { PRESETS, useStore } from "../../lib/store";
import type { Product } from "../../lib/types";
import {
  C,
  CAT_EMOJI,
  Chip,
  money,
  productEmoji,
  qtyLabel,
  Stepper,
  useK,
  useS,
} from "../../ui";

const fold = (t: string) =>
  t.toLowerCase().replace(/ъ/g, "а").replace(/ё/g, "е");
/** «Често купувани»: товары готовой корзины «Седмица за семейство» */
const FREQUENT = PRESETS[0].items.map((i) => i.productId);

export default function CatalogScreen() {
  const st = useStore();
  const { t, lang } = st;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | null>(null);
  const s = useS();
  const kf = useK();
  const { width, fontScale } = useWindowDimensions();
  // две колонки — только если карточке хватает места при текущем размере шрифта
  const cols =
    !st.settings.easy && width / Math.max(1, fontScale) >= 340 ? 2 : 1;
  const excluded = useMemo(
    () => excludedIndexes(st.city, st.excludedEiks, st.settings.onlyGrocery),
    [st.city, st.excludedEiks, st.settings.onlyGrocery],
  );

  const cats = (st.products?.categories ?? []).filter(
    (c) => !(st.settings.hideMedicines && c.id === 14),
  );
  const all = useMemo(
    () =>
      (st.products?.products ?? []).filter(
        (p) => !(st.settings.hideMedicines && p.cat === 14),
      ),
    [st.products, st.settings.hideMedicines],
  );
  const fq = fold(q.trim());
  const filtered = all.filter(
    (p) =>
      (cat == null || p.cat === cat) &&
      (!fq || fold(p.bg).includes(fq) || p.en.toLowerCase().includes(fq)),
  );
  const showFrequent = !fq && cat == null;
  const frequent = showFrequent
    ? FREQUENT.map((id) => all.find((p) => p.id === id)).filter(
        (p): p is Product => !!p,
      )
    : [];

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[s.pad, { paddingBottom: 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title={t("tabProducts")} />
        <View
          style={[
            s.row,
            {
              backgroundColor: "#EFEAE0",
              borderRadius: 16,
              paddingHorizontal: 14,
              minHeight: 52 * kf,
              gap: 10,
            },
          ]}
        >
          <Icon name="search-outline" size={22 * kf} color={C.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("searchWhat")}
            placeholderTextColor={C.muted}
            accessibilityLabel={t("searchWhat")}
            style={{
              flex: 1,
              fontSize: 17 * kf,
              color: C.ink,
              paddingVertical: 12,
            }}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            label={t("all")}
            active={cat == null}
            onPress={() => setCat(null)}
          />
          {cats.map((c) => (
            <Chip
              key={c.id}
              label={`${CAT_EMOJI[c.id] ?? ""} ${categoryName(c, lang)}`}
              active={cat === c.id}
              onPress={() => setCat(c.id)}
            />
          ))}
        </ScrollView>

        {showFrequent && (
          <>
            <Text
              style={[
                s.body,
                { fontWeight: "800", fontSize: 21 * kf, marginTop: 4 },
              ]}
              accessibilityRole="header"
            >
              {t("frequent")}
            </Text>
            <Grid items={frequent} cols={cols} excluded={excluded} />
            <Text
              style={[
                s.body,
                { fontWeight: "800", fontSize: 21 * kf, marginTop: 8 },
              ]}
              accessibilityRole="header"
            >
              {t("allProducts")}
            </Text>
          </>
        )}
        {filtered.length ? (
          <Grid items={filtered} cols={cols} excluded={excluded} />
        ) : (
          <Text style={s.muted}>{t("nothingFound")}</Text>
        )}
        <View
          style={[s.row, { justifyContent: "center", gap: 6, marginTop: 4 }]}
        >
          <Icon name="information-circle-outline" size={18} color={C.muted} />
          <Text style={s.muted}>{t("pricesDepend")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Grid({
  items,
  cols,
  excluded,
}: {
  items: Product[];
  cols: number;
  excluded: Set<number>;
}) {
  // явные ряды вместо flexWrap+процентов: на узких экранах проценты с gap переполняли ряд
  const rows: Product[][] = [];
  for (let i = 0; i < items.length; i += cols)
    rows.push(items.slice(i, i + cols));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => (
        <View key={r[0].id} style={{ flexDirection: "row", gap: 10 }}>
          {r.map((p) => (
            <View key={p.id} style={{ flex: 1 }}>
              <ProductCard p={p} excluded={excluded} wide={cols === 1} />
            </View>
          ))}
          {r.length < cols && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

/** Карточка продукта: иллюстрация · название · фасовка → «от X €» и «+» (после добавления — количество) */
function ProductCard({
  p,
  excluded,
  wide,
}: {
  p: Product;
  excluded: Set<number>;
  wide: boolean;
}) {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  const kf = useK();
  const name = splitName(productName(p, lang), lang)[0];
  const detail = productDetail(p, lang, t);
  const c = st.city
    ? cheapest(st.city, p.id, st.settings.usePromo, excluded)
    : null;
  const inBasket = st.basket.find((b) => !b.pin && b.productId === p.id);
  const step = st.qtyStep(p.id);
  const key = `g:${p.id}`;
  return (
    <View
      style={[
        s.card,
        { padding: 12, gap: 10, flex: 1, justifyContent: "space-between" },
      ]}
    >
      <View
        style={
          wide ? [s.row, { alignItems: "flex-start", gap: 10 }] : { gap: 8 }
        }
      >
        <ProductTile emoji={productEmoji(p)} size={wide ? 64 : 76} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.body, { fontWeight: "800", fontSize: 16 * kf }]}>
            {name}
          </Text>
          {!!detail && (
            <Text style={[s.muted, { fontSize: 13 * kf }]}>{detail}</Text>
          )}
        </View>
      </View>
      <View
        style={[
          s.row,
          { justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
        ]}
      >
        <Text
          style={{
            fontSize: 17 * kf,
            fontWeight: "800",
            color: c ? C.ink : C.muted,
          }}
        >
          {c
            ? `${t("from", { price: money(c.price, lang) })}${p.byWeight ? t("perKg") : ""}`
            : st.city
              ? t("noData")
              : "…"}
        </Text>
        {inBasket ? (
          <Stepper
            value={inBasket.qty}
            label={
              p.byWeight
                ? qtyLabel(inBasket.qty, true, t, lang)
                : String(inBasket.qty)
            }
            onMinus={() =>
              st.setQty(key, Math.round((inBasket.qty - step) * 10) / 10)
            }
            onPlus={() =>
              st.setQty(key, Math.round((inBasket.qty + step) * 10) / 10)
            }
          />
        ) : (
          <Pressable
            onPress={() => st.addItem(p.id)}
            disabled={!c}
            accessibilityRole="button"
            accessibilityLabel={`${t("add")}: ${name}`}
            style={{
              width: 46 * kf,
              height: 46 * kf,
              borderRadius: 23 * kf,
              backgroundColor: c ? C.green : C.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="add" size={28 * kf} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
