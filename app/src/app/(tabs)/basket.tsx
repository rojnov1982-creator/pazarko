// Кошница: город и район, состояние данных, позиции (обычные и закреплённые предложения),
// предварительная сумма — тем же расчётом, что и «План».

import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AreaPicker } from "../../AreaPicker";
import {
  DataStatus,
  Icon,
  itemName,
  PinBadge,
  PinInfo,
  ProductTile,
  ScreenHeader,
} from "../../components";
import { ANALYTICS_AVAILABLE } from "../../lib/analytics";
import { offerStatus, shortDate, todayIso } from "../../lib/brochures";
import { IS_DEMO } from "../../lib/data";
import {
  brandLabel,
  OWN_BRAND,
  productDetail,
  productName,
  splitName,
} from "../../lib/i18n";
import { isPerKgOffer, itemKey } from "../../lib/pins";
import { offerMatches } from "../../lib/favorites";
import { brandsInCity, cheapest } from "../../lib/prices";
import { PRESETS, useStore } from "../../lib/store";
import type { BasketItem } from "../../lib/types";
import { usePlan } from "../../lib/usePlan";
import {
  Button,
  C,
  Card,
  DemoBanner,
  H,
  money,
  productEmoji,
  PromoBadge,
  qtyLabel,
  Stepper,
  useK,
  useS,
} from "../../ui";

export default function BasketScreen() {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  const kf = useK();
  const easy = st.settings.easy === true;
  const [brandFor, setBrandFor] = useState<string | null>(null);
  const [areaOpen, setAreaOpen] = useState(false);
  const plan = usePlan();
  const { excluded } = plan;

  if (!st.ready) {
    return (
      <View style={[s.screen, { justifyContent: "center" }]}>
        <ActivityIndicator color={C.green} />
      </View>
    );
  }

  const brandItem = brandFor
    ? st.basket.find((b) => itemKey(b) === brandFor)
    : undefined;
  const r = plan.result;
  // цена покупки каждой позиции — из того же плана, что и итог
  const lineCost = new Map<string, number>();
  for (const sp of r?.plan.stores ?? [])
    for (const l of sp.lines) lineCost.set(l.key, l.cost);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 170 }]}>
        <ScreenHeader
          title={t("basketTitle")}
          subtitle={[
            st.basket.length ? t("nItems", { n: st.basket.length }) : "",
            st.index?.date
              ? t("pricesFromShort", { date: shortDate(st.index.date) })
              : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        />

        {/* Район покупок — одной строкой */}
        {!easy && (
          <Pressable
            onPress={() => setAreaOpen(true)}
            accessibilityRole="button"
            style={[
              s.row,
              {
                gap: 10,
                backgroundColor: "#EFEAE0",
                borderRadius: 14,
                paddingHorizontal: 14,
                minHeight: 50 * kf,
              },
            ]}
          >
            <Icon name="storefront-outline" size={22 * kf} color={C.ink} />
            <Text style={[s.body, { flex: 1, fontWeight: "600" }]}>
              {st.area.mode === "city"
                ? t("areaCity")
                : st.area.mode === "stores"
                  ? `${t("areaMyStores")} · ${st.areaStoreCount}`
                  : `${st.area.label} · ${t("km", { n: st.area.radiusKm })}`}
            </Text>
            <Icon name="chevron-forward" size={20 * kf} color={C.muted} />
          </Pressable>
        )}

        <DataStatus onOpenArea={() => setAreaOpen(true)} compact />
        {IS_DEMO && <DemoBanner />}

        {/* Первый запуск (или в корзине только любимые): главные действия — продукты и готовые корзины */}
        {st.basket.every((b) => b.fav) && (
          <>
            <Card style={{ gap: 12 }}>
              <Text style={[s.body, { fontWeight: "800", fontSize: 20 * kf }]}>
                {t("startHere")}
              </Text>
              <Text style={s.muted}>{t("buildBasketHint")}</Text>
              <Button
                title={`+ ${t("pickProducts")}`}
                onPress={() => router.push("/catalog")}
              />
            </Card>
            <H style={{ marginTop: 4 }}>{t("readyBaskets")}</H>
            {PRESETS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => st.loadPreset(p.items, p.id)}
                accessibilityRole="button"
                accessibilityLabel={t(p.title)}
              >
                <Card
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 34 }} importantForAccessibility="no">
                    {p.emoji}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, { fontWeight: "700" }]}>
                      {t(p.title)}
                    </Text>
                    <Text style={s.muted}>
                      {t("nItems", { n: p.items.length })}
                    </Text>
                  </View>
                  <Text
                    style={{ color: C.green, fontWeight: "800", fontSize: 17 }}
                  >
                    {t("take")}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </>
        )}
        {st.basket.length > 0 && (
          <>
            <View style={[s.row, { justifyContent: "flex-end" }]}>
              <Pressable
                onPress={st.clearBasket}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text
                  style={{ color: C.promo, fontWeight: "700", fontSize: 15 }}
                >
                  {t("clear")}
                </Text>
              </Pressable>
            </View>
            {st.basket.map((b) => (
              <BasketRow
                key={itemKey(b)}
                b={b}
                cost={lineCost.get(itemKey(b))}
                onBrand={() => setBrandFor(itemKey(b))}
                status={b.pin ? plan.pinStatuses.get(itemKey(b)) : undefined}
                excluded={excluded}
              />
            ))}
            <Pressable
              onPress={() => router.push("/catalog")}
              accessibilityRole="button"
              style={[
                s.row,
                {
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: "#EFEAE0",
                  borderRadius: 14,
                  minHeight: 50 * kf,
                },
              ]}
            >
              <Icon name="add" size={22 * kf} color={C.ink} />
              <Text style={[s.body, { fontWeight: "700" }]}>
                {t("addProducts").replace(/^\+\s*/, "")}
              </Text>
            </Pressable>
          </>
        )}

        {/* своя строка без цены и любимые продукты — и для пустой корзины */}
        <CustomItemInput />
        <Pressable
          onPress={() => router.push("/favorites")}
          accessibilityRole="button"
          style={[
            s.row,
            {
              gap: 10,
              backgroundColor: C.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.line,
              paddingHorizontal: 14,
              minHeight: 52 * kf,
            },
          ]}
        >
          <Text style={{ fontSize: 20 * kf }}>❤️</Text>
          <Text style={[s.body, { flex: 1, fontWeight: "700" }]}>
            {st.favorites.length
              ? t("favCount", { n: st.favorites.length })
              : t("favPromo")}
          </Text>
          <Icon name="chevron-forward" size={20 * kf} color={C.muted} />
        </Pressable>

        {/* Необязательные вопросы — ниже основных действий и не мешают работе */}
        {st.settings.easy == null && (
          <Card
            style={{
              gap: 10,
              backgroundColor: C.greenSoft,
              borderColor: C.greenSoft,
            }}
          >
            <Text style={[s.body, { fontWeight: "700" }]}>
              👓 {t("easyInlineAsk")}
            </Text>
            <Text style={s.muted}>{t("easyModeSub")}</Text>
            <View style={[s.row, { gap: 10, flexWrap: "wrap" }]}>
              <Button
                title={t("easyInlineOn")}
                onPress={() => st.updateSettings({ easy: true })}
                style={{ flexGrow: 1 }}
              />
              <Pressable
                onPress={() => st.updateSettings({ easy: false })}
                hitSlop={8}
                accessibilityRole="button"
                style={{ padding: 10 }}
              >
                <Text
                  style={{ color: C.muted, fontWeight: "700", fontSize: 16 }}
                >
                  {t("easyInlineNo")}
                </Text>
              </Pressable>
            </View>
          </Card>
        )}
        {ANALYTICS_AVAILABLE && st.settings.analytics === null && (
          <Card style={{ gap: 8 }}>
            <Text style={[s.body, { fontWeight: "700" }]}>
              📊 {t("analyticsAskTitle")}
            </Text>
            <Text style={s.muted}>{t("analyticsAskText")}</Text>
            <View style={[s.row, { gap: 10, flexWrap: "wrap" }]}>
              <Button
                title={t("analyticsYes")}
                kind="ghost"
                onPress={() => st.updateSettings({ analytics: true })}
                style={{ flexGrow: 1 }}
              />
              <Pressable
                onPress={() => st.updateSettings({ analytics: false })}
                hitSlop={8}
                accessibilityRole="button"
                style={{ padding: 10 }}
              >
                <Text
                  style={{ color: C.muted, fontWeight: "700", fontSize: 16 }}
                >
                  {t("analyticsNo")}
                </Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Предварительная сумма — тот же расчёт, что и в «План», с полнотой корзины */}
      {st.basket.length > 0 && (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
          <Pressable
            onPress={() => router.push("/result")}
            accessibilityRole="button"
            accessibilityLabel={
              r
                ? `${t("seePlan")}. ${t("estimate")} ${money(r.plan.total, lang)}, ${t("estimateOf", { n: plan.found, total: plan.total })}`
                : t("seePlan")
            }
            style={({ pressed }) => [
              s.btn,
              {
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 18,
                paddingVertical: 12,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[s.btnText, { fontSize: 20 * kf }]}>
                {t("compareBasket")} →
              </Text>
              <Text
                style={{
                  color: "#DDEBDF",
                  fontSize: 15 * kf,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {r
                  ? `${t("estimate")} ${r.plan.approx ? "≈ " : ""}${money(r.plan.total, lang)}${plan.found < plan.total ? ` · ${t("estimateOf", { n: plan.found, total: plan.total })}` : ""}`
                  : st.areaStatus === "error" ||
                      st.areaStatus === "empty" ||
                      st.error
                    ? t("noData")
                    : t("calculating")}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <AreaPicker visible={areaOpen} onClose={() => setAreaOpen(false)} />

      <Modal
        visible={!!brandItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBrandFor(null)}
      >
        <View style={[s.screen, s.pad]}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { fontSize: 22 }]}>
                {t("chooseBrand")}
              </Text>
              <Text style={s.muted}>
                {brandItem
                  ? splitName(
                      productName(
                        st.productById.get(brandItem.productId),
                        lang,
                      ),
                      lang,
                    )[0]
                  : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => setBrandFor(null)}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={{ color: C.green, fontWeight: "700", fontSize: 17 }}>
                {t("done")}
              </Text>
            </Pressable>
          </View>
          {brandItem && (
            <FlatList
              data={[
                null,
                ...brandsInCity(
                  st.city,
                  brandItem.productId,
                  st.settings.usePromo,
                  excluded,
                ),
              ]}
              keyExtractor={(x) => x?.brand ?? "__any"}
              ItemSeparatorComponent={() => <View style={s.divider} />}
              renderItem={({ item }) => {
                const active = (item?.brand ?? undefined) === brandItem.brand;
                const any = item
                  ? null
                  : cheapest(
                      st.city,
                      brandItem.productId,
                      st.settings.usePromo,
                      excluded,
                    );
                return (
                  <Pressable
                    onPress={() => {
                      st.setBrand(brandFor!, item?.brand);
                      setBrandFor(null);
                    }}
                    accessibilityRole="button"
                    style={[s.row, { paddingVertical: 14 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[s.body, { fontWeight: active ? "800" : "600" }]}
                      >
                        {item ? brandLabel(item.brand, t) : t("anyBrand")}
                      </Text>
                      <Text style={s.muted}>
                        {item
                          ? (item.brand === OWN_BRAND
                              ? `${t("ownBrandSub")} · `
                              : "") +
                            t("brandFrom", {
                              price: money(item.price, lang),
                              n: item.chains,
                            })
                          : `${t("anyBrandSub")}${any ? ` · ${t("from", { price: money(any.price, lang) })}` : ""}`}
                      </Text>
                    </View>
                    {item?.promo && <PromoBadge />}
                    {active && (
                      <Icon name="checkmark" size={22} color={C.green} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * Карточка позиции (как в концепции): иллюстрация · название · фасовка/марка · цена покупки справа · количество.
 * Закреплённая акция — с сетью, сроком и условиями; если её нельзя купить сегодня — причина и действия.
 */
function CustomItemInput() {
  const st = useStore();
  const { t } = st;
  const s = useS();
  const kf = useK();
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    st.addCustom(text);
    setText("");
  };
  return (
    <View style={[s.row, { gap: 8 }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={add}
        returnKeyType="done"
        placeholder={t("customPlaceholder")}
        placeholderTextColor={C.muted}
        accessibilityLabel={t("customPlaceholder")}
        style={{
          flex: 1,
          fontSize: 16 * kf,
          color: C.ink,
          backgroundColor: "#EFEAE0",
          borderRadius: 14,
          paddingHorizontal: 14,
          minHeight: 50 * kf,
        }}
      />
      <Pressable
        onPress={add}
        disabled={!text.trim()}
        accessibilityRole="button"
        accessibilityLabel={t("favAdd")}
        style={{
          width: 50 * kf,
          height: 50 * kf,
          borderRadius: 14,
          backgroundColor: text.trim() ? C.green : "#D6D0C4",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="add" size={26 * kf} color="#fff" />
      </Pressable>
    </View>
  );
}

function BasketRow({
  b,
  cost,
  onBrand,
  status,
  excluded,
}: {
  b: BasketItem;
  cost?: number;
  onBrand: () => void;
  status?: string;
  excluded: Set<number>;
}) {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  const kf = useK();
  const easy = st.settings.easy === true;
  const key = itemKey(b);
  const p = st.productById.get(b.productId);
  const name = itemName(b, lang, st.productById);
  const byWeight = b.pin ? !!b.pin.perKg : !!p?.byWeight;
  const step = b.pin ? (b.pin.perKg ? 0.5 : 1) : st.qtyStep(b.productId);
  // любимый: «от …» по марке КЗП может быть другим товаром — цену показываем только из плана
  const c =
    !b.pin && !b.fav && st.city
      ? cheapest(st.city, b.productId, st.settings.usePromo, excluded, b.brand)
      : null;
  const detail = !b.pin && !b.fav && p ? productDetail(p, lang, t) : "";
  const canBrand =
    !b.pin &&
    !b.fav &&
    !easy &&
    p?.hasBrands &&
    !!st.city?.brands?.[String(p.id)];
  const unpriced = !b.pin && !(b.productId > 0);
  const today = todayIso();
  const noData =
    st.areaStatus === "error" || st.areaStatus === "empty" || !!st.error;
  const pinProblem =
    b.pin && status && status !== "now"
      ? status === "expired"
        ? b.pin.source === "kzp"
          ? t("pinEnded")
          : t("pinExpired", { date: shortDate(b.pin.to ?? "") })
        : status === "soon"
          ? t("pinSoon", { date: shortDate(b.pin.from ?? "") })
          : t("pinUnavailable")
      : "";
  // цена справа: стоимость покупки из плана; без плана — «от …» за единицу
  const priceRight = cost != null ? money(cost, lang) : "";
  // любимый без цены в плане: если в брошюре есть подходящая акция (напр. «насипна» за кг) — показываем её
  const favOffer =
    b.fav && cost == null && b.words
      ? st.brochures?.offers.find(
          (o) => offerStatus(o, today) === "now" && offerMatches(b.words!, o),
        )
      : undefined;
  const priceSub = b.pin
    ? `${money(b.pin.price, lang)}${b.pin.perKg ? t("perKg") : ""}`
    : favOffer
      ? `📰 ${st.brochures?.chains[favOffer.c]?.name ?? ""} · ${money(favOffer.p ?? 0, lang)}${isPerKgOffer(favOffer) ? t("perKg") : ""} · ${t("validTo", { date: shortDate(favOffer.t) })}`
      : b.fav
        ? cost == null
          ? t("favOnlyDeal")
          : ""
        : unpriced
          ? t("customNoPrice")
          : !st.city
            ? noData
              ? "—"
              : t("loading")
            : c
              ? `${t("from", { price: money(c.price, lang) })}${p?.byWeight ? t("perKg") : ""}`
              : t("noPrice");
  const qtyText = byWeight
    ? qtyLabel(b.qty, true, t, lang)
    : String(b.qty).replace(".", lang === "bg" ? "," : ".");

  return (
    <View style={[s.card, { padding: 12, gap: 10 }]}>
      <View style={[s.row, { alignItems: "flex-start", gap: 12 }]}>
        <ProductTile
          emoji={
            b.fav && !p
              ? "❤️"
              : unpriced
                ? "📝"
                : b.pin && !p
                  ? "🏷️"
                  : productEmoji(p)
          }
          size={76}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <View
            style={[
              s.row,
              {
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
              },
            ]}
          >
            <Text
              style={[
                s.body,
                { fontWeight: "800", fontSize: 18 * kf, flex: 1 },
              ]}
            >
              {name}
            </Text>
            {!!priceRight && (
              <Text
                style={{ fontSize: 22 * kf, fontWeight: "900", color: C.ink }}
              >
                {priceRight}
              </Text>
            )}
          </View>
          {!!detail && <Text style={s.muted}>{detail}</Text>}
          {!!priceSub && (
            <Text
              style={[
                s.muted,
                {
                  color: favOffer
                    ? C.promo
                    : c || b.pin
                      ? C.green
                      : !st.city || unpriced || b.fav
                        ? C.muted
                        : C.promo,
                  fontWeight: "700",
                },
              ]}
            >
              {priceSub}
            </Text>
          )}
          {b.pin && <PinInfo pin={b.pin} />}
          <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
            {b.pin && <PinBadge />}
            {!!b.fav && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#FFF1F0",
                  borderRadius: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    color: C.promo,
                    fontWeight: "700",
                    fontSize: 13 * kf,
                  }}
                >
                  ❤️ {t("favBadge")}
                </Text>
              </View>
            )}
            {!!b.brand && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: C.greenSoft,
                  borderRadius: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <Icon name="checkmark" size={14} color={C.green} />
                <Text
                  style={{
                    color: C.green,
                    fontWeight: "700",
                    fontSize: 13 * kf,
                  }}
                >
                  {t("brandChosen")}: {brandLabel(b.brand, t)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {!!pinProblem && (
        <View
          style={[
            s.card,
            {
              gap: 8,
              backgroundColor: "#FFF8E8",
              borderColor: "#F0DFA8",
              padding: 12,
              shadowOpacity: 0,
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          <Text style={s.body}>⚠️ {pinProblem}</Text>
          <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
            {b.productId > 0 && status !== "soon" && (
              <Pressable
                onPress={() => st.allowSubstitute(key)}
                accessibilityRole="button"
                style={[s.chip, { borderColor: C.green }]}
              >
                <Text style={[s.chipText, { color: C.green }]}>
                  {t("allowSubstitute")}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => st.removeItem(key)}
              accessibilityRole="button"
              style={s.chip}
            >
              <Text style={[s.chipText, { color: C.promo }]}>
                {t("remove")}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View
        style={[
          s.row,
          { justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
        ]}
      >
        {canBrand ? (
          <Pressable
            onPress={() => (st.can("brandMode") ? onBrand() : st.openPaywall())}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${t("chooseBrand")}: ${b.brand ? brandLabel(b.brand, t) : t("anyBrand")}`}
            style={[s.row, { gap: 4, minHeight: 44, paddingHorizontal: 4 }]}
          >
            <Icon name="pricetag-outline" size={17} color={C.muted} />
            <Text style={[s.muted, { fontWeight: "700" }]}>
              {t("brandShort")} ▾{st.can("brandMode") ? "" : " 🔒"}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Stepper
          value={b.qty}
          label={qtyText}
          onMinus={() => st.setQty(key, Math.round((b.qty - step) * 10) / 10)}
          onPlus={() => st.setQty(key, Math.round((b.qty + step) * 10) / 10)}
        />
      </View>
    </View>
  );
}
