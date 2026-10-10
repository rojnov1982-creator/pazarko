#!/usr/bin/env node
// Генерирует ДЕМО-архив в точном формате kolkostruva.bg (вымышленные сети и цены),
// чтобы проверить конвейер и показывать приложение без доступа к порталу.
//   node make-demo.mjs && node ingest.mjs --zip demo/demo-2026-10-09.zip --date 2026-10-09 --out ../app/assets/demo-data

import fs from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";
import { RANGE_GROUPS } from "./lib/sizes.mjs";
import { BRANDS } from "./lib/brands.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const products = JSON.parse(fs.readFileSync(path.join(here, "ref/products.json"), "utf8")).products;

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// Ориентировочные базовые цены в евро по группам 1–85 (для правдоподобия демо).
const base = [
  0.9, 1.3, 1.4, 0.95, 1.6, 1.35, 0.85, 7.2, 3.2, 11.5, 4.1, 2.2, 4.3, 1.4, 4.4, 8.9, 5.1, 6.8, 7.6, 6.4, 7.9, 6.9, 13.9,
  12.5, 6.7, 6.2, 3.4, 4.6, 6.1, 9.5, 2.3, 2.7, 3.6, 3.9, 2.4, 1.1, 1.2, 1.15, 0.6, 1.0, 1.15, 1.9, 9.8, 1.2, 1.5, 1.3,
  1.5, 1.3, 2.4, 2.6, 1.8, 1.7, 1.6, 2.5, 0.9, 0.95, 0.8, 1.9, 6.5, 4.8, 0.9, 7.5, 1.3, 1.1, 14.5, 1.0, 0.8, 1.6, 1.9,
  3.8, 19.5, 1.6, 3.1, 2.6, 5.2, 5.5, 8.9, 3.6, 1.6, 1.5, 2.1, 3.3, 0.9, 1.2, 3.4,
];

const chains = [
  { name: "Демо Маркет", entity: "Демо Маркет ЕООД", eik: "100000001", level: 1.0, cover: 0.97, promo: 0.18, delim: ";" },
  { name: "Супер Евтино", entity: "Супер Евтино ООД", eik: "100000002", level: 0.9, cover: 0.8, promo: 0.1, delim: "," },
  { name: "Мега Хипер", entity: "Мега Хипер АД", eik: "100000003", level: 0.97, cover: 0.99, promo: 0.25, delim: ";" },
  { name: "Квартал Фреш", entity: "Квартал Фреш ЕООД", eik: "100000004", level: 1.12, cover: 0.75, promo: 0.08, delim: "," },
  { name: "Нон Стоп", entity: "Нон Стоп 24 ЕООД", eik: "100000005", level: 1.2, cover: 0.6, promo: 0.05, delim: ";" },
  { name: "Био Ъгъл", entity: "Био Ъгъл ООД", eik: "100000006", level: 1.28, cover: 0.45, promo: 0.12, delim: "," },
];
const cities = [
  { ekatte: "68134", suffixes: ["-01", "-05", "-12", ""], stores: 4 },
  { ekatte: "56784", suffixes: [""], stores: 2 },
  { ekatte: "10135", suffixes: [""], stores: 2 },
];

const files = {};
for (const ch of chains) {
  const lines = [["Населено място", "Търговски обект", "Наименование на продукта", "Код на продукта", "Категория", "Цена на дребно", "Цена в промоция"]];
  const bias = products.map(() => 0.85 + rnd() * 0.3); // индивидуальная «дешевизна» товара в сети
  for (const city of cities) {
    if (ch.level > 1.25 && city.ekatte !== "68134") continue; // «Био Ъгъл» только в Софии
    for (let s = 0; s < city.stores; s++) {
      const suf = city.suffixes[s % city.suffixes.length];
      const store = `${ch.name} №${s + 1}`;
      for (const p of products.slice(0, 85)) {
        if (rnd() > ch.cover) continue;
        const b = base[p.id - 1] * ch.level * bias[p.id - 1] * (0.97 + rnd() * 0.06);
        const price = Math.max(0.19, Math.round(b * 100) / 100 - 0.01);
        const promo = rnd() < ch.promo ? Math.round(price * (0.65 + rnd() * 0.2) * 100) / 100 : "";
        const code = `${ch.eik.slice(-1)}${String(p.id).padStart(4, "0")}`;
        const rg = RANGE_GROUPS[p.id];
        const size = !rg ? "" : rg.unit === "pcs" ? ` ${rg.ref} бр.` : ` ${Math.round(rg.ref * 1000)} ${rg.unit === "l" ? "мл" : "г"}`;
        const name = `${p.bg.replace(/ от .*| \d.*$/, "")} ${ch.name}${size}`;
        const quote = rnd() < 0.2;
        // в группах с марками — две марки на сеть, вторая чуть дороже
        const bl = BRANDS[p.id] ? Object.keys(BRANDS[p.id]) : null;
        if (bl) {
          const ci = chains.indexOf(ch);
          for (const [j, bi] of [[0, ci % bl.length], [1, (ci + 3) % bl.length]]) {
            const bp = Math.round(price * (1 + j * 0.12) * 100) / 100;
            const bpromo = j === 0 ? promo : "";
            const fmt = (v) => (ch.delim === ";" ? String(v).replace(".", ",") : String(v));
            lines.push([city.ekatte + suf, store, `${p.bg.replace(/ от .*| \d.*$/, "")} ${bl[bi]}${size}`, code + j, String(p.id), fmt(bp), bpromo === "" ? "" : fmt(bpromo)]);
          }
          continue;
        }
        lines.push([
          city.ekatte + suf,
          store,
          name,
          code,
          quote ? `"${p.id}"` : String(p.id),
          ch.delim === ";" ? String(price).replace(".", ",") : String(price),
          promo === "" ? "" : ch.delim === ";" ? String(promo).replace(".", ",") : String(promo),
        ]);
      }
    }
  }
  const esc = (v) => (v.includes(ch.delim) && !v.startsWith('"') ? `"${v}"` : v);
  const text = (ch.eik.endsWith("1") ? "﻿" : "") + lines.map((l) => l.map(esc).join(ch.delim)).join("\r\n");
  files[`${ch.name} (${ch.entity})_${ch.eik}.csv`] = strToU8(text);
}
fs.mkdirSync(path.join(here, "demo"), { recursive: true });
const out = path.join(here, "demo/demo-2026-10-09.zip");
fs.writeFileSync(out, zipSync(files));
console.log("Демо-архив:", out);
