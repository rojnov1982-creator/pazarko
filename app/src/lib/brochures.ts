// Брошюры сетей: сопоставление с сетями города, сроки действия, лучшее предложение для группы.

import { matchesWords } from "./favorites";
import type { BrochureCandidate } from "./optimize";
import type { BrochureFile, BrochureOffer, CityFile } from "./types";

const letters = (s: string) =>
  s
    .toUpperCase()
    .normalize("NFKC")
    .replace(/[^\p{L}]+/gu, "");

/** Сегодня по локальному времени устройства (YYYY-MM-DD) */
export function todayIso(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** «2026-11-08» → «08.11» */
export const shortDate = (iso: string) =>
  `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export type OfferStatus = "now" | "soon" | "expired";
export const offerStatus = (o: BrochureOffer, today: string): OfferStatus =>
  o.t < today ? "expired" : o.f > today ? "soon" : "now";

/**
 * Для каждой сети брошюр — индекс сети в городе (или -1, если её в городе нет).
 * Название сети КЗП сравниваем по буквам: «КАУФЛАНД БЪЛГАРИЯ…» содержит «КАУФЛАНД».
 */
export function matchChains(
  bro: BrochureFile | null,
  city: CityFile | null,
): number[] {
  if (!bro) return [];
  return bro.chains.map((ch) => {
    if (!city) return -1;
    const keys = ch.match.map(letters);
    return city.chains.findIndex(
      (c) => !c.sid && keys.some((k) => letters(c.name).includes(k)),
    );
  });
}

/**
 * Какие сети брошюр показывать: те, что есть в городе и не исключены в настройках.
 * Если ни одна сеть не сопоставилась (другое написание названий), показываем все — лучше лишнее, чем пусто.
 */
export function visibleChains(
  bro: BrochureFile | null,
  city: CityFile | null,
  excludedEiks: string[],
): boolean[] {
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
    if (
      o.g !== group ||
      o.rp == null ||
      !visible[o.c] ||
      offerStatus(o, today) !== "now"
    )
      continue;
    if (brand && !matchesBrand(o, brand)) continue;
    if (!best || o.rp < best.rp!) best = o;
  }
  return best;
}

/** Марка из корзины ("ВЕРЕЯ", "@own") ↔ марка в брошюре */
export function matchesBrand(o: BrochureOffer, brand: string) {
  if (brand === "@own") return o.o === 1;
  return !!o.b && letters(o.b).includes(letters(brand));
}

/** «2.36/kg» → «2,36 €/кг» */
export function unitPriceLabel(u: string | undefined, lang: "bg" | "en") {
  if (!u) return "";
  const [v, unit] = u.split("/");
  const n = Number(v);
  const units: Record<string, [string, string]> = {
    kg: ["кг", "kg"],
    l: ["л", "l"],
    pcs: ["бр.", "pc"],
  };
  const un = units[unit]?.[lang === "en" ? 1 : 0] ?? unit;
  return lang === "en"
    ? `€${n.toFixed(2)}/${un}`
    : `${n.toFixed(2).replace(".", ",")} €/${un}`;
}

type Candidate = BrochureCandidate & { brand?: string; own?: boolean };

/**
 * Предложения брошюр для расчёта плана: группа КЗП → действующие сегодня предложения с понятной фасовкой (rp)
 * и сети города, где они действуют (по названию сети; в режиме района — каждый выбранный магазин этой сети).
 */
export function brochureCandidates(
  bro: BrochureFile | null,
  city: CityFile | null,
  today: string,
): Map<number, Candidate[]> {
  const out = new Map<number, Candidate[]>();
  if (!bro || !city) return out;
  const chainsOf = bro.chains.map((ch) => {
    const keys = ch.match.map(letters).filter(Boolean);
    const idx: number[] = [];
    city.chains.forEach(
      (c, i) => keys.some((k) => letters(c.name).includes(k)) && idx.push(i),
    );
    return idx;
  });
  for (const o of bro.offers) {
    if (
      !o.g ||
      o.rp == null ||
      o.p == null ||
      o.m ||
      offerStatus(o, today) !== "now"
    )
      continue;
    const chains = chainsOf[o.c] ?? [];
    if (!chains.length) continue;
    const list = out.get(o.g) ?? [];
    list.push({
      chains,
      id: o.i ?? `${o.c}-${o.n}-${o.f}`,
      name: o.n,
      price: o.rp,
      packPrice: o.p,
      // обычная цена упаковки → за эталонную фасовку (в той же пропорции, что и цена по акции)
      regular: o.r ? Math.round(((o.r * o.rp) / o.p) * 100) / 100 : undefined,
      card: o.k ? true : undefined,
      to: o.t,
      condition: o.w,
      brand: o.b,
      own: o.o === 1,
    });
    out.set(o.g, list);
  }
  return out;
}

/** Функция для OptimizeOptions.brochure: предложения группы с учётом выбранной марки */
export function brochureLookup(map: Map<number, Candidate[]>) {
  return (
    productId: number,
    brand?: string,
    words?: string[],
  ): BrochureCandidate[] => {
    let list = map.get(productId) ?? [];
    // любимый продукт: только предложения, где есть все слова («Луканка Орехите Чардака»)
    if (words?.length)
      list = list.filter((c) =>
        matchesWords(words, `${c.name} ${c.brand ?? ""}`),
      );
    if (!brand) return list;
    return list.filter((c) =>
      brand === "@own"
        ? c.own
        : !!c.brand && letters(c.brand).includes(letters(brand)),
    );
  };
}

/**
 * Проверка предложения брошюры по ценам КЗП в той же сети и городе.
 * С маркой (если такая марка есть в данных) — обычная цена этой марки и реальная скидка;
 * без марки — самая низкая обычная цена группы в сети (для ориентира, не «скидка»).
 */
export function kzpCheck(
  o: BrochureOffer,
  bro: BrochureFile | null,
  city: CityFile | null,
): { regular: number; brand: boolean; real: number } | null {
  if (!bro || !city || !o.g || o.rp == null || o.p == null) return null;
  // сравниваем только упаковки, близкие к эталонной: мультипак «2 × 200 г» или бутылка 0,5 л против 2 л
  // в пересчёте дают ложную «реальную скидку»
  const ratio = o.p / o.rp;
  if (ratio < 0.75 || ratio > 1.33) return null;
  const keys = (bro.chains[o.c]?.match ?? []).map(letters).filter(Boolean);
  const idx = new Set<number>();
  city.chains.forEach(
    (c, i) => keys.some((k) => letters(c.name).includes(k)) && idx.add(i),
  );
  if (!idx.size) return null;
  const brands = city.brands?.[String(o.g)];
  let brandKey: string | undefined;
  if (brands) {
    if (o.o === 1 && brands["@own"]) brandKey = "@own";
    else if (o.b) {
      const b = letters(o.b);
      brandKey = Object.keys(brands).find(
        (k) =>
          k !== "@own" &&
          letters(k).length >= 3 &&
          (b.includes(letters(k)) || letters(k).includes(b)),
      );
    }
  }
  const list = (brandKey ? brands![brandKey] : city.items[String(o.g)]) ?? [];
  const regs = list.filter((t) => idx.has(t[0]) && t[1] > 0).map((t) => t[1]);
  if (!regs.length) return null;
  const regular = Math.min(...regs);
  return {
    regular,
    brand: !!brandKey,
    real: Math.round((1 - o.rp / regular) * 100),
  };
}
