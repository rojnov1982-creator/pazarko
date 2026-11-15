// Сохранённое состояние приложения и ключи кэша данных — чистые функции (без AsyncStorage), чтобы их можно было тестировать.

import type { Favorite } from "./favorites";
import type { BasketItem } from "./types";

/** Разобранное сохранённое состояние: только поля, которые прошли проверку формы */
export interface SavedState {
  ekatte: string | null;
  basket?: BasketItem[];
  /** настройки как сохранены (поверх них ложатся значения по умолчанию) */
  settings?: Record<string, unknown>;
  /** режим покупок: { stores: [...], checked: [...] } */
  shopping?: { stores: unknown[]; checked: string[] } & Record<string, unknown>;
  favorites?: Favorite[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Сохранённое состояние из строки AsyncStorage.
 * null — сохранённого нет или оно не читается (испорченный JSON): тогда приложение стартует с пустым состоянием.
 * Поля неверной формы пропускаются, остальные восстанавливаются.
 */
export function parseSaved(raw: string | null | undefined): SavedState | null {
  if (!raw) return null;
  let s: unknown;
  try {
    s = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(s)) return null;
  const out: SavedState = {
    ekatte: typeof s.ekatte === "string" && s.ekatte ? s.ekatte : null,
  };
  if (Array.isArray(s.basket))
    out.basket = (s.basket as BasketItem[]).filter(
      (b) => b && typeof b.productId === "number" && b.qty > 0,
    );
  if (isObj(s.settings)) {
    const st = { ...s.settings };
    // поля, от формы которых зависит работа экранов: неверные — убираем, сработают значения по умолчанию
    if (!isObj(st.areas)) delete st.areas;
    if (!Array.isArray(st.excludedChains)) delete st.excludedChains;
    out.settings = st;
  }
  if (isObj(s.shopping) && Array.isArray(s.shopping.stores))
    out.shopping = {
      ...s.shopping,
      stores: s.shopping.stores,
      checked: Array.isArray(s.shopping.checked)
        ? (s.shopping.checked as unknown[]).filter(
            (x): x is string => typeof x === "string",
          )
        : [],
    };
  if (Array.isArray(s.favorites))
    out.favorites = (s.favorites as Favorite[]).filter(
      (f) => f && f.id && Array.isArray(f.words),
    );
  return out;
}

const CACHE = "cache2:";
export const cacheKey = (path: string, version = "") =>
  `${CACHE}${path}@${version}`;

/** Ключи того же файла от других версий данных: после удачной загрузки новой версии они не нужны */
export function otherVersionKeys(
  keys: readonly string[],
  path: string,
  version: string,
): string[] {
  const prefix = `${CACHE}${path}@`;
  const keep = cacheKey(path, version);
  return keys.filter((k) => k.startsWith(prefix) && k !== keep);
}

/**
 * Ключи кэша, чья версия данных (дата или время выпуска) старше maxAgeDays: файлы городов и магазинов,
 * которые человек больше не открывает. Ключи без версии и текущая версия не трогаются.
 */
export function expiredCacheKeys(
  keys: readonly string[],
  currentVersion: string,
  nowMs: number,
  maxAgeDays = 7,
): string[] {
  return keys.filter((k) => {
    if (!k.startsWith(CACHE)) return false;
    const version = k.slice(k.lastIndexOf("@") + 1);
    if (!version || version === currentVersion) return false;
    const at = Date.parse(version);
    return Number.isFinite(at) && nowMs - at > maxAgeDays * 86400000;
  });
}

/** Сколько полных дней между датой цен и сегодняшним днём (обе — YYYY-MM-DD); 0, если дата не читается */
export function dataAgeDays(pricesDate: string, today: string): number {
  const a = Date.parse(`${pricesDate}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * С какого возраста цены считаются устаревшими. КЗП публикует вчерашний день, утром до обновления
 * данным два дня — это обычное состояние; три и больше значит, что обновление не прошло.
 */
export const OLD_PRICES_DAYS = 3;
