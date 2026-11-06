import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { setAnalyticsEnabled, setCommonProps, track } from "./analytics";
import { buildAreaCity, storesInArea } from "./area";
import { loadBrochures, loadCity, loadIndex, loadProducts, loadStoreFile } from "./data";
import { deviceLang, Lang, makeT, T, TKey } from "./i18n";
import { canUse, Feature } from "./premium";
import type { Area, BasketItem, BrochureFile, CityFile, IndexFile, Product, ProductsFile, StoreFile } from "./types";

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
  /** согласие на анонимную статистику: null — ещё не спрашивали */
  analytics: boolean | null;
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
  analytics: null,
};

/** настройки, изменения которых пишем в статистику */
const TRACKED_SETTINGS = ["maxStores", "usePromo", "extraStoreCost", "onlyGrocery", "showDeals", "hideMedicines", "lang"] as const;

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
  /** брошюры сетей (null — нет данных или ещё не загрузились) */
  brochures: BrochureFile | null;
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
  loadPreset: (items: BasketItem[], presetId?: string) => void;
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
  const [brochures, setBrochures] = useState<BrochureFile | null>(null);
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
        loadBrochures().then(setBrochures); // не задерживаем запуск
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

  // Статистика: включаем по согласию, общие свойства, событие запуска
  const opened = useRef(false);
  useEffect(() => {
    if (!ready) return;
    setAnalyticsEnabled(settings.analytics === true).then(() => {
      if (settings.analytics === true && !opened.current) {
        opened.current = true;
        track("app_open", { basket_items: basket.length, area_mode: area.mode });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.analytics]);
  const cityName = index?.cities.find((c) => c.ekatte === ekatte)?.name;
  useEffect(() => {
    setCommonProps({ lang: settings.lang, city: ekatte ?? undefined, city_name: cityName, prices_date: index?.date });
  }, [settings.lang, ekatte, cityName, index?.date]);

  const productById = useMemo(() => new Map((products?.products ?? []).map((p) => [p.id, p])), [products]);
  const t = useMemo(() => makeT(settings.lang), [settings.lang]);
  const qtyStep = useCallback((id: number) => (productById.get(id)?.byWeight ? 0.5 : 1), [productById]);

  const value: Ctx = {
    ready,
    error,
    index,
    products,
    brochures,
    productById,
    city: area.mode !== "city" && areaCity ? areaCity : city,
    baseCity: city,
    cityLoading,
    area,
    setArea: (a) => {
      if (!ekatte) return;
      setSettings((st) => ({ ...st, areas: { ...st.areas, [ekatte]: a } }));
      track("area_changed", {
        mode: a.mode,
        radius_km: a.mode === "near" ? a.radiusKm : undefined,
        stores: a.mode === "stores" ? a.ids.length : undefined,
      });
    },
    areaStoreCount,
    ekatte,
    basket,
    settings,
    selectCity: (e) => {
      setEkatte(e);
      track("city_selected", { city: e, city_name: index?.cities.find((c) => c.ekatte === e)?.name });
    },
    addItem: (productId) => {
      if (!basket.some((x) => x.productId === productId)) {
        const p = productById.get(productId);
        track("item_added", { group: productId, group_name: p?.bg, category: p?.cat });
      }
      setBasket((b) =>
        b.some((x) => x.productId === productId)
          ? b.map((x) => (x.productId === productId ? { ...x, qty: x.qty + qtyStep(productId) } : x))
          : [...b, { productId, qty: qtyStep(productId) }],
      );
    },
    setQty: (productId, qty) =>
      setBasket((b) =>
        qty <= 0 ? b.filter((x) => x.productId !== productId) : b.map((x) => (x.productId === productId ? { ...x, qty } : x)),
      ),
    clearBasket: () => setBasket([]),
    loadPreset: (items, presetId) => {
      setBasket(items.map((i) => ({ ...i })));
      track("preset_loaded", { preset: presetId, items: items.length });
    },
    updateSettings: (patch) => {
      for (const k of TRACKED_SETTINGS) if (k in patch && patch[k] !== settings[k]) track("setting_changed", { key: k, value: patch[k] });
      setSettings((s) => ({ ...s, ...patch }));
    },
    qtyStep,
    lang: settings.lang,
    t,
    setBrand: (productId, brand) => {
      track("brand_selected", { group: productId, group_name: productById.get(productId)?.bg, brand: brand ?? "any" });
      setBasket((b) => b.map((x) => (x.productId === productId ? { ...x, brand } : x)));
    },
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
