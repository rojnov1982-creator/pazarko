// Конвейер данных (data-pipeline/lib): собственная марка Lidl, разбор цен, сети из нескольких фирм.
// Модули .mjs подключаются по пути (без типов) — как и в history-pipeline.test.ts, нужен `npm ci` в data-pipeline.
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const lib = (f: string) => import(pathToFileURL(path.resolve(__dirname, "../../data-pipeline/lib", f)).href);

test("Lidl: товар без марки и свои марки — собственная марка; чужая марка латиницей — нет", async () => {
  const { brandOf, OWN } = await lib("brands.mjs");
  const lidl = "Лидл България";
  // группа 11 — кашкавал, 74 — бира, 6 — прясно мляко: в них есть словарь марок
  assert.equal(brandOf(11, "Кашкавал от краве мляко БДС 400g", lidl), OWN);
  assert.equal(brandOf(74, "Argus Светла бира 4,4%. 9,8°P", lidl), OWN);
  assert.equal(brandOf(6, "Pilos Прясно мляко 3% UHT 1 l", lidl), OWN);
  assert.equal(brandOf(6, "Прясно мляко 3,6% XXL BIO", lidl), OWN); // общие латинские слова — не марка
  assert.equal(brandOf(6, "Parmalat Прясно мляко 3,5% 1 l", lidl), null); // чужая марка, которой нет в словаре группы
  assert.equal(brandOf(74, "Corona Extra бира 0.355 l", lidl), null);
  // другие сети: без изменений — собственная марка только по своим признакам
  assert.equal(brandOf(11, "Кашкавал от краве мляко БДС 400g", "Билла"), null);
  assert.equal(brandOf(11, "Clever Кашкавал 400 г", "Билла"), OWN);
});

test("цена: десятичная запятая и точка, разделители тысяч, знак валюты; мусор — не цена", async () => {
  const { toPrice } = await lib("parse.mjs");
  assert.equal(toPrice("2,49"), 2.49);
  assert.equal(toPrice('"2.49"'), 2.49);
  assert.equal(toPrice("1 234,50"), 1234.5);
  assert.equal(toPrice("1,234.50"), 1234.5);
  assert.equal(toPrice("1.234,50"), 1234.5);
  assert.equal(toPrice("2,49 €"), 2.49);
  assert.equal(toPrice("0,99"), 0.99);
  assert.equal(toPrice(""), null);
  assert.equal(toPrice("0"), null);
  assert.equal(toPrice("няма"), null);
  assert.equal(toPrice("2,49 лв"), null); // лева за евро не принимаем
  assert.equal(toPrice("12-50"), null);
});

test("CSV сети: пропущенные строки считаются по причинам, а не пропадают молча", async () => {
  const { parseChainCsv } = await lib("parse.mjs");
  const csv = [
    "Населено място,Търговски обект,Наименование на продукта,Код на продукта,Категория,Цена на дребно,Цена в промоция",
    '68134-01,Магазин 1,Прясно мляко 1 л,111,6,"1,99","1,49"',
    "68134,Магазин 1,Сирене 400 г,112,9,5.49,",
    "68134,Магазин 1,Хляб,113,1,,", // без цены
    "68134,Магазин 1,Олио,114,42,скоро,", // цена не читается
    "68134,Магазин 1,Нещо,115,999,1.00,", // нет такой группы
    "abc,Магазин 1,Нещо,116,1,1.00,", // не населённый пункт
  ].join("\n");
  const stats: Record<string, number> = {};
  const rows = parseChainCsv(csv, "Тест (Тест ЕООД)_123456789.csv", stats);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    ekatte: "68134", store: "Магазин 1", product: "Прясно мляко 1 л", productId: 6,
    price: 1.99, promo: 1.49, eik: "123456789", chain: "Тест",
  });
  assert.deepEqual(stats, { total: 6, noPrice: 1, badPrice: 1, badGroup: 1, badPlace: 1 });
});

test("сеть из двух фирм: один ЕИК (наименьший) при любом порядке файлов и список всех ЕИК", async () => {
  const { aggregate } = await lib("aggregate.mjs");
  const row = (eik: string, chain: string, store: string, productId: number, price: number) =>
    ({ ekatte: "68134", store, product: `Товар ${productId}`, productId, price, promo: null, eik, chain });
  const groups = Array.from({ length: 14 }, (_, i) => i + 1); // 12+ пищевых групп → супермаркет
  const fantA = groups.map((g) => row("206255903", "ФАНТАСТИКО", "Ф1", g, 2));
  const fantB = groups.map((g) => row("100000001", "Фантастико", "Ф2", g, 2.1));
  const billa = groups.map((g) => row("130007884", "Билла", "Б1", g, 2.2));
  const settlements = { "68134": ["София", "Sofia"] };
  for (const rows of [[...fantA, ...fantB, ...billa], [...fantB, ...billa, ...fantA]]) {
    const { files } = aggregate(rows, { date: "2026-11-14", settlements });
    const chains = files["city/68134.json"].chains;
    const f = chains.find((c: { name: string }) => /фантастико/i.test(c.name));
    assert.equal(f.eik, "100000001");
    assert.deepEqual(f.eiks, ["100000001", "206255903"]);
    assert.equal(f.kind, "grocery");
    const b = chains.find((c: { name: string }) => c.name === "Билла");
    assert.equal(b.eiks, undefined); // одна фирма — список не нужен
  }
});
