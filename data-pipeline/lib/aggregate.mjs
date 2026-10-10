import { brandOf } from "./brands.mjs";

// Свёртка сырых строк в компактные JSON-файлы для приложения:
//   index.json            — дата, список городов
//   city/<ЕКАТТЕ>.json    — для каждой сети и группы товаров: минимальная обычная
//                           цена и минимальная цена с учётом акции (+ название товара и магазин)

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const round2 = (n) => Math.round(n * 100) / 100;

/** Обновляет «лучшую» запись (мин. обычная и мин. с акцией) для ключа */
function updBest(map, key, r) {
  let it = map.get(key);
  if (!it) map.set(key, (it = { reg: null, eff: null }));
  const eff = r.promo ?? r.price;
  if (!it.reg || r.price < it.reg.price) it.reg = { price: r.price, product: r.product, store: r.store, pack: r.packPrice ?? null };
  if (!it.eff || eff < it.eff.price)
    it.eff = {
      price: eff,
      regular: r.price,
      promo: r.promo != null,
      product: r.product,
      store: r.store,
      pack: r.packPrice != null ? (r.packPromo ?? r.packPrice) : null,
    };
}

/** [сеть, мин. обычная, товар, мин. с акцией, акция?, товар, магазин, (пачка обычн., пачка акц.)] */
function toTuple(ci, it) {
  const t = [ci, round2(it.reg.price), it.reg.product, round2(it.eff.price), it.eff.promo ? 1 : 0, it.eff.product, it.eff.store];
  if (it.reg.pack != null || it.eff.pack != null) t.push(round2(it.reg.pack ?? 0), round2(it.eff.pack ?? 0));
  return t;
}

// Супер оферти: скидка от 20% до 70% (больше — почти всегда ошибка в данных)
const DEAL_MIN = 0.2;
const DEAL_MAX = 0.7;
const DEALS_PER_CITY = 40;
const DEALS_PER_GROUP = 4;

/** Тип сети по ассортименту: супермаркет, аптека или прочее (дрогерия, duty free, строймаркет…) */
function chainKind(groupSet) {
  let food = 0, meds = 0;
  for (const g of groupSet) {
    if (g <= 77) food++;
    else if (g >= 86) meds++;
  }
  if (food >= 12) return "grocery";
  if (meds >= 3 && meds >= food) return "pharmacy";
  return "other";
}

export function aggregate(rows, { date, settlements, minChains = 2 }) {
  // 0. Тип каждой сети — по всему её ассортименту в стране
  const groupsByEik = new Map();
  for (const r of rows) {
    if (!groupsByEik.has(r.eik)) groupsByEik.set(r.eik, new Set());
    groupsByEik.get(r.eik).add(r.productId);
  }
  const kindByEik = new Map([...groupsByEik].map(([e, gs]) => [e, chainKind(gs)]));

  // 1. Отсев явных ошибок ввода: цена в 4+ раза ниже/выше национальной медианы группы.
  const byGroup = new Map();
  for (const r of rows) {
    if (!byGroup.has(r.productId)) byGroup.set(r.productId, []);
    byGroup.get(r.productId).push(r.price);
  }
  const med = new Map([...byGroup].map(([g, ps]) => [g, median(ps)]));
  let dropped = 0;
  const clean = rows.filter((r) => {
    const m = med.get(r.productId);
    const ok = r.price >= m / 4 && r.price <= m * 4 && (r.promo == null || r.promo >= m / 6);
    if (!ok) dropped++;
    return ok;
  });

  // 2. Группировка по городу → сети → группе товаров.
  const cities = new Map(); // ekatte → { chains: Map(eik → {name, stores:Set, items: Map(gid → best)}) }
  for (const r of clean) {
    let city = cities.get(r.ekatte);
    if (!city) cities.set(r.ekatte, (city = new Map()));
    // одна марка может подавать данные от нескольких фирм (два «ФАНТАСТИКО») — объединяем по названию
    const key = r.chain.toUpperCase();
    let ch = city.get(key);
    if (!ch) city.set(key, (ch = { name: r.chain, eik: r.eik, stores: new Set(), items: new Map(), brands: new Map(), deals: new Map() }));
    ch.stores.add(r.store);
    updBest(ch.items, r.productId, r);
    const brand = brandOf(r.productId, r.product, r.chain);
    if (brand) updBest(ch.brands, `${r.productId}|${brand}`, r);
    // кандидаты в супер оферти — по конкретному товару (берём реальные цены на полке)
    if (r.promo != null && r.productId <= 85) {
      const shelf = r.packPrice ?? r.price;
      const promo = r.packPromo ?? r.promo;
      const d = 1 - promo / shelf;
      if (d >= DEAL_MIN && d <= DEAL_MAX) {
        const dk = `${r.productId}|${r.product.toUpperCase()}`;
        const cur = ch.deals.get(dk);
        if (!cur) ch.deals.set(dk, { gid: r.productId, product: r.product, shelf, promo, d, stores: new Set([r.store]), brand });
        else {
          cur.stores.add(r.store);
          if (d > cur.d) Object.assign(cur, { shelf, promo, d });
        }
      }
    }
  }

  // 3. Сериализация.
  const index = { v: 1, date, generatedAt: new Date().toISOString(), source: "kolkostruva.bg (КЗП)", cities: [] };
  const files = {};
  for (const [ekatte, chainMap] of cities) {
    if (chainMap.size < minChains) continue;
    const chains = [...chainMap.entries()]
      .map(([, c]) => c)
      .sort((a, b) => b.items.size - a.items.size || a.name.localeCompare(b.name, "bg"));
    const items = {};
    let promoCount = 0;
    const brands = {};
    const dealPool = [];
    chains.forEach((c, ci) => {
      for (const [gid, it] of c.items) {
        (items[gid] ??= []).push(toTuple(ci, it));
        if (it.eff.promo) promoCount++;
      }
      for (const [k, it] of c.brands) {
        const [gid, brand] = k.split("|");
        ((brands[gid] ??= {})[brand] ??= []).push(toTuple(ci, it));
      }
      if (kindByEik.get(c.eik) === "grocery") for (const d of c.deals.values()) dealPool.push({ ci, ...d });
    });
    for (const g of Object.keys(items)) items[g].sort((a, b) => a[3] - b[3]);
    for (const g of Object.values(brands)) for (const list of Object.values(g)) list.sort((a, b) => a[3] - b[3]);

    // Топ скидок города: сначала самые большие, не больше DEALS_PER_GROUP на группу
    dealPool.sort((a, b) => b.d - a.d || b.shelf - b.promo - (a.shelf - a.promo));
    const perGroup = {};
    const deals = [];
    const seenDeal = new Set();
    for (const d of dealPool) {
      if (deals.length >= DEALS_PER_CITY) break;
      const sig = `${d.ci}|${d.gid}|${round2(d.shelf)}|${round2(d.promo)}`; // «большой/малый вакуум» с одной ценой — один оффер
      if (seenDeal.has(sig)) continue;
      seenDeal.add(sig);
      if ((perGroup[d.gid] = (perGroup[d.gid] ?? 0) + 1) > DEALS_PER_GROUP) continue;
      // [группа, сеть, товар, цена на полке, цена по акции, скидка %, магазинов, марка]
      deals.push([d.gid, d.ci, d.product, round2(d.shelf), round2(d.promo), Math.round(d.d * 100), d.stores.size, d.brand ?? ""]);
    }
    const [name, nameEn] = settlements[ekatte] ?? [`ЕКАТТЕ ${ekatte}`, ""];
    files[`city/${ekatte}.json`] = {
      v: 1,
      date,
      ekatte,
      name,
      nameEn,
      chains: chains.map((c) => ({ name: c.name, eik: c.eik, stores: c.stores.size, kind: kindByEik.get(c.eik) ?? "other" })),
      items,
      brands,
      deals,
    };
    index.cities.push({
      ekatte,
      name,
      nameEn,
      chains: chains.length,
      grocery: chains.filter((c) => kindByEik.get(c.eik) === "grocery").length,
      stores: chains.reduce((s, c) => s + c.stores.size, 0),
      groups: Object.keys(items).length,
      promos: promoCount,
    });
  }
  index.cities.sort((a, b) => b.stores - a.stores || a.name.localeCompare(b.name, "bg"));
  return { index, files, stats: { rows: rows.length, dropped, cities: index.cities.length } };
}
