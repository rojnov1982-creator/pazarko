import AsyncStorage from "@react-native-async-storage/async-storage";
import { favWords, historyProducts as historyProductsOf, inferFavorite, type Favorite, type HistoryProduct } from "./favorites";
import { todayIso } from "./brochures";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { setAnalyticsEnabled, setCommonProps, track } from "./analytics";
import { buildAreaCity, storesInArea } from "./area";
import {
  isStale,
  loadBrochureHistory,
  loadBrochures,
  loadCity,
  loadIndex,
  loadProducts,
  loadStoreFile,
} from "./data";
import { deviceLang, Lang, makeT, T, TKey } from "./i18n";
import { canUse, Feature } from "./premium";
import { itemKey } from "./pins";
import { isMetro } from "./prices";
import type {
  Area,
  BasketItem,
  BrochureFile,
  BrochureHistory,
  CityFile,
  IndexFile,
  PinnedOffer,
  Product,
  ProductsFile,
  StoreFile,
} from "./types";

/**
 * Состояние данных района:
 * city — весь город; loading — загружаются магазины; ready — все загружены; partial — часть не загрузилась;
 * empty — в районе нет магазинов; error — ни один магазин не загрузился. В empty/error/loading план не считается,
 * весь город НЕ подставляется — только явным действием «Целия град».
 */
export type AreaStatus =
  "city" | "loading" | "ready" | "partial" | "empty" | "error";

/**
 * Режим покупок: снимок выбранного плана на момент «Започни пазаруване».
 * Цены в нём не меняются при обновлении данных; отметки не удаляют товары из корзины.
 */
export interface ShoppingLine {
  key: string;
  name: string;
  /** что именно и сколько: «Сирене Верея 400 г · 2 × 400 г» */
  detail: string;
  cost: number;
  emoji: string;
  /** акция только с картой сети — напомнить взять карту */
  card?: boolean;
}
export interface ShoppingList {
  startedAt: string;
  pricesDate: string;
  total: number;
  approx: boolean;
  stores: {
    chain: string;
    label?: string;
    subtotal: number;
    lines: ShoppingLine[];
  }[];
  /** ключи купленных строк (`<магазин>|<позиция>`) */
  checked: string[];
}

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
  /** учитывать Metro (нужна клиентская карта); по умолчанию нет */
  includeMetro: boolean;
  /** согласие на анонимную статистику: null — ещё не спрашивали */
  analytics: boolean | null;
  /** «Лесен режим»: крупнее и меньше кнопок; null — ещё не выбирали (спрашиваем при первом запуске) */
  easy: boolean | null;
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
  easy: null,
  includeMetro: false,
};

/** настройки, изменения которых пишем в статистику */
const TRACKED_SETTINGS = [
  "maxStores",
  "usePromo",
  "extraStoreCost",
  "onlyGrocery",
  "showDeals",
  "hideMedicines",
  "lang",
  "easy",
  "includeMetro",
] as const;

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Позиция корзины для любимого продукта: группа КЗП и марка (если определены), слова — для брошюр */
const favItem = (f: Favorite): BasketItem => ({
  productId: f.productId ?? 0,
  qty: 1,
  brand: f.brand,
  fav: f.id,
  words: f.words,
  name: f.name,
});

export const PRESETS: {
  id: string;
  title: TKey;
  emoji: string;
  items: BasketItem[];
}[] = [
  {
    id: "week",
    title: "presetWeek",
    emoji: "🧺",
    items: [
      { productId: 1, qty: 2 },
      { productId: 6, qty: 3 },
      { productId: 7, qty: 4 },
      { productId: 9, qty: 1 },
      { productId: 12, qty: 1 },
      { productId: 16, qty: 1 },
      { productId: 25, qty: 0.5 },
      { productId: 31, qty: 1 },
      { productId: 35, qty: 1 },
      { productId: 42, qty: 1 },
      { productId: 52, qty: 1 },
      { productId: 53, qty: 1.5 },
      { productId: 54, qty: 1 },
      { productId: 58, qty: 1 },
      { productId: 61, qty: 2 },
      { productId: 85, qty: 1 },
    ],
  },
  {
    id: "breakfast",
    title: "presetBreakfast",
    emoji: "🥐",
    items: [
      { productId: 1, qty: 1 },
      { productId: 6, qty: 2 },
      { productId: 7, qty: 2 },
      { productId: 12, qty: 1 },
      { productId: 31, qty: 1 },
      { productId: 67, qty: 4 },
      { productId: 70, qty: 1 },
      { productId: 52, qty: 1 },
    ],
  },
  {
    id: "bbq",
    title: "presetBbq",
    emoji: "🔥",
    items: [
      { productId: 21, qty: 1.5 },
      { productId: 26, qty: 1 },
      { productId: 74, qty: 2 },
      { productId: 54, qty: 1 },
      { productId: 58, qty: 1 },
      { productId: 49, qty: 1 },
      { productId: 2, qty: 1 },
      { productId: 73, qty: 1 },
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
  /** история брошюр (последние месяцы) — поиск прошедших акций, подсказки в «Любими» */
  history: BrochureHistory | null;
  /** продукты истории: последняя закончившаяся / текущая / будущая акция */
  historyProducts: HistoryProduct[];
  productById: Map<number, Product>;
  /**
   * Данные для расчёта: весь город или собранные из магазинов района.
   * null — пока данные выбранного города/района не готовы (план не показываем, а не считаем по старым данным).
   */
  city: CityFile | null;
  /** весь город (для выбора магазинов и кварталов) */
  baseCity: CityFile | null;
  cityLoading: boolean;
  area: Area;
  setArea: (a: Area) => void;
  /** сколько магазинов в районе (0 — в районе нет магазинов) */
  areaStoreCount: number;
  areaStatus: AreaStatus;
  /** сколько магазинов района загружено (из areaStoreCount) */
  areaLoaded: number;
  retryArea: () => void;
  /** данные показаны из сохранённой копии: обновить не удалось */
  stale: boolean;
  /** повторить загрузку списка городов и данных города */
  reload: () => void;
  ekatte: string | null;
  basket: BasketItem[];
  settings: Settings;
  /** ЕИК исключённых сетей: выбранные в настройках + Metro, если он не включён */
  excludedEiks: string[];
  selectCity: (ekatte: string) => void;
  addItem: (productId: number) => void;
  /** закрепить конкретное предложение (не сливается с обычным товаром той же группы) */
  addPinned: (pin: PinnedOffer, productId: number) => void;
  /** любимые продукты: следим за ними в брошюрах; inList — держать в корзине каждую неделю */
  favorites: Favorite[];
  addFavorite: (name: string) => Favorite | null;
  removeFavorite: (id: string) => void;
  setFavoriteInList: (id: string, inList: boolean) => void;
  /** своя строка без цены («Тоалетна хартия») */
  addCustom: (name: string) => void;
  /** позиции корзины — по ключу (itemKey) */
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  /** «Разреши замяна»: закреплённое предложение → обычный подбор по группе */
  allowSubstitute: (key: string) => void;
  clearBasket: () => void;
  loadPreset: (items: BasketItem[], presetId?: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  qtyStep: (productId: number) => number;
  lang: Lang;
  t: T;
  setBrand: (key: string, brand?: string) => void;
  shopping: ShoppingList | null;
  startShopping: (list: Omit<ShoppingList, "checked" | "startedAt">) => void;
  toggleBought: (lineId: string) => void;
  finishShopping: () => void;
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
  const [history, setHistory] = useState<BrochureHistory | null>(null);
  const historyProducts = useMemo(() => historyProductsOf(history, todayIso()), [history]);
  const [city, setCity] = useState<CityFile | null>(null);
  const [areaCity, setAreaCity] = useState<CityFile | null>(null);
  const [areaStoreCount, setAreaStoreCount] = useState(0);
  const [cityLoading, setCityLoading] = useState(false);
  const [areaStatus, setAreaStatus] = useState<AreaStatus>("city");
  const [areaLoaded, setAreaLoaded] = useState(0);
  const [areaRetry, setAreaRetry] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [stale, setStale] = useState(false);
  const [ekatte, setEkatte] = useState<string | null>(null);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [shopping, setShopping] = useState<ShoppingList | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [settings, setSettings] = useState<Settings>({
    ...DEFAULT_SETTINGS,
    lang: deviceLang(),
  });
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Первая загрузка: сохранённое состояние + справочники (reload() — повторить)
  const restored = useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const [saved, idx] = await Promise.all([
          AsyncStorage.getItem(KEY).catch(() => null),
          loadIndex(),
        ]);
        const prods = await loadProducts(); // после index — чтобы взять файл текущей версии данных
        setIndex(idx);
        setProducts(prods);
        loadBrochures().then(setBrochures); // не задерживаем запуск
        loadBrochureHistory().then(setHistory);
        setError(null);
        if (!restored.current) {
          // сохранённое состояние читаем один раз; старые корзины (без закреплений) подходят как есть
          restored.current = true;
          const s = saved ? JSON.parse(saved) : {};
          if (Array.isArray(s.basket))
            setBasket(
              s.basket.filter(
                (b: BasketItem) =>
                  b && typeof b.productId === "number" && b.qty > 0,
              ),
            );
          if (s.settings)
            setSettings({
              ...DEFAULT_SETTINGS,
              lang: deviceLang(),
              ...s.settings,
            });
          if (s.shopping && Array.isArray(s.shopping.stores))
            setShopping(s.shopping);
          if (Array.isArray(s.favorites))
            setFavorites(
              s.favorites.filter(
                (f: Favorite) => f && f.id && Array.isArray(f.words),
              ),
            );
          const known = idx.cities.some((c) => c.ekatte === s.ekatte);
          setEkatte(known ? s.ekatte : (idx.cities[0]?.ekatte ?? null));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setReady(true);
      }
    })();
  }, [reloadKey]);

  // Данные выбранного города
  useEffect(() => {
    if (!ekatte) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- показать загрузку перед запросом
    setCityLoading(true);
    loadCity(ekatte)
      .then((c) => {
        if (!alive) return;
        setCity(c);
        setError(null);
        setStale(isStale("index.json", `city/${ekatte}.json`));
      })
      .catch(
        (e) => alive && setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => alive && setCityLoading(false));
    return () => {
      alive = false;
    };
  }, [ekatte, reloadKey]);

  // Район: собираем данные из цен выбранных магазинов
  const area: Area = (ekatte && settings.areas[ekatte]) || { mode: "city" };
  const areaKey = JSON.stringify(area);
  const cityReady = !!city && city.ekatte === ekatte; // после смены города старые данные не используем
  useEffect(() => {
    // сброс при смене района/города: старый план не показываем как актуальный
    // eslint-disable-next-line react-hooks/set-state-in-effect -- состояние загрузки района перед запросом
    setAreaCity(null);
    setAreaLoaded(0);
    if (area.mode === "city") {
      setAreaStatus("city");
      setAreaStoreCount(0);
      return;
    }
    if (!cityReady || !ekatte) {
      setAreaStatus("loading");
      return;
    }
    const picked = storesInArea(city!, area, settings.onlyGrocery);
    setAreaStoreCount(picked.length);
    if (!picked.length) {
      setAreaStatus("empty");
      return;
    }
    let alive = true;
    setAreaStatus("loading");
    setCityLoading(true);
    Promise.allSettled(
      picked.map((st) =>
        loadStoreFile(ekatte, st[0]).then((f) => [st[0], f] as const),
      ),
    )
      .then((res) => {
        if (!alive) return;
        const files: Record<string, StoreFile> = {};
        for (const r of res)
          if (r.status === "fulfilled") files[r.value[0]] = r.value[1];
        const ok = picked.filter((st) => files[st[0]]);
        setAreaLoaded(ok.length);
        if (!ok.length) {
          setAreaStatus("error");
          return;
        }
        setAreaCity(buildAreaCity(city!, ok, files));
        setAreaStatus(ok.length < picked.length ? "partial" : "ready");
      })
      .finally(() => alive && setCityLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, cityReady, ekatte, areaKey, settings.onlyGrocery, areaRetry]);

  // Сохранение
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      KEY,
      JSON.stringify({ ekatte, basket, settings, shopping, favorites }),
    ).catch(() => {});
  }, [ready, ekatte, basket, settings, shopping, favorites]);

  // Статистика: включаем по согласию, общие свойства, событие запуска
  const opened = useRef(false);
  useEffect(() => {
    if (!ready) return;
    setAnalyticsEnabled(settings.analytics === true).then(() => {
      if (settings.analytics === true && !opened.current) {
        opened.current = true;
        track("app_open", {
          basket_items: basket.length,
          area_mode: area.mode,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.analytics]);
  const cityName = index?.cities.find((c) => c.ekatte === ekatte)?.name;
  useEffect(() => {
    setCommonProps({
      lang: settings.lang,
      city: ekatte ?? undefined,
      city_name: cityName,
      prices_date: index?.date,
    });
  }, [settings.lang, ekatte, cityName, index?.date]);

  const excludedEiks = useMemo(() => {
    if (settings.includeMetro || !city) return settings.excludedChains;
    const metro = city.chains.filter((c) => isMetro(c)).map((c) => c.eik);
    return [...new Set([...settings.excludedChains, ...metro])];
  }, [settings.includeMetro, settings.excludedChains, city]);

  const productById = useMemo(
    () => new Map((products?.products ?? []).map((p) => [p.id, p])),
    [products],
  );
  const t = useMemo(() => makeT(settings.lang), [settings.lang]);
  const qtyStep = useCallback(
    (id: number) => (productById.get(id)?.byWeight ? 0.5 : 1),
    [productById],
  );

  const value: Ctx = {
    ready,
    error,
    index,
    products,
    brochures,
    history,
    historyProducts,
    productById,
    city:
      area.mode === "city"
        ? cityReady
          ? city
          : null
        : (areaStatus === "ready" || areaStatus === "partial") && areaCity
          ? areaCity
          : null,
    baseCity: cityReady ? city : null,
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
    areaStatus,
    areaLoaded,
    retryArea: () => setAreaRetry((n) => n + 1),
    stale,
    reload: () => {
      setError(null);
      setReloadKey((n) => n + 1);
    },
    ekatte,
    basket,
    settings,
    excludedEiks,
    selectCity: (e) => {
      setEkatte(e);
      track("city_selected", {
        city: e,
        city_name: index?.cities.find((c) => c.ekatte === e)?.name,
      });
    },
    addItem: (productId) => {
      const key = `g:${productId}`;
      if (!basket.some((x) => itemKey(x) === key)) {
        const p = productById.get(productId);
        track("item_added", {
          group: productId,
          group_name: p?.bg,
          category: p?.cat,
        });
      }
      setBasket((b) =>
        b.some((x) => itemKey(x) === key)
          ? b.map((x) =>
              itemKey(x) === key
                ? { ...x, qty: x.qty + qtyStep(productId) }
                : x,
            )
          : [...b, { productId, qty: qtyStep(productId) }],
      );
    },
    addPinned: (pin, productId) => {
      const key = `pin:${pin.id}`;
      const step = pin.perKg ? 0.5 : 1;
      if (!basket.some((x) => itemKey(x) === key))
        track("offer_pinned", {
          source: pin.source,
          chain: pin.chain,
          group: productId || undefined,
          product: pin.name,
        });
      setBasket((b) =>
        b.some((x) => itemKey(x) === key)
          ? b.map((x) => (itemKey(x) === key ? { ...x, qty: x.qty + step } : x))
          : [...b, { productId, qty: pin.perKg ? 1 : 1, pin }],
      );
    },
    setQty: (key, qty) => {
      if (qty <= 0 && key.startsWith("fav:"))
        setFavorites((fs) =>
          fs.map((f) => (`fav:${f.id}` === key ? { ...f, inList: false } : f)),
        );
      setBasket((b) =>
        qty <= 0
          ? b.filter((x) => itemKey(x) !== key)
          : b.map((x) => (itemKey(x) === key ? { ...x, qty } : x)),
      );
    },
    removeItem: (key) => {
      // любимый продукт остаётся в «Любими», только убирается из списка этой недели
      if (key.startsWith("fav:"))
        setFavorites((fs) =>
          fs.map((f) => (`fav:${f.id}` === key ? { ...f, inList: false } : f)),
        );
      setBasket((b) => b.filter((x) => itemKey(x) !== key));
    },
    allowSubstitute: (key) => {
      const it = basket.find((x) => itemKey(x) === key);
      if (!it?.pin || !it.productId) return;
      track("pin_substitute", {
        source: it.pin.source,
        chain: it.pin.chain,
        group: it.productId,
      });
      const gk = `g:${it.productId}`;
      setBasket((b) => {
        const rest = b.filter((x) => itemKey(x) !== key);
        // обычный товар этой группы уже есть — добавляем количество к нему
        if (rest.some((x) => itemKey(x) === gk))
          return rest.map((x) =>
            itemKey(x) === gk ? { ...x, qty: x.qty + it.qty } : x,
          );
        const qty =
          productById.get(it.productId)?.byWeight || !it.pin!.perKg
            ? it.qty
            : 1;
        return b.map((x) =>
          itemKey(x) === key ? { productId: it.productId, qty } : x,
        );
      });
    },
    favorites,
    addFavorite: (name) => {
      const text = name.trim();
      const words = favWords(text);
      if (!words.length) return null;
      const same = favorites.find((f) => f.words.join(" ") === words.join(" "));
      if (same) return same;
      const groupNames = new Map(
        (products?.products ?? []).map((p) => [p.id, p.bg]),
      );
      // группа КЗП: по текущим брошюрам и по истории (продукт мог быть в акции в прошлые недели)
      const known = brochures
        ? { ...brochures, offers: [...brochures.offers, ...((history?.items ?? []) as unknown as BrochureFile["offers"])] }
        : null;
      const { productId, brand } = inferFavorite(text, cityReady ? city : null, known, groupNames);
      const fav: Favorite = {
        id: newId(),
        name: text,
        words,
        productId,
        brand,
        inList: true,
      };
      setFavorites((fs) => [...fs, fav]);
      setBasket((b) => [...b, favItem(fav)]);
      track("favorite_added", {
        name: text,
        group: productId,
        brand: brand ?? "",
      });
      return fav;
    },
    removeFavorite: (id) => {
      setFavorites((fs) => fs.filter((f) => f.id !== id));
      setBasket((b) => b.filter((x) => x.fav !== id));
      track("favorite_removed", {});
    },
    setFavoriteInList: (id, inList) => {
      const fav = favorites.find((f) => f.id === id);
      if (!fav) return;
      setFavorites((fs) => fs.map((f) => (f.id === id ? { ...f, inList } : f)));
      setBasket((b) =>
        inList
          ? b.some((x) => x.fav === id)
            ? b
            : [...b, favItem(fav)]
          : b.filter((x) => x.fav !== id),
      );
    },
    addCustom: (name) => {
      const text = name.trim();
      if (!text) return;
      setBasket((b) => [
        ...b,
        { productId: 0, qty: 1, name: text, id: newId() },
      ]);
      track("custom_added", {});
    },
    // любимые «в списке» остаются и после очистки — их покупают каждую неделю
    clearBasket: () =>
      setBasket(favorites.filter((f) => f.inList).map(favItem)),
    loadPreset: (items, presetId) => {
      setBasket([
        ...items.map((i) => ({ ...i })),
        ...favorites.filter((f) => f.inList).map(favItem),
      ]);
      track("preset_loaded", { preset: presetId, items: items.length });
    },
    updateSettings: (patch) => {
      for (const k of TRACKED_SETTINGS)
        if (k in patch && patch[k] !== settings[k])
          track("setting_changed", { key: k, value: patch[k] });
      setSettings((s) => ({ ...s, ...patch }));
    },
    qtyStep,
    lang: settings.lang,
    t,
    setBrand: (key, brand) => {
      const it = basket.find((x) => itemKey(x) === key);
      track("brand_selected", {
        group: it?.productId,
        group_name: it ? productById.get(it.productId)?.bg : undefined,
        brand: brand ?? "any",
      });
      setBasket((b) =>
        b.map((x) => (itemKey(x) === key ? { ...x, brand } : x)),
      );
    },
    shopping,
    startShopping: (list) => {
      track("shopping_started", {
        stores: list.stores.length,
        items: list.stores.reduce((n, x) => n + x.lines.length, 0),
        total: list.total,
      });
      setShopping({
        ...list,
        startedAt: new Date().toISOString(),
        checked: [],
      });
    },
    toggleBought: (id) =>
      setShopping((sh) =>
        sh
          ? {
              ...sh,
              checked: sh.checked.includes(id)
                ? sh.checked.filter((x) => x !== id)
                : [...sh.checked, id],
            }
          : sh,
      ),
    finishShopping: () => {
      if (shopping)
        track("shopping_finished", {
          bought: shopping.checked.length,
          items: shopping.stores.reduce((n, x) => n + x.lines.length, 0),
        });
      setShopping(null);
    },
    can: (f) => canUse(f, settings.isPremium),
    paywallOpen,
    openPaywall: () => setPaywallOpen(true),
    closePaywall: () => setPaywallOpen(false),
  };
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore вне StoreProvider");
  return ctx;
}
