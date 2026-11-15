// Сети: сопоставление названий (КЗП ↔ брошюры) и исключение сети из расчёта.

import type { ChainInfo } from "./types";

export const letters = (s: string) =>
  s
    .toUpperCase()
    .normalize("NFKC")
    .replace(/[^\p{L}]+/gu, "");

const words = (s: string) =>
  s
    .toUpperCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * Название сети КЗП подходит под ключ сети («КАУФЛАНД БЪЛГАРИЯ…» ↔ «КАУФЛАНД», «T Market» ↔ «TMARKET»):
 * слова ключа идут в названии подряд целыми словами, либо название целиком равно ключу без пробелов.
 * Не по вхождению букв: «МЕТРОПОЛ» — не «МЕТРО».
 */
export function chainMatches(name: string, key: string): boolean {
  const k = letters(key);
  if (!k) return false;
  if (letters(name) === k) return true;
  const nw = words(name);
  for (let i = 0; i < nw.length; i++) {
    let joined = "";
    for (let j = i; j < nw.length && joined.length < k.length; j++) {
      joined += letters(nw[j]);
      if (joined === k) return true;
    }
  }
  return false;
}

/**
 * Сеть выключена в настройках. У сети из нескольких фирм (два «ФАНТАСТИКО») несколько ЕИК:
 * исключение действует по любому из них, даже если основной ЕИК сети в данных сменился.
 */
export function chainExcluded(
  c: Pick<ChainInfo, "eik" | "eiks">,
  excludedEiks: readonly string[],
): boolean {
  return (
    excludedEiks.includes(c.eik) ||
    !!c.eiks?.some((e) => excludedEiks.includes(e))
  );
}
