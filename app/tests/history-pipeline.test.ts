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
