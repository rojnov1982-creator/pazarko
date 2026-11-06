// Закреплённые предложения: пользователь выбрал конкретную акцию (из брошюры или «Супер оферти» дня).
// План берёт именно её — в этой сети и по этой цене. Если акция закончилась, ещё не началась или сети
// нет в районе, товар НЕ подменяется молча: план показывает причину и предлагает «Разреши замяна».

import type {
  BasketItem,
  BrochureFile,
  BrochureOffer,
  CityFile,
  DealTuple,
  PinnedOffer,
} from "./types";

const letters = (s: string) =>
  s
    .toUpperCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "");

/** Ключ позиции корзины: закреплённые предложения не сливаются с обычным товаром той же группы */
export const itemKey = (b: BasketItem) =>
  b.pin
    ? `pin:${b.pin.id}`
    : b.fav
      ? `fav:${b.fav}`
      : b.id
        ? `c:${b.id}`
        : `g:${b.productId}`;

/** Позиция без цены: своя строка или любимый продукт без группы КЗП — в расчёт плана не идёт */
export const isUnpriced = (b: BasketItem) => !b.pin && !(b.productId > 0);

export type PinStatus = "now" | "soon" | "expired" | "unavailable";

/** Индексы сетей города, к которым относится предложение (в режиме района — все магазины этой сети) */
export function pinChains(city: CityFile | null, pin: PinnedOffer): number[] {
  if (!city) return [];
  const keys = pin.match.map(letters).filter(Boolean);
  const out: number[] = [];
  city.chains.forEach(
    (c, i) => keys.some((k) => letters(c.name).includes(k)) && out.push(i),
  );
  return out;
}

/**
 * Можно ли купить закреплённое предложение сегодня.
 * Брошюра — по сроку действия. «Супер оферта» КЗП — пока она есть в данных города (дата данных меняется каждый день).
 */
export function pinStatus(
  pin: PinnedOffer,
  today: string,
  city: CityFile | null,
  excluded: Set<number>,
): { status: PinStatus; chains: number[] } {
  if (pin.source === "brochure") {
    if (pin.to && pin.to < today) return { status: "expired", chains: [] };
    if (pin.from && pin.from > today) return { status: "soon", chains: [] };
  }
  const chains = pinChains(city, pin).filter((i) => !excluded.has(i));
  if (pin.source === "kzp" && city && pin.to && city.date > pin.to) {
    // новые данные: оферта ещё действует, только если она снова в списке «Супер оферти» этой сети
    const still = (city.deals ?? []).some(
      (d) => d[2] === pin.name && chains.includes(d[1]),
    );
    if (!still) return { status: "expired", chains: [] };
  }
  if (!chains.length) return { status: "unavailable", chains: [] };
  return { status: "now", chains };
}

/** Простой устойчивый хеш (для предложений без готового идентификатора) */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

/** Предложение из брошюры → закрепление */
/** «Мандарини кг», «Свинско каре кг»: цена в брошюре — за 1 кг */
export const isPerKgOffer = (o: BrochureOffer) =>
  !!o.u &&
  o.u.endsWith("/kg") &&
  o.p != null &&
  Math.abs(Number(o.u.split("/")[0]) - o.p) < 0.005;

export function pinFromBrochure(
  o: BrochureOffer,
  bro: BrochureFile,
): PinnedOffer {
  const ch = bro.chains[o.c];
  // цена за 1 кг — количество в корзине в кг
  const perKg = isPerKgOffer(o);
  return {
    id: o.i ?? hash([ch?.name, o.f, o.t, o.n, o.p].join("|")),
    source: "brochure",
    name: o.n,
    chain: ch?.name ?? "",
    match: ch?.match ?? [ch?.name ?? ""],
    brand: o.b,
    price: o.p ?? 0,
    regular: o.r,
    perKg: perKg || undefined,
    unitPrice: o.u,
    from: o.f,
    to: o.t,
    card: o.k ? true : undefined,
    condition: o.w,
  };
}

/** «Супер оферта» дня из данных КЗП → закрепление (действует, пока есть в данных) */
export function pinFromDeal(
  d: DealTuple,
  city: CityFile,
  byWeight: boolean,
): PinnedOffer {
  const [, ci, product, shelf, promo, , , brand] = d;
  const chain = city.chains[ci];
  return {
    id: "kzp-" + hash([chain?.eik, d[0], product].join("|")),
    source: "kzp",
    name: product,
    chain: chain?.name ?? "",
    match: [chain?.name ?? ""],
    brand: brand || undefined,
    price: promo,
    regular: shelf,
    perKg: byWeight || undefined,
    from: city.date,
    to: city.date,
  };
}
