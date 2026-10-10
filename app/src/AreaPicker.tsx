// Выбор района: весь город / мои магазины / рядом (GPS или квартал + радиус).

import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { distanceKm, hasGeo, MAX_AREA_STORES, shortLabel, storesInArea } from "./lib/area";
import { IS_DEMO } from "./lib/data";
import { useStore } from "./lib/store";
import type { Area } from "./lib/types";
import { Button, C, Chip, H, s } from "./ui";

const RADII = [1, 2, 3, 5];
const fold = (t: string) => t.toLowerCase().normalize("NFKC");

export function AreaPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const st = useStore();
  const { t, baseCity: city, area, settings } = st;
  const [tab, setTab] = useState<Area["mode"]>(area.mode);
  const [ids, setIds] = useState<string[]>(area.mode === "stores" ? area.ids : []);
  const [q, setQ] = useState("");
  const [near, setNear] = useState<{ lat: number; lon: number; label: string } | null>(
    area.mode === "near" ? { lat: area.lat, lon: area.lon, label: area.label } : null,
  );
  const [radius, setRadius] = useState(area.mode === "near" ? area.radiusKm : 2);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // при открытии — текущее состояние
  useEffect(() => {
    if (!visible) return;
    setTab(area.mode);
    setIds(area.mode === "stores" ? area.ids : []);
    if (area.mode === "near") {
      setNear({ lat: area.lat, lon: area.lon, label: area.label });
      setRadius(area.radiusKm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const groceryStores = useMemo(
    () => (city?.stores ?? []).filter((x) => !settings.onlyGrocery || (city?.chains[x[1]]?.kind ?? "grocery") === "grocery"),
    [city, settings.onlyGrocery],
  );
  const shown = useMemo(() => {
    const fq = fold(q.trim());
    const list = groceryStores.filter((x) => !fq || fold(`${city?.chains[x[1]]?.name} ${x[2]}`).includes(fq));
    // выбранные — сверху
    return [...list.filter((x) => ids.includes(x[0])), ...list.filter((x) => !ids.includes(x[0]))];
  }, [groceryStores, q, ids, city]);

  const geo = hasGeo(city);
  const nearCount = near && city ? storesInArea(city, { mode: "near", ...near, radiusKm: radius }, settings.onlyGrocery).length : 0;
  const areasSorted = useMemo(() => {
    const a = city?.areas ?? [];
    return near && near.label === t("myLocation")
      ? [...a].sort((x, y) => distanceKm([near.lat, near.lon], [x[1], x[2]]) - distanceKm([near.lat, near.lon], [y[1], y[2]]))
      : a;
  }, [city, near, t]);

  async function useMyLocation() {
    setLocError(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setLocError(t("locDenied"));
        return;
      }
      const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      setNear({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: t("myLocation") });
    } catch {
      setLocError(t("locDenied"));
    } finally {
      setLocating(false);
    }
  }

  function apply() {
    if (tab === "city") st.setArea({ mode: "city" });
    else if (tab === "stores") st.setArea(ids.length ? { mode: "stores", ids } : { mode: "city" });
    else if (near) st.setArea({ mode: "near", lat: near.lat, lon: near.lon, radiusKm: radius, label: near.label });
    onClose();
  }

  const canApply = tab === "city" || (tab === "stores" && ids.length > 0) || (tab === "near" && !!near && nearCount > 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.screen, s.pad, { flex: 1 }]}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={[s.title, { fontSize: 22 }]}>{t("areaTitle")}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: C.green, fontWeight: "700" }}>{t("close")}</Text>
          </Pressable>
        </View>

        <View style={[s.row, { gap: 8, flexWrap: "wrap" }]}>
          <Chip label={t("areaCity")} active={tab === "city"} onPress={() => setTab("city")} />
          <Chip label={t("areaMyStores")} active={tab === "stores"} onPress={() => setTab("stores")} />
          <Chip label={t("areaNear")} active={tab === "near"} onPress={() => setTab("near")} />
        </View>

        {tab === "stores" && <Text style={s.muted}>{t("areaHint")}</Text>}
        {IS_DEMO && tab !== "city" ? (
          <Text style={s.muted}>{t("areaDemo")}</Text>
        ) : tab === "stores" ? (
          <View style={{ flex: 1, gap: 8 }}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t("searchStores")}
              placeholderTextColor={C.muted}
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.ink }}
            />
            <Text style={s.muted}>
              {t("storesSelected", { n: ids.length })} · {t("maxStores", { n: MAX_AREA_STORES })}
            </Text>
            <FlatList
              data={shown}
              keyExtractor={(x) => x[0]}
              ItemSeparatorComponent={() => <View style={s.divider} />}
              renderItem={({ item: x }) => {
                const on = ids.includes(x[0]);
                const chain = city?.chains[x[1]]?.name ?? "";
                return (
                  <Pressable
                    onPress={() =>
                      setIds((cur) => (on ? cur.filter((i) => i !== x[0]) : cur.length >= MAX_AREA_STORES ? cur : [...cur, x[0]]))
                    }
                    style={[s.row, { paddingVertical: 11 }]}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        borderWidth: 2,
                        borderColor: on ? C.green : C.line,
                        backgroundColor: on ? C.green : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {on && <Text style={{ color: "#fff", fontWeight: "800" }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.body, { fontWeight: "700" }]}>{chain}</Text>
                      <Text style={s.muted} numberOfLines={2}>
                        {shortLabel(x[2], chain)}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : tab === "near" ? (
          !geo ? (
            <Text style={s.muted}>{t("noGeoYet")}</Text>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
              <Button title={locating ? t("locating") : t("areaNearMe")} kind="ghost" onPress={useMyLocation} disabled={locating} />
              {locating && <ActivityIndicator color={C.green} />}
              {locError && <Text style={{ color: C.promo }}>{locError}</Text>}
              <H>{t("radius")}</H>
              <View style={[s.row, { gap: 8 }]}>
                {RADII.map((r) => (
                  <Chip key={r} label={t("km", { n: r })} active={radius === r} onPress={() => setRadius(r)} />
                ))}
              </View>
              {near && (
                <Text style={[s.body, { fontWeight: "700", color: nearCount ? C.green : C.promo }]}>
                  📍 {near.label} · {nearCount ? t("storesFound", { n: nearCount }) : t("noStoresInArea")}
                </Text>
              )}
              {!!areasSorted.length && (
                <>
                  <H>{t("areaOrKvartal")}</H>
                  <View style={[s.row, { gap: 8, flexWrap: "wrap" }]}>
                    {areasSorted.map(([name, lat, lon]) => (
                      <Chip key={name} label={name} active={near?.label === name} onPress={() => setNear({ lat, lon, label: name })} />
                    ))}
                  </View>
                </>
              )}
              <Text style={[s.muted, { fontSize: 11 }]}>{t("osmCredit")}</Text>
            </ScrollView>
          )
        ) : null}

        <Button title={t("apply")} onPress={apply} disabled={!canApply || (IS_DEMO && tab !== "city")} />
      </View>
    </Modal>
  );
}
