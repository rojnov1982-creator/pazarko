// Источник данных.
// Если в app.json → expo.extra.dataUrl указан адрес (папка out/ из data-pipeline,
// выложенная на хостинг), приложение берёт свежие цены оттуда и кэширует их.
// Если адрес пустой или сеть недоступна — используются встроенные ДЕМО-данные.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { CityFile, IndexFile, ProductsFile, StoreFile } from "./types";

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

// Список городов проверяем часто (он маленький), а файлы городов и магазинов кэшируем
// по версии данных: как только на сервере появились новые цены — скачиваются новые файлы.
const INDEX_TTL = 20 * 60 * 1000;
const FILE_TTL = 24 * 3600 * 1000;
let dataVersion = "";

async function fetchCached<T>(path: string, ttl: number, version = ""): Promise<T> {
  const key = `cache2:${path}@${version}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const { at, data } = JSON.parse(raw);
      if (Date.now() - at < ttl) return data as T;
    }
  } catch {}
  try {
    // ?v= — чтобы телефон и CDN не отдали старую копию файла
    const res = await fetch(`${DATA_URL}/${path}?v=${encodeURIComponent(version || String(Math.floor(Date.now() / ttl)))}`);
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
  if (IS_DEMO) return demoIndex;
  const idx = await fetchCached<IndexFile>("index.json", INDEX_TTL);
  dataVersion = idx.generatedAt ?? idx.date;
  return idx;
}

export async function loadProducts(): Promise<ProductsFile> {
  return IS_DEMO ? demoProducts : fetchCached<ProductsFile>("products.json", FILE_TTL, dataVersion).catch(() => demoProducts);
}

export async function loadCity(ekatte: string): Promise<CityFile> {
  if (IS_DEMO) {
    const c = demoCities[ekatte];
    if (!c) throw new Error("No data for this city");
    return c;
  }
  return fetchCached<CityFile>(`city/${ekatte}.json`, FILE_TTL, dataVersion);
}

/** Цены одного магазина (для режимов «Мои магазини» и «Близо до мен») */
export async function loadStoreFile(ekatte: string, sid: string): Promise<StoreFile> {
  if (IS_DEMO) throw new Error("В демо-режиме нет данных по магазинам");
  return fetchCached<StoreFile>(`city/${ekatte}/s/${sid}.json`, FILE_TTL, dataVersion);
}
