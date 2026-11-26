// Сборка истории брошюр (data-pipeline/brochures.mjs): по месяцам, каждая неделя отдельно, условия сохраняются.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HEAD =
  "chain,brochure_from,brochure_to,valid_from,valid_to,product,brand,type,cat,kzp_group,price_eur,effective_eur,regular_eur,discount_printed,discount_calc_pct,mechanic,condition,total_qty,unit,own_label,check";
const row = (o: Record<string, string>) =>
  HEAD.split(",")
    .map((k) => {
      const v = o[k] ?? "";
      return v.includes(",") ? `"${v}"` : v;
    })
    .join(",");

test("история: два месяца, прошедшая и будущая неделя — обе; multibuy и «от суммы» — с условиями", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bro-in-"));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "bro-out-"));
  const base = { chain: "Fantastico", product: "Луканка Чардака ОРЕХИТЕ 300 г", brand: "ОРЕХИТЕ", cat: "4", kzp_group: "28" };
  fs.writeFileSync(
    path.join(dir, "test.csv"),
    [
      HEAD,
      row({ ...base, valid_from: "2026-10-20", valid_to: "2026-10-26", effective_eur: "3.49", regular_eur: "5.49" }),
      row({ ...base, valid_from: "2026-11-10", valid_to: "2026-11-16", effective_eur: "3.29", regular_eur: "5.49" }),
      row({ chain: "Kaufland", product: "Кисело мляко Верея", brand: "ВЕРЕЯ", cat: "2", valid_from: "2026-10-13", valid_to: "2026-10-19", price_eur: "6", effective_eur: "3", regular_eur: "6", mechanic: "multibuy", condition: "Купи 2 броя" }),
      row({ chain: "Lidl", product: "Кафе", cat: "10", valid_from: "2026-10-06", valid_to: "2026-10-12", effective_eur: "6", mechanic: "tiered" }),
    ].join("\n"),
  );
  const script = path.resolve(__dirname, "../../data-pipeline/brochures.mjs");
  execFileSync("node", [script, "--in", dir, "--out", out, "--today", "2026-11-06"], { stdio: "pipe" });
  const idx = JSON.parse(fs.readFileSync(path.join(out, "history/index.json"), "utf8"));
  assert.deepEqual(idx.months, ["2026-10", "2026-11"]);
  const oct = JSON.parse(fs.readFileSync(path.join(out, "history/2026-10.json"), "utf8"));
  const nov = JSON.parse(fs.readFileSync(path.join(out, "history/2026-11.json"), "utf8"));
  const name = (f: { chains: string[]; items: { c: number }[] }, i: number) => f.chains[f.items[i].c];
  assert.ok(oct.items.some((h: { n: string; f: string }) => h.n.startsWith("Луканка") && h.f === "2026-10-20"));
  assert.ok(nov.items.some((h: { n: string; f: string }) => h.n.startsWith("Луканка") && h.f === "2026-11-10"));
  const yog = oct.items.find((h: { n: string }) => h.n.startsWith("Кисело"));
  assert.equal(yog.m, "multibuy");
  assert.equal(yog.w, "Купи 2 броя");
  assert.equal(yog.p, 3);
  const coffee = oct.items.find((h: { n: string }) => h.n === "Кафе");
  assert.equal(coffee.m, "tiered");
  assert.equal(name(oct, oct.items.indexOf(coffee)), "Lidl");
});

test("набор («1+1», «2+1», каса): цена и старая цена — за весь набор, цена за кг/л — от цены набора", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bro-in-"));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "bro-out-"));
  const head = `${HEAD},price_per_unit_eur`;
  const line = (o: Record<string, string>) => `${row(o)},${o.price_per_unit_eur ?? ""}`;
  const week = { chain: "Kaufland", valid_from: "2026-11-23", valid_to: "2026-11-29", cat: "2" };
  fs.writeFileSync(
    path.join(dir, "test.csv"),
    [
      head,
      // в таблице: price_eur — за набор (2 x 400 г), effective_eur — за 1 брой, price_per_unit_eur = price_eur / total_qty
      line({ ...week, product: "MILKI DREAM Кашкавал 2 x 400 г", kzp_group: "11", price_eur: "5.52", effective_eur: "2.76", regular_eur: "11.04", total_qty: "0.8", unit: "kg", price_per_unit_eur: "6.9", mechanic: "multibuy+card_app" }),
      line({ ...week, product: "ШУМЕНСКО Бира 20 x 0,5 л ЦЕНА ЗА 20 БР.", kzp_group: "74", cat: "12", price_eur: "10", effective_eur: "0.5", regular_eur: "17", total_qty: "10", unit: "l", price_per_unit_eur: "1", mechanic: "price_cut+card_app" }),
      // купон на 1 брой: цена за единицу посчитана от effective_eur — берём effective_eur, как раньше
      line({ ...week, product: "Кисело мляко 400 г купон", kzp_group: "7", price_eur: "0.89", effective_eur: "0.69", regular_eur: "0.89", total_qty: "0.4", unit: "kg", price_per_unit_eur: "1.725", mechanic: "price_cut+card_app" }),
    ].join("\n"),
  );
  const script = path.resolve(__dirname, "../../data-pipeline/brochures.mjs");
  execFileSync("node", [script, "--in", dir, "--out", out, "--today", "2026-11-24"], { stdio: "pipe" });
  const bro = JSON.parse(fs.readFileSync(path.join(out, "brochures.json"), "utf8"));
  const offer = (start: string) => bro.offers.find((o: { n: string }) => o.n.startsWith(start));
  const cheese = offer("MILKI");
  assert.equal(cheese.p, 5.52);
  assert.equal(cheese.r, 11.04);
  assert.equal(cheese.u, "6.9/kg");
  const beer = offer("ШУМЕНСКО");
  assert.equal(beer.p, 10);
  assert.equal(beer.u, "1/l");
  assert.equal(beer.rp, 2); // 2 л — эталонная фасовка группы пива: 1 €/л, а не 0,10 €
  const yogurt = offer("Кисело");
  assert.equal(yogurt.p, 0.69);
  const nov = JSON.parse(fs.readFileSync(path.join(out, "history/2026-11.json"), "utf8"));
  const hist = nov.items.find((h: { n: string }) => h.n.startsWith("MILKI"));
  assert.equal(hist.p, 5.52);
  assert.equal(hist.u, "6.9/kg");
});
