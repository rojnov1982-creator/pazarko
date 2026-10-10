// Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { optimizeBasket } from "../src/lib/optimize";
import type { CityFile, BasketItem } from "../src/lib/types";

const city: CityFile = JSON.parse(fs.readFileSync(new URL("../assets/demo-data/city/68134.json", import.meta.url), "utf8"));

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

function randomBasket(n: number): BasketItem[] {
  const ids = Object.keys(city.items).map(Number);
  const out = new Map<number, number>();
  while (out.size < n) out.set(ids[Math.floor(rnd() * ids.length)], 1 + Math.floor(rnd() * 3));
  return [...out].map(([productId, qty]) => ({ productId, qty }));
}

/** Эталон: тупой перебор всех назначений «товар → сеть» с лимитом магазинов */
function bruteForce(basket: BasketItem[], k: number, usePromo: boolean) {
  const opts = basket.map((b) =>
    city.items[b.productId].map((t) => ({ c: t[0], p: usePromo && t[4] ? t[3] : t[1] })),
  );
  let best = Infinity;
  const rec = (i: number, used: Set<number>, sum: number) => {
    if (sum >= best) return;
    if (i === basket.length) return void (best = sum);
    for (const o of opts[i]) {
      const had = used.has(o.c);
      if (!had && used.size >= k) continue;
      used.add(o.c);
      rec(i + 1, used, sum + o.p * basket[i].qty);
      if (!had) used.delete(o.c);
    }
  };
  rec(0, new Set(), 0);
  return Math.round(best * 100) / 100;
}

test("план с лимитом магазинов совпадает с полным перебором", () => {
  for (let t = 0; t < 40; t++) {
    const basket = randomBasket(3 + Math.floor(rnd() * 6));
    for (const k of [1, 2, 3]) {
      for (const usePromo of [true, false]) {
        const r = optimizeBasket(city, basket, { maxStores: k, usePromo, extraStoreCost: 0 });
        assert.equal(r.plan.missing.length, 0);
        assert.ok(r.plan.stores.length <= k, "не больше K магазинов");
        assert.equal(r.plan.total, bruteForce(basket, k, usePromo), `basket ${JSON.stringify(basket)} k=${k}`);
      }
    }
  }
});

test("без лимита = каждый товар в самой дешёвой сети; не дороже одной сети", () => {
  const basket = randomBasket(12);
  const r = optimizeBasket(city, basket, { maxStores: 0, usePromo: true, extraStoreCost: 0 });
  assert.equal(r.plan.total, r.ideal.total);
  for (const s of r.singles) assert.ok(s.overpay >= -0.001, `${s.chain} overpay ${s.overpay}`);
  const sum = r.plan.stores.reduce((a, s) => a + s.subtotal, 0);
  assert.ok(Math.abs(sum - r.plan.total) < 0.05);
});

test("штраф за магазин уменьшает число магазинов", () => {
  const basket = randomBasket(10);
  const free = optimizeBasket(city, basket, { maxStores: 4, usePromo: true, extraStoreCost: 0 });
  const costly = optimizeBasket(city, basket, { maxStores: 4, usePromo: true, extraStoreCost: 50 });
  assert.ok(costly.plan.stores.length <= free.plan.stores.length);
  assert.equal(costly.plan.stores.length, 1);
});

test("исключённые сети не попадают в план, отсутствующие товары помечаются", () => {
  const basket: BasketItem[] = [{ productId: 8, qty: 1 }, { productId: 9999, qty: 1 }];
  const r = optimizeBasket(city, basket, { maxStores: 2, usePromo: true, extraStoreCost: 0, excludedChains: [1, 2] });
  assert.deepEqual(r.plan.missing, [9999]);
  for (const s of r.plan.stores) assert.ok(![1, 2].includes(s.chain));
});

test("выбранная марка: план берёт только товары этой марки", () => {
  const brands = city.brands?.["6"] ?? {};
  const brand = Object.keys(brands)[0];
  assert.ok(brand, "в демо-данных есть марки");
  const r = optimizeBasket(city, [{ productId: 6, qty: 2, brand }], { maxStores: 0, usePromo: true, extraStoreCost: 0 });
  const allowed = new Set(brands[brand].map((t) => t[0]));
  for (const s of r.plan.stores) {
    assert.ok(allowed.has(s.chain), "сеть, где есть эта марка");
    for (const l of s.lines) assert.ok(l.offer.product.includes(brand), l.offer.product);
  }
  const any = optimizeBasket(city, [{ productId: 6, qty: 2 }], { maxStores: 0, usePromo: true, extraStoreCost: 0 });
  assert.ok(any.plan.total <= r.plan.total + 1e-9, "любая марка не дороже конкретной");
});

test("марки, которой нет в городе, — товар не найден", () => {
  const r = optimizeBasket(city, [{ productId: 6, qty: 1, brand: "НесуществующаяМарка" }], { maxStores: 2, usePromo: true, extraStoreCost: 0 });
  assert.deepEqual(r.plan.missing, [6]);
});

test("район: план считается только по выбранным магазинам", async () => {
  const { buildAreaCity, storesInArea } = await import("../src/lib/area");
  const picked = (city.stores ?? []).filter((s, i, all) => all.findIndex((x) => x[1] === s[1]) === i).slice(0, 3);
  assert.equal(picked.length, 3);
  const files = Object.fromEntries(
    picked.map((st) => [st[0], JSON.parse(fs.readFileSync(new URL(`../assets/demo-data/city/68134/s/${st[0]}.json`, import.meta.url), "utf8"))]),
  );
  const area = buildAreaCity(city, picked, files);
  assert.equal(area.chains.length, 3);
  assert.deepEqual(storesInArea(city, { mode: "stores", ids: picked.map((p) => p[0]) }).map((s) => s[0]).sort(), picked.map((p) => p[0]).sort());
  const r = optimizeBasket(area, [{ productId: 6, qty: 2 }, { productId: 1, qty: 1 }], { maxStores: 2, usePromo: true, extraStoreCost: 0 });
  for (const s of r.plan.stores) assert.ok(s.chain >= 0 && s.chain < 3);
  assert.equal(r.plan.missing.length, 0);
});
