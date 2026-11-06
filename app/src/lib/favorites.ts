// «Любими»: продукты, которые человек покупает всегда («Луканка Орехите Чардака»).
// - Каждую неделю ищем их в брошюрах: все слова названия должны встретиться в предложении (по основе слова:
//   «луканка» находит «Луканков», «Орехите» — «ОРЕХИТЕ ГАСТРО»).
// - Если любимый продукт «в списке», он стоит в корзине как обычный товар: группа КЗП + марка (если удалось
//   определить) — цена по КЗП, а если есть подходящая акция в брошюре, план возьмёт её. Без группы — строка без цены.

import type { BrochureFile, BrochureHistory, BrochureHistoryItem, BrochureOffer, CityFile, PriceTuple } from "./types";

export interface Favorite {
  id: string;
  /** как ввёл человек: «Луканка Орехите Чардака» */
  name: string;
  /** основы слов для поиска */
  words: string[];
  /** группа КЗП и марка — для цены, если удалось определить */
  productId?: number;
  brand?: string;
  /** держать в корзине каждую неделю */
  inList: boolean;
}

/** нижний регистр, ъ/ё как в поиске брошюр, без знаков */
export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** «Луканка Орехите Чардака» → основы ["лукан", "орехи", "чарда"] */
export function favWords(text: string): string[] {
  // основа — первые 4–5 букв: «луканка», «луканков» → «лукан»; короткие слова — целиком
  return [
    ...new Set(
      fold(text)
        .split(" ")
        .filter((w) => w.length >= 2),
    ),
  ].map((w) =>
    w.length > 5 ? w.slice(0, Math.max(4, Math.min(5, w.length - 2))) : w,
  );
}

/** Все основы встречаются в начале какого-нибудь слова текста */
export function matchesWords(words: string[], text: string): boolean {
  if (!words.length) return false;
  const tokens = fold(text).split(" ");
  return words.every((w) => tokens.some((t) => t.startsWith(w)));
}

export const offerMatches = (words: string[], o: BrochureOffer) =>
  matchesWords(words, `${o.n} ${o.b ?? ""}`);

/**
 * Группа КЗП и марка для любимого продукта:
 * марка — из марок КЗП, чьё название есть среди слов; группа — та, где такая марка есть
 * (если групп несколько — по подходящим предложениям брошюр); без марки — по названию группы.
 */
export function inferFavorite(
  text: string,
  city: CityFile | null,
  bro: BrochureFile | null,
  groupNames: Map<number, string>,
): { productId?: number; brand?: string } {
  const words = favWords(text);
  // группы из брошюр, где нашлись подходящие предложения
  const votes = new Map<number, number>();
  for (const o of bro?.offers ?? [])
    if (o.g && offerMatches(words, o))
      votes.set(o.g, (votes.get(o.g) ?? 0) + 1);
  const byVotes = [...votes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const brands = city?.brands ?? {};
  const withBrand: { g: number; brand: string }[] = [];
  for (const [g, map] of Object.entries(brands)) {
    for (const key of Object.keys(map)) {
      if (key === "@own") continue;
      const bw = favWords(key);
      if (
        bw.length &&
        bw.every((w) =>
          words.some(
            (x) => x.startsWith(w) || (x.length >= 3 && w.startsWith(x)),
          ),
        )
      )
        withBrand.push({ g: Number(g), brand: key });
    }
  }
  if (withBrand.length) {
    const best = withBrand.find((x) => byVotes.includes(x.g)) ?? withBrand[0];
    return { productId: best.g, brand: best.brand };
  }
  if (byVotes.length) return { productId: byVotes[0] };
  // без марки: группа, в названии которой есть все слова («кисело мляко»)
  for (const [id, name] of groupNames)
    if (matchesWords(words, name)) return { productId: id };
  return {};
}

/** Действующие предложения брошюр для любимого продукта, самые выгодные первыми */
export function favoriteOffers(
  f: Favorite,
  bro: BrochureFile | null,
  visible: boolean[],
  isActive: (o: BrochureOffer) => boolean,
) {
  if (!bro) return [];
  return bro.offers
    .filter((o) => visible[o.c] && isActive(o) && offerMatches(f.words, o))
    .sort((a, b) => (b.d ?? 0) - (a.d ?? 0));
}

/** Самая низкая цена именно этого продукта по КЗП (название содержит все слова): для «Без акция: от …» */
export function kzpFavPrice(
  f: Favorite,
  city: CityFile | null,
): { price: number; chain: string } | null {
  if (!city || !f.productId) return null;
  const list =
    (f.brand
      ? city.brands?.[String(f.productId)]?.[f.brand]
      : city.items[String(f.productId)]) ?? [];
  let best: { price: number; chain: string } | null = null;
  for (const t of list) {
    const part = favPart(t, f.words, true);
    if (part && (!best || part.price < best.price))
      best = { price: part.price, chain: city.chains[t[0]]?.name ?? "" };
  }
  return best;
}

/**
 * Цена любимого продукта из записи КЗП. В записи две части — обычная цена (свой товар) и самая выгодная
 * (может быть ДРУГОЙ товар той же марки, например по акции). Каждую часть проверяем отдельно — с её ценой
 * и фасовкой; чужой товар не подставляем никогда.
 */
export function favPart(
  t: PriceTuple,
  words: string[],
  usePromo: boolean,
): { price: number; regular: number; isPromo: boolean; product: string; pack?: number } | null {
  const [, regular, regName, eff, promo, effName, , regPack, effPack] = t;
  const regOk = regular > 0 && matchesWords(words, regName);
  const effOk = eff > 0 && matchesWords(words, effName);
  // выгодная часть: акция — только если акции включены; без акции — просто более низкая цена этого же товара
  const effUsable = effOk && (usePromo || !promo);
  if (effUsable && (!regOk || eff < regular)) {
    return { price: eff, regular: regOk ? regular : eff, isPromo: !!promo, product: effName, pack: effPack || undefined };
  }
  if (regOk) return { price: regular, regular, isPromo: false, product: regName, pack: regPack || undefined };
  return null;
}

/** Продукты из истории брошюр, где есть все слова; самые свежие первыми */
export function historyMatches(history: BrochureHistory | null, words: string[], limit = 20): BrochureHistoryItem[] {
  if (!history || !words.length) return [];
  const out: BrochureHistoryItem[] = [];
  for (const h of history.items) {
    if (matchesWords(words, `${h.n} ${h.b ?? ""}`)) out.push(h);
    if (out.length >= limit) break; // items уже отсортированы по дате, новые первыми
  }
  return out;
}

/** Последняя акция любимого продукта из истории брошюр */
export const lastSeen = (f: Favorite, history: BrochureHistory | null) => historyMatches(history, f.words, 1)[0];

/**
 * Название для «Любими» из продукта брошюры: вид продукта (первое слово), собственные имена (с заглавной)
 * и марка (первое слово), без граммовки и описаний —
 * «Луканка Добруджанска; Чардака ОРЕХИТЕ ГАСТРО насипна от щандова витрина» → «Луканка Добруджанска Чардака Орехите».
 */
export function favNameFrom(name: string, brand?: string): string {
  const title = (w: string) => (w.length > 1 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w);
  const brandWords = new Set(fold(brand ?? "").split(" ").filter(Boolean));
  const firstBrand = fold(brand ?? "").split(" ")[0] ?? "";
  const words = name
    .replace(/[;,()]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/\d/.test(w) && !/^(г|гр|кг|мл|л|бр|x|х|%)$/i.test(w));
  const out: string[] = [];
  words.forEach((w, i) => {
    const f = fold(w);
    if (brandWords.has(f) && f !== firstBrand) return; // от марки — только первое слово
    const proper = /^\p{Lu}/u.test(w);
    if (i === 0 || proper) out.push(title(w));
  });
  if (firstBrand && !out.some((w) => fold(w) === firstBrand)) out.push(title((brand ?? "").split(/\s+/)[0]));
  return [...new Set(out)].join(" ");
}
