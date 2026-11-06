// Брошюры сетей: сопоставление с сетями города, сроки действия, лучшее предложение для группы.

import type { BrochureFile, BrochureOffer, CityFile } from "./types";

const letters = (s: string) => s.toUpperCase().normalize("NFKC").replace(/[^\p{L}]+/gu, "");

/** Сегодня по локальному времени устройства (YYYY-MM-DD) */
export function todayIso(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** «2026-11-08» → «08.11» */
export const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export type OfferStatus = "now" | "soon" | "expired";
export const offerStatus = (o: BrochureOffer, today: string): OfferStatus =>
  o.t < today ? "expired" : o.f > today ? "soon" : "now";

/**
 * Для каждой сети брошюр — индекс сети в городе (или -1, если её в городе нет).
 * Название сети КЗП сравниваем по буквам: «КАУФЛАНД БЪЛГАРИЯ…» содержит «КАУФЛАНД».
 */
export function matchChains(bro: BrochureFile | null, city: CityFile | null): number[] {
  if (!bro) return [];
  return bro.chains.map((ch) => {
    if (!city) return -1;
    const keys = ch.match.map(letters);
    return city.chains.findIndex((c) => !c.sid && keys.some((k) => letters(c.name).includes(k)));
  });
}

/**
 * Какие сети брошюр показывать: те, что есть в городе и не исключены в настройках.
 * Если ни одна сеть не сопоставилась (другое написание названий), показываем все — лучше лишнее, чем пусто.
 */
export function visibleChains(bro: BrochureFile | null, city: CityFile | null, excludedEiks: string[]): boolean[] {
  if (!bro) return [];
  const m = matchChains(bro, city);
  if (!m.some((i) => i >= 0)) return bro.chains.map(() => true);
  return m.map((i) => i >= 0 && !excludedEiks.includes(city!.chains[i].eik));
}

/** Самое выгодное действующее предложение брошюр для группы (по цене за эталонную фасовку) */
export function bestBrochureOffer(
  bro: BrochureFile | null,
  group: number,
  visible: boolean[],
  today: string,
  brand?: string,
): BrochureOffer | null {
  if (!bro) return null;
  let best: BrochureOffer | null = null;
  for (const o of bro.offers) {
    if (o.g !== group || o.rp == null || !visible[o.c] || offerStatus(o, today) !== "now") continue;
    if (brand && !matchesBrand(o, brand)) continue;
    if (!best || o.rp < best.rp!) best = o;
  }
  return best;
}

/** Марка из корзины ("ВЕРЕЯ", "@own") ↔ марка в брошюре */
function matchesBrand(o: BrochureOffer, brand: string) {
  if (brand === "@own") return o.o === 1;
  return !!o.b && letters(o.b).includes(letters(brand));
}

/** «2.36/kg» → «2,36 €/кг» */
export function unitPriceLabel(u: string | undefined, lang: "bg" | "en") {
  if (!u) return "";
  const [v, unit] = u.split("/");
  const n = Number(v);
  const units: Record<string, [string, string]> = { kg: ["кг", "kg"], l: ["л", "l"], pcs: ["бр.", "pc"] };
  const un = units[unit]?.[lang === "en" ? 1 : 0] ?? unit;
  return lang === "en" ? `€${n.toFixed(2)}/${un}` : `${n.toFixed(2).replace(".", ",")} €/${un}`;
}
