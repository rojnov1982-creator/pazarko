import assert from "node:assert/strict";
import { test } from "node:test";
import { bestBrochureOffer, matchChains, offerStatus, visibleChains } from "../src/lib/brochures";
import type { BrochureFile, CityFile } from "../src/lib/types";

const city = {
  chains: [
    { name: "КАУФЛАНД БЪЛГАРИЯ ЕООД ЕНД КО КД", eik: "111", stores: 5 },
    { name: "ЛИДЛ БЪЛГАРИЯ", eik: "222", stores: 9 },
    { name: "Т МАРКЕТ", eik: "333", stores: 3 },
  ],
} as unknown as CityFile;

const bro: BrochureFile = {
  v: 1,
  generatedAt: "",
  today: "2026-11-06",
  chains: [
    { name: "Kaufland", match: ["КАУФЛАНД", "KAUFLAND"] },
    { name: "Lidl", match: ["ЛИДЛ", "LIDL"] },
    { name: "T Market", match: ["ТМАРКЕТ", "TMARKET"] },
    { name: "Metro", match: ["МЕТРО", "METRO"] },
  ],
  types: ["ориз"],
  offers: [
    { c: 0, f: "2026-11-02", t: "2026-11-08", y: 0, g: 35, n: "Ориз 1 кг", p: 1.2, rp: 1.2 },
    { c: 1, f: "2026-11-02", t: "2026-11-08", y: 0, g: 35, n: "Ориз 1 кг", p: 0.99, rp: 0.99 },
    { c: 2, f: "2026-11-10", t: "2026-11-16", y: 0, g: 35, n: "Ориз 1 кг", p: 0.5, rp: 0.5 }, // ещё не начался
    { c: 3, f: "2026-11-05", t: "2026-11-18", y: 0, g: 35, n: "Ориз 1 кг", p: 0.4, rp: 0.4 }, // Metro нет в городе
    { c: 1, f: "2026-11-02", t: "2026-11-08", y: 0, g: 35, n: "Ориз ИЗИ 1 кг", b: "IZZI", p: 1.1, rp: 1.1 },
  ],
};

test("сети брошюр находятся в названиях сетей КЗП", () => {
  assert.deepEqual(matchChains(bro, city), [0, 1, 2, -1]);
});

test("исключённые и отсутствующие в городе сети скрыты; без совпадений — показываем все", () => {
  assert.deepEqual(visibleChains(bro, city, ["222"]), [true, false, true, false]);
  const other = { chains: [{ name: "ДРУГА ВЕРИГА", eik: "9", stores: 1 }] } as unknown as CityFile;
  assert.deepEqual(visibleChains(bro, other, []), [true, true, true, true]);
});

test("лучшее предложение: только действующее, только видимые сети, с учётом марки", () => {
  const vis = visibleChains(bro, city, []);
  assert.equal(bestBrochureOffer(bro, 35, vis, "2026-11-06")?.p, 0.99);
  assert.equal(bestBrochureOffer(bro, 35, vis, "2026-11-06", "IZZI")?.p, 1.1);
  assert.equal(bestBrochureOffer(bro, 36, vis, "2026-11-06"), null);
  assert.equal(offerStatus(bro.offers[2], "2026-11-06"), "soon");
  assert.equal(offerStatus(bro.offers[0], "2026-11-09"), "expired");
});

import { isMetro } from "../src/lib/prices";
test("Metro распознаётся на кириллице и латинице, другие сети — нет", () => {
  assert.ok(isMetro({ name: "Метро България" }));
  assert.ok(isMetro({ name: "METRO Cash & Carry" }));
  assert.ok(!isMetro({ name: "Лидл България" }));
  assert.ok(!isMetro({ name: "T Market" }));
});
