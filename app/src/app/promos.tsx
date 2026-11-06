// «Моите акции»: только закреплённые предложения (брошюры и «Супер оферти»), по магазинам,
// с суммой и экономией к обычным ценам; отсюда же — режим покупок только по акциям.

import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackLink, ChainBadge, Icon, ProductTile } from "../components";
import { shortDate } from "../lib/brochures";
import { itemKey } from "../lib/pins";
import { useStore } from "../lib/store";
import type { BasketItem } from "../lib/types";
import { usePlan } from "../lib/usePlan";
import {
  Button,
  C,
  CAT_EMOJI,
  Card,
  money,
  productEmoji,
  qtyLabel,
  Stepper,
  useK,
  useS,
} from "../ui";

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function PromosScreen() {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  const k = useK();
  const m = (n: number) => money(n, lang);
  const { pinStatuses } = usePlan();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const pins = st.basket.filter(
    (b): b is BasketItem & { pin: NonNullable<BasketItem["pin"]> } => !!b.pin,
  );
  const active = (b: BasketItem) =>
    (pinStatuses.get(itemKey(b)) ?? "now") === "now";
  // по магазинам, в порядке добавления
  const stores: { chain: string; items: typeof pins }[] = [];
  for (const b of pins) {
    const g = stores.find((x) => x.chain === b.pin.chain);
    if (g) g.items.push(b);
    else stores.push({ chain: b.pin.chain, items: [b] });
  }
  const cost = (b: BasketItem) => r2(b.qty * (b.pin?.price ?? 0));
  const regular = (b: BasketItem) =>
    r2(b.qty * (b.pin?.regular ?? b.pin?.price ?? 0));
  const counted = pins.filter(active);
  const total = r2(counted.reduce((sum, b) => sum + cost(b), 0));
  const saving = r2(counted.reduce((sum, b) => sum + regular(b) - cost(b), 0));
  const emojiOf = (b: BasketItem) => {
    const p = st.productById.get(b.productId);
    return p ? productEmoji(p) : (CAT_EMOJI[0] ?? "🏷️");
  };

  const shop = () => {
    st.startShopping({
      pricesDate: st.index?.date ?? "",
      total,
      approx: false,
      stores: stores
        .map((g) => {
          const items = g.items.filter(active);
          return {
            chain: g.chain,
            subtotal: r2(items.reduce((sum, b) => sum + cost(b), 0)),
            lines: items.map((b) => ({
              key: `${g.chain}|${itemKey(b)}`,
              name: b.pin.name,
              detail: [
                qtyLabel(b.qty, !!b.pin.perKg, t, lang),
                b.pin.card ? t("withCard") : "",
                b.pin.to ? t("validTo", { date: shortDate(b.pin.to) }) : "",
              ]
                .filter(Boolean)
                .join(" · "),
              cost: cost(b),
              emoji: emojiOf(b),
              card: !!b.pin.card,
            })),
          };
        })
        .filter((g) => g.lines.length),
    });
    router.push("/shopping");
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 140 }]}>
        <BackLink onPress={back} />
        <Text
          style={[s.title, { fontSize: 30 * k }]}
          accessibilityRole="header"
        >
          {t("myPromos")}
        </Text>
        <Text style={s.muted}>{t("myPromosNote")}</Text>

        {!pins.length ? (
          <Card>
            <Text style={s.body}>{t("myPromosEmpty")}</Text>
          </Card>
        ) : (
          <>
            <Card
              style={{ gap: 6, backgroundColor: C.green, borderColor: C.green }}
            >
              <Text
                style={{ color: "#fff", fontSize: 18 * k, fontWeight: "700" }}
              >
                {t("myPromosCount", { n: counted.length })}
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 40 * k,
                  fontWeight: "900",
                  letterSpacing: -1,
                }}
              >
                {m(total)}
              </Text>
              {saving > 0 && (
                <Text
                  style={{
                    color: "#E3F0E5",
                    fontSize: 17 * k,
                    fontWeight: "700",
                  }}
                >
                  {t("myPromosSave", { amount: m(saving) })}
                </Text>
              )}
            </Card>

            {stores.map((g) => (
              <Card key={g.chain} style={{ gap: 12 }}>
                <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
                  <ChainBadge name={g.chain} size={18} />
                  <Text
                    style={[s.body, { fontWeight: "800", fontSize: 18 * k }]}
                  >
                    ·{" "}
                    {m(
                      r2(
                        g.items
                          .filter(active)
                          .reduce((sum, b) => sum + cost(b), 0),
                      ),
                    )}
                  </Text>
                </View>
                {g.items.map((b) => {
                  const key = itemKey(b);
                  const on = active(b);
                  const step = b.pin.perKg ? 0.5 : 1;
                  return (
                    <View key={key} style={{ gap: 8, opacity: on ? 1 : 0.6 }}>
                      <View
                        style={[s.row, { alignItems: "flex-start", gap: 10 }]}
                      >
                        <ProductTile emoji={emojiOf(b)} size={48} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[s.body, { fontWeight: "700" }]}>
                            {b.pin.name}
                          </Text>
                          <Text style={[s.muted, { fontSize: 14 * k }]}>
                            {[
                              `${m(b.pin.price)}${b.pin.perKg ? (lang === "en" ? "/kg" : "/кг") : ""}`,
                              b.pin.regular
                                ? `${t("weeklyUsual", { amount: m(b.pin.regular) })}`
                                : "",
                              b.pin.card ? t("withCard") : "",
                              b.pin.to
                                ? t("validTo", { date: shortDate(b.pin.to) })
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                          {!on && (
                            <Text
                              style={{
                                color: "#8A5A00",
                                fontWeight: "700",
                                fontSize: 14 * k,
                              }}
                            >
                              {t("myPromosOff")}
                            </Text>
                          )}
                        </View>
                        <Text style={[s.body, { fontWeight: "800" }]}>
                          {m(cost(b))}
                        </Text>
                      </View>
                      <View
                        style={[s.row, { justifyContent: "space-between" }]}
                      >
                        <Pressable
                          onPress={() => st.removeItem(key)}
                          accessibilityRole="button"
                          accessibilityLabel={`${t("remove")}: ${b.pin.name}`}
                          hitSlop={8}
                          style={[s.row, { gap: 4, paddingVertical: 6 }]}
                        >
                          <Icon
                            name="trash-outline"
                            size={18 * k}
                            color={C.muted}
                          />
                          <Text style={[s.muted, { fontWeight: "700" }]}>
                            {t("remove")}
                          </Text>
                        </Pressable>
                        <Stepper
                          value={b.qty}
                          label={qtyLabel(b.qty, !!b.pin.perKg, t, lang)}
                          onMinus={() =>
                            b.qty - step <= 0
                              ? st.removeItem(key)
                              : st.setQty(key, r2(b.qty - step))
                          }
                          onPlus={() => st.setQty(key, r2(b.qty + step))}
                        />
                      </View>
                    </View>
                  );
                })}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      {counted.length > 0 && (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
          <Button
            title={st.shopping ? t("continueShopping") : t("myPromosShop")}
            onPress={() => (st.shopping ? router.push("/shopping") : shop())}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
