// Брошюры в расчёте плана: действующее предложение с понятной фасовкой конкурирует с ценой КЗП в своей сети.
import { test } from "node:test";
import assert from "node:assert/strict";
import { brochureCandidates, brochureLookup } from "../src/lib/brochures";
import { optimizeBasket, type ItemMeta } from "../src/lib/optimize";
import type { BrochureFile, CityFile } from "../src/lib/types";

// Группа 9 — сирене, эталон 400 г; группа 61 — картофи на вес
const meta = (id: number): ItemMeta | undefined =>
  id === 9 ? { byWeight: false, ref: { unit: "kg", size: 0.4 } } : id === 61 ? { byWeight: true } : undefined;

const city = {
  v: 1,
  date: "2026-11-06",
  ekatte: "68134",
  name: "гр. София",
  nameEn: "Sofia",
  chains: [
    { name: "КАУФЛАНД БЪЛГАРИЯ ЕООД ЕНД КО КД", eik: "1", stores: 3 },
    { name: "ЛИДЛ БЪЛГАРИЯ ЕООД ЕНД КО КД", eik: "2", stores: 3 },
  ],
  items: {
    "9": [
      [0, 4.0, "Сирене К 400 г", 4.0, 0, "Сирене К 400 г", "", 4.0, 4.0],
      [1, 4.2, "Сирене Л 400 г", 4.2, 0, "Сирене Л 400 г", "", 4.2, 4.2],
    ],
    "61": [[0, 1.2, "Картофи", 1.2, 0, "Картофи", ""]],
  },
  deals: [],
} as unknown as CityFile;

const offer = (o: Partial<BrochureFile["offers"][number]>) => ({ c: 1, f: "2026-11-03", t: "2026-11-09", y: 0, n: "Сирене Pilos 400 г", ...o });
const bro: BrochureFile = {
  v: 1,
  generatedAt: "",
  today: "2026-11-06",
  chains: [
    { name: "Kaufland", match: ["КАУФЛАНД"] },
    { name: "Lidl", match: ["ЛИДЛ"] },
  ],
  types: [""],
  offers: [
    offer({ i: "lidl-cheese", g: 9, p: 2.99, r: 4.99, rp: 2.99, k: 1, b: "Pilos" }), // с карта — участвует
    offer({ i: "lidl-cheese-cond", g: 9, p: 1.5, rp: 1.5, m: "multibuy" }), // условная механика — нет
    offer({ i: "lidl-old", g: 9, p: 1.0, rp: 1.0, f: "2026-10-20", t: "2026-10-26" }), // истекла — нет
    offer({ i: "lidl-soon", g: 9, p: 1.0, rp: 1.0, f: "2026-11-10", t: "2026-11-16" }), // ещё не началась — нет
    offer({ c: 0, i: "kaufland-potato", g: 61, n: "Картофи кг", p: 0.69, rp: 0.69 }),
  ],
};
const base = { maxStores: 0, usePromo: true, extraStoreCost: 0, meta, today: "2026-11-06" };
const brochure = brochureLookup(brochureCandidates(bro, city, "2026-11-06"));

test("брошюра дешевле КЗП — план берёт её (акция «с карта» участвует), условная/истёкшая/будущая — нет", () => {
  const plan = optimizeBasket(city, [{ productId: 9, qty: 1 }], { ...base, brochure }).plan;
  assert.equal(plan.total, 2.99);
  const line = plan.stores[0].lines[0];
  assert.equal(plan.stores[0].chain, 1);
  assert.equal(line.offer.brochure?.id, "lidl-cheese");
  assert.equal(line.offer.brochure?.card, true);
  assert.equal(line.packs, 1);
});

test("без брошюр — как раньше, по ценам КЗП", () => {
  const plan = optimizeBasket(city, [{ productId: 9, qty: 1 }], base).plan;
  assert.equal(plan.total, 4.0);
  assert.equal(plan.stores[0].lines[0].offer.brochure, undefined);
});

test("весовой товар из брошюры — по весу; «акции изключени» — брошюры не участват", () => {
  const plan = optimizeBasket(city, [{ productId: 61, qty: 2 }], { ...base, brochure }).plan;
  assert.equal(plan.total, 1.38);
  const noPromo = optimizeBasket(city, [{ productId: 61, qty: 2 }], { ...base, brochure, usePromo: false }).plan;
  assert.equal(noPromo.total, 2.4);
});

test("выбранная марка: брошюра другой марки не подставляется", () => {
  const other = optimizeBasket(city, [{ productId: 9, qty: 1, brand: "ВЕРЕЯ" }], { ...base, brochure }).plan;
  assert.equal(other.stores.length, 0); // в КЗП нет цен марки ВЕРЕЯ, брошюра — Pilos
  const same = brochure(9, "PILOS");
  assert.equal(same.length, 1);
});

test("сеть исключена — её брошюра не участвует", () => {
  const plan = optimizeBasket(city, [{ productId: 9, qty: 1 }], { ...base, brochure, excludedChains: [1] }).plan;
  assert.equal(plan.total, 4.0);
});
