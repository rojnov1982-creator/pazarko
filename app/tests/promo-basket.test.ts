// «Кошница на седмицата»: лучшие акции брошюр на базовые продукты, не больше двух сетей.
import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyPromoBasket } from "../src/lib/promoBasket";
import type { BrochureFile } from "../src/lib/types";

const base = { f: "2026-11-03", t: "2026-11-09", y: 0 };
const bro = {
  v: 1,
  generatedAt: "",
  today: "2026-11-06",
  chains: [
    { name: "Lidl", match: ["ЛИДЛ"] },
    { name: "Kaufland", match: ["КАУФЛАНД"] },
    { name: "Billa", match: ["БИЛЛА"] },
  ],
  types: [""],
  offers: [
    // Lidl: три хорошие акции
    { ...base, c: 0, n: "Сирене 400 г", g: 9, p: 2.99, r: 4.99, rp: 2.99 },
    { ...base, c: 0, n: "Мляко 1 л", g: 6, p: 0.99, r: 1.49, rp: 0.99 },
    { ...base, c: 0, n: "Яйца 10 бр", g: 31, p: 1.99, r: 2.99, rp: 1.99 },
    // Kaufland: дешевле сирене и ещё два продукта
    { ...base, c: 1, n: "Сирене К 400 г", g: 9, p: 2.49, r: 4.49, rp: 2.49 },
    { ...base, c: 1, n: "Олио 1 л", g: 42, p: 1.49, r: 2.49, rp: 1.49 },
    { ...base, c: 1, n: "Ориз 1 кг", g: 35, p: 0.99, r: 2.49, rp: 0.99 },
    // Billa: одна маленькая акция — третья сеть не нужна
    { ...base, c: 2, n: "Хляб", g: 1, p: 0.89, r: 1.09, rp: 0.89 },
    // не участвуют: условие, скидка < 15%, истекла, алкоголь, химия
    { ...base, c: 0, n: "Кисело мляко 2+1", g: 7, p: 0.5, r: 1.2, rp: 0.5, m: "multibuy" },
    { ...base, c: 0, n: "Захар", g: 38, p: 1.0, r: 1.1, rp: 1.0 },
    { ...base, c: 1, n: "Масло стара", g: 12, p: 1.0, r: 3.0, rp: 1.0, f: "2026-10-20", t: "2026-10-26" },
    { ...base, c: 1, n: "Вино", g: 76, p: 2.0, r: 6.0, rp: 2.0 },
    { ...base, c: 1, n: "Прах за пране", g: 83, p: 5.0, r: 15.0, rp: 5.0 },
  ],
} as unknown as BrochureFile;

test("лучшая пара сетей, по одной акции на продукт, без условных/слабых/истёкших/алкоголя/химии", () => {
  const wk = weeklyPromoBasket(bro, [true, true, true], "2026-11-06")!;
  assert.deepEqual(wk.chains.sort(), [0, 1]);
  const names = wk.picks.map((p) => p.offer.n).sort();
  assert.deepEqual(names, ["Мляко 1 л", "Олио 1 л", "Ориз 1 кг", "Сирене К 400 г", "Яйца 10 бр"]);
  assert.equal(wk.total, 7.95);
  assert.equal(wk.regular, 13.95);
});

test("скрытая сеть (нет в городе / исключена) не участвует; меньше 3 акций — карточки нет", () => {
  const wk = weeklyPromoBasket(bro, [true, false, true], "2026-11-06")!;
  assert.ok(wk.picks.every((p) => p.offer.c !== 1));
  assert.equal(weeklyPromoBasket(bro, [false, false, true], "2026-11-06"), null);
});
