// Поиск самой выгодной потребительской корзины.
//
// Задача: для списка товаров (групп КЗП) и количеств выбрать, в каких сетях что купить,
// чтобы сумма была минимальной при ограничении «не больше K магазинов» и, по желанию,
// «штрафе» за каждый дополнительный магазин (время/дорога). Затем сравнить с покупкой
// всей корзины в одной сети.
//
// Метод: полный перебор подмножеств сетей размера ≤ K среди кандидатов (для K ≤ 4 и
// ≤ 24 кандидатов это максимум ~12 тыс. вариантов — мгновенно на телефоне). Внутри
// подмножества каждый товар берётся там, где он дешевле. Критерий: сначала меньше
// ненайденных товаров, потом меньше сумма (+ штраф за магазины).

import type { BasketItem, CityFile, PriceTuple } from "./types";

export interface OptimizeOptions {
  /** максимум разных сетей в плане; 0 = без ограничения */
  maxStores: number;
  /** учитывать акционные цены */
  usePromo: boolean;
  /** условная стоимость каждого дополнительного магазина, € */
  extraStoreCost: number;
  /** сети, которые пользователь исключил (индексы) */
  excludedChains?: number[];
}

export interface Offer {
  chain: number;
  price: number;
  regular: number;
  isPromo: boolean;
  product: string;
  store: string;
  /** реальная цена пачки на полке, если цена приведена к эталонной фасовке */
  packPrice?: number;
}

export interface PlanLine {
  productId: number;
  qty: number;
  offer: Offer;
  cost: number;
}

export interface StorePlan {
  chain: number;
  lines: PlanLine[];
  subtotal: number;
}

export interface Plan {
  stores: StorePlan[];
  total: number;
  /** товары, которых нет ни в одной выбранной сети */
  missing: number[];
}

export interface SingleStoreResult {
  chain: number;
  total: number;
  missing: number[];
  /** стоимость оптимального плана на тех же товарах, что есть в этой сети */
  planOnSameItems: number;
  /** сколько переплата при покупке только здесь (на сопоставимых товарах) */
  overpay: number;
  lines: PlanLine[];
}

export interface OptimizeResult {
  plan: Plan;
  /** абсолютный минимум (каждый товар в самой дешёвой сети, без лимита магазинов) */
  ideal: Plan;
  singles: SingleStoreResult[];
  bestSingle: SingleStoreResult | null;
  /** экономия плана против лучшей одной сети (на сопоставимых товарах) */
  savings: number;
  savingsPct: number;
  evaluated: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function toOffer(t: PriceTuple, usePromo: boolean): Offer {
  const [chain, regular, regName, eff, promo, effName, store, regPack, effPack] = t;
  if (usePromo && promo && eff < regular) {
    return { chain, price: eff, regular, isPromo: true, product: effName, store, packPrice: effPack || undefined };
  }
  return {
    chain,
    price: regular,
    regular,
    isPromo: false,
    product: regName,
    store: promo ? "" : store,
    packPrice: regPack || undefined,
  };
}

/** offers[i] — предложения по i-му товару корзины, индексированные по сети */
function buildOffers(city: CityFile, basket: BasketItem[], opts: OptimizeOptions) {
  const excluded = new Set(opts.excludedChains ?? []);
  return basket.map((b) => {
    const m = new Map<number, Offer>();
    const list = b.brand ? city.brands?.[String(b.productId)]?.[b.brand] ?? [] : city.items[String(b.productId)] ?? [];
    for (const t of list) {
      if (excluded.has(t[0])) continue;
      m.set(t[0], toOffer(t, opts.usePromo));
    }
    return m;
  });
}

function evaluate(chains: number[], basket: BasketItem[], offers: Map<number, Offer>[]) {
  let total = 0;
  const missing: number[] = [];
  const choice: (Offer | null)[] = [];
  for (let i = 0; i < basket.length; i++) {
    let best: Offer | null = null;
    for (const c of chains) {
      const o = offers[i].get(c);
      if (o && (!best || o.price < best.price)) best = o;
    }
    choice.push(best);
    if (best) total += best.price * basket[i].qty;
    else missing.push(basket[i].productId);
  }
  const used = new Set(choice.filter(Boolean).map((o) => o!.chain));
  return { total, missing, choice, used };
}

function toPlan(basket: BasketItem[], ev: ReturnType<typeof evaluate>): Plan {
  const byChain = new Map<number, StorePlan>();
  ev.choice.forEach((o, i) => {
    if (!o) return;
    let sp = byChain.get(o.chain);
    if (!sp) byChain.set(o.chain, (sp = { chain: o.chain, lines: [], subtotal: 0 }));
    const cost = o.price * basket[i].qty;
    sp.lines.push({ productId: basket[i].productId, qty: basket[i].qty, offer: o, cost: r2(cost) });
    sp.subtotal += cost;
  });
  const stores = [...byChain.values()]
    .map((s) => ({ ...s, subtotal: r2(s.subtotal) }))
    .sort((a, b) => b.subtotal - a.subtotal);
  return { stores, total: r2(ev.total), missing: ev.missing };
}

function* combinations(arr: number[], k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) {
    yield acc;
    return;
  }
  for (let i = start; i <= arr.length - (k - acc.length); i++) {
    acc.push(arr[i]);
    yield* combinations(arr, k, i + 1, acc);
    acc.pop();
  }
}

export function optimizeBasket(city: CityFile, basket: BasketItem[], opts: OptimizeOptions): OptimizeResult {
  const items = basket.filter((b) => b.qty > 0);
  const offers = buildOffers(city, items, opts);
  const allChains = [...new Set(offers.flatMap((m) => [...m.keys()]))];

  const ideal = evaluate(allChains, items, offers);
  const singleEv = allChains.map((c) => ({ chain: c, ev: evaluate([c], items, offers) }));

  // Кандидаты для перебора
  const k = opts.maxStores > 0 ? opts.maxStores : allChains.length;
  let candidates = allChains;
  if (allChains.length > 24) {
    const pick = new Set<number>();
    offers.forEach((m) =>
      [...m.values()]
        .sort((a, b) => a.price - b.price)
        .slice(0, 3)
        .forEach((o) => pick.add(o.chain)),
    );
    [...singleEv]
      .sort((a, b) => a.ev.missing.length - b.ev.missing.length || a.ev.total - b.ev.total)
      .slice(0, 8)
      .forEach((s) => pick.add(s.chain));
    candidates = [...pick].slice(0, 24);
  }

  let best: ReturnType<typeof evaluate> | null = null;
  let bestScore = [Infinity, Infinity];
  let evaluated = 0;
  if (opts.maxStores <= 0 && opts.extraStoreCost <= 0) {
    best = ideal; // без лимита и штрафа оптимум — каждый товар в самой дешёвой сети
    evaluated = 1;
  } else {
    const maxK = Math.min(k, candidates.length, 4);
    for (let size = 1; size <= maxK; size++) {
      for (const combo of combinations(candidates, size)) {
        evaluated++;
        const ev = evaluate(combo, items, offers);
        const score = [ev.missing.length, ev.total + opts.extraStoreCost * Math.max(0, ev.used.size - 1)];
        if (score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1] - 1e-9)) {
          bestScore = score;
          best = ev;
        }
      }
    }
  }
  const plan = best ? toPlan(items, best) : { stores: [], total: 0, missing: items.map((b) => b.productId) };

  // Сравнение с каждой сетью: переплата считается на тех товарах, что в ней есть
  const planCost = new Map<number, number>();
  plan.stores.forEach((s) => s.lines.forEach((l) => planCost.set(l.productId, l.cost)));
  const singles: SingleStoreResult[] = singleEv.map(({ chain, ev }) => {
    const lines = toPlan(items, ev).stores[0]?.lines ?? [];
    const same = lines.reduce((sum, l) => sum + (planCost.get(l.productId) ?? l.cost), 0);
    const total = r2(ev.total);
    return { chain, total, missing: ev.missing, planOnSameItems: r2(same), overpay: r2(total - same), lines };
  });
  singles.sort((a, b) => a.missing.length - b.missing.length || a.total - b.total);
  const bestSingle = singles[0] ?? null;

  let savings = bestSingle ? bestSingle.overpay : 0;
  if (Math.abs(savings) < 0.02) savings = 0; // погрешность округления по строкам
  const savingsPct = bestSingle && bestSingle.total > 0 ? (savings / bestSingle.total) * 100 : 0;

  return {
    plan,
    ideal: toPlan(items, ideal),
    singles,
    bestSingle,
    savings: r2(savings),
    savingsPct: Math.round(savingsPct * 10) / 10,
    evaluated,
  };
}
