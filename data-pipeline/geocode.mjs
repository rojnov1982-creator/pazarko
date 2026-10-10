#!/usr/bin/env node
// Координаты магазинов и кварталов через OpenStreetMap Nominatim.
//
//   node geocode.mjs [--max 700]
//
// Запускается в GitHub Actions после ingest.mjs. Берёт список магазинов из .work/stores-index.json,
// для новых магазинов ищет координаты по адресу из названия и сохраняет результат в geo/*.json
// (эти файлы коммитятся в репозиторий, поэтому каждый адрес ищется только один раз).
//
// Правила Nominatim: не больше 1 запроса в секунду, понятный User-Agent, кэширование результатов.
// https://operations.osmfoundation.org/policies/nominatim/
// Данные © участники OpenStreetMap, лицензия ODbL.

import fs from "node:fs";
import path from "node:path";
import { addressCandidates, distanceKm } from "./lib/address.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const MAX_REQUESTS = Number(arg("max", 700));
const RETRY_FAILED_DAYS = 30;
const UA = "Pazarko/1.0 (grocery price comparison; https://github.com/rojnov1982-creator/pazarko)";

const geoDir = process.env.GEO_DIR || path.join(here, "geo");
fs.mkdirSync(geoDir, { recursive: true });
const load = (f) => (fs.existsSync(path.join(geoDir, f)) ? JSON.parse(fs.readFileSync(path.join(geoDir, f), "utf8")) : {});
const save = (f, obj) => fs.writeFileSync(path.join(geoDir, f), JSON.stringify(obj, null, 0) + "\n");

const stores = load("stores.json"); // sid → [lat, lon, качество] | { failed: "YYYY-MM-DD" }
const cities = load("cities.json"); // ЕКАТТЕ → [lat, lon]
const areas = load("areas.json"); // ЕКАТТЕ → [[квартал, lat, lon], ...]
const areaTried = load("areas-tried.json"); // "ЕКАТТЕ|квартал" → дата

// Кварталы больших городов (координаты ищутся автоматически; добавить квартал — дописать название)
const KVARTALS = {
  "68134": [ // София
    "Младост 1", "Младост 2", "Младост 3", "Младост 4", "Студентски град", "Малинова долина", "Дървеница",
    "Мусагеница", "Дружба 1", "Дружба 2", "Люлин", "Надежда", "Обеля", "Красно село", "Красна поляна",
    "Лозенец", "Изток", "Изгрев", "Гео Милев", "Слатина", "Овча купел", "Бъкстон", "Манастирски ливади",
    "Борово", "Хаджи Димитър", "Сухата река", "Банишора", "Белите брези", "Хиподрума", "Иван Вазов",
    "Яворов", "Редута", "Подуяне", "Стрелбище", "Дианабад", "Бояна", "Драгалевци", "Симеоново",
    "Гоце Делчев", "Лагера", "Оборище", "Кръстова вада", "Витоша", "Горна баня", "Факултета", "Илинден",
    "Захарна фабрика", "Света Троица", "Разсадника", "Връбница", "Модерно предградие", "Левски",
    "Сердика", "Център", "Гевгелийски", "Христо Ботев", "Хаджи Димитър", "Полигона", "Горубляне",
  ],
  "56784": ["Тракия", "Смирненски", "Кючук Париж", "Изгрев", "Център", "Каменица", "Западен", "Христо Ботев", "Коматево", "Беломорски", "Остромила", "Въстанически"], // Пловдив
  "10135": ["Владиславово", "Чайка", "Младост", "Възраждане", "Левски", "Аспарухово", "Бриз", "Победа", "Трошево", "Гръцка махала", "Център", "Кайсиева градина", "Виница"], // Варна
  "07079": ["Славейков", "Изгрев", "Меден рудник", "Зорница", "Лазур", "Възраждане", "Братя Миладинови", "Победа", "Сарафово", "Център"], // Бургас
  "63427": ["Здравец", "Дружба", "Чародейка", "Родина", "Център", "Възраждане", "Ялта"], // Русе
  "68850": ["Железник", "Три чучура", "Самара", "Казански", "Център", "Зора", "Митрополит Методий Кусев"], // Стара Загора
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;
let last = 0;

async function nominatim(q) {
  if (requests >= MAX_REQUESTS) throw new Error("LIMIT");
  const wait = 1100 - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  last = Date.now();
  requests++;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=bg&accept-language=bg&q=${encodeURIComponent(q + ", България")}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "bg" } });
  if (res.status === 429 || res.status === 403) throw new Error(`HTTP ${res.status}`);
  if (!res.ok) return null;
  const j = await res.json();
  return j[0] ? [Number(j[0].lat), Number(j[0].lon)] : null;
}

const today = new Date().toISOString().slice(0, 10);
const daysSince = (d) => (Date.now() - new Date(d).getTime()) / 86400000;
const round5 = (n) => Math.round(n * 1e5) / 1e5;

const index = JSON.parse(fs.readFileSync(path.join(here, ".work/stores-index.json"), "utf8"));
// большие города — первыми
const cityCount = {};
for (const s of index) cityCount[s.ekatte] = (cityCount[s.ekatte] ?? 0) + 1;
index.sort((a, b) => cityCount[b.ekatte] - cityCount[a.ekatte]);

let found = 0, failed = 0, areasFound = 0;
const radius = (ekatte) => (cityCount[ekatte] > 100 ? 20 : 12); // км от центра города

async function cityCenter(ekatte, cityName) {
  if (cities[ekatte]) return cities[ekatte];
  const c = await nominatim(cityName.replace(/^(гр|с)\.\s*/, ""));
  if (c) cities[ekatte] = [round5(c[0]), round5(c[1])];
  return cities[ekatte];
}

try {
  // 1. Кварталы
  for (const [ekatte, names] of Object.entries(KVARTALS).sort((a, b) => (cityCount[b[0]] ?? 0) - (cityCount[a[0]] ?? 0))) {
    const cityName = index.find((s) => s.ekatte === ekatte)?.city;
    if (!cityName) continue;
    const center = await cityCenter(ekatte, cityName);
    const have = new Set((areas[ekatte] ?? []).map((a) => a[0]));
    for (const name of [...new Set(names)]) {
      const key = `${ekatte}|${name}`;
      if (have.has(name) || (areaTried[key] && daysSince(areaTried[key]) < RETRY_FAILED_DAYS)) continue;
      const c = await nominatim(`${name}, ${cityName.replace(/^(гр|с)\.\s*/, "")}`);
      if (c && (!center || distanceKm(center, c) <= radius(ekatte))) {
        (areas[ekatte] ??= []).push([name, round5(c[0]), round5(c[1])]);
        areasFound++;
      } else areaTried[key] = today;
    }
    areas[ekatte]?.sort((a, b) => a[0].localeCompare(b[0], "bg"));
  }

  // 2. Магазины
  for (const s of index) {
    const cur = stores[s.sid];
    if (Array.isArray(cur)) continue;
    if (cur?.failed && daysSince(cur.failed) < RETRY_FAILED_DAYS) continue;
    const center = await cityCenter(s.ekatte, s.city);
    let hit = null;
    for (const cand of addressCandidates(s.label, s.chain, s.city)) {
      const c = await nominatim(cand.q);
      if (c && (!center || distanceKm(center, c) <= radius(s.ekatte))) {
        hit = [round5(c[0]), round5(c[1]), cand.quality === "street" ? 1 : 2]; // 1 — точный адрес, 2 — квартал
        break;
      }
    }
    if (hit) {
      stores[s.sid] = hit;
      found++;
    } else {
      stores[s.sid] = { failed: today };
      failed++;
    }
  }
} catch (e) {
  if (e.message !== "LIMIT") console.warn("Остановлено:", e.message);
}

save("stores.json", stores);
save("cities.json", cities);
save("areas.json", areas);
save("areas-tried.json", areaTried);
const total = index.length;
const withGeo = index.filter((s) => Array.isArray(stores[s.sid])).length;
console.log(`Запросов: ${requests}. Новых координат: ${found} (не найдено: ${failed}), кварталов: ${areasFound}.`);
console.log(`Магазинов с координатами: ${withGeo} из ${total}.`);
