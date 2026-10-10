// Тексты интерфейса на болгарском и английском.
// Чтобы добавить язык: скопируйте блок `en`, переведите и добавьте код в LANGS.

import { getLocales } from "expo-localization";
import type { Category, Product } from "./types";

export type Lang = "bg" | "en";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "bg", label: "Български" },
  { code: "en", label: "English" },
];

const bg = {
  appName: "Пазарко",
  loading: "зареждане…",
  error: "Грешка",
  // Кошница
  tabBasket: "Кошница",
  tabProducts: "Продукти",
  tabSavings: "Спестяване",
  tabSettings: "Настройки",
  chooseCity: "Изберете град",
  pricesOn: "Цени към {date}",
  chainsInCity: "{n} вериги в града",
  buildBasket: "Съберете кошница",
  buildBasketHint:
    "Добавете продукти — Пазарко ще намери в кои магазини какво е най-евтино и ще сравни с пазаруване само в един магазин.",
  pickProducts: "Изберете продукти",
  readyBaskets: "Готови кошници",
  nItems: "{n} продукта",
  take: "Вземи →",
  clear: "Изчисти",
  addProducts: "+ Добави продукти",
  findBest: "Намери изгодата",
  from: "от {price}",
  perKg: "/кг",
  chainsShort: "{n} вер.",
  notInCity: "няма в този град",
  city: "Град",
  done: "Готово",
  cityStats: "{chains} вериги · {stores} магазина · {promos} промоции",
  presetWeek: "Седмица за семейство",
  presetBreakfast: "Закуски",
  presetBbq: "Барбекю",
  // Продукти
  searchPlaceholder: "Търсене: мляко, сирене, банани…",
  all: "Всички",
  nothingFound: "Нищо не е намерено",
  noData: "няма данни",
  // Спестяване
  emptyBasket: "Кошницата е празна — добавете продукти и тук ще се появи най-добрият план за пазаруване.",
  toBasket: "Към кошницата",
  howManyStores: "Колко магазина сте готови да обиколите",
  oneStore: "1 магазин",
  anyNumber: "Без ограничение",
  optimalBasket: "Оптимална кошница",
  storesCount: "{n} маг.",
  savingsText: "Спестявате {amount} ({pct}%) спрямо пазаруване само в {chain} — най-изгодния единичен магазин (за същите продукти).",
  allInOne: "Най-изгодно е да купите всичко на едно място{chain}.",
  notFound: "Не намерихме в града: {list}",
  idealHint: "Без ограничение на магазините би излязло {total} — още {extra} спестяване, но в {n} магазина.",
  whatWhere: "Какво къде да купите",
  itemsAndStores: "{items} прод. · {stores} маг. в града",
  inStore: "в магазин: {store}",
  ifOneStore: "Ако купите всичко в един магазин",
  optimalPlan: "Оптимален план",
  missingOf: "няма {n} от {total} прод.",
  overpay: "+{amount} надплащане",
  same: "същото",
  compareNote:
    "Надплащането се смята върху продуктите, които ги има в магазина. Цената е най-ниската за веригата в града към датата на данните; в конкретен магазин може да се различава.",
  promo: "ПРОМО",
  qtyPcs: "{n} бр.",
  qtyKg: "{n} кг",
  // Настройки
  calc: "Изчисление",
  usePromo: "Отчитай промоции",
  usePromoSub: "Използвай промо цените, ако са по-ниски",
  storeCost: "Цена на допълнителен магазин",
  storeCostSub: "Колко струва за вас пътят до още един магазин. Планът няма да се раздробява заради стотинки.",
  hideMeds: "Скрий лекарствата",
  hideMedsSub: "Аптечните групи от списъка на КЗП",
  language: "Език",
  chainsInCityTitle: "Вериги в града",
  chainsHint: "Изключете веригите, в които не пазарувате — няма да влизат в плана.",
  chainSub: "{n} маг. · ЕИК {eik}",
  data: "Данни",
  source: "Източник: {source}",
  demoSource: "вградени демо данни",
  pricesDate: "Дата на цените: {date}",
  server: "Сървър: {url}",
  aboutData:
    "Цените се публикуват от КЗП на kolkostruva.bg (101 групи продукти от голямата потребителска кошница). Веригите с оборот над 10 млн. лв. са длъжни да подават цени всеки ден.",
  demoBanner: "Демо режим: веригите и цените са измислени. Свържете данни от kolkostruva.bg — вижте README.",
  forSize: "цена за {size}",
  pack: "опаковка {price}",
  onlyGrocery: "Само супермаркети",
  onlyGrocerySub: "Без аптеки, дрогерии, безмитни и строителни магазини",
  kindPharmacy: "аптека",
  kindOther: "не е супермаркет",
  unitG: "г",
  unitKg: "кг",
  unitMl: "мл",
  unitL: "л",
  unitPcs: "бр.",
  sizeNote: "За продукти в различни опаковки цената е преизчислена за една и съща опаковка (напр. 400 г), за да е честно сравнението.",
  tabDeals: "Оферти",
  dealsTitle: "Супер оферти",
  dealsHint: "Най-големите отстъпки днес в {city}. Цените са за опаковка на рафта.",
  dealsEmpty: "Днес няма големи отстъпки в този град.",
  dealStores: "{n} маг.",
  add: "Добави",
  added: "В кошницата",
  anyBrand: "Всяка марка",
  anyBrandSub: "най-евтиното от групата",
  chooseBrand: "Марка",
  brandFrom: "от {price} · {n} вер.",
  superDeal: "Супер оферта",
  superDealText: "{product} в {chain} — {price} ({pct}% по-евтино от избраната марка)",
  takeIt: "Вземи тази",
  showDeals: "Подсказвай супер оферти",
  showDealsSub: "Дори ако марката не е от любимите ви",
  premium: "Пазарко Premium",
  premiumSub: "Още повече спестявания и удобство",
  premiumSoon: "Скоро",
  premiumFree: "Безплатно завинаги: кошница, план в 1–2 магазина, сравнение на веригите, промоции и супер оферти.",
  premiumLocked: "Функция на Premium",
  close: "Затвори",
  inDev: "в разработка",
  pfMoreStores: "План в 3 магазина и без ограничение",
  pfBrandMode: "Любими марки и подсказки за супер оферти",
  pfSavedBaskets: "Няколко запазени кошници",
  pfPriceAlerts: "Известия за промоции на продукти от кошницата",
  pfPriceHistory: "История на цените",
  pfNearbyStores: "Най-близките магазини",
  ownBrand: "Собствена марка",
  ownBrandSub: "марката на самата верига (Clever, Акцент, Aro, Lidl…)",
  areaTitle: "Къде пазарувате",
  areaCity: "Целия град",
  areaMyStores: "Моите магазини",
  areaNear: "Близо до",
  areaNearMe: "📍 Моето местоположение",
  areaOrKvartal: "Или изберете квартал",
  radius: "Радиус",
  km: "{n} км",
  storesFound: "{n} магазина в района",
  storesSelected: "Избрани магазини: {n}",
  searchStores: "Търсене: улица, квартал, верига…",
  noGeoYet: "Координатите на магазините все още се подготвят. Дотогава изберете „Моите магазини“.",
  locDenied: "Няма разрешение за местоположение. Изберете квартал.",
  locating: "Определяне на местоположението…",
  myLocation: "моето местоположение",
  noStoresInArea: "Няма магазини в този район — увеличете радиуса или изберете други магазини.",
  areaDemo: "В демо режим изборът на магазини не е наличен.",
  areaHint: "Планът ще се смята само по тези магазини.",
  osmCredit: "Местоположения © участници в OpenStreetMap",
  apply: "Приложи",
  maxStores: "До {n} магазина",
  notFoundArea: "Няма в избраните магазини: {list}",
  forItems: "за {n} от {total} продукта",
  coverageHint: "С толкова магазина липсват {n} продукта, затова сумата е по-малка. Изберете {k}+ магазина, за да намерите всичко.",
};

type Dict = typeof bg;

const en: Dict = {
  appName: "Pazarko",
  loading: "loading…",
  error: "Error",
  tabBasket: "Basket",
  tabProducts: "Products",
  tabSavings: "Savings",
  tabSettings: "Settings",
  chooseCity: "Choose a city",
  pricesOn: "Prices as of {date}",
  chainsInCity: "{n} chains in the city",
  buildBasket: "Build your basket",
  buildBasketHint:
    "Add products — Pazarko will find which stores sell what for the least and compare it with doing all your shopping in one store.",
  pickProducts: "Pick products",
  readyBaskets: "Ready-made baskets",
  nItems: "{n} items",
  take: "Use →",
  clear: "Clear",
  addProducts: "+ Add products",
  findBest: "Find the best deal",
  from: "from {price}",
  perKg: "/kg",
  chainsShort: "{n} chains",
  notInCity: "not sold in this city",
  city: "City",
  done: "Done",
  cityStats: "{chains} chains · {stores} stores · {promos} promos",
  presetWeek: "Family week",
  presetBreakfast: "Breakfasts",
  presetBbq: "Barbecue",
  searchPlaceholder: "Search: milk, cheese, bananas…",
  all: "All",
  nothingFound: "Nothing found",
  noData: "no data",
  emptyBasket: "Your basket is empty — add products and the best shopping plan will appear here.",
  toBasket: "Go to basket",
  howManyStores: "How many stores will you visit",
  oneStore: "1 store",
  anyNumber: "No limit",
  optimalBasket: "Optimal basket",
  storesCount: "{n} stores",
  savingsText: "You save {amount} ({pct}%) compared with buying everything at {chain}, the best single store (for the same items).",
  allInOne: "It's cheapest to buy everything in one place{chain}.",
  notFound: "Not found in this city: {list}",
  idealHint: "With no store limit it would be {total} — another {extra} saved, but across {n} stores.",
  whatWhere: "What to buy where",
  itemsAndStores: "{items} items · {stores} stores in city",
  inStore: "at store: {store}",
  ifOneStore: "If you buy everything in one store",
  optimalPlan: "Optimal plan",
  missingOf: "missing {n} of {total} items",
  overpay: "+{amount} overpay",
  same: "same price",
  compareNote:
    "Overpay is counted on the items that store carries. Prices are the chain's lowest in the city on the data date; an individual store may differ.",
  promo: "PROMO",
  qtyPcs: "×{n}",
  qtyKg: "{n} kg",
  calc: "Calculation",
  usePromo: "Include promotions",
  usePromoSub: "Use promo prices when they are lower",
  storeCost: "Cost of an extra store",
  storeCostSub: "What a trip to one more store is worth to you. The plan won't split up just to save a few cents.",
  hideMeds: "Hide medicines",
  hideMedsSub: "Pharmacy groups from the CPC list",
  language: "Language",
  chainsInCityTitle: "Chains in the city",
  chainsHint: "Turn off chains you don't shop at — they won't be used in the plan.",
  chainSub: "{n} stores · UIC {eik}",
  data: "Data",
  source: "Source: {source}",
  demoSource: "built-in demo data",
  pricesDate: "Price date: {date}",
  server: "Server: {url}",
  aboutData:
    "Prices are published by Bulgaria's Consumer Protection Commission (CPC) on kolkostruva.bg — 101 product groups from the large consumer basket. Chains with turnover above BGN 10 million must report prices daily.",
  demoBanner: "Demo mode: chains and prices are fictional. Connect kolkostruva.bg data — see README.",
  forSize: "price per {size}",
  pack: "pack {price}",
  onlyGrocery: "Supermarkets only",
  onlyGrocerySub: "Exclude pharmacies, drugstores, duty free and DIY stores",
  kindPharmacy: "pharmacy",
  kindOther: "not a supermarket",
  unitG: "g",
  unitKg: "kg",
  unitMl: "ml",
  unitL: "L",
  unitPcs: "pcs",
  sizeNote: "For products sold in different pack sizes, prices are converted to the same pack (e.g. 400 g) so the comparison is fair.",
  tabDeals: "Deals",
  dealsTitle: "Super deals",
  dealsHint: "The biggest discounts today in {city}. Prices are per pack on the shelf.",
  dealsEmpty: "No big discounts in this city today.",
  dealStores: "{n} stores",
  add: "Add",
  added: "In basket",
  anyBrand: "Any brand",
  anyBrandSub: "the cheapest in the group",
  chooseBrand: "Brand",
  brandFrom: "from {price} · {n} chains",
  superDeal: "Super deal",
  superDealText: "{product} at {chain} — {price} ({pct}% cheaper than your brand)",
  takeIt: "Take this one",
  showDeals: "Suggest super deals",
  showDealsSub: "Even if the brand isn't one of your favourites",
  premium: "Pazarko Premium",
  premiumSub: "Even more savings and convenience",
  premiumSoon: "Coming soon",
  premiumFree: "Free forever: basket, 1–2 store plan, chain comparison, promotions and super deals.",
  premiumLocked: "Premium feature",
  close: "Close",
  inDev: "in development",
  pfMoreStores: "Plan across 3 stores or with no limit",
  pfBrandMode: "Favourite brands and super deal tips",
  pfSavedBaskets: "Several saved baskets",
  pfPriceAlerts: "Alerts when basket items go on promotion",
  pfPriceHistory: "Price history",
  pfNearbyStores: "Nearest stores",
  ownBrand: "Store brand",
  ownBrandSub: "the chain's own label (Clever, Akcent, Aro, Lidl…)",
  areaTitle: "Where you shop",
  areaCity: "Whole city",
  areaMyStores: "My stores",
  areaNear: "Near",
  areaNearMe: "📍 My location",
  areaOrKvartal: "Or pick a neighbourhood",
  radius: "Radius",
  km: "{n} km",
  storesFound: "{n} stores in the area",
  storesSelected: "Selected stores: {n}",
  searchStores: "Search: street, neighbourhood, chain…",
  noGeoYet: "Store locations are still being prepared. Meanwhile, use “My stores”.",
  locDenied: "No location permission. Pick a neighbourhood instead.",
  locating: "Finding your location…",
  myLocation: "my location",
  noStoresInArea: "No stores in this area — increase the radius or choose other stores.",
  areaDemo: "Store selection isn't available in demo mode.",
  areaHint: "The plan will use only these stores.",
  osmCredit: "Locations © OpenStreetMap contributors",
  apply: "Apply",
  maxStores: "Up to {n} stores",
  notFoundArea: "Not in your selected stores: {list}",
  forItems: "for {n} of {total} items",
  coverageHint: "With this many stores {n} items are missing, so the total is lower. Choose {k}+ stores to get everything.",
};

const DICTS: Record<Lang, Dict> = { bg, en };
export type TKey = keyof Dict;

export function deviceLang(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === "bg" ? "bg" : code === "en" ? "en" : "bg";
  } catch {
    return "bg";
  }
}

export function makeT(lang: Lang) {
  const d = DICTS[lang];
  return (key: TKey, params?: Record<string, string | number>) =>
    d[key].replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? ""));
}
export type T = ReturnType<typeof makeT>;

/** «400 г», «1 кг», «75 мл», «10 бр.» */
export function sizeLabel(ref: { unit: "kg" | "l" | "pcs"; size: number }, t: T, lang: Lang) {
  const fmt = (n: number) => (lang === "bg" ? String(n).replace(".", ",") : String(n));
  if (ref.unit === "pcs") return `${ref.size} ${t("unitPcs")}`;
  const small = ref.size < 1;
  const v = small ? Math.round(ref.size * 1000) : ref.size;
  const u = ref.unit === "kg" ? (small ? t("unitG") : t("unitKg")) : small ? t("unitMl") : t("unitL");
  return `${fmt(v)} ${u}`;
}

/** Подпись под названием: для групп с эталонной фасовкой — «цена за 400 г», иначе — детали из названия */
export function productDetail(p: Product, lang: Lang, t: T) {
  if (p.ref) return t("forSize", { size: sizeLabel(p.ref, t, lang) });
  return splitName(productName(p, lang), lang)[1];
}

/** Ключ собственной марки сети в данных */
export const OWN_BRAND = "@own";
export const brandLabel = (b: string, t: T) => (b === OWN_BRAND ? t("ownBrand") : b);

export const productName = (p: Product | undefined, lang: Lang) => (p ? (lang === "en" ? p.en : p.bg) : "?");
export const categoryName = (c: Category, lang: Lang) => (lang === "en" ? c.en : c.bg);

/** Короткое название + детали: «Прясно мляко от 2% до 3,6% 1 л» → [«Прясно мляко», «от 2% до 3,6% 1 л»] */
export function splitName(name: string, lang: Lang): [string, string] {
  const re = lang === "en" ? /^(.*?)(,?\s+(?:size|\d|\().*)$/ : /^(.*?)(,?\s+(?:от|размер|\d|\().*)$/;
  const m = name.match(re);
  if (!m || m[1].length < 3) return [name, ""];
  return [m[1].replace(/,$/, ""), m[2].replace(/^,?\s*/, "")];
}
