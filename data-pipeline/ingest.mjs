#!/usr/bin/env node
// Загрузка дневных цен с kolkostruva.bg и подготовка данных для приложения.
//
//   node ingest.mjs                     — вчерашний день (архив дня D выходит в D+1 ~00:01)
//   node ingest.mjs --date 2026-10-09   — конкретная дата (портал хранит ~14 дней)
//   node ingest.mjs --zip ./file.zip    — локальный архив
//   node ingest.mjs --out ../app/public-data
//
// Результат (папка out/) можно выложить на любой статический хостинг
// (GitHub Pages, Netlify, S3) и указать его адрес в приложении.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { unzipSync } from "fflate";
import { parseChainCsv } from "./lib/parse.mjs";
import { aggregate } from "./lib/aggregate.mjs";
import { normalizeSizes, RANGE_GROUPS } from "./lib/sizes.mjs";
import { BRANDS } from "./lib/brands.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]);
    return acc;
  }, []),
);

function daysAgoSofia(n) {
  const d = new Date(Date.now() - n * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(d);
}

function decode(bytes) {
  const utf = new TextDecoder("utf-8").decode(bytes);
  if (!utf.includes("�")) return utf;
  return new TextDecoder("windows-1251").decode(bytes); // на случай старой кодировки
}

async function loadZip() {
  if (args.zip) {
    const fromName = path.basename(args.zip).match(/\d{4}-\d{2}-\d{2}/)?.[0];
    return { bytes: fs.readFileSync(args.zip), date: args.date || fromName || daysAgoSofia(1) };
  }
  // Без --date пробуем вчера, затем ещё 3 дня назад (если архив задержался)
  const dates = args.date ? [args.date] : [1, 2, 3, 4].map(daysAgoSofia);
  let lastErr;
  for (const date of dates) {
    const cached = path.join(here, ".work", `${date}.zip`); // повторный запуск в том же workflow — без нового скачивания
    if (fs.existsSync(cached)) {
      console.log(`↺ ${date}.zip из кэша`);
      return { bytes: new Uint8Array(fs.readFileSync(cached)), date };
    }
    const url = `https://kolkostruva.bg/opendata_files/${date}.zip`;
    console.log(`↓ ${url}`);
    try {
      const res = await fetch(url, { headers: { "User-Agent": "pazarko-ingest (+https://github.com)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length < 1000) throw new Error("слишком маленький файл");
      fs.mkdirSync(path.join(here, ".work"), { recursive: true });
      fs.writeFileSync(cached, bytes);
      return { bytes, date };
    } catch (e) {
      lastErr = e;
      console.warn(`  нет архива за ${date}: ${e.message}`);
    }
  }
  throw new Error(`Не удалось скачать архив (${lastErr?.message}). Проверьте https://kolkostruva.bg/opendata`);
}

const { bytes, date } = await loadZip();
const entries = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
const rows = [];
let files = 0;
const errors = [];
// Защита от ошибок в архиве: бывает, что файл одной сети содержит копию данных другой
// (например, «Кауфланд» с магазинами «Лили Дрогерие»). Одинаковые файлы — оставляем тот,
// чьё название совпадает с названиями магазинов внутри.
const seen = new Map(); // хэш → имя файла
const skip = new Set();
const hashOf = (bytes) => createHash("sha1").update(bytes).digest("hex");
const tokens = (name) =>
  name.replace(/_\d+\.csv$/i, "").toUpperCase().split(/[^\p{L}]+/u).filter((t) => t.length >= 4 && !/^(ЕООД|ООД|БЪЛГАРИЯ|EOOD|ГРУП)$/.test(t));
const matchesStores = (name, text) => {
  const head = text.slice(0, 20000).toUpperCase();
  return tokens(name).some((t) => head.includes(t));
};
for (const [name, data] of Object.entries(entries)) {
  if (!/\.csv$/i.test(name)) continue;
  const h = hashOf(data);
  const prev = seen.get(h);
  if (prev) {
    const text = decode(data);
    const keepNew = matchesStores(name, text) && !matchesStores(prev, text);
    const drop = keepNew ? prev : name;
    skip.add(drop);
    if (keepNew) seen.set(h, name);
    console.warn(`  ! «${drop}» — копия данных другой сети, пропускаю`);
  } else seen.set(h, name);
}

for (const [name, data] of Object.entries(entries)) {
  if (!/\.csv$/i.test(name) || skip.has(name)) continue;
  files++;
  try {
    for (const r of parseChainCsv(decode(data), name)) rows.push(r); // без spread: у крупных сетей сотни тысяч строк
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
  }
}
console.log(`CSV-файлов: ${files}, строк: ${rows.length}, ошибок разбора: ${errors.length}`);
errors.slice(0, 5).forEach((e) => console.warn("  ! " + e));
if (!rows.length) throw new Error("В архиве не найдено ни одной корректной строки");

const settlements = JSON.parse(fs.readFileSync(path.join(here, "ref/settlements.json"), "utf8"));
const norm = normalizeSizes(rows);
const parsedPct = Math.round(
  (100 * Object.values(norm.stat).reduce((a, s) => a + s.parsed, 0)) / Math.max(1, Object.values(norm.stat).reduce((a, s) => a + s.total, 0)),
);
console.log(`Фасовки распознаны: ${parsedPct}% строк в группах с разными размерами`);
// Координаты магазинов и кварталов (накапливаются скриптом geocode.mjs, хранятся в репозитории)
const readJson = (f, dflt) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : dflt);
const geoStores = readJson(path.join(here, "geo/stores.json"), {});
const geoAreas = readJson(path.join(here, "geo/areas.json"), {});
const geo = Object.fromEntries(Object.entries(geoStores).filter(([, v]) => Array.isArray(v) && v.length >= 2));
const { index, files: out, storesIndex, stats } = aggregate(norm.rows, { date, settlements, geo, areas: geoAreas });

const outDir = path.resolve(args.out && args.out !== true ? args.out : path.join(here, "out"));
fs.mkdirSync(path.join(outDir, "city"), { recursive: true });
const products = JSON.parse(fs.readFileSync(path.join(here, "ref/products.json"), "utf8"));
for (const p of products.products) {
  const g = RANGE_GROUPS[p.id];
  if (g) p.ref = { unit: g.unit, size: g.ref }; // цена в данных — за эту фасовку
  if (BRANDS[p.id]) p.hasBrands = true; // можно выбрать марку
}
fs.writeFileSync(path.join(outDir, "products.json"), JSON.stringify(products));
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index));
for (const [rel, obj] of Object.entries(out)) {
  fs.mkdirSync(path.dirname(path.join(outDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(outDir, rel), JSON.stringify(obj));
}
// Список магазинов для geocode.mjs (не публикуется)
fs.mkdirSync(path.join(here, ".work"), { recursive: true });
fs.writeFileSync(path.join(here, ".work/stores-index.json"), JSON.stringify(storesIndex));
const withGeo = storesIndex.filter((s) => geo[s.sid]).length;
console.log(`Магазинов-супермаркетов: ${storesIndex.length}, с координатами: ${withGeo}`);

console.log(`Отсеяно аномальных цен: ${stats.dropped}. Городов: ${stats.cities}. → ${outDir}`);
console.log("Топ городов:", index.cities.slice(0, 5).map((c) => `${c.name} (${c.chains} сетей)`).join(", "));
