// «Любими продукти»: что человек покупает всегда. Каждую неделю ищем в брошюрах; «в списке» — стоит в корзине
// как обычный товар (цена по КЗП, а если есть подходящая акция в брошюре — план возьмёт её).

import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackLink, Icon, ProductTile } from "../components";
import {
  offerStatus,
  shortDate,
  todayIso,
  visibleChains,
} from "../lib/brochures";
import { favoriteOffers, kzpFavPrice } from "../lib/favorites";
import { isPerKgOffer } from "../lib/pins";
import { useStore } from "../lib/store";
import { Button, C, Card, money, productEmoji, useK, useS } from "../ui";

export default function FavoritesScreen() {
  const st = useStore();
  const { t, lang, brochures: bro } = st;
  const s = useS();
  const k = useK();
  const [text, setText] = useState("");
  const today = todayIso();
  const visible = useMemo(
    () => visibleChains(bro, st.baseCity, st.excludedEiks),
    [bro, st.baseCity, st.excludedEiks],
  );
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const add = () => {
    if (st.addFavorite(text)) setText("");
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[s.pad, { paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackLink onPress={back} />
        <Text
          style={[s.title, { fontSize: 30 * k }]}
          accessibilityRole="header"
        >
          ❤️ {t("favTitle")}
        </Text>
        <Text style={s.muted}>{t("favIntro")}</Text>

        <Card style={{ gap: 10 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            returnKeyType="done"
            placeholder={t("favPlaceholder")}
            placeholderTextColor={C.muted}
            accessibilityLabel={t("favPlaceholder")}
            style={{
              fontSize: 17 * k,
              color: C.ink,
              backgroundColor: "#EFEAE0",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
          <Button
            title={`♡ ${t("favAdd")}`}
            onPress={add}
            disabled={!text.trim()}
          />
        </Card>

        {!st.favorites.length && (
          <Card>
            <Text style={s.body}>{t("favEmpty")}</Text>
          </Card>
        )}

        {st.favorites.map((f) => {
          const offers = favoriteOffers(
            f,
            bro,
            visible,
            (o) => offerStatus(o, today) === "now",
          );
          const best = offers[0];
          const p = f.productId ? st.productById.get(f.productId) : undefined;
          const kzp = kzpFavPrice(f, st.baseCity);
          return (
            <Card key={f.id} style={{ gap: 10 }}>
              <View style={[s.row, { gap: 12, alignItems: "flex-start" }]}>
                <ProductTile emoji={p ? productEmoji(p) : "❤️"} size={56} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={[s.body, { fontWeight: "800", fontSize: 18 * k }]}
                  >
                    {f.name}
                  </Text>
                  {best ? (
                    <Text
                      style={{
                        color: C.promo,
                        fontWeight: "800",
                        fontSize: 15 * k,
                      }}
                    >
                      {t("favOnSale", {
                        chain: bro?.chains[best.c]?.name ?? "",
                        price:
                          money(best.p ?? 0, lang) +
                          (isPerKgOffer(best) ? t("perKg") : ""),
                        pct: best.d ?? 0,
                        date: shortDate(best.t),
                      })}
                    </Text>
                  ) : (
                    <Text style={[s.muted, { fontWeight: "700" }]}>
                      {t("favNoSale")}
                    </Text>
                  )}
                  {offers.slice(1, 3).map((o) => (
                    <Text
                      key={o.i ?? o.n}
                      style={[s.muted, { fontSize: 14 * k }]}
                    >
                      · {bro?.chains[o.c]?.name}: {o.n} —{" "}
                      {money(o.p ?? 0, lang)}
                      {isPerKgOffer(o) ? t("perKg") : ""}
                    </Text>
                  ))}
                  <Text style={[s.muted, { fontSize: 14 * k }]}>
                    {kzp
                      ? t("favKzp", {
                          price: money(kzp.price, lang),
                          chain: kzp.chain,
                        })
                      : t("favNoKzp")}
                  </Text>
                </View>
              </View>
              <View
                style={[s.row, { justifyContent: "space-between", gap: 8 }]}
              >
                <View style={[s.row, { gap: 8, flex: 1 }]}>
                  <Switch
                    value={f.inList}
                    onValueChange={(v) => st.setFavoriteInList(f.id, v)}
                    accessibilityLabel={`${t("favInList")}: ${f.name}`}
                    trackColor={{ true: C.green, false: "#D6D0C4" }}
                  />
                  <Text style={[s.body, { flex: 1, fontSize: 15 * k }]}>
                    {t("favInList")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => st.removeFavorite(f.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("remove")}: ${f.name}`}
                  hitSlop={8}
                  style={[s.row, { gap: 4, minHeight: 44 }]}
                >
                  <Icon name="trash-outline" size={18 * k} color={C.muted} />
                  <Text style={[s.muted, { fontWeight: "700" }]}>
                    {t("remove")}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
