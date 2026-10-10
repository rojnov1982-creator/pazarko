// Район покупок: весь город, выбранные магазины или магазины рядом (GPS / квартал + радиус).
// В режимах «магазины» и «рядом» из цен отдельных магазинов собирается «город», где каждая
// «сеть» — это один конкретный магазин. Поэтому алгоритм корзины и экраны работают без изменений.

import type { Area, CityFile, StoreFile, StoreTuple } from "./types";

export const MAX_AREA_STORES = 25;

export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const hasGeo = (city: CityFile | null) => !!city?.stores?.some((s) => s[3] != null);

/** Магазины, попадающие в район (не больше MAX_AREA_STORES, ближайшие — первыми) */
export function storesInArea(city: CityFile, area: Area, onlyGrocery = true): StoreTuple[] {
  const all = (city.stores ?? []).filter((s) => !onlyGrocery || (city.chains[s[1]]?.kind ?? "grocery") === "grocery");
  if (area.mode === "stores") {
    const ids = new Set(area.ids);
    return all.filter((s) => ids.has(s[0]));
  }
  if (area.mode === "near") {
    return all
      .filter((s) => s[3] != null && s[4] != null)
      .map((s) => ({ s, d: distanceKm([area.lat, area.lon], [s[3]!, s[4]!]) }))
      .filter((x) => x.d <= area.radiusKm)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_AREA_STORES)
      .map((x) => x.s);
  }
  return [];
}

/** Короткий адрес магазина для подписи: убираем название сети и служебные слова */
export function shortLabel(label: string, chain: string) {
  let s = label;
  for (const w of chain.split(/\s+/).filter((x) => x.length >= 3)) s = s.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "");
  s = s
    .replace(/обект:.*?адрес:/i, "")
    .replace(/\(H\d+\)/gi, "")
    .replace(/^[\s\d-]*(?=\S)/, "")
    .replace(/гр\.\s*[А-Яа-я]+\s*,?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.\-–/]+|[\s,.\-–/]+$/g, "");
  return s || label;
}

/** Собирает «город» из выбранных магазинов */
export function buildAreaCity(base: CityFile, stores: StoreTuple[], files: Record<string, StoreFile>): CityFile {
  const chains = stores.map((st) => ({ ...base.chains[st[1]], stores: 1, sid: st[0], label: shortLabel(st[2], base.chains[st[1]]?.name ?? "") }));
  const items: CityFile["items"] = {};
  const brands: NonNullable<CityFile["brands"]> = {};
  stores.forEach((st, i) => {
    const f = files[st[0]];
    if (!f) return;
    for (const [gid, list] of Object.entries(f.items)) for (const t of list) (items[gid] ??= []).push([i, ...t.slice(1)] as typeof t);
    for (const [gid, byBrand] of Object.entries(f.brands ?? {}))
      for (const [b, list] of Object.entries(byBrand)) for (const t of list) ((brands[gid] ??= {})[b] ??= []).push([i, ...t.slice(1)] as typeof t);
  });
  for (const list of Object.values(items)) list.sort((a, b) => a[3] - b[3]);
  // оферти города — только сетей, чьи магазины выбраны (индекс = первый магазин этой сети)
  const firstOfChain = new Map<number, number>();
  stores.forEach((st, i) => !firstOfChain.has(st[1]) && firstOfChain.set(st[1], i));
  const deals = (base.deals ?? []).filter((d) => firstOfChain.has(d[1])).map((d) => [d[0], firstOfChain.get(d[1])!, ...d.slice(2)] as typeof d);
  return { ...base, chains, items, brands, deals };
}
