// Приведение фасовок к сопоставимой цене.
//
// В группах КЗП вида «Сирене пакетирано от 200 г до 1 кг» рядом стоят пачки разного
// размера, поэтому сравнивать надо цену за кг/л. Размер берём из названия товара
// («...400ГР», «0.650», «2x100g», «М10») и проверяем, что он попадает в диапазон группы.
// Цена в данных приложения = цена за эталонную фасовку (ref), чтобы корзина считалась
// в привычных единицах: «1 пачка сирене 400 г».

/** Группы с диапазоном фасовок: единица, допустимый диапазон, эталонная фасовка */
export const RANGE_GROUPS = {
  1: { unit: "kg", min: 0.5, max: 1, ref: 0.6 },
  2: { unit: "kg", min: 0.5, max: 1, ref: 0.6 },
  3: { unit: "kg", min: 0.4, max: 0.6, ref: 0.5 },
  4: { unit: "kg", min: 0.4, max: 0.6, ref: 0.5 },
  5: { unit: "kg", min: 0.4, max: 0.5, ref: 0.4 },
  7: { unit: "kg", min: 0.37, max: 0.5, ref: 0.4 },
  9: { unit: "kg", min: 0.2, max: 1, ref: 0.4 },
  11: { unit: "kg", min: 0.2, max: 1, ref: 0.4 },
  12: { unit: "kg", min: 0.125, max: 0.25, ref: 0.2 },
  14: { unit: "kg", min: 0.2, max: 1, ref: 0.5 },
  27: { unit: "kg", min: 0.3, max: 1, ref: 0.5 },
  28: { unit: "kg", min: 0.25, max: 1, ref: 0.3 },
  31: { unit: "pcs", min: 6, max: 10, ref: 10 },
  32: { unit: "pcs", min: 6, max: 10, ref: 10 },
  36: { unit: "kg", min: 0.4, max: 0.5, ref: 0.5 },
  46: { unit: "kg", min: 0.4, max: 0.8, ref: 0.4 },
  47: { unit: "kg", min: 0.4, max: 0.8, ref: 0.4 },
  48: { unit: "kg", min: 0.4, max: 0.8, ref: 0.4 },
  49: { unit: "kg", min: 0.4, max: 0.8, ref: 0.5 },
  63: { unit: "kg", min: 0.19, max: 0.25, ref: 0.2 },
  64: { unit: "kg", min: 0.19, max: 0.25, ref: 0.2 },
  65: { unit: "kg", min: 0.4, max: 0.8, ref: 0.4 },
  68: { unit: "kg", min: 0.1, max: 0.5, ref: 0.2 },
  69: { unit: "kg", min: 0.08, max: 0.1, ref: 0.1 },
  70: { unit: "kg", min: 0.2, max: 0.25, ref: 0.25 },
  79: { unit: "l", min: 0.4, max: 1.5, ref: 0.5 },
  81: { unit: "l", min: 0.05, max: 0.125, ref: 0.075 },
  82: { unit: "l", min: 0.25, max: 0.5, ref: 0.4 },
};

/**
 * Группы с одной фасовкой («1 л», «1 кг», «750 мл»), которые продаются упаковками.
 * Если в названии виден другой размер (бутылка 500 мл в группе «1 л»), цена пересчитывается
 * на эталон; если размер не указан — считаем, что упаковка стандартная.
 */
export const FIXED_GROUPS = {
  6: { unit: "l", ref: 1 },
  33: { unit: "kg", ref: 1 },
  34: { unit: "kg", ref: 1 },
  35: { unit: "kg", ref: 1 },
  37: { unit: "kg", ref: 0.5 },
  38: { unit: "kg", ref: 1 },
  39: { unit: "kg", ref: 1 },
  40: { unit: "kg", ref: 1 },
  41: { unit: "kg", ref: 1 },
  42: { unit: "l", ref: 1 },
  43: { unit: "l", ref: 1 },
  44: { unit: "l", ref: 0.7 },
  45: { unit: "l", ref: 0.7 },
  71: { unit: "kg", ref: 1 },
  74: { unit: "l", ref: 2 },
  75: { unit: "l", ref: 0.75 },
  76: { unit: "l", ref: 0.75 },
  77: { unit: "l", ref: 0.7 },
};
for (const g of Object.values(FIXED_GROUPS)) {
  g.min = g.ref * 0.25;
  g.max = g.ref * 3;
}

const num = (s) => Number(String(s).replace(",", "."));
const inRange = (v, g) => v >= g.min * 0.9 && v <= g.max * 1.1;

const UNIT = /(?:(\d{1,2})\s*[xх*]\s*)?(\d+(?:[.,]\d+)?)\s*(кг|kg|гр|gr|г|g|мл|ml|лт|lt|л|l)(?![a-zа-я])/gi;
const BARE_DEC = /(?<![\d/.,])(\d{1,2}[.,]\d{2,3})(?![\d%.,])/g;
const BARE_INT = /(?<![\d/.,\-#])(\d{2,4})(?![\d.,/\-%])/g;
const EGGS = [/(?:^|[^\d])(\d{1,2})\s*(?:бр|-?ца|броя|pcs)/i, /(?:^|[\s*])[МMLЛ]\s?-?(\d{1,2})(?!\d)/i];

/** Размер фасовки в единицах группы (кг, л или шт.) либо null */
export function parseSize(name, g) {
  const s = name.toLowerCase();
  if (g.unit === "pcs") {
    for (const re of EGGS) {
      const m = s.match(re);
      if (m && inRange(num(m[1]), g)) return num(m[1]);
    }
    return null;
  }
  // 1) явная единица: «400 гр», «0,5 л», «2x100g»
  for (const m of s.matchAll(UNIT)) {
    const mult = m[1] ? num(m[1]) : 1;
    let v = num(m[2]);
    const u = m[3];
    if (/^(гр|gr|г|g|мл|ml)$/.test(u)) v /= 1000;
    v *= mult;
    if (inRange(v, g)) return v;
  }
  // 2) десятичное без единицы: «0.650», «0,400» → кг/л
  for (const m of s.matchAll(BARE_DEC)) {
    const v = num(m[1]);
    if (inRange(v, g)) return v;
  }
  // 3) целое без единицы: «400», «680» → граммы/мл
  for (const m of s.matchAll(BARE_INT)) {
    const v = num(m[1]) / 1000;
    if (inRange(v, g)) return v;
  }
  return null;
}

/**
 * Приводит строки диапазонных групп к цене за эталонную фасовку.
 * Строки, у которых размер не распознан, отбрасываются (честнее, чем сравнивать 200 г с 1 кг).
 */
export function normalizeSizes(rows) {
  const out = [];
  const stat = {};
  for (const r of rows) {
    const fixed = FIXED_GROUPS[r.productId];
    if (fixed) {
      const size = parseSize(r.product, fixed);
      if (size == null || Math.abs(size - fixed.ref) / fixed.ref < 0.05) {
        out.push(r); // стандартная упаковка
      } else {
        const k = fixed.ref / size;
        out.push({ ...r, packPrice: r.price, packPromo: r.promo, price: r.price * k, promo: r.promo != null ? r.promo * k : null });
      }
      continue;
    }
    const g = RANGE_GROUPS[r.productId];
    if (!g) {
      out.push(r);
      continue;
    }
    const st = (stat[r.productId] ??= { total: 0, parsed: 0 });
    st.total++;
    const size = parseSize(r.product, g);
    if (size == null) continue;
    st.parsed++;
    const k = g.ref / size;
    out.push({
      ...r,
      packPrice: r.price,
      packPromo: r.promo,
      price: r.price * k,
      promo: r.promo != null ? r.promo * k : null,
    });
  }
  return { rows: out, stat };
}
