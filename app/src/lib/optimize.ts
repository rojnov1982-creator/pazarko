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
//
// Две цены (см. purchase()):
// - цена для сравнения — за эталонную фасовку группы (400 г сирене, 1 л мляко), как в данных КЗП;
// - стоимость покупки — сколько заплатишь на кассе: целое число упаковок × цена упаковки
//   (нужно 400 г, есть только 1 кг за 7,50 € → покупка 7,50 €). План, сравнение сетей и экономия — по стоимости покупки.
// Если размер упаковки не распознан, строка помечается approx («ориентировъчно»), размер не придумывается.
//
// Закреплённое предложение (BasketItem.pin) участвует только в своей сети и по своей цене (см. pins.ts).
//
// Брошюры (OptimizeOptions.brochure): действующее предложение брошюры с понятной фасовкой (rp) — ещё одна цена
// в своей сети, рядом с ценой КЗП; берётся та, где покупка дешевле. Акции «с карта» участвуют (у тех, кто следит
// за акциями, карты сетей есть); условные механики (купи 2, от суммы, код) — нет, у них rp не считается.

import { itemKey, pinStatus } from "./pins";
import type { BasketItem, CityFile, PriceTuple } from "./types";

/** Что нужно знать о группе товара, чтобы посчитать покупку */
export interface ItemMeta {
  byWeight: boolean;
  /** группы с разными фасовками: цена в данных — за эту фасовку */
  ref?: { unit: "kg" | "l" | "pcs"; size: number };
  /** группы с одной стандартной фасовкой («1 л», «1 кг») */
  std?: { unit: "kg" | "l" | "pcs"; size: number };
}

export interface OptimizeOptions {
  /** максимум разных сетей в плане; 0 = без ограничения */
  maxStores: number;
  /** учитывать акционные цены */
  usePromo: boolean;
  /** условная стоимость каждого дополнительного магазина, € */
  extraStoreCost: number;
  /** сети, которые пользователь исключил (индексы) */
  excludedChains?: number[];
  /** сведения о группах (вес / фасовка); без них цена × количество */
  meta?: (productId: number) => ItemMeta | undefined;
  /** сегодня (YYYY-MM-DD) — для сроков закреплённых акций */
  today?: string;
  /** действующие предложения брошюр для группы (и марки, если выбрана) — см. brochures.ts */
  brochure?: (productId: number, brand?: string) => BrochureCandidate[];
}

/** Предложение брошюры, готовое к сравнению с ценами КЗП */
export interface BrochureCandidate {
  /** индексы сетей города (в режиме района — все магазины сети) */
  chains: number[];
  id: string;
  name: string;
  /** цена за эталонную фасовку группы (или за кг) */
  price: number;
  /** цена упаковки по брошюре */
  packPrice: number;
  /** обычная цена за эталонную фасовку, если указана */
  regular?: number;
  card?: boolean;
  /** действует до (YYYY-MM-DD) */
  to: string;
  condition?: string;
}

export interface Offer {
  chain: number;
  /** цена для сравнения: за эталонную фасовку группы (или за кг) */
  price: number;
  regular: number;
  isPromo: boolean;
  product: string;
  store: string;
  /** реальная цена упаковки на полке, если известна */
  packPrice?: number;
  /** закреплённое пользователем предложение */
  pinned?: boolean;
  /** цена из брошюры (а не из данных КЗП) */
  brochure?: { id: string; to: string; card?: boolean; condition?: string };
}

export interface PlanLine {
  /** ключ позиции корзины (см. itemKey) */
  key: string;
  productId: number;
  /** количество в корзине: эталонные фасовки, кг или штуки */
  qty: number;
  offer: Offer;
  /** сколько упаковок купить (для весовых — нет) */
  packs?: number;
  /** размер одной упаковки в единицах группы (кг / л / шт.), если известен */
  packSize?: number;
  packUnit?: "kg" | "l" | "pcs";
  /** стоимость покупки, € */
  cost: number;
  /** размер упаковки не распознан — стоимость ориентировочная */
  approx?: boolean;
}

export interface StorePlan {
  chain: number;
  lines: PlanLine[];
  subtotal: number;
}

export interface Plan {
  stores: StorePlan[];
  total: number;
  /** ключи позиций, которых нет ни в одной выбранной сети (или закреплённая акция недоступна) */
  missing: string[];
  /** есть строки с ориентировочной стоимостью */
  approx: boolean;
}

export interface SingleStoreResult {
  chain: number;
  total: number;
  missing: string[];
  /** стоимость оптимального плана на тех же позициях, что есть в этой сети */
  planOnSameItems: number;
  /** сколько переплата при покупке только здесь (на сопоставимых позициях) */
  overpay: number;
  lines: PlanLine[];
}

export interface OptimizeResult {
  plan: Plan;
  /** следующие по цене варианты с другим набором магазинов (до 2): «вариант 2», «вариант 3» */
  alternatives: Plan[];
  /** абсолютный минимум (каждая позиция в самой дешёвой сети, без лимита магазинов) */
  ideal: Plan;
  singles: SingleStoreResult[];
  bestSingle: SingleStoreResult | null;
  /** экономия плана против лучшей одной сети (на сопоставимых позициях) */
  savings: number;
  savingsPct: number;
  evaluated: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
/** до 20% меньше нужного — всё ещё одна упаковка (380 г вместо 400 г) */
const PACK_SLACK = 0.2;

/** Стоимость покупки позиции у этого предложения: упаковки × цена упаковки (или вес × цена за кг) */
export function purchase(o: Offer, qty: number, m?: ItemMeta): Omit<PlanLine, "key" | "productId" | "qty" | "offer"> {
  if (o.pinned) return { cost: qty * o.price, packs: m?.byWeight ? undefined : qty };
  if (m?.byWeight) return { cost: qty * o.price };
  const ref = m?.ref ?? m?.std;
  if (ref) {
    if (o.packPrice && o.packPrice > 0 && o.price > 0) {
      const ratio = o.packPrice / o.price; // упаковка в эталонных фасовках
      const packs = Math.max(1, Math.ceil(qty / ratio - PACK_SLACK + 1e-9));
      return { cost: packs * o.packPrice, packs, packSize: Math.round(ratio * ref.size * 1000) / 1000, packUnit: ref.unit };
    }
    return { cost: qty * o.price, packs: Math.ceil(qty), approx: true }; // размер не распознан
  }
  return { cost: qty * o.price, packs: Math.ceil(qty) };
}

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

type Choice = { offer: Offer; line: ReturnType<typeof purchase> };

/** choices[i] — варианты покупки i-й позиции, по сетям */
function buildChoices(city: CityFile, basket: BasketItem[], opts: OptimizeOptions) {
  const excluded = new Set(opts.excludedChains ?? []);
  const today = opts.today ?? "";
  return basket.map((b) => {
    const m = new Map<number, Choice>();
    const meta = opts.meta?.(b.productId);
    if (b.pin) {
      const st = pinStatus(b.pin, today, city, excluded);
      if (st.status !== "now") return m; // истекла / ещё не началась / сети нет — не подменяем
      for (const c of st.chains) {
        const offer: Offer = {
          chain: c,
          price: b.pin.price,
          regular: b.pin.regular ?? b.pin.price,
          isPromo: true,
          product: b.pin.name,
          store: "",
          packPrice: b.pin.price,
          pinned: true,
        };
        m.set(c, { offer, line: purchase(offer, b.qty, { byWeight: !!b.pin.perKg }) });
      }
      return m;
    }
    const list = b.brand ? city.brands?.[String(b.productId)]?.[b.brand] ?? [] : city.items[String(b.productId)] ?? [];
    for (const t of list) {
      if (excluded.has(t[0])) continue;
      const offer = toOffer(t, opts.usePromo);
      m.set(t[0], { offer, line: purchase(offer, b.qty, meta) });
    }
    // брошюры: в своей сети заменяют цену КЗП, если покупка выходит дешевле
    if (opts.usePromo && opts.brochure) {
      for (const bc of opts.brochure(b.productId, b.brand)) {
        for (const c of bc.chains) {
          if (excluded.has(c)) continue;
          const offer: Offer = {
            chain: c,
            price: bc.price,
            regular: bc.regular ?? bc.price,
            isPromo: true,
            product: bc.name,
            store: "",
            packPrice: bc.packPrice,
            brochure: { id: bc.id, to: bc.to, card: bc.card, condition: bc.condition },
          };
          const line = purchase(offer, b.qty, meta);
          const cur = m.get(c);
          if (!cur || line.cost < cur.line.cost - 1e-9) m.set(c, { offer, line });
        }
      }
    }
    return m;
  });
}

function evaluate(chains: number[], basket: BasketItem[], choices: Map<number, Choice>[]) {
  let total = 0;
  const missing: string[] = [];
  const choice: (Choice | null)[] = [];
  for (let i = 0; i < basket.length; i++) {
    let best: Choice | null = null;
    for (const c of chains) {
      const o = choices[i].get(c);
      if (o && (!best || o.line.cost < best.line.cost)) best = o;
    }
    choice.push(best);
    if (best) total += best.line.cost;
    else missing.push(itemKey(basket[i]));
  }
  const used = new Set(choice.filter(Boolean).map((o) => o!.offer.chain));
  return { total, missing, choice, used };
}

function toPlan(basket: BasketItem[], ev: ReturnType<typeof evaluate>): Plan {
  const byChain = new Map<number, StorePlan>();
  let approx = false;
  ev.choice.forEach((o, i) => {
    if (!o) return;
    let sp = byChain.get(o.offer.chain);
    if (!sp) byChain.set(o.offer.chain, (sp = { chain: o.offer.chain, lines: [], subtotal: 0 }));
    if (o.line.approx) approx = true;
    sp.lines.push({ key: itemKey(basket[i]), productId: basket[i].productId, qty: basket[i].qty, offer: o.offer, ...o.line, cost: r2(o.line.cost) });
    sp.subtotal += o.line.cost;
  });
  const stores = [...byChain.values()]
    .map((s) => ({ ...s, subtotal: r2(s.subtotal) }))
    .sort((a, b) => b.subtotal - a.subtotal);
  return { stores, total: r2(ev.total), missing: ev.missing, approx };
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
  const choices = buildChoices(city, items, opts);
  const allChains = [...new Set(choices.flatMap((m) => [...m.keys()]))];

  const ideal = evaluate(allChains, items, choices);
  const singleEv = allChains.map((c) => ({ chain: c, ev: evaluate([c], items, choices) }));

  // Кандидаты для перебора
  const k = opts.maxStores > 0 ? opts.maxStores : allChains.length;
  let candidates = allChains;
  if (allChains.length > 24) {
    const pick = new Set<number>();
    choices.forEach((m) =>
      [...m.values()]
        .sort((a, b) => a.line.cost - b.line.cost)
        .slice(0, 3)
        .forEach((o) => pick.add(o.offer.chain)),
    );
    [...singleEv]
      .sort((a, b) => a.ev.missing.length - b.ev.missing.length || a.ev.total - b.ev.total)
      .slice(0, 8)
      .forEach((s) => pick.add(s.chain));
    candidates = [...pick].slice(0, 24);
  }

  // Перебор: храним 3 лучших варианта с РАЗНЫМ набором реально использованных сетей
  type Ev = ReturnType<typeof evaluate>;
  const better = (a: number[], b: number[]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1] - 1e-9);
  const top: { key: string; score: number[]; ev: Ev }[] = [];
  const consider = (ev: Ev) => {
    if (!ev.used.size) return;
    const key = [...ev.used].sort((a, b) => a - b).join(",");
    const score = [ev.missing.length, ev.total + opts.extraStoreCost * Math.max(0, ev.used.size - 1)];
    const same = top.findIndex((x) => x.key === key);
    if (same >= 0) {
      if (!better(score, top[same].score)) return;
      top.splice(same, 1);
    }
    top.push({ key, score, ev });
    top.sort((a, b) => (better(a.score, b.score) ? -1 : better(b.score, a.score) ? 1 : 0));
    if (top.length > 3) top.length = 3;
  };
  let evaluated = 0;
  const unlimited = opts.maxStores <= 0 && opts.extraStoreCost <= 0;
  const maxK = Math.min(k, candidates.length, 4);
  for (let size = 1; size <= maxK; size++) {
    for (const combo of combinations(candidates, size)) {
      evaluated++;
      consider(evaluate(combo, items, choices));
    }
  }
  // без лимита и штрафа оптимум — каждый товар в самой дешёвой сети (может быть больше 4 магазинов)
  if (unlimited) consider(ideal);
  const best: Ev | null = unlimited ? ideal : top[0]?.ev ?? null;
  const bestKey = best ? [...best.used].sort((a, b) => a - b).join(",") : "";
  const plan = best ? toPlan(items, best) : { stores: [], total: 0, missing: items.map(itemKey), approx: false };
  const alternatives = top
    .filter((x) => x.key !== bestKey)
    .slice(0, 2)
    .map((x) => toPlan(items, x.ev));

  // Сравнение с каждой сетью: переплата считается на тех товарах, что в ней есть
  const planCost = new Map<string, number>();
  plan.stores.forEach((s) => s.lines.forEach((l) => planCost.set(l.key, l.cost)));
  const singles: SingleStoreResult[] = singleEv.map(({ chain, ev }) => {
    const lines = toPlan(items, ev).stores[0]?.lines ?? [];
    const same = lines.reduce((sum, l) => sum + (planCost.get(l.key) ?? l.cost), 0);
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
    alternatives,
    ideal: toPlan(items, ideal),
    singles,
    bestSingle,
    savings: r2(savings),
    savingsPct: Math.round(savingsPct * 10) / 10,
    evaluated,
  };
}
