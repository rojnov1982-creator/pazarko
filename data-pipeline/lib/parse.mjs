// Разбор CSV одной торговой сети из дневного архива kolkostruva.bg (КЗП).
//
// Формат файла (одинаковый порядок колонок у всех сетей):
//   0 Населено място (ЕКАТТЕ) · 1 Търговски обект · 2 Наименование на продукта ·
//   3 Код на продукта · 4 Категория (id группы 1–101) · 5 Цена на дребно · 6 Цена в промоция
// Имя файла: "<Сеть> (<юрлицо>)_<ЕИК>.csv". Разделитель бывает "," или ";",
// бывает BOM и кавычки вокруг чисел. Цены в евро с 01.01.2026.
// Логика нормализации адаптирована из electionsbg (MIT).

import { parse } from "csv-parse/sync";

const stripBom = (s) => s.replace(/^﻿/, "");
const unquote = (s) => (s ?? "").trim().replace(/^"|"$/g, "").trim();

export function parseChainFromFilename(filename) {
  const base = filename.split("/").pop().replace(/\.csv$/i, "");
  const us = base.lastIndexOf("_");
  const eik = us >= 0 ? base.slice(us + 1) : base;
  const full = us >= 0 ? base.slice(0, us) : base;
  const chain = full.replace(/\s*\(.*\)\s*$/, "").trim() || full.trim();
  return { eik, chain };
}

export function normalizeEkatte(raw) {
  let c = unquote(stripBom(raw ?? ""));
  c = c.split("-")[0]; // София: "68134-01" → "68134"
  return c.padStart(5, "0");
}

function toPrice(raw) {
  const v = unquote(raw).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 10000 ? n : null;
}

/** @returns {Array<{ekatte,store,product,productId,price,promo,eik,chain}>} */
export function parseChainCsv(text, filename) {
  const { eik, chain } = parseChainFromFilename(filename);
  const clean = stripBom(text);
  const nl = clean.indexOf("\n");
  const first = nl >= 0 ? clean.slice(0, nl) : clean;
  const delimiter = first.split(";").length > first.split(",").length ? ";" : ",";

  const records = parse(clean, {
    delimiter,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    bom: true,
  });

  const rows = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r || r.length < 6) continue;
    const c0 = unquote(stripBom(r[0] ?? ""));
    if (i === 0 && /Населено\s*място/i.test(c0)) continue; // заголовок
    if (!c0) continue;
    const price = toPrice(r[5]);
    if (price == null) continue;
    const ekatte = normalizeEkatte(c0);
    if (!/^\d{5}$/.test(ekatte)) continue;
    const productId = parseInt(unquote(r[4]), 10);
    if (!Number.isFinite(productId) || productId < 1 || productId > 101) continue;
    let promo = toPrice(r[6]);
    if (promo != null && promo >= price) promo = null; // «промо» не дешевле — игнорируем
    rows.push({
      ekatte,
      store: (r[1] ?? "").trim(),
      product: (r[2] ?? "").trim(),
      productId,
      price,
      promo,
      eik,
      chain,
    });
  }
  return rows;
}
