// Источник данных.
// Если в app.json → expo.extra.dataUrl указан адрес (папка out/ из data-pipeline,
// выложенная на хостинг), приложение берёт свежие цены оттуда и кэширует их.
// Если адрес пустой или сеть недоступна — используются встроенные ДЕМО-данные.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { CityFile, IndexFile, ProductsFile } from "./types";

const demoIndex = require("../../assets/demo-data/index.json") as IndexFile;
const demoProducts = require("../../assets/demo-data/products.json") as ProductsFile;
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

const CACHE_TTL = 3 * 3600 * 1000;

async function fetchCached<T>(path: string): Promise<T> {
  const key = `cache:${path}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const { at, data } = JSON.parse(raw);
      if (Date.now() - at < CACHE_TTL) return data as T;
    }
  } catch {}
  try {
    const res = await fetch(`${DATA_URL}/${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    AsyncStorage.setItem(key, JSON.stringify({ at: Date.now(), data })).catch(() => {});
    return data;
  } catch (e) {
    const raw = await AsyncStorage.getItem(key).catch(() => null);
    if (raw) return JSON.parse(raw).data as T; // устаревший кэш лучше, чем ничего
    throw e;
  }
}

export async function loadIndex(): Promise<IndexFile> {
  return IS_DEMO ? demoIndex : fetchCached<IndexFile>("index.json");
}

export async function loadProducts(): Promise<ProductsFile> {
  return IS_DEMO ? demoProducts : fetchCached<ProductsFile>("products.json").catch(() => demoProducts);
}

export async function loadCity(ekatte: string): Promise<CityFile> {
  if (IS_DEMO) {
    const c = demoCities[ekatte];
    if (!c) throw new Error("No data for this city");
    return c;
  }
  return fetchCached<CityFile>(`city/${ekatte}.json`);
}
