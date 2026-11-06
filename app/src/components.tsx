// Общие элементы экранов: заголовок с настройками, состояние данных, строка покупки, значок закрепления.

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { shortDate } from "./lib/brochures";
import { brandLabel, productName, sizeLabel, splitName } from "./lib/i18n";
import type { PlanLine } from "./lib/optimize";
import { useStore } from "./lib/store";
import type { BasketItem, PinnedOffer } from "./lib/types";
import { C, money, productEmoji, qtyLabel, Stepper, useK, useS } from "./ui";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 22,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** «гр. София» → «София» / «Sofia» */
export const cityLabel = (name: string, nameEn: string, lang: string) =>
  lang === "en" && nameEn ? nameEn : name.replace(/^(гр|с)\. /, "");

/**
 * Шапка всех основных экранов: логотип, город · район (выбор города), шестерёнка (настройки и язык).
 */
export function AppHeader() {
  const st = useStore();
  const { t, lang, area } = st;
  const s = useS();
  const k = useK();
  const [picker, setPicker] = useState(false);
  const cur = st.index?.cities.find((c) => c.ekatte === st.ekatte);
  const where = cur ? cityLabel(cur.name, cur.nameEn, lang) : t("chooseCity");
  const sub = area.mode === "near" ? area.label : "";
  return (
    <View
      style={[
        s.row,
        { justifyContent: "space-between", alignItems: "center", gap: 8 },
      ]}
    >
      <View
        style={[s.row, { gap: 6, flexShrink: 1 }]}
        accessible
        accessibilityRole="header"
        accessibilityLabel={t("appName")}
      >
        {/* логотип не увеличиваем в лёгком режиме — иначе он наезжает на выбор города */}
        <Icon name="basket" size={28} color={C.green} />
        <Text
          style={{
            fontSize: 21,
            fontWeight: "900",
            color: C.green,
            letterSpacing: -0.5,
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {t("appName")}
        </Text>
      </View>
      <View style={[s.row, { gap: 8, flexShrink: 1 }]}>
        <Pressable
          onPress={() => setPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t("city")}: ${where}${sub ? `, ${sub}` : ""}`}
          style={[
            s.row,
            {
              gap: 4,
              paddingHorizontal: 12,
              minHeight: 40 * k,
              borderRadius: 999,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              flexShrink: 1,
            },
          ]}
        >
          <Icon name="location-outline" size={17 * k} color={C.ink} />
          <Text
            style={{
              fontSize: 14 * k,
              fontWeight: "600",
              color: C.ink,
              flexShrink: 1,
            }}
            numberOfLines={2}
          >
            {where}
            {sub ? ` · ${sub}` : ""}
          </Text>
          <Icon name="chevron-down" size={15 * k} color={C.muted} />
        </Pressable>
        <Pressable
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel={t("settingsA11y")}
          hitSlop={8}
          style={{
            width: 44 * k,
            height: 44 * k,
            borderRadius: 22 * k,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="settings-outline" size={26 * k} color={C.ink} />
        </Pressable>
      </View>
      <CityPicker visible={picker} onClose={() => setPicker(false)} />
    </View>
  );
}

/** Выбор города */
function CityPicker({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.screen, s.pad]}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={[s.title, { fontSize: 24 }]}>{t("city")}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={{ color: C.green, fontWeight: "700", fontSize: 17 }}>
              {t("done")}
            </Text>
          </Pressable>
        </View>
        <FlatList
          data={st.index?.cities ?? []}
          keyExtractor={(c) => c.ekatte}
          ItemSeparatorComponent={() => <View style={s.divider} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                st.selectCity(item.ekatte);
                onClose();
              }}
              accessibilityRole="button"
              style={[s.row, { paddingVertical: 14 }]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    s.body,
                    { fontWeight: item.ekatte === st.ekatte ? "800" : "500" },
                  ]}
                >
                  {cityLabel(item.name, item.nameEn, lang)}
                </Text>
                <Text style={s.muted}>
                  {t("cityStats", {
                    chains: st.settings.onlyGrocery
                      ? (item.grocery ?? item.chains)
                      : item.chains,
                    stores: item.stores,
                    promos: item.promos,
                  })}
                </Text>
              </View>
              {item.ekatte === st.ekatte && (
                <Icon name="checkmark" size={22} color={C.green} />
              )}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

/** Шапка + крупный заголовок страницы + подзаголовок */
export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const s = useS();
  const k = useK();
  return (
    <View style={{ gap: 10 }}>
      <AppHeader />
      <View style={{ gap: 2, marginTop: 4 }}>
        <Text
          style={[s.title, { fontSize: 30 * k }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {!!subtitle && <Text style={s.muted}>{subtitle}</Text>}
      </View>
    </View>
  );
}

/** Иллюстрация товара на мягкой плашке (фотографий в данных нет) */
export function ProductTile({
  emoji,
  size = 64,
}: {
  emoji: string;
  size?: number;
}) {
  const k = useK();
  const z = size * k;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: z,
        height: z,
        borderRadius: 16,
        backgroundColor: C.tile,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: z * 0.55 }}>{emoji}</Text>
    </View>
  );
}

/** Цвет метки сети: устойчивый по названию (без логотипов сетей) */
const CHAIN_COLORS = [
  "#C62828",
  "#1565C0",
  "#2E7D32",
  "#EF6C00",
  "#6A1B9A",
  "#00838F",
  "#AD1457",
  "#5D4037",
];
export function chainColor(name: string) {
  let h = 0;
  for (const ch of name.toUpperCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CHAIN_COLORS[h % CHAIN_COLORS.length];
}

/** Метка сети: цветная точка + название */
export function ChainBadge({
  name,
  size = 15,
}: {
  name: string;
  size?: number;
}) {
  const k = useK();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 10 * k,
          height: 10 * k,
          borderRadius: 5 * k,
          backgroundColor: chainColor(name),
        }}
      />
      <Text
        style={{
          fontSize: size * k,
          fontWeight: "800",
          color: chainColor(name),
        }}
      >
        {name}
      </Text>
    </View>
  );
}

/** Переключатель-«таблетка» (Днес | Брошури) */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const k = useK();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#ECE7DD",
        borderRadius: 999,
        padding: 4,
      }}
      accessibilityRole="tablist"
    >
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable
            key={it.id}
            onPress={() => onChange(it.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              minHeight: 44 * k,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? C.green : "transparent",
              flexDirection: "row",
              gap: 6,
            }}
          >
            {it.icon && (
              <Icon name={it.icon} size={18 * k} color={on ? "#fff" : C.ink} />
            )}
            <Text
              style={{
                fontSize: 16 * k,
                fontWeight: "700",
                color: on ? "#fff" : C.ink,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Карточка акции: иллюстрация · сеть · название · фасовка · скидка (второстепенно) · цена · срок/карта · условие · действие.
 * После добавления — количество на месте кнопки.
 */
export function OfferCard(props: {
  emoji: string;
  chain: string;
  title: string;
  detail?: string;
  price?: number;
  regular?: number;
  pct?: number;
  dateLabel: string;
  soon?: boolean;
  card?: boolean;
  condition?: string;
  /** проверка по ценам КЗП: «обичайно X € → реално −N%» */
  check?: { text: string; tone: "good" | "weak" | "plain" };
  qty?: number;
  qtyLabel?: string;
  onAdd?: () => void;
  onMinus?: () => void;
  onPlus?: () => void;
}) {
  const { t, lang } = useStore();
  const s = useS();
  const k = useK();
  const p = props;
  return (
    <View style={[s.card, { gap: 12, padding: 14 }]}>
      <View style={[s.row, { alignItems: "flex-start", gap: 12 }]}>
        <ProductTile emoji={p.emoji} size={84} />
        <View style={{ flex: 1, gap: 2 }}>
          <View
            style={[
              s.row,
              {
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 6,
              },
            ]}
          >
            <View style={{ flexShrink: 1 }}>
              <ChainBadge name={p.chain} />
            </View>
            {!!p.pct && (
              <View
                style={{
                  backgroundColor: C.promo,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "800", fontSize: 14 * k }}
                >
                  −{p.pct}%
                </Text>
              </View>
            )}
          </View>
          <Text style={[s.body, { fontWeight: "800", fontSize: 18 * k }]}>
            {p.title}
          </Text>
          {!!p.detail && <Text style={s.muted}>{p.detail}</Text>}
          <View
            style={[
              s.row,
              {
                justifyContent: "space-between",
                alignItems: "flex-end",
                flexWrap: "wrap",
                marginTop: 4,
              },
            ]}
          >
            <View>
              {p.price != null && (
                <Text
                  style={{
                    fontSize: 28 * k,
                    fontWeight: "900",
                    color: C.green,
                  }}
                >
                  {money(p.price, lang)}
                </Text>
              )}
              {p.regular != null && (
                <Text
                  style={[
                    s.muted,
                    { textDecorationLine: "line-through", fontSize: 16 * k },
                  ]}
                >
                  {money(p.regular, lang)}
                </Text>
              )}
            </View>
            <View style={{ gap: 4, alignItems: "flex-start" }}>
              <Pill
                icon="calendar-outline"
                text={p.dateLabel}
                tone={p.soon ? "warn" : "plain"}
              />
              {p.card && <Pill icon="card-outline" text={t("withCard")} />}
            </View>
          </View>
        </View>
      </View>
      {!!p.condition && (
        <Text style={[s.muted, { fontSize: 14 * k }]}>{p.condition}</Text>
      )}
      {!!p.check && (
        <View style={[s.row, { gap: 6, alignItems: "flex-start" }]}>
          <Icon
            name={
              p.check.tone === "good"
                ? "shield-checkmark-outline"
                : "information-circle-outline"
            }
            size={18 * k}
            color={
              p.check.tone === "good"
                ? C.green
                : p.check.tone === "weak"
                  ? "#8A5A00"
                  : C.muted
            }
          />
          <Text
            style={[
              s.muted,
              {
                flex: 1,
                fontSize: 14 * k,
                color:
                  p.check.tone === "good"
                    ? C.green
                    : p.check.tone === "weak"
                      ? "#8A5A00"
                      : C.muted,
                fontWeight: "600",
              },
            ]}
          >
            {p.check.text}
          </Text>
        </View>
      )}
      {p.qty != null ? (
        <View
          style={[
            s.row,
            { justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
          ]}
        >
          <Text style={[s.body, { color: C.green, fontWeight: "800" }]}>
            ✓ {t("inBasketQty")}
          </Text>
          <Stepper
            value={p.qty}
            label={p.qtyLabel ?? String(p.qty)}
            onMinus={p.onMinus!}
            onPlus={p.onPlus!}
          />
        </View>
      ) : (
        p.onAdd && (
          <Pressable
            onPress={p.onAdd}
            accessibilityRole="button"
            accessibilityLabel={`${t("pinAddA11y")}: ${p.title}, ${p.chain}`}
            style={({ pressed }) => [
              s.btn,
              {
                minHeight: 50 * k,
                paddingVertical: 12,
                borderRadius: 14,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[s.btnText, { fontSize: 17 }]}>{t("pinAdd")}</Text>
          </Pressable>
        )
      )}
    </View>
  );
}

/** Маленькая плашка с иконкой: «📅 До 08.11», «💳 С карта» */
export function Pill({
  icon,
  text,
  tone = "plain",
}: {
  icon: IconName;
  text: string;
  tone?: "plain" | "warn";
}) {
  const k = useK();
  const warn = tone === "warn";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        borderWidth: 1,
        borderColor: warn ? "#F0DFA8" : C.line,
        backgroundColor: warn ? "#FFF6DD" : "#FAF8F3",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Icon name={icon} size={15 * k} color={warn ? "#8A5A00" : C.ink} />
      <Text
        style={{
          fontSize: 13 * k,
          fontWeight: "600",
          color: warn ? "#8A5A00" : C.ink,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

/** Кнопка-действие в сообщении о данных */
function Action({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: IconName;
}) {
  const s = useS();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[s.chip, s.row, { gap: 6, borderColor: C.green }]}
    >
      <Icon name={icon} size={18} color={C.green} />
      <Text style={[s.chipText, { color: C.green }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Компактно: дата цен, город/район, сохранённые данные, частичная загрузка, ошибка с повтором.
 * Если район не готов — объясняет почему и даёт действия; весь город подставляется только по кнопке.
 */
export function DataStatus({
  onOpenArea,
  compact,
}: {
  onOpenArea?: () => void;
  compact?: boolean;
}) {
  const st = useStore();
  const { t, lang, index, area, areaStatus } = st;
  const s = useS();
  const cur = index?.cities.find((c) => c.ekatte === st.ekatte);
  const cityName = cur
    ? lang === "en" && cur.nameEn
      ? cur.nameEn
      : cur.name.replace(/^(гр|с)\. /, "")
    : "";
  const areaName =
    area.mode === "city"
      ? t("dsWholeCity")
      : area.mode === "stores"
        ? t("areaMyStores")
        : `${area.label} · ${t("km", { n: area.radiusKm })}`;
  const date = index?.date
    ? shortDate(index.date) + "." + index.date.slice(0, 4)
    : "—";

  const areaProblem =
    area.mode !== "city" && (areaStatus === "empty" || areaStatus === "error");
  return (
    <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
      {!compact && (
        <Text style={s.muted}>
          {t("dsPrices", { date })} · {cityName}
          {cityName ? `, ${areaName}` : ""}
        </Text>
      )}
      {st.stale && (
        <Text style={[s.muted, { color: "#8A5A00" }]}>
          <Icon name="cloud-offline-outline" size={16} color="#8A5A00" />{" "}
          {t("dsStale")}
        </Text>
      )}
      {!!st.error && (
        <View
          style={[
            s.card,
            { gap: 8, backgroundColor: "#FFF1EC", borderColor: "#F3C9BB" },
          ]}
        >
          <Text style={s.body}>
            {t("dsError")}: {st.error}
          </Text>
          <Action label={t("dsRetry")} icon="refresh" onPress={st.reload} />
        </View>
      )}
      {area.mode !== "city" && areaStatus === "loading" && (
        <Text style={s.muted}>{t("dsAreaLoading")}</Text>
      )}
      {area.mode !== "city" && areaStatus === "partial" && (
        <Text style={[s.muted, { color: "#8A5A00" }]}>
          {t("dsAreaPartial", { n: st.areaLoaded, total: st.areaStoreCount })}
        </Text>
      )}
      {areaProblem && (
        <View
          style={[
            s.card,
            { gap: 10, backgroundColor: "#FFF8E8", borderColor: "#F0DFA8" },
          ]}
        >
          <Text style={s.body}>
            {areaStatus === "empty" ? t("dsAreaEmpty") : t("dsAreaError")}
          </Text>
          <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
            {area.mode === "near" && area.radiusKm < 5 && (
              <Action
                label={t("dsWiden")}
                icon="expand-outline"
                onPress={() =>
                  st.setArea({
                    ...area,
                    radiusKm: Math.min(5, area.radiusKm + 1),
                  })
                }
              />
            )}
            {onOpenArea && (
              <Action
                label={t("dsOtherStores")}
                icon="storefront-outline"
                onPress={onOpenArea}
              />
            )}
            {areaStatus === "error" && (
              <Action
                label={t("dsRetry")}
                icon="refresh"
                onPress={st.retryArea}
              />
            )}
            <Action
              label={t("dsUseCity")}
              icon="business-outline"
              onPress={() => st.setArea({ mode: "city" })}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/** Название позиции корзины: закреплённое предложение — как в источнике, иначе — группа КЗП */
export function itemName(
  b: BasketItem | undefined,
  lang: "bg" | "en",
  productById: Map<number, { bg: string; en: string; id: number; cat: number }>,
) {
  if (!b) return "";
  if (b.pin) return b.pin.name;
  return splitName(
    productName(productById.get(b.productId) as never, lang),
    lang,
  )[0];
}

/** Значок «Закрепено» */
export function PinBadge() {
  const { t } = useStore();
  return (
    <View
      accessibilityLabel={t("pinnedA11y")}
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
      <Icon name="pin" size={14} color={C.green} />
      <Text style={{ color: C.green, fontWeight: "800", fontSize: 12 }}>
        {t("pinned")}
      </Text>
    </View>
  );
}

/** Условия закреплённой акции: сеть, срок, карта, условие */
export function PinInfo({ pin }: { pin: PinnedOffer }) {
  const { t, lang } = useStore();
  const s = useS();
  const parts = [
    t("inChain", { chain: pin.chain }),
    pin.source === "brochure" && pin.to
      ? t("validTo", { date: shortDate(pin.to) })
      : "",
    pin.card ? t("withCard") : "",
    pin.unitPrice ? unitLabel(pin.unitPrice, lang) : "",
  ].filter(Boolean);
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.muted}>{parts.join(" · ")}</Text>
      {!!pin.condition && (
        <Text style={[s.muted, { fontSize: 13 }]}>
          {t("cond", { text: pin.condition })}
        </Text>
      )}
    </View>
  );
}

function unitLabel(u: string, lang: "bg" | "en") {
  const [v, unit] = u.split("/");
  const n = Number(v);
  const units: Record<string, [string, string]> = {
    kg: ["кг", "kg"],
    l: ["л", "l"],
    pcs: ["бр.", "pc"],
  };
  const un = units[unit]?.[lang === "en" ? 1 : 0] ?? unit;
  return lang === "en"
    ? `€${n.toFixed(2)}/${un}`
    : `${n.toFixed(2).replace(".", ",")} €/${un}`;
}

/** Тексты строки покупки: название, что именно (марка · товар), количество/упаковки — для плана и списка покупок */
export function lineTexts(
  line: PlanLine,
  item: BasketItem | undefined,
  st: ReturnType<typeof useStore>,
) {
  const { t, lang } = st;
  const m = (n: number) => money(n, lang);
  const p = st.productById.get(line.productId);
  const group = item?.pin
    ? item.pin.name
    : itemName(item, lang, st.productById);
  const product =
    line.offer.product && line.offer.product !== group
      ? line.offer.product
      : "";
  const brand = item?.brand ? brandLabel(item.brand, t) : "";
  const byWeight = item?.pin ? !!item.pin.perKg : !!p?.byWeight;
  const size =
    line.packSize && line.packUnit
      ? sizeLabel({ unit: line.packUnit, size: line.packSize }, t, lang)
      : "";
  // «2 × 1 кг · 7,50 €» или «1,5 кг × 1,21 €»
  const qtyText = byWeight
    ? `${qtyLabel(line.qty, true, t, lang)} × ${m(line.offer.price)}`
    : line.packs != null && size
      ? `${t("packsOf", { packs: line.packs, size })} · ${m(line.offer.packPrice ?? line.offer.price)}`
      : `${qtyLabel(line.packs ?? line.qty, false, t, lang)} × ${m(line.offer.packPrice ?? line.offer.price)}`;
  const bro = line.offer.brochure && !item?.pin ? line.offer.brochure : null;
  const what = [brand, product].filter(Boolean).join(" · ");
  return {
    group,
    what,
    /** «📰 от брошурата · с карта» — для списка покупок */
    brochureNote: bro
      ? `📰 ${t("fromBrochure")}${bro.card ? ` · ${t("withCard")}` : ""}`
      : "",
    qtyText,
    emoji: item?.pin && !p ? "🏷️" : productEmoji(p),
  };
}

/**
 * Строка покупки (как в концепции): зелёная галочка · название · что именно и сколько (курсивом) · цена покупки.
 * Сохраняет всё нужное для покупки и в «Лесен режим»: марку, товар, упаковки, магазин, условия акции, «ориентировъчно».
 */
export function PurchaseLine({
  line,
  item,
}: {
  line: PlanLine;
  item?: BasketItem;
}) {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  const k = useK();
  const m = (n: number) => money(n, lang);
  const { group, what, qtyText } = lineTexts(line, item, st);
  return (
    <View
      style={[s.row, { alignItems: "flex-start", gap: 10 }]}
      accessible
      accessibilityLabel={`${group}. ${what}. ${qtyText}. ${m(line.cost)}`}
    >
      <View style={{ marginTop: 1 }} importantForAccessibility="no">
        <Icon name="checkmark-circle" size={24 * k} color={C.green} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
          <Text style={[s.body, { fontWeight: "700" }]}>{group}</Text>
          {item?.pin && <PinBadge />}
        </View>
        {!!what && (
          <Text style={[s.muted, { fontStyle: "italic" }]}>{what}</Text>
        )}
        <Text style={[s.muted, { fontStyle: "italic" }]}>{qtyText}</Text>
        {line.offer.brochure && !item?.pin ? (
          <Text
            style={[
              s.muted,
              { color: C.promo, fontSize: 13 * k, fontWeight: "700" },
            ]}
          >
            📰{" "}
            {[
              t("fromBrochure"),
              t("validTo", { date: shortDate(line.offer.brochure.to) }),
              line.offer.brochure.card ? t("withCard") : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : (
          line.offer.isPromo &&
          !item?.pin && (
            <Text
              style={[
                s.muted,
                { color: C.promo, fontSize: 13 * k, fontWeight: "700" },
              ]}
            >
              {t("promo")}
            </Text>
          )
        )}
        {!!line.offer.brochure?.condition && !item?.pin && (
          <Text style={[s.muted, { fontSize: 13 * k }]}>
            {line.offer.brochure.condition}
          </Text>
        )}
        {!!line.offer.store && (
          <Text style={[s.muted, { fontSize: 13 * k }]}>
            {t("storeAddr", { store: line.offer.store })}
          </Text>
        )}
        {item?.pin && <PinInfo pin={item.pin} />}
        {line.approx && (
          <Text style={[s.muted, { fontSize: 13 * k, color: "#8A5A00" }]}>
            ≈ {t("approxLine")}
          </Text>
        )}
      </View>
      <Text style={[s.body, { fontWeight: "800", fontSize: 18 * k }]}>
        {line.approx ? "≈ " : ""}
        {m(line.cost)}
      </Text>
    </View>
  );
}

/** «‹ Назад» для экранов поверх вкладок (режим покупок, мои акции) */
export function BackLink({ onPress }: { onPress: () => void }) {
  const { t } = useStore();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("back")}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        paddingVertical: 6,
      }}
    >
      <Icon name="chevron-back" size={24} color={C.green} />
      <Text style={{ color: C.green, fontWeight: "700", fontSize: 17 }}>
        {t("back")}
      </Text>
    </Pressable>
  );
}
