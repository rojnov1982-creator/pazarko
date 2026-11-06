// Цена покупки (упаковки), закреплённые предложения, совместимость старых корзин.
import { test } from "node:test";
import assert from "node:assert/strict";
import { optimizeBasket, purchase, type ItemMeta } from "../src/lib/optimize";
import { itemKey, pinStatus } from "../src/lib/pins";
import type { BasketItem, CityFile, PinnedOffer } from "../src/lib/types";

// Группа 9 — «Сирене пакетирано», эталон 400 г; группа 61 — картофи на вес; группа 35 — ориз, стандарт 1 кг
const meta = (id: number): ItemMeta | undefined =>
  id === 9 ? { byWeight: false, ref: { unit: "kg", size: 0.4 } } : id === 61 ? { byWeight: true } : id === 35 ? { byWeight: false, std: { unit: "kg", size: 1 } } : undefined;

// A: только упаковка 1 кг за 7,50 € (за 400 г выходит 3,00 €); B: упаковка 400 г за 4,00 €
const city = {
  v: 1,
  date: "2026-11-06",
  ekatte: "68134",
  name: "гр. София",
  nameEn: "Sofia",
  chains: [
    { name: "Верига А", eik: "1", stores: 3 },
    { name: "Верига Б", eik: "2", stores: 3 },
    { name: "Лидл България", eik: "3", stores: 3 },
  ],
  items: {
    "9": [
      [0, 3.0, "Сирене А 1 кг", 3.0, 0, "Сирене А 1 кг", "", 7.5, 7.5],
      [1, 4.0, "Сирене Б 400 г", 4.0, 0, "Сирене Б 400 г", "", 4.0, 4.0],
    ],
    "61": [[0, 1.2, "Картофи", 1.2, 0, "Картофи", ""], [1, 1.0, "Картофи", 1.0, 0, "Картофи", ""]],
    "35": [[0, 2.0, "Ориз", 2.0, 0, "Ориз", ""]],
  },
  deals: [],
} as unknown as CityFile;
const opts = { maxStores: 0, usePromo: true, extraStoreCost: 0, meta, today: "2026-11-06" };

test("контрольный пример: нужно 400 г, есть только 1 кг за 7,50 € — покупка 7,50 €, не 3 €", () => {
  const r = purchase({ chain: 0, price: 3.0, regular: 3.0, isPromo: false, product: "", store: "", packPrice: 7.5 }, 1, meta(9));
  assert.equal(r.cost, 7.5);
  assert.equal(r.packs, 1);
  assert.equal(r.packSize, 1);
  // и план выбирает упаковку 400 г за 4,00 €, хотя «цена за 400 г» у А ниже
  const plan = optimizeBasket(city, [{ productId: 9, qty: 1 }], opts).plan;
  assert.equal(plan.total, 4.0);
  assert.equal(plan.stores[0].chain, 1);
});

test("упаковки: 1,2 кг сирене из пачек по 1 кг — 2 пачки; 380 г вместо 400 г — одна", () => {
  const A = { chain: 0, price: 3.0, regular: 3.0, isPromo: false, product: "", store: "", packPrice: 7.5 };
  assert.equal(purchase(A, 3, meta(9)).packs, 2); // 3 × 400 г = 1,2 кг
  const small = { chain: 0, price: 4.0, regular: 4.0, isPromo: false, product: "", store: "", packPrice: 3.8 }; // 380 г
  assert.equal(purchase(small, 1, meta(9)).packs, 1);
});

test("весовой товар считается по весу; неизвестная фасовка — ориентировочно", () => {
  const plan = optimizeBasket(city, [{ productId: 61, qty: 1.5 }], opts).plan;
  assert.equal(plan.total, 1.5);
  assert.equal(plan.approx, false);
  const rice = optimizeBasket(city, [{ productId: 35, qty: 1 }], opts).plan;
  assert.equal(rice.approx, true);
  assert.equal(rice.stores[0].lines[0].approx, true);
});

const pin = (over: Partial<PinnedOffer> = {}): PinnedOffer => ({
  id: "x1",
  source: "brochure",
  name: "Сирене ЛИДЛ акция 400 г",
  chain: "Lidl",
  match: ["ЛИДЛ", "LIDL"],
  price: 5.0,
  from: "2026-11-02",
  to: "2026-11-08",
  ...over,
});

test("закреплённая акция: план берёт именно её сеть и цену, даже если в другой сети дешевле", () => {
  const plan = optimizeBasket(city, [{ productId: 9, qty: 1, pin: pin() }], opts).plan;
  assert.equal(plan.stores.length, 1);
  assert.equal(plan.stores[0].chain, 2); // Лидл
  assert.equal(plan.total, 5.0);
  assert.equal(plan.stores[0].lines[0].offer.product, "Сирене ЛИДЛ акция 400 г");
});

test("истёкшая и будущая акции не учитываются сегодня и не подменяются молча", () => {
  const expired = optimizeBasket(city, [{ productId: 9, qty: 1, pin: pin({ to: "2026-11-05" }) }], opts).plan;
  assert.deepEqual(expired.missing, ["pin:x1"]);
  const soon = optimizeBasket(city, [{ productId: 9, qty: 1, pin: pin({ from: "2026-11-10", to: "2026-11-16" }) }], opts).plan;
  assert.deepEqual(soon.missing, ["pin:x1"]);
  assert.equal(pinStatus(pin({ to: "2026-11-05" }), "2026-11-06", city, new Set()).status, "expired");
  assert.equal(pinStatus(pin({ from: "2026-11-10" }), "2026-11-06", city, new Set()).status, "soon");
  assert.equal(pinStatus(pin(), "2026-11-06", city, new Set([2])).status, "unavailable");
});

test("закреплённая акция и обычный товар той же группы — отдельные позиции", () => {
  const basket: BasketItem[] = [{ productId: 9, qty: 1, pin: pin() }, { productId: 9, qty: 1 }, { productId: 9, qty: 1, pin: pin({ id: "x2", price: 4.5 }) }];
  assert.equal(new Set(basket.map(itemKey)).size, 3);
  const plan = optimizeBasket(city, basket, opts).plan;
  const lines = plan.stores.flatMap((s) => s.lines);
  assert.equal(lines.length, 3);
  assert.equal(plan.total, 5.0 + 4.0 + 4.5);
});

test("старая сохранённая корзина (без ключей и закреплений) считается как раньше", () => {
  const saved = JSON.parse('[{"productId":9,"qty":1},{"productId":61,"qty":1.5,"brand":"X"}]') as BasketItem[];
  assert.deepEqual(saved.map(itemKey), ["g:9", "g:61"]);
  const plan = optimizeBasket(city, [saved[0]], opts).plan;
  assert.equal(plan.total, 4.0);
});
