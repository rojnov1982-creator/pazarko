import type { CityFile } from "./types";

/** Минимальная цена группы товаров в городе и число сетей, где она есть */
export function cheapest(
  city: CityFile | null,
  productId: number,
  usePromo: boolean,
  excluded: Set<number> = new Set(),
  brand?: string,
) {
  const src = brand ? city?.brands?.[String(productId)]?.[brand] : city?.items[String(productId)];
  const list = (src ?? []).filter((t) => !excluded.has(t[0]));
  if (!list.length) return null;
  let min = Infinity;
  let chain = -1;
  let promo = false;
  let product = "";
  for (const t of list) {
    const p = usePromo && t[4] ? t[3] : t[1];
    if (p < min) {
      min = p;
      chain = t[0];
      promo = usePromo && !!t[4];
      product = promo ? t[5] : t[2];
    }
  }
  return { price: min, chain, promo, chains: list.length, product };
}

/** Марки группы, доступные в городе: [марка, мин. цена, сетей], по возрастанию цены */
export function brandsInCity(city: CityFile | null, productId: number, usePromo: boolean, excluded: Set<number>) {
  const g = city?.brands?.[String(productId)] ?? {};
  return Object.keys(g)
    .map((b) => {
      const c = cheapest(city, productId, usePromo, excluded, b);
      return c ? { brand: b, price: c.price, chains: c.chains, promo: c.promo } : null;
    })
    .filter((x): x is { brand: string; price: number; chains: number; promo: boolean } => !!x)
    .sort((a, b) => a.price - b.price);
}

/** Сети, которые не участвуют в расчёте: выключенные вручную и, если включено, не-супермаркеты */
export function excludedIndexes(city: CityFile | null, eiks: string[], onlyGrocery = true) {
  const set = new Set<number>();
  city?.chains.forEach((c, i) => {
    if (eiks.includes(c.eik) || (onlyGrocery && c.kind && c.kind !== "grocery")) set.add(i);
  });
  return set;
}

/** Самая выгодная акция в группе (любая марка) — для подсказки «супер оферта» */
export function bestPromo(city: CityFile | null, productId: number, excluded: Set<number>) {
  let best: { price: number; chain: number; product: string; regular: number } | null = null;
  for (const t of city?.items[String(productId)] ?? []) {
    if (!t[4] || excluded.has(t[0])) continue;
    if (!best || t[3] < best.price) best = { price: t[3], chain: t[0], product: t[5], regular: t[1] };
  }
  return best;
}
