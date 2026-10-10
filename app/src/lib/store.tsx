import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildAreaCity, storesInArea } from "./area";
import { loadCity, loadIndex, loadProducts, loadStoreFile } from "./data";
import { deviceLang, Lang, makeT, T, TKey } from "./i18n";
import { canUse, Feature } from "./premium";
import type { Area, BasketItem, CityFile, IndexFile, Product, ProductsFile, StoreFile } from "./types";

export interface Settings {
  maxStores: number; // 0 = без лимита
  usePromo: boolean;
  extraStoreCost: number; // €
  excludedChains: string[]; // ЕИК — устойчивы между днями, в отличие от индексов
  hideMedicines: boolean;
  /** считать только супермаркеты (без аптек, дрогерий, duty free) */
  onlyGrocery: boolean;
  /** подсказывать супер оферти других марок */
  showDeals: boolean;
  /** подписка Premium (выставляется после покупки) */
  isPremium: boolean;
  /** район покупок по городам (ЕКАТТЕ → район) */
  areas: Record<string, Area>;
  lang: Lang;
}

const DEFAULT_SETTINGS: Settings = {
  maxStores: 2,
  usePromo: true,
  extraStoreCost: 0,
  excludedChains: [],
  hideMedicines: true,
  onlyGrocery: true,
  showDeals: true,
  isPremium: false,
  areas: {},
  lang: "bg",
};

export const PRESETS: { id: string; title: TKey; emoji: string; items: BasketItem[] }[] = [
  {
    id: "week",
    title: "presetWeek",
    emoji: "🧺",
    items: [
      { productId: 1, qty: 2 }, { productId: 6, qty: 3 }, { productId: 7, qty: 4 }, { productId: 9, qty: 1 },
      { productId: 12, qty: 1 }, { productId: 16, qty: 1 }, { productId: 25, qty: 0.5 }, { productId: 31, qty: 1 },
      { productId: 35, qty: 1 }, { productId: 42, qty: 1 }, { productId: 52, qty: 1 }, { productId: 53, qty: 1.5 },
      { productId: 54, qty: 1 }, { productId: 58, qty: 1 }, { productId: 61, qty: 2 }, { productId: 85, qty: 1 },
    ],
  },
  {
    id: "breakfast",
    title: "presetBreakfast",
    emoji: "🥐",
    items: [
      { productId: 1, qty: 1 }, { productId: 6, qty: 2 }, { productId: 7, qty: 2 }, { productId: 12, qty: 1 },
      { productId: 31, qty: 1 }, { productId: 67, qty: 4 }, { productId: 70, qty: 1 }, { productId: 52, qty: 1 },
    ],
  },
  {
    id: "bbq",
    title: "presetBbq",
    emoji: "🔥",
    items: [
      { productId: 21, qty: 1.5 }, { productId: 26, qty: 1 }, { productId: 74, qty: 2 }, { productId: 54, qty: 1 },
      { productId: 58, qty: 1 }, { productId: 49, qty: 1 }, { productId: 2, qty: 1 }, { productId: 73, qty: 1 },
    ],
  },
];

interface Ctx {
  ready: boolean;
  error: string | null;
  index: IndexFile | null;
  products: ProductsFile | null;
  productById: Map<number, Product>;
  /** данные для расчёта: весь город или собранные из магазинов района */
  city: CityFile | null;
  /** весь город (для выбора магазинов и кварталов) */
  baseCity: CityFile | null;
  cityLoading: boolean;
  area: Area;
  setArea: (a: Area) => void;
  /** сколько магазинов в районе (0 — в районе нет магазинов) */
  areaStoreCount: number;
  ekatte: string | null;
  basket: BasketItem[];
  settings: Settings;
  selectCity: (ekatte: string) => void;
  addItem: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clearBasket: () => void;
  loadPreset: (items: BasketItem[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  qtyStep: (productId: number) => number;
  lang: Lang;
  t: T;
  setBrand: (productId: number, brand?: string) => void;
  can: (f: Feature) => boolean;
  paywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
}

const StoreContext = createContext<Ctx | null>(null);
const KEY = "pazarko:v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [products, setProducts] = useState<ProductsFile | null>(null);
  const [city, setCity] = useState<CityFile | null>(null);
  const [areaCity, setAreaCity] = useState<CityFile | null>(null);
  const [areaStoreCount, setAreaStoreCount] = useState(0);
  const [cityLoading, setCityLoading] = useState(false);
  const [ekatte, setEkatte] = useState<string | null>(null);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, lang: deviceLang() });
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Первая загрузка: сохранённое состояние + справочники
  useEffect(() => {
    (async () => {
      try {
        const [saved, idx] = await Promise.all([AsyncStorage.getItem(KEY).catch(() => null), loadIndex()]);
        const prods = await loadProducts(); // после index — чтобы взять файл текущей версии данных
        setIndex(idx);
        setProducts(prods);
        const s = saved ? JSON.parse(saved) : {};
        if (Array.isArray(s.basket)) setBasket(s.basket);
        if (s.settings) setSettings({ ...DEFAULT_SETTINGS, lang: deviceLang(), ...s.settings });
        const known = idx.cities.some((c) => c.ekatte === s.ekatte);
        setEkatte(known ? s.ekatte : idx.cities[0]?.ekatte ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Данные выбранного города
  useEffect(() => {
    if (!ekatte) return;
    let alive = true;
    setCityLoading(true);
    loadCity(ekatte)
      .then((c) => alive && (setCity(c), setError(null)))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setCityLoading(false));
    return () => {
      alive = false;
    };
  }, [ekatte]);

  // Район: собираем данные из цен выбранных магазинов
  const area: Area = (ekatte && settings.areas[ekatte]) || { mode: "city" };
  const areaKey = JSON.stringify(area);
  useEffect(() => {
    if (!city || !ekatte || area.mode === "city") {
      setAreaCity(null);
      setAreaStoreCount(0);
      return;
    }
    const picked = storesInArea(city, area, settings.onlyGrocery);
    setAreaStoreCount(picked.length);
    if (!picked.length) {
      setAreaCity(null);
      return;
    }
    let alive = true;
    setCityLoading(true);
    Promise.allSettled(picked.map((st) => loadStoreFile(ekatte, st[0]).then((f) => [st[0], f] as const)))
      .then((res) => {
        if (!alive) return;
        const files: Record<string, StoreFile> = {};
        for (const r of res) if (r.status === "fulfilled") files[r.value[0]] = r.value[1];
        const ok = picked.filter((st) => files[st[0]]);
        setAreaCity(ok.length ? buildAreaCity(city, ok, files) : null);
      })
      .finally(() => alive && setCityLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, ekatte, areaKey, settings.onlyGrocery]);

  // Сохранение
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ ekatte, basket, settings })).catch(() => {});
  }, [ready, ekatte, basket, settings]);

  const productById = useMemo(() => new Map((products?.products ?? []).map((p) => [p.id, p])), [products]);
  const t = useMemo(() => makeT(settings.lang), [settings.lang]);
  const qtyStep = useCallback((id: number) => (productById.get(id)?.byWeight ? 0.5 : 1), [productById]);

  const value: Ctx = {
    ready,
    error,
    index,
    products,
    productById,
    city: area.mode !== "city" && areaCity ? areaCity : city,
    baseCity: city,
    cityLoading,
    area,
    setArea: (a) => ekatte && setSettings((st) => ({ ...st, areas: { ...st.areas, [ekatte]: a } })),
    areaStoreCount,
    ekatte,
    basket,
    settings,
    selectCity: setEkatte,
    addItem: (productId) =>
      setBasket((b) =>
        b.some((x) => x.productId === productId)
          ? b.map((x) => (x.productId === productId ? { ...x, qty: x.qty + qtyStep(productId) } : x))
          : [...b, { productId, qty: qtyStep(productId) }],
      ),
    setQty: (productId, qty) =>
      setBasket((b) =>
        qty <= 0 ? b.filter((x) => x.productId !== productId) : b.map((x) => (x.productId === productId ? { ...x, qty } : x)),
      ),
    clearBasket: () => setBasket([]),
    loadPreset: (items) => setBasket(items.map((i) => ({ ...i }))),
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    qtyStep,
    lang: settings.lang,
    t,
    setBrand: (productId, brand) => setBasket((b) => b.map((x) => (x.productId === productId ? { ...x, brand } : x))),
    can: (f) => canUse(f, settings.isPremium),
    paywallOpen,
    openPaywall: () => setPaywallOpen(true),
    closePaywall: () => setPaywallOpen(false),
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore вне StoreProvider");
  return ctx;
}
