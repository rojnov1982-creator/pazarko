// Форматы данных, которые готовит data-pipeline/ingest.mjs

export interface Category {
  id: number;
  bg: string;
  en: string;
}

export interface Product {
  id: number;
  cat: number;
  bg: string;
  en: string;
  /** продаётся на вес (цена за 1 кг) */
  byWeight: boolean;
  /** для групп с разными фасовками: цены приведены к этой фасовке */
  ref?: { unit: "kg" | "l" | "pcs"; size: number };
  /** в группе можно выбрать марку */
  hasBrands?: boolean;
  /** стандартная упаковка группы с одной фасовкой («1 л», «1 кг»); цены в данных — за неё */
  std?: { unit: "kg" | "l" | "pcs"; size: number };
}

export interface ProductsFile {
  categories: Category[];
  products: Product[];
}

export interface CitySummary {
  ekatte: string;
  name: string;
  nameEn: string;
  chains: number;
  /** из них супермаркетов */
  grocery?: number;
  stores: number;
  groups: number;
  promos: number;
}

export interface IndexFile {
  v: number;
  date: string;
  generatedAt: string;
  source: string;
  cities: CitySummary[];
}

/**
 * [индекс сети, мин. обычная цена, товар, мин. цена с акцией, 1=акция, товар, магазин,
 *  цена пачки (обычная)?, цена пачки (с акцией)?]
 * Для групп с разными фасовками цены приведены к эталонной фасовке, а цена пачки — реальная цена на полке.
 */
export type PriceTuple = [
  number,
  number,
  string,
  number,
  0 | 1,
  string,
  string,
  number?,
  number?,
];

export type ChainKind = "grocery" | "pharmacy" | "other";

export interface ChainInfo {
  name: string;
  eik: string;
  stores: number;
  kind?: ChainKind;
  /** в режиме «район»: конкретный магазин */
  sid?: string;
  label?: string;
}

/** [id, индекс сети, название/адрес, широта?, долгота?] */
export type StoreTuple = [string, number, string, number?, number?];

/** Файл цен одного магазина: те же кортежи, индекс сети = 0 */
export interface StoreFile {
  items: Record<string, PriceTuple[]>;
  brands?: Record<string, Record<string, PriceTuple[]>>;
}

export type Area =
  | { mode: "city" }
  | { mode: "stores"; ids: string[] }
  | { mode: "near"; lat: number; lon: number; radiusKm: number; label: string };

export interface CityFile {
  v: number;
  date: string;
  ekatte: string;
  name: string;
  nameEn: string;
  chains: ChainInfo[];
  items: Record<string, PriceTuple[]>;
  /** цены по маркам: группа → марка → сети */
  brands?: Record<string, Record<string, PriceTuple[]>>;
  /** супер оферти города */
  deals?: DealTuple[];
  /** магазины-супермаркеты города */
  stores?: StoreTuple[];
  /** кварталы: [название, широта, долгота] */
  areas?: [string, number, number][];
}

/** [группа, сеть, товар, цена на полке, цена по акции, скидка %, магазинов, марка] */
export type DealTuple = [
  number,
  number,
  string,
  number,
  number,
  number,
  number,
  string,
];

/**
 * Конкретное предложение, закреплённое пользователем (акция из брошюры или «Супер оферта» дня).
 * План берёт именно его — в этой сети и по этой цене — и не подменяет другим товаром.
 */
export interface PinnedOffer {
  /** устойчивый идентификатор предложения */
  id: string;
  source: "brochure" | "kzp";
  /** название товара, как в брошюре / данных КЗП */
  name: string;
  /** сеть, как в источнике */
  chain: string;
  /** как искать сеть среди сетей КЗП (заглавные буквы без пробелов) */
  match: string[];
  brand?: string;
  /** цена одной упаковки (или 1 кг, если perKg) */
  price: number;
  regular?: number;
  /** цена за кг: количество в корзине — в кг */
  perKg?: boolean;
  /** цена за единицу для справки: «2,36 €/кг» */
  unitPrice?: string;
  /** действует с / по (YYYY-MM-DD); для КЗП — дата данных */
  from?: string;
  to?: string;
  /** только с картой / приложением сети */
  card?: boolean;
  /** условие из брошюры (1+1, от суммы, не во всех магазинах) */
  condition?: string;
}

export interface BasketItem {
  productId: number;
  qty: number;
  /** выбранная марка; нет — любая марка (самое дешёвое) */
  brand?: string;
  /** закреплённое предложение; productId — группа КЗП (0, если группы нет) */
  pin?: PinnedOffer;
  /** любимый продукт (Favorite.id): в брошюрах подходят только предложения со всеми словами `words` */
  fav?: string;
  words?: string[];
  /** своя строка без цены («Тоалетна хартия») или любимый без группы КЗП; id — для ключа */
  name?: string;
  id?: string;
}

/** Брошюры сетей (data-pipeline/brochures.mjs → brochures.json) */
export interface BrochureOffer {
  /** устойчивый идентификатор (хеш сети, срока, названия и цены) */
  i?: string;
  /** индекс сети в BrochureFile.chains */
  c: number;
  /** действует с / по (YYYY-MM-DD) */
  f: string;
  t: string;
  /** индекс вида товара в BrochureFile.types */
  y: number;
  /** раздел брошюры: 1–12 храни и напитки, 13 химия, 15 животни, 16–17 дом и техника */
  a?: number;
  /** группа КЗП (= id продукта) */
  g?: number;
  b?: string;
  /** собствена марка */
  o?: 1;
  n: string;
  /** цена по предложению */
  p?: number;
  /** цена до намалението */
  r?: number;
  /** отстъпка, % */
  d?: number;
  /** цена за единица: "2.36/kg" */
  u?: string;
  /** цена за еталонната опаковка на групата (за сравнение с цената в плана) */
  rp?: number;
  /** само с карта / приложение на веригата */
  k?: 1;
  /** условна механика (купи 2, от сума, код) — не участва в сравнението */
  m?: string;
  /** условие от брошурата */
  w?: string;
}

export interface BrochureFile {
  v: number;
  generatedAt: string;
  today: string;
  chains: { name: string; match: string[] }[];
  types: string[];
  offers: BrochureOffer[];
}

/** Продукт из истории брошюр (все разобранные недели): последняя акция и сколько недель встречался */
export interface BrochureHistoryItem {
  c: number;
  n: string;
  b?: string;
  g?: number;
  a?: number;
  /** последняя акция: с / до */
  f: string;
  t: string;
  p?: number;
  r?: number;
  u?: string;
  k?: 1;
  /** в скольких неделях был в брошюрах */
  w: number;
}

export interface BrochureHistory {
  v: number;
  generatedAt: string;
  chains: { name: string; match: string[] }[];
  items: BrochureHistoryItem[];
}
