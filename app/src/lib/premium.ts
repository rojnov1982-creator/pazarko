// Платные функции Пазарко.
//
// Пока в app.json → expo.extra.premiumEnabled = false, ВСЕ функции открыты для всех:
// так собираем пользователей и смотрим, чем они пользуются. Когда будете готовы
// продавать подписку — поставьте true, подключите покупки (например, RevenueCat)
// и выставляйте settings.isPremium после успешной покупки.

import Constants from "expo-constants";
import type { TKey } from "./i18n";

export type Feature =
  | "moreStores" // план в 3 магазинах и без ограничения (бесплатно — 1–2)
  | "brandMode" // выбор марки у товара + подсказки супер оферт
  | "savedBaskets" // несколько сохранённых корзин (скоро)
  | "priceAlerts" // уведомления об акциях на товары из корзины (скоро)
  | "priceHistory" // история цен (скоро)
  | "nearbyStores"; // ближайшие магазины (скоро)

/** Что показываем на экране Premium; `ready: false` — функция ещё в разработке */
export const PREMIUM_FEATURES: { id: Feature; title: TKey; emoji: string; ready: boolean }[] = [
  { id: "moreStores", title: "pfMoreStores", emoji: "🛒", ready: true },
  { id: "brandMode", title: "pfBrandMode", emoji: "🏷️", ready: true },
  { id: "savedBaskets", title: "pfSavedBaskets", emoji: "🗂️", ready: false },
  { id: "priceAlerts", title: "pfPriceAlerts", emoji: "🔔", ready: false },
  { id: "priceHistory", title: "pfPriceHistory", emoji: "📈", ready: false },
  { id: "nearbyStores", title: "pfNearbyStores", emoji: "📍", ready: false },
];

/** Бесплатный лимит магазинов в плане */
export const FREE_MAX_STORES = 2;

export const PREMIUM_ENABLED: boolean =
  process.env.EXPO_PUBLIC_PREMIUM_ENABLED === "1" ||
  !!(Constants.expoConfig?.extra as { premiumEnabled?: boolean } | undefined)?.premiumEnabled;

/** Доступна ли функция: всегда, пока Premium выключен; иначе — только подписчикам */
export function canUse(_feature: Feature, isPremium: boolean): boolean {
  return !PREMIUM_ENABLED || isPremium;
}
