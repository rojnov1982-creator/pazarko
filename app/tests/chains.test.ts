// Сети (целым словом, несколько ЕИК), дата по Софии, акции «с карта» в плане.
import assert from "node:assert/strict";
import { test } from "node:test";
import { bestBrochureOffer, brochureCandidates, matchChains, todayIso, visibleChains } from "../src/lib/brochures";
import { chainExcluded, chainMatches } from "../src/lib/chains";
import { excludedIndexes, isMetro } from "../src/lib/prices";
import type { BrochureFile, CityFile } from "../src/lib/types";

test("сеть сопоставляется целым словом: «МЕТРОПОЛ» — не Metro, «T Market» — «TMARKET»", () => {
  assert.ok(chainMatches("Метро България", "МЕТРО"));
  assert.ok(chainMatches("METRO Cash & Carry", "METRO"));
  assert.ok(chainMatches("КАУФЛАНД БЪЛГАРИЯ ЕООД ЕНД КО КД", "КАУФЛАНД"));
  assert.ok(chainMatches("T Market", "TMARKET"));
  assert.ok(chainMatches("Т МАРКЕТ", "ТМАРКЕТ"));
  assert.ok(chainMatches("Лидл България", "ЛИДЛ"));
  assert.ok(!chainMatches("МЕТРОПОЛ ТРЕЙД", "МЕТРО"));
  assert.ok(!chainMatches("Метрополис", "МЕТРО"));
  assert.ok(!chainMatches("БИЛЛАРД КЛУБ", "БИЛЛА"));
  assert.ok(!chainMatches("Лидл България", ""));
  assert.ok(!isMetro({ name: "МЕТРОПОЛ ТРЕЙД" }));
  assert.ok(isMetro({ name: "Метро България" }));
});

test("сеть с похожим названием не получает чужие брошюры", () => {
  const city = {
    chains: [
      { name: "МЕТРОПОЛ ТРЕЙД", eik: "1", stores: 2 },
      { name: "Метро България", eik: "2", stores: 2 },
    ],
  } as unknown as CityFile;
  const bro = {
    v: 1,
    generatedAt: "",
    today: "2026-11-06",
    chains: [{ name: "Metro", match: ["МЕТРО", "METRO"] }],
    types: [""],
    offers: [{ c: 0, f: "2026-11-02", t: "2026-11-08", y: 0, g: 35, n: "Ориз 1 кг", p: 1, rp: 1 }],
  } as unknown as BrochureFile;
  assert.deepEqual(matchChains(bro, city), [1]);
  assert.deepEqual(brochureCandidates(bro, city, "2026-11-06").get(35)?.[0].chains, [1]);
});

test("сеть из нескольких фирм исключается по любому своему ЕИК", () => {
  const fant = { name: "ФАНТАСТИКО", eik: "100", eiks: ["100", "200"], stores: 40 };
  assert.ok(chainExcluded(fant, ["200"])); // исключили, когда основным был другой ЕИК
  assert.ok(chainExcluded(fant, ["100"]));
  assert.ok(!chainExcluded(fant, ["300"]));
  assert.ok(!chainExcluded({ eik: "100" }, ["200"]));
  const city = { chains: [fant, { name: "Билла", eik: "300", stores: 5 }] } as unknown as CityFile;
  assert.deepEqual([...excludedIndexes(city, ["200"], false)], [0]);
  const bro = {
    chains: [
      { name: "Fantastico", match: ["ФАНТАСТИКО"] },
      { name: "Billa", match: ["БИЛЛА"] },
    ],
    offers: [],
  } as unknown as BrochureFile;
  assert.deepEqual(visibleChains(bro, city, ["200"]), [false, true]);
});

test("сегодня — по времени Софии, а не устройства", () => {
  assert.equal(todayIso(new Date("2026-11-10T22:30:00Z")), "2026-11-11"); // зима: UTC+2
  assert.equal(todayIso(new Date("2026-11-10T21:30:00Z")), "2026-11-10");
  assert.equal(todayIso(new Date("2026-07-01T21:30:00Z")), "2026-07-02"); // лято: UTC+3
  assert.equal(todayIso(new Date("2026-12-31T22:00:00Z")), "2027-01-01");
});

test("акции «с карта»: при выключенной настройке не идут ни в план, ни в подсказки", () => {
  const city = { chains: [{ name: "Билла", eik: "1", stores: 5 }] } as unknown as CityFile;
  const bro = {
    v: 1,
    generatedAt: "",
    today: "2026-11-06",
    chains: [{ name: "Billa", match: ["БИЛЛА"] }],
    types: [""],
    offers: [
      { c: 0, f: "2026-11-02", t: "2026-11-08", y: 0, g: 35, n: "Ориз 1 кг (Billa Card)", p: 0.79, rp: 0.79, k: 1 },
      { c: 0, f: "2026-11-02", t: "2026-11-08", y: 0, g: 35, n: "Ориз 1 кг", p: 0.99, rp: 0.99 },
    ],
  } as unknown as BrochureFile;
  const all = brochureCandidates(bro, city, "2026-11-06").get(35) ?? [];
  assert.deepEqual(all.map((c) => c.price), [0.79, 0.99]);
  assert.equal(all[0].card, true);
  const noCards = brochureCandidates(bro, city, "2026-11-06", { cards: false }).get(35) ?? [];
  assert.deepEqual(noCards.map((c) => c.price), [0.99]);
  const vis = visibleChains(bro, city, []);
  assert.equal(bestBrochureOffer(bro, 35, vis, "2026-11-06")?.p, 0.79);
  assert.equal(bestBrochureOffer(bro, 35, vis, "2026-11-06", undefined, false)?.p, 0.99);
});
