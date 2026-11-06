// Анонимная статистика использования (PostHog, серверы в ЕС).
//
// Включается только с согласия пользователя (Настройки → «Анонимна статистика» или карточка на главном экране).
// Без нативных модулей: события копятся в очереди и отправляются пачкой через fetch → работает в Expo Go и в web.
// Не отправляем: имя, имейл, телефон, GPS-координаты, адреса. Идентификатор — случайный, создаётся при установке
// и удаляется при отказе от статистики.
//
// Ключ проекта PostHog (phc_…) — публичный по назначению (только запись событий), его можно хранить в app.json:
//   expo.extra.analytics = { "key": "phc_…", "host": "https://eu.i.posthog.com" }
// или в переменных окружения EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST. Без ключа статистика выключена.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { IS_DEMO } from "./data";

type Props = Record<
  string,
  string | number | boolean | null | undefined | string[]
>;

const cfg =
  (
    Constants.expoConfig?.extra as
      { analytics?: { key?: string; host?: string } } | undefined
  )?.analytics ?? {};
const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || cfg.key || "";
const HOST = (
  process.env.EXPO_PUBLIC_POSTHOG_HOST ||
  cfg.host ||
  "https://eu.i.posthog.com"
).replace(/\/$/, "");
const ID_KEY = "pazarko:aid";

/** статистика настроена в сборке (есть ключ и это не демо-режим) */
export const ANALYTICS_AVAILABLE = !!API_KEY && !IS_DEMO;

const rnd = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

let enabled = false;
let distinctId = "";
const sessionId = rnd();
let common: Props = {};
let queue: { event: string; properties: Props; timestamp: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** Включить/выключить отправку. При выключении очередь и идентификатор удаляются. */
export async function setAnalyticsEnabled(on: boolean) {
  const next = on && ANALYTICS_AVAILABLE;
  if (next === enabled) return;
  if (!next) {
    enabled = false;
    queue = [];
    distinctId = "";
    AsyncStorage.removeItem(ID_KEY).catch(() => {});
    return;
  }
  let id = await AsyncStorage.getItem(ID_KEY).catch(() => null);
  if (!id) {
    id = rnd();
    AsyncStorage.setItem(ID_KEY, id).catch(() => {});
  }
  distinctId = id;
  enabled = true;
}

/** Свойства, которые добавляются ко всем событиям (язык, город, дата цен). */
export function setCommonProps(p: Props) {
  common = { ...common, ...p };
}

export function track(event: string, properties: Props = {}) {
  if (!enabled) return;
  queue.push({
    event,
    properties: {
      ...common,
      ...properties,
      distinct_id: distinctId,
      $session_id: sessionId,
      $process_person_profile: false, // анонимные события, без профилей людей
      $geoip_disable: true, // не определять местоположение по IP
      $lib: "pazarko",
      app_version: Constants.expoConfig?.version ?? "",
      platform: Platform.OS,
    },
    timestamp: new Date().toISOString(),
  });
  if (queue.length >= 20) flush();
  else if (!timer) timer = setTimeout(flush, 10_000);
}

export async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!enabled || !queue.length) return;
  const batch = queue;
  queue = [];
  try {
    const res = await fetch(`${HOST}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: API_KEY, batch }),
    });
    if (!res.ok && res.status >= 500) queue = [...batch, ...queue].slice(-200);
  } catch {
    // нет сети — вернём события в очередь (не больше 200, чтобы не копить бесконечно)
    if (enabled) queue = [...batch, ...queue].slice(-200);
  }
}
