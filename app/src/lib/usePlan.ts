// Один расчёт плана для корзины и экрана «План»: предварительная сумма в корзине и итог не расходятся.

import { useCallback, useMemo } from "react";
import { todayIso } from "./brochures";
import { optimizeBasket, type ItemMeta } from "./optimize";
import { itemKey, pinStatus, type PinStatus } from "./pins";
import { FREE_MAX_STORES } from "./premium";
import { excludedIndexes } from "./prices";
import { useStore } from "./store";

export function usePlan() {
  const st = useStore();
  const { city, basket, settings } = st;
  const today = todayIso();

  // без Premium план ограничен FREE_MAX_STORES магазинами
  const maxStores =
    st.can("moreStores") || (settings.maxStores > 0 && settings.maxStores <= FREE_MAX_STORES) ? settings.maxStores : FREE_MAX_STORES;
  const excluded = useMemo(
    () => excludedIndexes(city, st.excludedEiks, settings.onlyGrocery),
    [city, st.excludedEiks, settings.onlyGrocery],
  );
  const meta = useCallback(
    (id: number): ItemMeta | undefined => {
      const p = st.productById.get(id);
      return p ? { byWeight: p.byWeight, ref: p.ref, std: p.std } : undefined;
    },
    [st.productById],
  );
  const opts = useMemo(
    () => ({ maxStores, usePromo: settings.usePromo, extraStoreCost: settings.extraStoreCost, excludedChains: [...excluded], meta, today }),
    [maxStores, settings.usePromo, settings.extraStoreCost, excluded, meta, today],
  );

  const result = useMemo(() => (city && basket.length ? optimizeBasket(city, basket, opts) : null), [city, basket, opts]);

  /** Сколько стоит план, если разрешить на один магазин меньше: «второй магазин экономит X €» */
  const fewerStores = useMemo(() => {
    const n = result?.plan.stores.length ?? 0;
    if (!city || n < 2) return null;
    const r = optimizeBasket(city, basket, { ...opts, maxStores: n - 1, extraStoreCost: 0 });
    return r.plan.missing.length === result!.plan.missing.length ? r.plan : null;
  }, [city, basket, opts, result]);

  /** Без «цены лишнего магазина»: если с ней план другой, это надо объяснить отдельно */
  const noStoreCost = useMemo(() => {
    if (!city || !basket.length || settings.extraStoreCost <= 0) return null;
    return optimizeBasket(city, basket, { ...opts, extraStoreCost: 0 }).plan;
  }, [city, basket, opts, settings.extraStoreCost]);

  /** Статус закреплённых предложений по ключу позиции */
  const pinStatuses = useMemo(() => {
    const m = new Map<string, PinStatus>();
    for (const b of basket) if (b.pin) m.set(itemKey(b), pinStatus(b.pin, today, city, excluded).status);
    return m;
  }, [basket, today, city, excluded]);

  const found = result ? basket.length - result.plan.missing.length : 0;
  return { result, excluded, maxStores, today, found, total: basket.length, fewerStores, noStoreCost, pinStatuses, opts };
}
