import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DATA_URL, IS_DEMO } from "../lib/data";
import { LANGS } from "../lib/i18n";
import { useStore } from "../lib/store";
import { C, Card, Chip, H, money, s, Stepper } from "../ui";

function Toggle({ title, sub, value, onChange }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[s.row, { justifyContent: "space-between", paddingVertical: 4 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.body, { fontWeight: "600" }]}>{title}</Text>
        {!!sub && <Text style={s.muted}>{sub}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.green, false: C.line }} thumbColor="#fff" />
    </View>
  );
}

export default function SettingsScreen() {
  const st = useStore();
  const { settings: cfg, city, index, t, lang } = st;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 32 }]}>
        <Text style={s.title}>{t("tabSettings")}</Text>

        <H>{t("language")}</H>
        <View style={[s.row, { gap: 8 }]}>
          {LANGS.map((l) => (
            <Chip key={l.code} label={l.label} active={lang === l.code} onPress={() => st.updateSettings({ lang: l.code })} />
          ))}
        </View>

        <Pressable onPress={st.openPaywall}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.green, borderColor: C.green, marginTop: 8 }}>
            <Text style={{ fontSize: 26 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{t("premium")}</Text>
              <Text style={{ color: "#CFE6D6", fontSize: 13 }}>{t("premiumSub")}</Text>
            </View>
            <Text style={{ color: "#fff", fontWeight: "700" }}>→</Text>
          </Card>
        </Pressable>

        <H style={{ marginTop: 6 }}>{t("calc")}</H>
        <Card style={{ gap: 12 }}>
          <Toggle title={t("usePromo")} sub={t("usePromoSub")} value={cfg.usePromo} onChange={(v) => st.updateSettings({ usePromo: v })} />
          <View style={s.divider} />
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: "600" }]}>{t("storeCost")}</Text>
              <Text style={s.muted}>{t("storeCostSub")}</Text>
            </View>
            <Stepper
              value={cfg.extraStoreCost}
              label={money(cfg.extraStoreCost, lang)}
              onMinus={() => st.updateSettings({ extraStoreCost: Math.max(0, cfg.extraStoreCost - 0.5) })}
              onPlus={() => st.updateSettings({ extraStoreCost: cfg.extraStoreCost + 0.5 })}
            />
          </View>
          <View style={s.divider} />
          <Toggle
            title={t("onlyGrocery")}
            sub={t("onlyGrocerySub")}
            value={cfg.onlyGrocery}
            onChange={(v) => st.updateSettings({ onlyGrocery: v })}
          />
          <View style={s.divider} />
          <Toggle title={t("showDeals")} sub={t("showDealsSub")} value={cfg.showDeals} onChange={(v) => st.updateSettings({ showDeals: v })} />
          <View style={s.divider} />
          <Toggle title={t("hideMeds")} sub={t("hideMedsSub")} value={cfg.hideMedicines} onChange={(v) => st.updateSettings({ hideMedicines: v })} />
        </Card>

        <H style={{ marginTop: 6 }}>{t("chainsInCityTitle")}</H>
        <Card style={{ gap: 6 }}>
          <Text style={s.muted}>{t("chainsHint")}</Text>
          {(city?.chains ?? [])
            .filter((c) => !cfg.onlyGrocery || !c.kind || c.kind === "grocery")
            .map((c) => (
            <Toggle
              key={c.eik}
              title={c.name}
              sub={
                t("chainSub", { n: c.stores, eik: c.eik }) +
                (c.kind === "pharmacy" ? ` · ${t("kindPharmacy")}` : c.kind === "other" ? ` · ${t("kindOther")}` : "")
              }
              value={!cfg.excludedChains.includes(c.eik)}
              onChange={(v) =>
                st.updateSettings({
                  excludedChains: v ? cfg.excludedChains.filter((e) => e !== c.eik) : [...cfg.excludedChains, c.eik],
                })
              }
            />
          ))}
        </Card>

        <H style={{ marginTop: 6 }}>{t("data")}</H>
        <Card style={{ gap: 4 }}>
          <Text style={s.body}>{t("source", { source: IS_DEMO ? t("demoSource") : index?.source ?? "" })}</Text>
          <Text style={s.muted}>{t("pricesDate", { date: index?.date ?? "—" })}</Text>
          {!IS_DEMO && <Text style={s.muted}>{t("server", { url: DATA_URL })}</Text>}
          <Text style={[s.muted, { marginTop: 6 }]}>{t("aboutData")}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
