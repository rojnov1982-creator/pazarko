// Извлечение адреса из названия магазина в данных КЗП.
// Форматы у сетей разные: «Билла 101 СОФИЯ БУЛ.БЪЛГАРИЯ 55», «187 - София/ул. Ладога 3»,
// «обект: НДК адрес: гр. София ул.Фритьоф Нансен 37 А», «МАГАЗИН 101 МЛАДОСТ 4».
// Возвращаем несколько вариантов запроса — от точного (улица + номер) к примерному (квартал).

const STREET = /(?:^|[\s,.(/-])((?:улица|ул|булевард|бул|площад|пл)\.?\s*["„“]?[^,;()/"“”]{2,60}?["“”]?(?:\s*(?:№|N|NO:?|No\.?)?\s*\d+[а-яa-z]?)?)(?=$|[,;()/]|\s+(?:до|срещу|бл|вх|ет|ниво|маг)\b)/i;
const AREA = /(?:^|[\s,.(/-])((?:ж\.?\s?к|жк|ж-к|кв|квартал|к-с)\.?\s*["„“]?[А-Яа-яA-Za-z][^,;()/"“”0-9]{2,40}(?:\s\d{1,2}(?!\d))?)/i;

// \b в JS не работает с кириллицей — границы слова задаём через Unicode-классы
const W = (alts) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts})(?![\\p{L}\\p{N}])\\.?`, "giu");
const NOISE = W("магазин|маг|супермаркет|хипермаркет|маркет|обект|адрес|онлайн|склад|централен|фирмен|гр|град|ниво|етаж|търговски|мол|mall|grand|ООД|ЕООД|ЕАД|АД");
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const clean = (s) =>
  s
    .replace(/[„“”"«»]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*[,.-]\s*$/, "")
    .trim();

const tidyStreet = (s) =>
  clean(
    s
      .replace(/\b(NO:?|No\.?|N)\s*(?=\d)/g, "")
      .replace(/№\s*/g, "")
      .replace(/^(улица|ул)\.?\s*/i, "ул. ")
      .replace(/^(булевард|бул)\.?\s*/i, "бул. ")
      .replace(/^(площад|пл)\.?\s*/i, "пл. "),
  );

const tidyArea = (s) =>
  clean(
    s
      .replace(/^(ж\.?\s?к|жк|ж-к|к-с)\.?\s*/i, "")
      .replace(/^(кв|квартал)\.?\s*/i, "")
      .replace(/\s(улица|ул|булевард|бул|пл)(?![\p{L}]).*$/iu, ""),
  );

/**
 * @param {string} label название магазина
 * @param {string} chain название сети (вырезается из текста)
 * @param {string} cityName «гр. София»
 * @returns {{ q: string, quality: "street" | "area" | "free" }[]}
 */
export function addressCandidates(label, chain, cityName) {
  const city = cityName.replace(/^(гр|с)\.\s*/, "");
  const cityRe = new RegExp(`(?<![\\p{L}])(?:гр\\.?\\s*)?${esc(city)}(?![\\p{L}])`, "giu");
  let s = ` ${label.replace(/[„“”"«»]/g, "")} `;
  // «обект: X адрес: Y» → Y
  const adr = s.match(/адрес:\s*(.+)$/i);
  if (adr) s = ` ${adr[1]} `;
  // «187 - София/ул. Ладога 3» → часть после «/»
  const slash = s.match(/^\s*\d+\s*-\s*[^/]+\/(.+)$/);
  if (slash) s = ` ${slash[1]} `;
  // название сети и код магазина в начале
  for (const w of chain.split(/\s+/).filter((x) => x.length >= 3)) s = s.replace(W(esc(w)), " ");
  s = s.replace(/\(H\d+\)/gi, " ").replace(/^\s*[А-ЯA-Z]?\d{1,4}\s*-\s*/, " ").replace(/\b\d{4}\b(?=\s*,?\s*гр)/g, " ");
  s = s.replace(cityRe, " ").replace(/\s+/g, " ").trim();

  const out = [];
  const st = s.match(STREET);
  if (st) {
    const full = tidyStreet(st[1]).replace(/\s+(между|до|срещу|бл\.?|вх\.?)(?![\p{L}]).*$/iu, "");
    out.push({ q: `${full}, ${city}`, quality: "street" });
    // В OpenStreetMap у многих домов в Болгарии нет номеров — пробуем без «ул.» и без номера
    const bare = full.replace(/^(ул|бул|пл)\.\s*/i, "");
    if (bare !== full) out.push({ q: `${bare}, ${city}`, quality: "street" });
    const noNum = bare.replace(/\s*\d+[а-яa-z]?$/iu, "").trim();
    if (noNum && noNum !== bare && noNum.length >= 3) {
      const prefix = full.match(/^(ул|бул|пл)\./i)?.[0];
      out.push({ q: `${prefix ? prefix + " " : ""}${noNum}, ${city}`, quality: "area" });
      out.push({ q: `${noNum}, ${city}`, quality: "area" });
    }
  }
  const ar = s.match(AREA);
  if (ar) {
    const a = tidyArea(ar[1]);
    if (st) out.push({ q: `${tidyStreet(st[1])}, ${a}, ${city}`, quality: "street" });
    out.push({ q: `${a}, ${city}`, quality: "area" });
  }
  if (!st) {
    // «МАГАЗИН 101 МЛАДОСТ 4», «СЛАТИНА», «БУРЛЕКС НАДЕЖДА - НАДЕЖДА 4 ЕКЗАРХ СТЕФАН ДО БЛ. 462»
    const parts = s.split(/\s[-–]\s/).reverse(); // сначала часть после « - » (обычно адрес)
    for (const part of parts) {
      const rest = clean(
        part
          .replace(/\s(до|срещу|зад|до блок|бл)\b.*$/iu, " ")
          .replace(/(?<![\p{L}])(до|срещу|зад|бл|блок|вх)\.?\s*\d*.*$/iu, " ")
          .replace(NOISE, " ")
          .replace(/\b(NO:?|No\.?)\s*/g, "")
          .replace(/(?<![\p{N}])\d{2,4}(?![\p{N}])/gu, " ")
          .replace(/[-–/,]+/g, " "),
      );
      if (rest.length >= 4 && rest.length <= 40) out.push({ q: `${rest}, ${city}`, quality: ar ? "area" : "free" });
    }
  }
  // уникальные
  const seen = new Set();
  return out.filter((c) => (seen.has(c.q) ? false : (seen.add(c.q), true)));
}

/** Расстояние между точками, км */
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
