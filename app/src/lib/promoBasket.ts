// «Кошница на седмицата»: готовая корзина из лучших акций брошюр на базовые продукты.
// Берём по одной упаковке продуктов КЗП на каждый день (еда, без алкоголя и табака), у которых в брошюре есть акция
// от 20% без условий. Упаковка — обычная (не мультипак «2 × 1 кг»), до 12 €, чтобы корзину не забивали дорогие
// покупки «про запас»; ранжируем по проценту скидки, не по сумме. Одна позиция на семейство (кафе на зърна и мляно —
// одно). Чтобы не ходить по всем магазинам, выбираем лучшую пару сетей (или одну) и в ней — лучшее предложение.

import { offerStatus } from "./brochures";
import { pinFromBrochure } from "./pins";
import type { BrochureFile, BrochureOffer, PinnedOffer } from "./types";

export interface PromoPick {
  offer: BrochureOffer;
  pin: PinnedOffer;
  productId: number;
  /** экономия на одной упаковке (обычная цена − цена по акции) */
  saving: number;
  /** скидка, доля (0,35 = −35%) */
  disc: number;
}

export interface WeeklyPromo {
  /** индексы сетей брошюр */
  chains: number[];
  picks: PromoPick[];
  /** сумма по акции и по обычным ценам (по одной упаковке) */
  total: number;
  regular: number;
}

/** Группы КЗП, которые идут в корзину: еда без алкоголя (74–77) и табака (78), без бытовой химии (79+) */
export const isPromoBasketGroup = (id: number) => id >= 1 && id <= 73;

const MIN_DISCOUNT = 0.2;
const MAX_PACK_PRICE = 12;
/** упаковка не больше 1,6 эталонной (иначе это мультипак / запас) */
const MAX_PACK_RATIO = 1.6;

interface Options {
  maxChains?: number;
  maxItems?: number;
  /** группа есть в справочнике продуктов приложения */
  hasGroup?: (id: number) => boolean;
  /** «семейство» продукта: из одного семейства — одна позиция */
  family?: (id: number) => string;
}

type Item = { g: number; o: BrochureOffer; saving: number; disc: number };

const unitPrice = (o: BrochureOffer) => o.rp ?? o.p!;

export function weeklyPromoBasket(
  bro: BrochureFile | null,
  visible: boolean[],
  today: string,
  opts: Options = {},
): WeeklyPromo | null {
  const {
    maxChains = 2,
    maxItems = 12,
    hasGroup,
    family = (id: number) => String(id),
  } = opts;
  if (!bro) return null;
  // группа → сеть → лучшее предложение (самое дешёвое за эталонную фасовку)
  const best = new Map<number, Map<number, BrochureOffer>>();
  for (const o of bro.offers) {
    if (
      !o.g ||
      !isPromoBasketGroup(o.g) ||
      (hasGroup && !hasGroup(o.g)) ||
      !visible[o.c]
    )
      continue;
    if (o.p == null || o.r == null || o.rp == null || o.r <= o.p || o.m)
      continue;
    if (offerStatus(o, today) !== "now") continue;
    if (
      1 - o.p / o.r < MIN_DISCOUNT ||
      o.p > MAX_PACK_PRICE ||
      o.p / o.rp > MAX_PACK_RATIO
    )
      continue;
    const byChain = best.get(o.g) ?? new Map<number, BrochureOffer>();
    const cur = byChain.get(o.c);
    if (!cur || unitPrice(o) < unitPrice(cur)) byChain.set(o.c, o);
    best.set(o.g, byChain);
  }
  if (!best.size) return null;

  // лучшее предложение каждого продукта в наборе сетей; одно на семейство; по убыванию скидки; не больше maxItems
  const pick = (set: number[]): Item[] => {
    const byFamily = new Map<string, Item>();
    for (const [g, byChain] of best) {
      let o: BrochureOffer | undefined;
      for (const c of set) {
        const x = byChain.get(c);
        if (x && (!o || unitPrice(x) < unitPrice(o))) o = x;
      }
      if (!o) continue;
      const item = { g, o, saving: o.r! - o.p!, disc: 1 - o.p! / o.r! };
      const f = family(g);
      const cur = byFamily.get(f);
      if (!cur || item.disc > cur.disc) byFamily.set(f, item);
    }
    return [...byFamily.values()]
      .sort((a, b) => b.disc - a.disc)
      .slice(0, maxItems);
  };

  // оценка набора: сумма скидок в процентах — больше хороших акций, а не одна дорогая покупка
  const chains = [...new Set([...best.values()].flatMap((m) => [...m.keys()]))];
  let bestSet: number[] = [];
  let bestScore = -1;
  const consider = (set: number[]) => {
    const score = pick(set).reduce((sum, x) => sum + x.disc, 0);
    if (score > bestScore + 1e-6) {
      bestScore = score;
      bestSet = set;
    }
  };
  for (let i = 0; i < chains.length; i++) {
    consider([chains[i]]);
    if (maxChains >= 2)
      for (let j = i + 1; j < chains.length; j++)
        consider([chains[i], chains[j]]);
  }

  const items = pick(bestSet);
  if (items.length < 3) return null;
  const picks = items.map((x) => ({
    offer: x.o,
    pin: pinFromBrochure(x.o, bro),
    productId: x.g,
    saving: x.saving,
    disc: x.disc,
  }));
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    chains: [...new Set(picks.map((p) => p.offer.c))],
    picks,
    total: r2(picks.reduce((sum, p) => sum + p.offer.p!, 0)),
    regular: r2(picks.reduce((sum, p) => sum + p.offer.r!, 0)),
  };
}
