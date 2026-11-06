// Брошюры сетей → brochures.json для приложения.
//
// Вход: data-pipeline/brochures/*.csv — разборы брошюр в формате v1 (30 колонок, как в Media Radar / навык brochure-offers).
// Только открытые источники (сайты сетей, агрегаторы брошюр): репозиторий публичный.
//
// Выход: <out>/brochures.json — действующие предложения и те, что начнутся в ближайшие UPCOMING_DAYS дней;
//        <out>/history/<ГГГГ-ММ>.json — все предложения всех разобранных недель по месяцам, history/index.json — месяцы.
// Для предложений с понятной фасовкой считается цена за эталонную фасовку группы КЗП (rp) —
// её приложение сравнивает с ценой в плане корзины.
//
//   node brochures.mjs --out ../site [--today 2026-11-06] [--in <папка с CSV>]

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { FIXED_GROUPS, RANGE_GROUPS } from "./lib/sizes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith("--") ? [...a, [x.slice(2), all[i + 1] ?? true]] : a), []),
);
const outDir = path.resolve(args.out && args.out !== true ? args.out : path.join(here, "out"));
const UPCOMING_DAYS = 7;

/** Сегодня по Софии (YYYY-MM-DD) */
const today =
  typeof args.today === "string"
    ? args.today
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const horizon = addDays(today, UPCOMING_DAYS);

/** Сеть из брошюры → как её искать в названиях сетей КЗП (заглавные, только буквы) */
const CHAINS = {
  Kaufland: ["КАУФЛАНД", "KAUFLAND"],
  Lidl: ["ЛИДЛ", "LIDL"],
  Billa: ["БИЛЛА", "BILLA"],
  Fantastico: ["ФАНТАСТИКО", "FANTASTICO"],
  "T Market": ["ТМАРКЕТ", "TMARKET"],
  Metro: ["МЕТРО", "METRO"],
};

// Эталонная фасовка группы: на вес — 1 кг; группы с фасовками — из sizes.mjs
const refProducts = JSON.parse(fs.readFileSync(path.join(here, "ref/products.json"), "utf8")).products;
const byWeight = new Set(refProducts.filter((p) => p.byWeight).map((p) => p.id));
function groupRef(g) {
  if (byWeight.has(g)) return { unit: "kg", ref: 1 };
  return RANGE_GROUPS[g] ?? FIXED_GROUPS[g] ?? null;
}

const num = (s) => {
  const v = Number(String(s ?? "").replace(",", ".").trim());
  return Number.isFinite(v) && String(s ?? "").trim() !== "" ? v : null;
};
const r2 = (v) => (v == null ? undefined : Math.round(v * 100) / 100);

const dir = path.resolve(args.in && args.in !== true ? args.in : path.join(here, "brochures"));
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".csv")).sort() : [];

const chainIdx = new Map();
const typeIdx = new Map();
const idx = (m, v) => (m.has(v) ? m.get(v) : (m.set(v, m.size), m.size - 1));
const offers = [];
const seen = new Set();
const stats = { files: files.length, rows: 0, expired: 0, future: 0, noChain: 0, dup: 0, comparable: 0 };

// История брошюр по месяцам: каждое предложение каждой недели (не только последнее — иначе будущая акция затирала бы
// прошедшую), с ценой, обычной ценой и УСЛОВИЯМИ (механика, текст условия, «с карта»). Месяц — по дате начала акции.
// Приложение само решает, что «последно в акция» (уже закончилась), что «сега», что «скоро».
const historyByMonth = new Map(); // "2026-11" → Map(ключ → запись)
const cleanName = (s) =>
  (s ?? "")
    .split("•")[0]
    .replace(/(^|\s)(МЕ|ME)\s*=\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
function remember(r, chain, from, to) {
  const name = cleanName(r.product);
  if (!name) return;
  const brand = (r.brand ?? "").trim() || undefined;
  const price = num(r.effective_eur) ?? num(r.price_eur);
  const regular = num(r.regular_eur);
  const mech = (r.mechanic ?? "").trim();
  const conditional = /multibuy|tiered|code_threshold|promo_pack|pct_no_price/.test(mech);
  const key = [chain, name.toLowerCase(), (brand ?? "").toLowerCase(), from, to, price].join("|");
  const month = from.slice(0, 7);
  const m = historyByMonth.get(month) ?? new Map();
  historyByMonth.set(month, m);
  if (m.has(key)) return;
  const qty = num(r.total_qty);
  const unit = (r.unit ?? "").trim();
  const ppu = !(r.check ?? "").trim() && price && qty && unit ? r2(price / qty) : undefined;
  m.set(key, {
    chain,
    n: name,
    b: brand,
    g: num(String(r.kzp_group ?? "").split("/")[0]) || undefined,
    a: num(r.cat) ?? undefined,
    f: from,
    t: to,
    p: r2(price),
    r: regular && price && regular > price ? r2(regular) : undefined,
    u: ppu ? `${ppu}/${unit}` : undefined,
    k: mech.includes("card_app") ? 1 : undefined,
    m: conditional ? mech : undefined,
    w: (r.condition ?? "").trim() || undefined,
  });
}

for (const f of files) {
  const rows = parse(fs.readFileSync(path.join(dir, f), "utf8"), { columns: true, bom: true, skip_empty_lines: true, relax_column_count: true });
  for (const r of rows) {
    stats.rows++;
    const chain = (r.chain ?? "").trim();
    if (!CHAINS[chain]) {
      stats.noChain++;
      continue;
    }
    const from = r.valid_from || r.brochure_from;
    const to = r.valid_to || r.brochure_to;
    if (!from || !to) continue;
    remember(r, chain, from, to); // история: все недели, включая прошедшие
    if (to < today) {
      stats.expired++;
      continue;
    }
    if (from > horizon) {
      stats.future++;
      continue;
    }
    const mech = (r.mechanic ?? "").trim();
    const price = num(r.effective_eur) ?? num(r.price_eur);
    const regular = num(r.regular_eur);
    const pctPrinted = num(r.discount_printed);
    const pctCalc = num(r.discount_calc_pct);
    let pct = Math.abs(Math.round(pctCalc ?? pctPrinted ?? (price && regular ? (1 - price / regular) * 100 : 0))) || undefined;
    // напечатанная и расчётная скидки расходятся — верим напечатанной, старую цену не показываем;
    // скидка больше 70% без напечатанного процента — чаще ошибка разбора (цена другой фасовки), не показываем её
    const mismatch = pctPrinted != null && pctCalc != null && Math.abs(Math.abs(pctPrinted) - Math.abs(pctCalc)) > 10;
    const oddDiscount = mismatch || (pct != null && pct > 70 && pctPrinted == null);
    if (mismatch) pct = Math.abs(Math.round(pctPrinted));
    else if (oddDiscount) pct = undefined;
    // название: до первого «•» (у Metro дальше идут характеристики)
    const name = (r.product ?? "")
      .split("•")[0]
      .replace(/(^|\s)(МЕ|ME)\s*=\s*/g, "$1") // служебное «МЕ=» у Metro (мерна единица)
      .replace(/\s+/g, " ")
      .trim();
    if (!name) continue;
    const key = [chain, from, to, name, price].join("|");
    if (seen.has(key)) {
      stats.dup++;
      continue;
    }
    seen.add(key);

    const g = num(String(r.kzp_group ?? "").split("/")[0]) ?? 0;
    const card = mech.includes("card_app");
    // условные механики (купи 2, от суммы, код) не сравниваем с ценой КЗП
    const conditional = /multibuy|tiered|code_threshold|promo_pack|pct_no_price/.test(mech);
    const qty = num(r.total_qty);
    const unit = (r.unit ?? "").trim();
    const suspicious = !!(r.check ?? "").trim();

    let rp;
    const ref = g ? groupRef(g) : null;
    if (ref && price && qty && unit === ref.unit && !conditional && !suspicious && qty >= ref.ref * 0.2 && qty <= ref.ref * 5) {
      rp = r2((price / qty) * ref.ref);
      stats.comparable++;
    }
    const ppu = !suspicious && price && qty && unit ? r2(price / qty) : undefined;

    offers.push({
      // устойчивый идентификатор: приложение хранит его в корзине для закреплённой акции
      i: createHash("sha1").update(key).digest("hex").slice(0, 12),
      c: idx(chainIdx, chain),
      f: from,
      t: to,
      y: idx(typeIdx, (r.type ?? "").trim()),
      a: num(r.cat) ?? undefined, // раздел: 1–12 храни и напитки, 13 химия, 15 животни, 16–17 дом и техника
      g: g || undefined,
      b: (r.brand ?? "").trim() || undefined,
      o: r.own_label === "1" ? 1 : undefined,
      n: name,
      p: r2(price),
      r: !oddDiscount && regular && price && regular > price ? r2(regular) : undefined,
      d: pct,
      u: ppu ? `${ppu}/${unit}` : undefined,
      rp,
      k: card ? 1 : undefined,
      m: conditional ? mech : undefined,
      w: (r.condition ?? "").trim() || undefined,
    });
  }
}

// Сначала крупные скидки
offers.sort((a, b) => (b.d ?? 0) - (a.d ?? 0));

const result = {
  v: 1,
  generatedAt: new Date().toISOString(),
  today,
  chains: [...chainIdx.keys()].map((name) => ({ name, match: CHAINS[name] })),
  types: [...typeIdx.keys()],
  offers,
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "brochures.json"), JSON.stringify(result));

// история: history/<ГГГГ-ММ>.json + history/index.json (список месяцев); сети — по названию в каждом файле
const histDir = path.join(outDir, "history");
fs.mkdirSync(histDir, { recursive: true });
const months = [...historyByMonth.keys()].sort();
let histTotal = 0;
for (const month of months) {
  const chains = [];
  const ci = (name) => (chains.includes(name) ? chains.indexOf(name) : chains.push(name) - 1);
  const items = [...historyByMonth.get(month).values()]
    .sort((x, y) => (y.f < x.f ? -1 : y.f > x.f ? 1 : 0))
    .map(({ chain, ...h }) => ({ ...h, c: ci(chain) }));
  histTotal += items.length;
  fs.writeFileSync(path.join(histDir, `${month}.json`), JSON.stringify({ v: 2, month, chains, items }));
}
fs.writeFileSync(path.join(histDir, "index.json"), JSON.stringify({ v: 2, generatedAt: result.generatedAt, months }));

console.log(
  `Брошюры: файлов ${stats.files}, строк ${stats.rows} → предложений ${offers.length} ` +
    `(сравнимых с КЗП ${stats.comparable}; истекли ${stats.expired}, позже ${UPCOMING_DAYS} дн. ${stats.future}, ` +
    `дубли ${stats.dup}, неизвестная сеть ${stats.noChain}) → ${outDir}/brochures.json; ` +
    `история: ${histTotal} предложений за ${months.length} мес. → history/`,
);
