// Источник данных.
// Если в app.json → expo.extra.dataUrl указан адрес (папка out/ из data-pipeline,
// выложенная на хостинг), приложение берёт свежие цены оттуда и кэширует их.
// Если адрес пустой или сеть недоступна — используются встроенные ДЕМО-данные.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { cacheKey, expiredCacheKeys, otherVersionKeys } from "./persist";
import type {
  BrochureFile,
  BrochureHistory,
  BrochureHistoryMonth,
  CityFile,
  IndexFile,
  ProductsFile,
  StoreFile,
} from "./types";

const demoIndex = require("../../assets/demo-data/index.json") as IndexFile;
const demoProducts =
  require("../../assets/demo-data/products.json") as ProductsFile;
const demoCities: Record<string, CityFile> = {
  "68134": require("../../assets/demo-data/city/68134.json"),
  "56784": require("../../assets/demo-data/city/56784.json"),
  "10135": require("../../assets/demo-data/city/10135.json"),
};

// Адрес можно задать в app.json (expo.extra.dataUrl) или переменной окружения EXPO_PUBLIC_DATA_URL
export const DATA_URL: string = (
  process.env.EXPO_PUBLIC_DATA_URL ||
  (Constants.expoConfig?.extra as { dataUrl?: string } | undefined)?.dataUrl ||
  ""
).replace(/\/$/, "");
export const IS_DEMO = !DATA_URL;

// Список городов проверяем часто (он маленький), а файлы городов и магазинов кэшируем
// по версии данных: как только на сервере появились новые цены — скачиваются новые файлы.
const INDEX_TTL = 20 * 60 * 1000;
const FILE_TTL = 24 * 3600 * 1000;
let dataVersion = "";

/** Файлы, которые не удалось обновить и которые показаны из сохранённой копии */
const stalePaths = new Set<string>();
export const isStale = (...paths: string[]) =>
  paths.some((p) => stalePaths.has(p));

/**
 * Проверка формы файла. Ответ не той формы (страница ошибки, обрезанный или старый файл) в кэш не попадает
 * и на экраны не идёт: вместо него берётся сохранённая копия.
 */
type Check = (d: unknown) => boolean;
const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const okIndex: Check = (d) =>
  isObj(d) && Array.isArray(d.cities) && typeof d.date === "string";
const okProducts: Check = (d) =>
  isObj(d) && Array.isArray(d.products) && Array.isArray(d.categories);
const okCity: Check = (d) =>
  isObj(d) && Array.isArray(d.chains) && isObj(d.items);
const okStore: Check = (d) => isObj(d) && isObj(d.items);

/** Сохранённая копия файла, если она читается и нужной формы */
async function readCache(
  key: string,
  check: Check,
): Promise<{ at: number; data: unknown } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    return check(data) ? { at: Number(at) || 0, data } : null;
  } catch {
    return null;
  }
}

const removeKeys = async (pickKeys: (keys: readonly string[]) => string[]) => {
  const drop = pickKeys(await AsyncStorage.getAllKeys());
  if (drop.length) await AsyncStorage.multiRemove(drop);
};

/**
 * Записать файл в кэш и убрать его копии от прежних версий данных (версия меняется каждый день — без этого
 * хранилище телефона заполняется, и тогда перестаёт сохраняться и корзина). Если места нет — освободить
 * его от всех прежних версий и записать ещё раз.
 */
async function saveCache(
  key: string,
  path: string,
  version: string,
  data: unknown,
) {
  const value = JSON.stringify({ at: Date.now(), data });
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    try {
      await removeKeys((keys) =>
        expiredCacheKeys(keys, dataVersion, Date.now(), 0).filter(
          (k) => k !== key,
        ),
      );
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn("Pazarko: data file was not cached", path, e);
      return;
    }
  }
  removeKeys((keys) => otherVersionKeys(keys, path, version)).catch(() => {});
}

async function fetchCached<T>(
  path: string,
  ttl: number,
  version = "",
  check: Check = () => true,
): Promise<T> {
  const key = cacheKey(path, version);
  const cached = await readCache(key, check);
  if (cached && Date.now() - cached.at < ttl) return cached.data as T;
  try {
    // ?v= — чтобы телефон и CDN не отдали старую копию файла
    const res = await fetch(
      `${DATA_URL}/${path}?v=${encodeURIComponent(version || String(Math.floor(Date.now() / ttl)))}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!check(data)) throw new Error(`Unexpected data format: ${path}`);
    saveCache(key, path, version, data);
    stalePaths.delete(path);
    return data as T;
  } catch (e) {
    // устаревший кэш лучше, чем ничего — но экран должен сказать, что данные не обновились
    if (cached) {
      stalePaths.add(path);
      return cached.data as T;
    }
    // любая сохранённая версия этого файла (другая версия данных)
    const keys = await AsyncStorage.getAllKeys().catch(
      () => [] as readonly string[],
    );
    const older = otherVersionKeys(keys, path, version).sort().pop();
    const old = older ? await readCache(older, check) : null;
    if (old) {
      stalePaths.add(path);
      return old.data as T;
    }
    throw e;
  }
}

export async function loadIndex(): Promise<IndexFile> {
  if (IS_DEMO) return demoIndex;
  const idx = await fetchCached<IndexFile>(
    "index.json",
    INDEX_TTL,
    "",
    okIndex,
  );
  dataVersion = idx.generatedAt ?? idx.date;
  // файлы городов и магазинов, которые давно не открывались (версия данных старше недели)
  removeKeys((keys) => expiredCacheKeys(keys, dataVersion, Date.now())).catch(
    () => {},
  );
  return idx;
}

export async function loadProducts(): Promise<ProductsFile> {
  return IS_DEMO
    ? demoProducts
    : fetchCached<ProductsFile>(
        "products.json",
        FILE_TTL,
        dataVersion,
        okProducts,
      ).catch(() => demoProducts);
}

export async function loadCity(ekatte: string): Promise<CityFile> {
  if (IS_DEMO) {
    const c = demoCities[ekatte];
    if (!c) throw new Error("No data for this city");
    return c;
  }
  return fetchCached<CityFile>(
    `city/${ekatte}.json`,
    FILE_TTL,
    dataVersion,
    okCity,
  );
}

/** Цены одного магазина (для режимов «Мои магазини» и «Близо до мен») */
export async function loadStoreFile(
  ekatte: string,
  sid: string,
): Promise<StoreFile> {
  if (IS_DEMO) throw new Error("В демо-режиме нет данных по магазинам");
  return fetchCached<StoreFile>(
    `city/${ekatte}/s/${sid}.json`,
    FILE_TTL,
    dataVersion,
    okStore,
  );
}

/** Брошюры сетей: действующие предложения и ближайшие (на неделю вперёд). В демо-режиме — нет. */
export async function loadBrochures(): Promise<BrochureFile | null> {
  if (IS_DEMO) return null;
  return fetchCached<BrochureFile>(
    "brochures.json",
    FILE_TTL,
    dataVersion,
  ).catch(() => null);
}

/** Сколько последних месяцев истории брошюр загружать */
const HISTORY_MONTHS = 6;

/**
 * История брошюр: history/index.json → последние HISTORY_MONTHS месяцев (history/<ГГГГ-ММ>.json), вместе,
 * новые первыми. Для поиска прошедших акций и подсказок в «Любими». В демо-режиме — нет.
 */
export async function loadBrochureHistory(): Promise<BrochureHistory | null> {
  if (IS_DEMO) return null;
  try {
    const idx = await fetchCached<{ months: string[] }>("history/index.json", FILE_TTL, dataVersion);
    const months = idx.months.slice(-HISTORY_MONTHS);
    const files = await Promise.all(
      months.map((m) => fetchCached<BrochureHistoryMonth>(`history/${m}.json`, FILE_TTL, dataVersion).catch(() => null)),
    );
    const items = files
      .flatMap((f) => (f ? f.items.map(({ c, ...h }) => ({ ...h, ch: f.chains[c] ?? "" })) : []))
      .sort((a, b) => (b.f < a.f ? -1 : b.f > a.f ? 1 : 0));
    return { months, items };
  } catch {
    return null;
  }
}
