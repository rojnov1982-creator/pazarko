// Экран Premium. Пока покупки не подключены, кнопка показывает «Скоро».
// Когда будете подключать RevenueCat — замените кнопку на покупку и после успеха
// вызовите updateSettings({ isPremium: true }).

import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { PREMIUM_FEATURES } from "./lib/premium";
import { useStore } from "./lib/store";
import { Button, C, Card, s } from "./ui";

export function Paywall() {
  const { paywallOpen, closePaywall, t } = useStore();
  return (
    <Modal visible={paywallOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closePaywall}>
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingTop: 28 }]}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={{ fontSize: 40 }}>🧺✨</Text>
          <Pressable onPress={closePaywall} hitSlop={12}>
            <Text style={{ color: C.green, fontWeight: "700" }}>{t("close")}</Text>
          </Pressable>
        </View>
        <Text style={s.title}>{t("premium")}</Text>
        <Text style={s.muted}>{t("premiumSub")}</Text>
        <Card style={{ gap: 14 }}>
          {PREMIUM_FEATURES.map((f) => (
            <View key={f.id} style={[s.row, { alignItems: "flex-start" }]}>
              <Text style={{ fontSize: 20 }}>{f.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.body, { fontWeight: "600" }]}>{t(f.title)}</Text>
                {!f.ready && <Text style={s.muted}>{t("inDev")}</Text>}
              </View>
            </View>
          ))}
        </Card>
        <Button title={t("premiumSoon")} onPress={closePaywall} disabled />
        <Text style={[s.muted, { textAlign: "center" }]}>{t("premiumFree")}</Text>
      </ScrollView>
    </Modal>
  );
}
