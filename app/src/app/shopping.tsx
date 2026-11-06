// Режим покупок: снимок плана, разбитый по магазинам, с отметками «купено».
// Сохраняется после закрытия приложения; цены в списке не меняются при обновлении данных;
// отметки не удаляют товары из корзины.

import { router } from "expo-router";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackLink, ChainBadge, Icon, ProductTile } from "../components";
import { shortDate } from "../lib/brochures";
import { track } from "../lib/analytics";
import { shareText, shoppingText } from "../lib/share";
import { useStore } from "../lib/store";
import { Button, C, Card, money, useK, useS } from "../ui";

export default function ShoppingScreen() {
  const st = useStore();
  const { t, lang, shopping: sh } = st;
  const s = useS();
  const k = useK();
  const m = (n: number) => money(n, lang);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/result");
  const cityName = st.baseCity
    ? lang === "en" && st.baseCity.nameEn
      ? st.baseCity.nameEn
      : st.baseCity.name.replace(/^(гр|с)\. /, "")
    : "";

  if (!sh) {
    return (
      <SafeAreaView style={s.screen} edges={["top"]}>
        <View style={s.pad}>
          <BackLink onPress={back} />
          <Card>
            <Text style={s.body}>{t("emptyBasket")}</Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const lines = sh.stores.flatMap((x) => x.lines);
  const done = lines.filter((l) => sh.checked.includes(l.key));
  // «осталось» = итог плана минус купленное: сумма строк может отличаться от итога на копейку из-за округлений
  const bought = lines
    .filter((l) => sh.checked.includes(l.key))
    .reduce((sum, l) => sum + l.cost, 0);
  const left = Math.max(0, sh.total - bought);
  const pct = lines.length ? done.length / lines.length : 0;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 140 }]}>
        <BackLink onPress={back} />
        <Text
          style={[s.title, { fontSize: 30 * k }]}
          accessibilityRole="header"
        >
          {t("shopTitle")}
        </Text>

        {/* Прогресс и оставшаяся сумма */}
        <Card
          style={{ gap: 10, backgroundColor: C.green, borderColor: C.green }}
        >
          <Text
            style={{ color: "#fff", fontSize: 20 * k, fontWeight: "800" }}
            accessibilityLiveRegion="polite"
          >
            {done.length === lines.length
              ? t("shopDone")
              : t("shopProgress", { n: done.length, total: lines.length })}
          </Text>
          <View
            style={{
              height: 10,
              borderRadius: 5,
              backgroundColor: "rgba(255,255,255,0.25)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.round(pct * 100)}%`,
                height: "100%",
                backgroundColor: "#fff",
                borderRadius: 5,
              }}
            />
          </View>
          {done.length < lines.length && sh.total > 0 && (
            <Text
              style={{ color: "#E3F0E5", fontSize: 17 * k, fontWeight: "600" }}
            >
              {t("shopLeft", { amount: m(Math.round(left * 100) / 100) })}
            </Text>
          )}
        </Card>
        <Text style={[s.muted, { fontSize: 13 * k }]}>
          {t("shopSnapshot", { date: shortDate(sh.startedAt.slice(0, 10)) })}
        </Text>
        <Pressable
          onPress={() =>
            shareText(
              shoppingText(
                sh,
                t("shareTitle"),
                (amount) => t("shareTotal", { amount }),
                m,
              ),
              "shopping",
            )
          }
          accessibilityRole="button"
          style={[
            s.row,
            {
              gap: 8,
              justifyContent: "center",
              minHeight: 48 * k,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: C.green,
            },
          ]}
        >
          <Icon name="share-outline" size={20 * k} color={C.green} />
          <Text style={{ color: C.green, fontWeight: "800", fontSize: 16 * k }}>
            {t("share")}
          </Text>
        </Pressable>

        {sh.stores.map((store) => (
          <Card key={store.chain} style={{ gap: 12 }}>
            <View style={{ gap: 2 }}>
              <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
                <ChainBadge name={store.chain} size={18} />
                {store.subtotal > 0 && (
                  <Text
                    style={[s.body, { fontWeight: "800", fontSize: 18 * k }]}
                  >
                    · {m(store.subtotal)}
                  </Text>
                )}
              </View>
              {!!store.label && <Text style={s.muted}>📍 {store.label}</Text>}
              {store.subtotal > 0 && (
                <Pressable
                  onPress={() => {
                    track("map_opened", { chain: store.chain });
                    const q =
                      `${store.label ?? store.chain} ${cityName}`.trim();
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
                    ).catch(() => {});
                  }}
                  accessibilityRole="link"
                  hitSlop={6}
                  style={[
                    s.row,
                    { gap: 4, alignSelf: "flex-start", minHeight: 40 },
                  ]}
                >
                  <Icon name="map-outline" size={18 * k} color={C.green} />
                  <Text
                    style={{
                      color: C.green,
                      fontWeight: "800",
                      fontSize: 15 * k,
                    }}
                  >
                    {t("mapOpen")}
                  </Text>
                </Pressable>
              )}
              {store.lines.some((l) => l.card) && (
                <Text
                  style={{
                    color: "#8A5A00",
                    fontWeight: "700",
                    fontSize: 14.5 * k,
                  }}
                >
                  {t("cardReminder", {
                    chain: store.chain,
                    n: store.lines.filter((l) => l.card).length,
                  })}
                </Text>
              )}
            </View>
            {store.lines.map((l) => {
              const on = sh.checked.includes(l.key);
              return (
                <Pressable
                  key={l.key}
                  onPress={() => st.toggleBought(l.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${t("shopCheckA11y")}: ${l.name}, ${l.detail}, ${m(l.cost)}`}
                  style={[
                    s.row,
                    {
                      alignItems: "flex-start",
                      gap: 12,
                      minHeight: 56,
                      opacity: on ? 0.55 : 1,
                    },
                  ]}
                >
                  <View style={{ marginTop: 4 }}>
                    <Icon
                      name={on ? "checkmark-circle" : "ellipse-outline"}
                      size={32 * k}
                      color={on ? C.green : C.muted}
                    />
                  </View>
                  <ProductTile emoji={l.emoji} size={44} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[
                        s.body,
                        {
                          fontWeight: "700",
                          textDecorationLine: on ? "line-through" : "none",
                        },
                      ]}
                    >
                      {l.name}
                    </Text>
                    <Text style={[s.muted, { fontStyle: "italic" }]}>
                      {l.detail}
                    </Text>
                  </View>
                  <Text style={[s.body, { fontWeight: "800" }]}>
                    {l.cost > 0 ? m(l.cost) : ""}
                  </Text>
                </Pressable>
              );
            })}
          </Card>
        ))}
      </ScrollView>
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
        <Button
          title={t("shopFinish")}
          kind={done.length === lines.length ? "primary" : "ghost"}
          style={{
            backgroundColor: done.length === lines.length ? C.green : C.card,
          }}
          onPress={() => {
            st.finishShopping();
            back();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
