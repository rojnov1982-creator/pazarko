// Общие элементы экранов: заголовок с настройками, состояние данных, строка покупки, значок закрепления.

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { shortDate } from "./lib/brochures";
import { brandLabel, productName, sizeLabel, splitName } from "./lib/i18n";
import type { PlanLine } from "./lib/optimize";
import { useStore } from "./lib/store";
import type { BasketItem, PinnedOffer } from "./lib/types";
import { C, money, productEmoji, qtyLabel, useK, useS } from "./ui";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({ name, size = 22, color = C.ink }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Заголовок экрана: название и заметная шестерёнка (настройки и язык доступны со всех экранов) */
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const { t } = useStore();
  const s = useS();
  const k = useK();
  return (
    <View style={[s.row, { justifyContent: "space-between", alignItems: "center" }]}>
      <Text style={[s.title, { flexShrink: 1 }]} accessibilityRole="header">
        {title}
      </Text>
      <View style={[s.row, { gap: 8 }]}>
        {right}
        <Pressable
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel={t("settingsA11y")}
          hitSlop={8}
          style={{
            width: 48 * k,
            height: 48 * k,
            borderRadius: 24 * k,
            backgroundColor: C.card,
            borderWidth: 1.5,
            borderColor: C.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="settings-outline" size={26 * k} color={C.green} />
        </Pressable>
      </View>
    </View>
  );
}

/** Кнопка-действие в сообщении о данных */
function Action({ label, onPress, icon }: { label: string; onPress: () => void; icon: IconName }) {
  const s = useS();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[s.chip, s.row, { gap: 6, borderColor: C.green }]}>
      <Icon name={icon} size={18} color={C.green} />
      <Text style={[s.chipText, { color: C.green }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Компактно: дата цен, город/район, сохранённые данные, частичная загрузка, ошибка с повтором.
 * Если район не готов — объясняет почему и даёт действия; весь город подставляется только по кнопке.
 */
export function DataStatus({ onOpenArea }: { onOpenArea?: () => void }) {
  const st = useStore();
  const { t, lang, index, area, areaStatus } = st;
  const s = useS();
  const cur = index?.cities.find((c) => c.ekatte === st.ekatte);
  const cityName = cur ? (lang === "en" && cur.nameEn ? cur.nameEn : cur.name.replace(/^(гр|с)\. /, "")) : "";
  const areaName =
    area.mode === "city" ? t("dsWholeCity") : area.mode === "stores" ? t("areaMyStores") : `${area.label} · ${t("km", { n: area.radiusKm })}`;
  const date = index?.date ? shortDate(index.date) + "." + index.date.slice(0, 4) : "—";

  const areaProblem = area.mode !== "city" && (areaStatus === "empty" || areaStatus === "error");
  return (
    <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
      <Text style={s.muted}>
        {t("dsPrices", { date })} · {cityName}
        {cityName ? `, ${areaName}` : ""}
      </Text>
      {st.stale && (
        <Text style={[s.muted, { color: "#8A5A00" }]}>
          <Icon name="cloud-offline-outline" size={16} color="#8A5A00" /> {t("dsStale")}
        </Text>
      )}
      {!!st.error && (
        <View style={[s.card, { gap: 8, backgroundColor: "#FFF1EC", borderColor: "#F3C9BB" }]}>
          <Text style={s.body}>
            {t("dsError")}: {st.error}
          </Text>
          <Action label={t("dsRetry")} icon="refresh" onPress={st.reload} />
        </View>
      )}
      {area.mode !== "city" && areaStatus === "loading" && <Text style={s.muted}>{t("dsAreaLoading")}</Text>}
      {area.mode !== "city" && areaStatus === "partial" && (
        <Text style={[s.muted, { color: "#8A5A00" }]}>{t("dsAreaPartial", { n: st.areaLoaded, total: st.areaStoreCount })}</Text>
      )}
      {areaProblem && (
        <View style={[s.card, { gap: 10, backgroundColor: "#FFF8E8", borderColor: "#F0DFA8" }]}>
          <Text style={s.body}>{areaStatus === "empty" ? t("dsAreaEmpty") : t("dsAreaError")}</Text>
          <View style={[s.row, { flexWrap: "wrap", gap: 8 }]}>
            {area.mode === "near" && area.radiusKm < 5 && (
              <Action label={t("dsWiden")} icon="expand-outline" onPress={() => st.setArea({ ...area, radiusKm: Math.min(5, area.radiusKm + 1) })} />
            )}
            {onOpenArea && <Action label={t("dsOtherStores")} icon="storefront-outline" onPress={onOpenArea} />}
            {areaStatus === "error" && <Action label={t("dsRetry")} icon="refresh" onPress={st.retryArea} />}
            <Action label={t("dsUseCity")} icon="business-outline" onPress={() => st.setArea({ mode: "city" })} />
          </View>
        </View>
      )}
    </View>
  );
}

/** Название позиции корзины: закреплённое предложение — как в источнике, иначе — группа КЗП */
export function itemName(b: BasketItem | undefined, lang: "bg" | "en", productById: Map<number, { bg: string; en: string; id: number; cat: number }>) {
  if (!b) return "";
  if (b.pin) return b.pin.name;
  return splitName(productName(productById.get(b.productId) as never, lang), lang)[0];
}

/** Значок «Закрепено» */
export function PinBadge() {
  const { t } = useStore();
  return (
    <View
      accessibilityLabel={t("pinnedA11y")}
      style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.greenSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}
    >
      <Icon name="pin" size={14} color={C.green} />
      <Text style={{ color: C.green, fontWeight: "800", fontSize: 12 }}>{t("pinned")}</Text>
    </View>
  );
}

/** Условия закреплённой акции: сеть, срок, карта, условие */
export function PinInfo({ pin }: { pin: PinnedOffer }) {
  const { t, lang } = useStore();
  const s = useS();
  const parts = [
    t("inChain", { chain: pin.chain }),
    pin.source === "brochure" && pin.to ? t("validTo", { date: shortDate(pin.to) }) : "",
    pin.card ? t("withCard") : "",
    pin.unitPrice ? unitLabel(pin.unitPrice, lang) : "",
  ].filter(Boolean);
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.muted}>{parts.join(" · ")}</Text>
      {!!pin.condition && <Text style={[s.muted, { fontSize: 13 }]}>{t("cond", { text: pin.condition })}</Text>}
    </View>
  );
}

function unitLabel(u: string, lang: "bg" | "en") {
  const [v, unit] = u.split("/");
  const n = Number(v);
  const units: Record<string, [string, string]> = { kg: ["кг", "kg"], l: ["л", "l"], pcs: ["бр.", "pc"] };
  const un = units[unit]?.[lang === "en" ? 1 : 0] ?? unit;
  return lang === "en" ? `€${n.toFixed(2)}/${un}` : `${n.toFixed(2).replace(".", ",")} €/${un}`;
}

/**
 * Строка покупки: что именно купить (товар и марка), упаковки, цена покупки, магазин, условия.
 * Одинаковая для обычного и «Лесен режим» — простой режим лишь крупнее.
 */
export function PurchaseLine({ line, item }: { line: PlanLine; item?: BasketItem }) {
  const st = useStore();
  const { t, lang } = st;
  const s = useS();
  const k = useK();
  const m = (n: number) => money(n, lang);
  const p = st.productById.get(line.productId);
  const group = item?.pin ? item.pin.name : itemName(item, lang, st.productById);
  const product = line.offer.product && line.offer.product !== group ? line.offer.product : "";
  const brand = item?.brand ? brandLabel(item.brand, t) : "";
  const byWeight = item?.pin ? !!item.pin.perKg : !!p?.byWeight;
  const size = line.packSize && line.packUnit ? sizeLabel({ unit: line.packUnit, size: line.packSize }, t, lang) : "";
  // «2 × 1 кг · 7,50 €» или «1,5 кг × 1,21 €»
  const qtyText = byWeight
    ? `${qtyLabel(line.qty, true, t, lang)} × ${m(line.offer.price)}`
    : line.packs != null && size
      ? `${t("packsOf", { packs: line.packs, size })} · ${m(line.offer.packPrice ?? line.offer.price)}`
      : `${qtyLabel(line.packs ?? line.qty, false, t, lang)} × ${m(line.offer.packPrice ?? line.offer.price)}`;
  return (
    <View style={[s.row, { alignItems: "flex-start", gap: 12 }]} accessible accessibilityLabel={`${group}. ${product}. ${qtyText}. ${m(line.cost)}`}>
      <Text style={{ fontSize: 28 * k }} importantForAccessibility="no">
        {item?.pin && !p ? "🏷️" : productEmoji(p)}
      </Text>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={[s.row, { gap: 6, flexWrap: "wrap" }]}>
          <Text style={[s.body, { fontWeight: "700" }]}>{group}</Text>
          {item?.pin && <PinBadge />}
        </View>
        {(!!product || !!brand) && <Text style={s.muted}>{[brand, product].filter(Boolean).join(" · ")}</Text>}
        <Text style={[s.muted, { color: C.ink }]}>{qtyText}</Text>
        {line.offer.isPromo && !item?.pin && <Text style={[s.muted, { color: C.promo }]}>{t("promo")}</Text>}
        {!!line.offer.store && <Text style={[s.muted, { fontSize: 13 }]}>{t("storeAddr", { store: line.offer.store })}</Text>}
        {item?.pin && <PinInfo pin={item.pin} />}
        {line.approx && <Text style={[s.muted, { fontSize: 13, color: "#8A5A00" }]}>≈ {t("approxLine")}</Text>}
      </View>
      <Text style={[s.body, s.num, { fontWeight: "800" }]}>
        {line.approx ? "≈ " : ""}
        {m(line.cost)}
      </Text>
    </View>
  );
}
