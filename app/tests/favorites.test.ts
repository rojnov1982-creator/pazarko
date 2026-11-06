// «Любими»: поиск в брошюрах по словам, определение группы/марки, цена в плане.
import { test } from "node:test";
import assert from "node:assert/strict";
import { brochureCandidates, brochureLookup } from "../src/lib/brochures";
import { favWords, inferFavorite, matchesWords } from "../src/lib/favorites";
import { optimizeBasket } from "../src/lib/optimize";
import { isUnpriced, itemKey } from "../src/lib/pins";
import type { BrochureFile, CityFile } from "../src/lib/types";

const base = { f: "2026-11-03", t: "2026-11-09", y: 0 };
const bro = {
  v: 1,
  generatedAt: "",
  today: "2026-11-06",
  chains: [
    { name: "Fantastico", match: ["ФАНТАСТИКО"] },
    { name: "Kaufland", match: ["КАУФЛАНД"] },
  ],
  types: [""],
  offers: [
    { ...base, c: 0, i: "chardaka", n: "Луканка Добруджанска; Чардака ОРЕХИТЕ ГАСТРО 300 г", b: "ОРЕХИТЕ ГАСТРО", g: 28, p: 3.49, r: 5.49, rp: 3.49 },
    { ...base, c: 1, i: "smyadovo", n: "Луканка Смядовска ОРЕХИТЕ 300 г", b: "ОРЕХИТЕ", g: 28, p: 2.99, r: 4.99, rp: 2.99 },
    { ...base, c: 1, i: "nuts", n: "DETELINA Суров орех 400 г", b: "DETELINA", g: null, p: 3.99 },
  ],
} as unknown as BrochureFile;

const city = {
  v: 1,
  date: "2026-11-05",
  ekatte: "68134",
  name: "гр. София",
  chains: [
    { name: "ФАНТАСТИКО ГРУП ООД", eik: "1", stores: 3 },
    { name: "КАУФЛАНД БЪЛГАРИЯ ЕООД ЕНД КО КД", eik: "2", stores: 3 },
  ],
  items: { "28": [[0, 4.2, "Луканка", 4.2, 0, "Луканка", ""], [1, 3.9, "Шпек", 3.9, 0, "Шпек", ""]] },
  brands: { "28": { Орехите: [[0, 4.1, "Шпек Орехите", 4.1, 0, "Шпек Орехите", ""], [1, 5.0, "Луканка Чардака Орехите 300 г", 5.0, 0, "Луканка Чардака Орехите 300 г", ""]], Перелик: [[1, 4.5, "x", 4.5, 0, "x", ""]] } },
  deals: [],
} as unknown as CityFile;

test("слова по основе: «Луканка Орехите Чардака» находит «Луканков…», «ОРЕХИТЕ ГАСТРО»; орехи (ядки) — нет", () => {
  const w = favWords("Луканка Орехите Чардака");
  assert.ok(matchesWords(w, "Луканка Добруджанска; Чардака ОРЕХИТЕ ГАСТРО 300 г"));
  assert.ok(!matchesWords(w, "Луканка Смядовска ОРЕХИТЕ 300 г")); // нет «Чардака»
  assert.ok(!matchesWords(favWords("Орехите луканка"), "DETELINA Суров орех 400 г"));
  assert.ok(matchesWords(favWords("орехите луканка"), "ОРЕХИТЕ Луканков салам 180 г"));
});

test("группа и марка определяются по маркам КЗП и брошюрам", () => {
  const r = inferFavorite("Луканка Орехите Чардака", city, bro, new Map([[28, "Сухи колбаси"]]));
  assert.deepEqual(r, { productId: 28, brand: "Орехите" });
  assert.deepEqual(inferFavorite("Тоалетна хартия", city, bro, new Map([[28, "Сухи колбаси"]])), {});
});

test("в плане любимый берёт только «свою» акцию; без акции — цену марки по КЗП", () => {
  const brochure = brochureLookup(brochureCandidates(bro, city, "2026-11-06"));
  const fav = { productId: 28, qty: 1, brand: "Орехите", fav: "f1", words: favWords("Луканка Орехите Чардака"), name: "Луканка Орехите Чардака" };
  const opts = { maxStores: 0, usePromo: true, extraStoreCost: 0, meta: () => ({ byWeight: false, ref: { unit: "kg" as const, size: 0.3 } }), today: "2026-11-06", brochure };
  const plan = optimizeBasket(city, [fav], opts).plan;
  assert.equal(plan.total, 3.49); // Чардака во Fantastico, а не более дешёвая Смядовска в Kaufland
  assert.equal(plan.stores[0].lines[0].offer.brochure?.id, "chardaka");
  assert.equal(plan.stores[0].lines[0].key, "fav:f1");
  const noPromo = optimizeBasket(city, [fav], { ...opts, brochure: undefined }).plan;
  assert.equal(noPromo.total, 5.0); // КЗП: именно «Луканка Чардака Орехите», а не более дешёвый шпек той же марки
  const other = { ...fav, fav: "f2", words: favWords("Луканка Орехите Смядовска") };
  const none = optimizeBasket(city, [other], { ...opts, brochure: undefined }).plan;
  assert.deepEqual(none.missing, ["fav:f2"]); // такого товара в КЗП нет — в план без цены, а не чужой товар
});

test("свои строки — без цены, отдельный ключ", () => {
  const custom = { productId: 0, qty: 1, name: "Тоалетна хартия", id: "c1" };
  assert.ok(isUnpriced(custom));
  assert.equal(itemKey(custom), "c:c1");
  assert.ok(!isUnpriced({ productId: 28, qty: 1 }));
});
