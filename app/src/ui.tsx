import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import type { Lang, T } from "./lib/i18n";
import { useStore } from "./lib/store";

export const C = {
  bg: "#F4EFE6",
  card: "#FFFDF8",
  ink: "#1E2A22",
  muted: "#6B7468",
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

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
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
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({ value, label, onMinus, onPlus }: { value: number; label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={onMinus} hitSlop={8} style={s.stepBtn}>
        <Text style={s.stepSign}>−</Text>
      </Pressable>
      <Text style={s.stepVal}>{label}</Text>
      <Pressable onPress={onPlus} hitSlop={8} style={s.stepBtn}>
        <Text style={s.stepSign}>+</Text>
      </Pressable>
    </View>
  );
}

export function PromoBadge() {
  return (
    <View style={s.badge}>
      <Text style={s.badgeText}>{useStore().t("promo")}</Text>
    </View>
  );
}

export function H({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.h, style]}>{children}</Text>;
}

export function DemoBanner() {
  return (
    <View style={s.demo}>
      <Text style={s.demoText}>{useStore().t("demoBanner")}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.line },
  h: { fontSize: 13, fontWeight: "700", color: C.muted, letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: "800", color: C.ink, letterSpacing: -0.5 },
  body: { fontSize: 15, color: C.ink },
  muted: { fontSize: 13, color: C.muted },
  num: { fontFamily: mono, fontVariant: ["tabular-nums"], color: C.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  btn: { backgroundColor: C.green, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: C.green },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipActive: { backgroundColor: C.green, borderColor: C.green },
  chipText: { fontSize: 13, color: C.ink, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: C.greenSoft, borderRadius: 999 },
  stepBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  stepSign: { fontSize: 20, color: C.green, fontWeight: "700" },
  stepVal: { minWidth: 56, textAlign: "center", fontWeight: "700", color: C.ink, fontSize: 13 },
  badge: { backgroundColor: C.promoSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: C.promo, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  demo: { backgroundColor: "#FFF4D6", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#F0DFA8" },
  demoText: { fontSize: 12, color: "#7A5C12" },
  divider: { height: 1, backgroundColor: C.line },
});
