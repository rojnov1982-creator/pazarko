// Сохранённое состояние и кэш данных: разбор сохранённого, очистка старых версий, возраст цен.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cacheKey,
  dataAgeDays,
  expiredCacheKeys,
  OLD_PRICES_DAYS,
  otherVersionKeys,
  parseSaved,
} from "../src/lib/persist";

test("сохранённое состояние: корзина, любимые, настройки и город восстанавливаются", () => {
  const s = parseSaved(
    JSON.stringify({
      ekatte: "68134",
      basket: [{ productId: 1, qty: 2 }, { productId: 6, qty: 0 }, null, { productId: "x", qty: 1 }],
      settings: { maxStores: 3, analytics: true, areas: { "68134": { mode: "city" } }, excludedChains: ["123"] },
      shopping: { startedAt: "2026-11-10", stores: [{ chain: "Lidl", lines: [] }], checked: ["a|1", 5] },
      favorites: [{ id: "f1", name: "Луканка", words: ["ЛУКАНКА"] }, { id: "", words: [] }, { id: "f2" }],
    }),
  );
  assert.ok(s);
  assert.equal(s.ekatte, "68134");
  assert.deepEqual(s.basket, [{ productId: 1, qty: 2 }]);
  assert.equal(s.settings?.maxStores, 3);
  assert.equal(s.settings?.analytics, true);
  assert.deepEqual(s.shopping?.checked, ["a|1"]);
  assert.equal(s.favorites?.length, 1);
});

test("сохранённого нет или оно испорчено: null, а не пустое состояние вместо сохранённого", () => {
  assert.equal(parseSaved(null), null);
  assert.equal(parseSaved(""), null);
  assert.equal(parseSaved('{"basket":[{"productId":1'), null); // обрезанный JSON
  assert.equal(parseSaved("[1,2]"), null);
  assert.equal(parseSaved('"text"'), null);
});

test("поля неверной формы пропускаются, остальное восстанавливается", () => {
  const s = parseSaved(
    JSON.stringify({
      ekatte: 68134,
      basket: "нет",
      settings: { areas: "x", excludedChains: null, lang: "en" },
      shopping: { stores: "нет" },
      favorites: {},
    }),
  );
  assert.ok(s);
  assert.equal(s.ekatte, null);
  assert.equal(s.basket, undefined);
  assert.deepEqual(s.settings, { lang: "en" }); // areas и excludedChains возьмутся из значений по умолчанию
  assert.equal(s.shopping, undefined);
  assert.equal(s.favorites, undefined);
});

test("режим покупок без списка отметок: отметки пустые, экран не падает", () => {
  const s = parseSaved(JSON.stringify({ shopping: { stores: [] } }));
  assert.deepEqual(s?.shopping?.checked, []);
});

test("кэш: после новой версии файла его прежние версии удаляются, другие файлы — нет", () => {
  const keys = [
    cacheKey("city/68134.json", "2026-11-08T05:00:00Z"),
    cacheKey("city/68134.json", "2026-11-09T05:00:00Z"),
    cacheKey("city/68134.json", "2026-11-10T05:00:00Z"),
    cacheKey("city/68134/s/abc.json", "2026-11-08T05:00:00Z"),
    cacheKey("city/10135.json", "2026-11-08T05:00:00Z"),
    cacheKey("index.json"),
    "pazarko:v1",
  ];
  assert.deepEqual(otherVersionKeys(keys, "city/68134.json", "2026-11-10T05:00:00Z"), [
    cacheKey("city/68134.json", "2026-11-08T05:00:00Z"),
    cacheKey("city/68134.json", "2026-11-09T05:00:00Z"),
  ]);
  assert.deepEqual(otherVersionKeys(keys, "index.json", ""), []);
});

test("кэш: версии старше недели удаляются; текущая версия, список городов и состояние приложения остаются", () => {
  const now = Date.parse("2026-11-11T08:00:00Z");
  const cur = "2026-10-20T05:00:00Z"; // обновление стоит три недели: текущую версию всё равно не трогаем
  const keys = [
    cacheKey("city/68134.json", cur),
    cacheKey("city/10135.json", "2026-11-01T05:00:00Z"),
    cacheKey("city/10135/s/abc.json", "2026-11-03"),
    cacheKey("city/56784.json", "2026-11-09T05:00:00Z"),
    cacheKey("index.json"),
    "pazarko:v1",
    "pazarko:v1:corrupt",
  ];
  assert.deepEqual(expiredCacheKeys(keys, cur, now), [
    cacheKey("city/10135.json", "2026-11-01T05:00:00Z"),
    cacheKey("city/10135/s/abc.json", "2026-11-03"),
  ]);
  // хранилище заполнено: освобождаем всё, кроме текущей версии и ключей без версии
  assert.deepEqual(expiredCacheKeys(keys, cur, now, 0), [
    cacheKey("city/10135.json", "2026-11-01T05:00:00Z"),
    cacheKey("city/10135/s/abc.json", "2026-11-03"),
    cacheKey("city/56784.json", "2026-11-09T05:00:00Z"),
  ]);
});

test("возраст цен: вчерашние и позавчерашние — норма, от трёх дней — предупреждение", () => {
  assert.equal(dataAgeDays("2026-11-10", "2026-11-11"), 1);
  assert.equal(dataAgeDays("2026-11-09", "2026-11-11"), 2);
  assert.equal(dataAgeDays("2026-11-08", "2026-11-11"), 3);
  assert.equal(dataAgeDays("2026-10-30", "2026-11-02"), 3); // через границу месяца
  assert.equal(dataAgeDays("2026-11-12", "2026-11-11"), 0); // дата «из будущего» (другой часовой пояс)
  assert.equal(dataAgeDays("", "2026-11-11"), 0);
  assert.ok(dataAgeDays("2026-11-09", "2026-11-11") < OLD_PRICES_DAYS);
  assert.ok(dataAgeDays("2026-11-08", "2026-11-11") >= OLD_PRICES_DAYS);
});
