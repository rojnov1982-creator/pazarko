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
export type PriceTuple = [number, number, string, number, 0 | 1, string, string, number?, number?];

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
export type DealTuple = [number, number, string, number, number, number, number, string];

export interface BasketItem {
  productId: number;
  qty: number;
  /** выбранная марка; нет — любая марка (самое дешёвое) */
  brand?: string;
}
