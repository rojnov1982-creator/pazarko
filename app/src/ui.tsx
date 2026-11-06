import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import type { Lang, T } from "./lib/i18n";
import { useStore } from "./lib/store";

export const C = {
  bg: "#F4EFE6",
  card: "#FFFDF8",
  ink: "#1E2A22",
  muted: "#545C52", // темнее, чтобы читалось на бежевом фоне
  line: "#E4DDCF",
  green: "#1F6F4A",
  greenSoft: "#DCEBDF",
  promo: "#D9482B",
  promoSoft: "#FBE3DC",
  gold: "#C99A2E",
};

export const mono = Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" });

const eur = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eurEn = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n: number, lang: Lang = "bg") => (lang === "en" ? `€${eurEn.format(n)}` : `${eur.format(n)} €`);
export const qtyLabel = (qty: number, byWeight: boolean, t: T, lang: Lang = "bg") => {
  const n = lang === "en" ? String(qty) : String(qty).replace(".", ",");
  return byWeight ? t("qtyKg", { n }) : t("qtyPcs", { n });
};

export const CAT_EMOJI: Record<number, string> = {
  1: "🍞", 2: "🥛", 3: "🫒", 4: "🥩", 5: "🐟", 6: "🥕", 7: "🍫", 8: "🥫", 9: "🍎", 10: "☕", 11: "💧", 12: "🍷", 13: "🧴", 14: "💊",
};

/** Значок для каждого товара КЗП (не раздела): масло — 🧈, яйца — 🥚, ориз — 🍚 */
export const PRODUCT_EMOJI: Record<number, string> = {
  1: "🍞", 2: "🍞", 3: "🍞", 4: "🍞", 5: "🫓",
  6: "🥛", 7: "🥣", 8: "🧀", 9: "🧀", 10: "🧀", 11: "🧀", 12: "🧈", 13: "🧀", 14: "🧀",
  15: "🐔", 16: "🍗", 17: "🍗", 18: "🥩", 19: "🥩", 20: "🥩", 21: "🥩", 22: "🥩", 23: "🥩", 24: "🥩", 25: "🥩",
  26: "🌭", 27: "🌭", 28: "🥓", 29: "🐟", 30: "🐟", 31: "🥚", 32: "🥚",
  33: "🫘", 34: "🫘", 35: "🍚", 36: "🍝", 37: "🍝", 38: "🍬", 39: "🧂", 40: "🌾", 41: "🌾",
  42: "🌻", 43: "🫒", 44: "🍶", 45: "🍶", 46: "🥫", 47: "🥫", 48: "🥫", 49: "🫙",
  50: "🍋", 51: "🍊", 52: "🍌", 53: "🍎", 54: "🍅", 55: "🧅", 56: "🥕", 57: "🥬", 58: "🥒", 59: "🧄", 60: "🍄",
  61: "🥔", 62: "🫒", 63: "🥣", 64: "🍼", 65: "🍼", 66: "🍪", 67: "🥐", 68: "🥧", 69: "🍫",
  70: "☕", 71: "☕", 72: "🍵", 73: "💧", 74: "🍺", 75: "🥂", 76: "🍷", 77: "🥃", 78: "🚬",
  79: "🧽", 80: "🪥", 81: "🦷", 82: "🧴", 83: "🧼", 84: "🧻", 85: "🧻",
};
export const productEmoji = (p?: { id: number; cat: number }) => (p ? PRODUCT_EMOJI[p.id] ?? CAT_EMOJI[p.cat] ?? "🛒" : "🛒");

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const s = useS();
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  kind = "primary",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "ghost";
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const s = useS();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        kind === "ghost" && s.btnGhost,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      <Text style={[s.btnText, kind === "ghost" && { color: C.green }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const s = useS();
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({ value, label, onMinus, onPlus }: { value: number; label: string; onMinus: () => void; onPlus: () => void }) {
  const s = useS();
  const { t } = useStore();
  return (
    <View style={s.stepper}>
      <Pressable onPress={onMinus} hitSlop={8} style={s.stepBtn} accessibilityRole="button" accessibilityLabel={`${t("qtyLess")} (${label})`}>
        <Text style={s.stepSign}>−</Text>
      </Pressable>
      <Text style={s.stepVal} accessibilityLabel={label}>
        {label}
      </Text>
      <Pressable onPress={onPlus} hitSlop={8} style={s.stepBtn} accessibilityRole="button" accessibilityLabel={`${t("qtyMore")} (${label})`}>
        <Text style={s.stepSign}>+</Text>
      </Pressable>
    </View>
  );
}

export function PromoBadge() {
  const s = useS();
  return (
    <View style={s.badge}>
      <Text style={s.badgeText}>{useStore().t("promo")}</Text>
    </View>
  );
}

export function H({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const s = useS();
  return <Text style={[s.h, style]}>{children}</Text>;
}

export function DemoBanner() {
  const s = useS();
  return (
    <View style={s.demo}>
      <Text style={s.demoText}>{useStore().t("demoBanner")}</Text>
    </View>
  );
}

function makeStyles(k: number) {
  const f = (n: number) => Math.round(n * k);
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.line },
  h: { fontSize: f(14), fontWeight: "700", color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" },
  title: { fontSize: f(30), fontWeight: "800", color: C.ink, letterSpacing: -0.5 },
  body: { fontSize: f(17), color: C.ink },
  muted: { fontSize: f(15), color: C.muted },
  num: { fontFamily: mono, fontVariant: ["tabular-nums"], color: C.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  btn: { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 16, alignItems: "center", minHeight: f(56) },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: C.green },
  btnText: { color: "#fff", fontWeight: "700", fontSize: f(18), textAlign: "center" },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, minHeight: f(44), justifyContent: "center" },
  chipActive: { backgroundColor: C.green, borderColor: C.green },
  chipText: { fontSize: f(15), color: C.ink, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: C.greenSoft, borderRadius: 999 },
  stepBtn: { width: f(48), height: f(48), alignItems: "center", justifyContent: "center" },
  stepSign: { fontSize: f(28), color: C.green, fontWeight: "700" },
  stepVal: { minWidth: f(64), textAlign: "center", fontWeight: "700", color: C.ink, fontSize: f(17) },
  badge: { backgroundColor: C.promoSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: C.promo, fontSize: f(12), fontWeight: "800", letterSpacing: 0.5 },
  demo: { backgroundColor: "#FFF4D6", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#F0DFA8" },
  demoText: { fontSize: f(14), color: "#7A5C12" },
  divider: { height: 1, backgroundColor: C.line },
  });
}

/** Стили обычного режима (для мест вне компонентов) */
export const s = makeStyles(1);
/** Лесен режим: всё на 20% крупнее */
const sEasy = makeStyles(1.2);
/** Коэффициент размеров: 1 или 1.2 в «Лесен режим» */
export function useK() {
  return useStore().settings.easy ? 1.2 : 1;
}
/** Стили с учётом «Лесен режим» */
export function useS() {
  return useStore().settings.easy ? sEasy : s;
}
