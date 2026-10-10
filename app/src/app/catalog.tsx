import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cheapest, excludedIndexes } from "../lib/prices";
import { useStore } from "../lib/store";
import { categoryName, productDetail, productName, splitName } from "../lib/i18n";
import { C, CAT_EMOJI, Chip, money, PromoBadge, qtyLabel, s, Stepper } from "../ui";

const fold = (t: string) => t.toLowerCase().replace(/ъ/g, "а").replace(/ё/g, "е");

export default function CatalogScreen() {
  const st = useStore();
  const { t, lang } = st;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | null>(null);
  const excluded = useMemo(
    () => excludedIndexes(st.city, st.settings.excludedChains, st.settings.onlyGrocery),
    [st.city, st.settings.excludedChains, st.settings.onlyGrocery],
  );

  const cats = (st.products?.categories ?? []).filter((c) => !(st.settings.hideMedicines && c.id === 14));
  const list = useMemo(() => {
    const fq = fold(q.trim());
    return (st.products?.products ?? []).filter(
      (p) =>
        !(st.settings.hideMedicines && p.cat === 14) &&
        (cat == null || p.cat === cat) &&
        (!fq || fold(p.bg).includes(fq) || p.en.toLowerCase().includes(fq)),
    );
  }, [st.products, q, cat, st.settings.hideMedicines]);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={[s.pad, { paddingBottom: 6 }]}>
        <Text style={s.title}>{t("tabProducts")}</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={C.muted}
          style={{
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 11,
            fontSize: 15,
            color: C.ink,
          }}
        />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
          <Chip label={t("all")} active={cat == null} onPress={() => setCat(null)} />
          {cats.map((c) => (
            <Chip key={c.id} label={`${CAT_EMOJI[c.id] ?? ""} ${categoryName(c, lang)}`} active={cat === c.id} onPress={() => setCat(c.id)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={s.divider} />}
        ListEmptyComponent={<Text style={[s.muted, { padding: 16 }]}>{t("nothingFound")}</Text>}
        renderItem={({ item: p }) => {
          const name = splitName(productName(p, lang), lang)[0];
                const detail = productDetail(p, lang, t);
          const c = cheapest(st.city, p.id, st.settings.usePromo, excluded);
          const inBasket = st.basket.find((b) => b.productId === p.id);
          const step = st.qtyStep(p.id);
          return (
            <View style={[s.row, { paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22 }}>{CAT_EMOJI[p.cat] ?? "🛒"}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.body, { fontWeight: "600" }]}>{name}</Text>
                {!!detail && (
                  <Text style={s.muted} numberOfLines={1}>
                    {detail}
                  </Text>
                )}
                <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
                  <Text style={[s.muted, { color: c ? C.green : C.muted, fontWeight: "700" }]} numberOfLines={1}>
                    {c ? `${t("from", { price: money(c.price, lang) })}${p.byWeight ? t("perKg") : ""}` : t("noData")}
                  </Text>
                  {c?.promo && <PromoBadge />}
                  {c && <Text style={s.muted}>· {t("chainsShort", { n: c.chains })}</Text>}
                </View>
              </View>
              {inBasket ? (
                <Stepper
                  value={inBasket.qty}
                  label={qtyLabel(inBasket.qty, p.byWeight, t, lang)}
                  onMinus={() => st.setQty(p.id, Math.round((inBasket.qty - step) * 10) / 10)}
                  onPlus={() => st.setQty(p.id, Math.round((inBasket.qty + step) * 10) / 10)}
                />
              ) : (
                <Pressable
                  onPress={() => st.addItem(p.id)}
                  disabled={!c}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: c ? C.green : C.line,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", marginTop: -2 }}>+</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
