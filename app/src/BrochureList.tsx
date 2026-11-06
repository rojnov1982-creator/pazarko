// Вкладка «Оферти» → «Брошури»: предложения из седмичните брошури на веригите.

import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { track } from "./lib/analytics";
import { offerStatus, shortDate, todayIso, unitPriceLabel, visibleChains } from "./lib/brochures";
import { useStore } from "./lib/store";
import type { BrochureOffer } from "./lib/types";
import { C, Chip, money, s } from "./ui";

const fold = (t: string) => t.toLowerCase().replace(/ъ/g, "а").replace(/ё/g, "е");

export function BrochureList({ header }: { header: React.ReactElement }) {
  const st = useStore();
  const { t, lang, brochures: bro, settings } = st;
  const today = todayIso();
  const [chain, setChain] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [food, setFood] = useState(true);

  // сети, которые есть в городе и не исключены в настройках
  const visible = useMemo(() => visibleChains(bro, st.baseCity, settings.excludedChains), [bro, st.baseCity, settings.excludedChains]);
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
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("brochuresSearch")}
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label={`🥦 ${t("onlyFood")}`} active={food} onPress={() => setFood(!food)} />
            <Chip label={t("all")} active={chain == null} onPress={() => setChain(null)} />
            {bro.chains.map((ch, i) =>
              counts.get(i) ? (
                <Chip
                  key={ch.name}
                  label={`${ch.name} · ${counts.get(i)}`}
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
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => <OfferRow o={item} today={today} />}
    />
  );
}

function OfferRow({ o, today }: { o: BrochureOffer; today: string }) {
  const st = useStore();
  const { t, lang, brochures: bro } = st;
  const soon = offerStatus(o, today) === "soon";
  const product = o.g ? st.productById.get(o.g) : undefined;
  const inBasket = !!product && st.basket.some((b) => b.productId === product.id);
  const unit = unitPriceLabel(o.u, lang);

  return (
    <View style={[s.card, { padding: 14, gap: 4, opacity: soon ? 0.85 : 1 }]}>
      <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start", gap: 10 }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.body, { fontWeight: "700" }]} numberOfLines={2}>
            {o.n}
          </Text>
          <Text style={s.muted} numberOfLines={1}>
            {bro?.chains[o.c]?.name}
            {unit ? ` · ${unit}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {o.p != null ? (
            <Text style={[s.num, { fontWeight: "800", color: C.promo, fontSize: 17 }]}>{money(o.p, lang)}</Text>
          ) : null}
          {o.r != null ? <Text style={[s.muted, { textDecorationLine: "line-through" }]}>{money(o.r, lang)}</Text> : null}
        </View>
      </View>

      <View style={[s.row, { gap: 6, flexWrap: "wrap", alignItems: "center" }]}>
        {o.d ? <Badge text={`−${o.d}%`} bg={C.promo} color="#fff" /> : null}
        <Badge
          text={soon ? `${t("validFrom", { date: shortDate(o.f) })} · ${t("soon")}` : t("validTo", { date: shortDate(o.t) })}
          bg={soon ? "#FFF1D6" : C.greenSoft}
          color={soon ? "#8A5A00" : C.green}
        />
        {o.k ? <Badge text={`🪪 ${t("withCard")}`} bg="#EEE8DC" color={C.ink} /> : null}
        <View style={{ flex: 1 }} />
        {product && (
          <Pressable
            onPress={() => {
              if (inBasket) return;
              track("brochure_added", { group: product.id, chain: bro?.chains[o.c]?.name, product: o.n, pct: o.d, soon });
              st.addItem(product.id);
            }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: inBasket ? C.greenSoft : C.green }}
          >
            <Text style={{ color: inBasket ? C.green : "#fff", fontWeight: "700", fontSize: 13 }}>
              {inBasket ? `✓ ${t("added")}` : `+ ${t("add")}`}
            </Text>
          </Pressable>
        )}
      </View>
      {!!o.w && (
        <Text style={[s.muted, { fontSize: 12 }]} numberOfLines={2}>
          {o.w}
        </Text>
      )}
    </View>
  );
}

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{text}</Text>
    </View>
  );
}
