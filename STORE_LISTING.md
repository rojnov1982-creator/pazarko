# Тексты для App Store и Google Play

Вставляйте как есть. Лимиты символов проверены (в скобках — длина / лимит).
Адрес сайта — GitHub Pages: `https://rojnov1982-creator.github.io/pazarko`.
Разработчик / Developer: **Олег Рожнов / Oleg Rozhnov** (личный аккаунт Google Play), rojnov1982@gmail.com.
Имя разработчика в Play Console должно совпадать с именем в политике конфиденциальности (`site-static/privacy.html`).

---

## Общее

| Поле | Значение |
|---|---|
| Название | **Пазарко** (BG) / **Pazarko** (EN) |
| Категория | App Store: Покупки (Shopping), доп. — Еда и напитки · Google Play: Покупки (Shopping) |
| Цена | Бесплатно |
| Политика конфиденциальности | `https://rojnov1982-creator.github.io/pazarko/privacy.html` |
| Сайт / поддержка (Support URL) | `https://rojnov1982-creator.github.io/pazarko/` |
| Почта для связи | rojnov1982@gmail.com |
| Возрастной рейтинг | 4+ (Apple) · «Для всех» / PEGI 3 (Google) |
| Bundle ID / package | `bg.pazarko.app` |
| Страны | Болгария |

---

## 🇧🇬 Български

**App Store — подзаглавие** (28/30)
```
Най-евтината кошница наблизо
```

**App Store — промо текст** (до 170)
```
Брошурите на веригите и цените от КЗП на едно място. Съберете кошница и вижте къде да купите всичко, за да платите най-малко.
```

**App Store — ключови думи** (до 100, без интервали след запетая)
```
цени,промоции,супермаркет,кошница,пазаруване,брошури,оферти,намаления,спестяване,КЗП
```

**Google Play — кратко описание** (71/80)
```
Брошури и цени на веригите на едно място. Най-евтината кошница наблизо.
```

**Пълно описание** (App Store и Google Play; ~1430 / 4000)
```
Пазарко ви показва къде да пазарувате, за да платите най-малко.

Седмичните брошури на Kaufland, Lidl, Billa, Фантастико, T Market и Metro и ежедневните цени от КЗП — на едно място. Съберете кошница и Пазарко ще намери в кои магазини какво да купите.

ОФЕРТИ ЗА ВАС
• Актуалните предложения от брошурите — по раздели, вериги и дати
• „Кошница на седмицата“ — най-изгодните продукти в акция, добавени с един бутон
• Проверка с цените на КЗП: виждате дали намалението е истинско

ОПТИМАЛНАТА КОШНИЦА
• Какво да купите в кой магазин, за да платите най-малко
• Изберете 1, 2 или 3 магазина — Пазарко намира най-добрата комбинация
• Колко спестявате спрямо пазаруване само в един магазин
• Списък за пазаруване по магазини, който можете да споделите

ЛЮБИМИ ПРОДУКТИ
Напишете какво купувате редовно — например „Луканка Орехите“ — и Пазарко ще ви покаже, когато е в брошура.

ВАШИТЕ МАГАЗИНИ
Целия град, „Моите магазини“ или магазините близо до вас. Изключете веригите, в които не пазарувате. Оферти „с карта“ — по ваш избор.

ЛЕСЕН РЕЖИМ
По-едър текст и по-малко бутони.

БЕЗ РЕГИСТРАЦИЯ И РЕКЛАМИ
Кошницата ви се пази само на телефона. Анонимна статистика се изпраща само ако се съгласите.

Цените идват от отворените данни на Комисията за защита на потребителите (kolkostruva.bg) и от публичните брошури на веригите. Пазарко не е свързан с КЗП или с търговските вериги. Цената в конкретен магазин може да се различава от показаната.
```

**Какво ново (първа версия)**
```
Първа версия на Пазарко: брошурите на веригите, оптимална кошница, любими продукти, български и английски език.
```

---

## 🇬🇧 English

**App Store — subtitle** (27/30)
```
The cheapest grocery basket
```

**App Store — promotional text** (up to 170)
```
Supermarket leaflets and official prices in one place. Build a basket and see where to buy everything so you pay the least.
```

**App Store — keywords** (up to 100)
```
grocery,prices,supermarket,basket,deals,leaflets,promo,Bulgaria,shopping,save,cheap,discounts
```

**Google Play — short description** (75/80)
```
Supermarket leaflets and prices in one place. The cheapest basket near you.
```

**Full description** (~1330 / 4000)
```
Pazarko shows you where to shop so you pay the least.

The weekly leaflets of Kaufland, Lidl, Billa, Fantastico, T Market and Metro, plus daily prices from Bulgaria's consumer authority — all in one place. Build a basket and Pazarko works out what to buy in which store.

OFFERS FOR YOU
• Current leaflet offers by section, chain and date
• "Basket of the week" — the best deals, added with one tap
• Checked against official prices, so you can see whether a discount is real

THE OPTIMAL BASKET
• What to buy in which store to pay the least
• Pick 1, 2 or 3 stores — Pazarko finds the best combination
• How much you save compared with shopping in a single store
• A shopping list by store that you can share

FAVOURITE PRODUCTS
Type what you buy regularly and Pazarko shows you when it is on offer in a leaflet.

YOUR STORES
The whole city, "My stores" or the stores near you. Turn off the chains you don't use. Loyalty-card offers — your choice.

EASY MODE
Larger text and fewer buttons.

NO SIGN-UP, NO ADS
Your basket stays on your phone. Anonymous statistics are sent only if you agree.

Prices come from the open data of Bulgaria's Consumer Protection Commission (kolkostruva.bg) and the chains' public leaflets. Pazarko is not affiliated with the Commission or any retail chain. Prices in a specific store may differ.
```

**What's new (first version)**
```
First release of Pazarko: chain leaflets, the optimal basket, favourite products, Bulgarian and English.
```

---

## Анкеты о приватности

С версии с аналитикой (анонимная статистика PostHog, только по согласию — `app/src/lib/analytics.ts`).
Если сборка без ключа PostHog (`expo.extra.analytics.key` пустой), статистика не отправляется — тогда верны старые ответы «Data Not Collected» / «Нет».
Геолокация в обоих случаях используется только на устройстве и не передаётся — это не «сбор».
Текст, который человек пишет сам («Любими», свои строки), в статистику не отправляется.

**Apple — App Privacy:**
- Usage Data → **Product Interaction** — собирается; Not linked to the user; Not used for tracking; цель — **Analytics**
- Identifiers → **Device ID** (случайный ID установки, не IDFA/IDFV) — собирается; Not linked; Not used for tracking; цель — **Analytics**
- Всё остальное — не собирается. App Tracking Transparency не нужен (нет отслеживания между приложениями).

**Google Play — Data safety:**
- Собирает ли приложение данные? — **Да**: App activity → *App interactions*; Device or other IDs → *Device or other IDs*
- Местоположение — **не собирается** (точное местоположение остаётся на телефоне; выбранный город — часть *App interactions*)
- Обработка эфемерная? — Нет · Сбор обязателен? — **Нет, пользователь может отказаться** (optional) · Цель — **Analytics**
- Передаёт ли данные третьим лицам? — **Нет** (PostHog — обработчик/service provider, это не «sharing» по правилам Google)
- Шифрование при передаче — **Да** (HTTPS)
- Вход с аккаунтами, созданными вне приложения? — **Нет** (входа нет)
- Можно ли запросить удаление данных? — **Нет**: статистика анонимна и не связана с человеком, найти записи по запросу нельзя;
  выключение статистики только прекращает отправку (ID на телефоне удаляется). Вариант «удаляются в течение 90 дней» не выбирать —
  PostHog хранит данные до 12 месяцев. Заполнено так в Play Console 17.11.2026.

**Google Play — прочее:**
- Реклама — **нет**
- Доступ к приложению — **все функции доступны без входа** (ограничений нет)
- Целевая аудитория — **18+** (не для детей, чтобы не попадать под Families Policy)
- Новостное приложение — нет · Госорган — нет (приложение не связано с КЗП) · Финансовые функции — нет · Здоровье — нет
- Возрастной рейтинг (анкета IARC): насилия, азартных игр, общения пользователей, покупок нет → «Для всех» / PEGI 3

---

## Графика

Готовые файлы — в `store/` (собраны скриптом `store/make-graphics.mjs`):

| Файл | Куда | Требование Google |
|---|---|---|
| `store/icon-512.png` | Значок приложения | 512 × 512, PNG 32 бит, до 1 МБ |
| `store/feature-graphic-bg.jpg` | Графика для описания (основной язык — болгарский) | 1024 × 500, JPG или PNG без прозрачности, до 15 МБ |
| `store/feature-graphic-en.jpg` | Графика для описания (английский перевод страницы) | то же |

## Скриншоты

- **Google Play:** телефон, от 2 до 8 штук (лучше 4+), стороны от 320 до 3840 px, соотношение не больше 2:1; для показа в рекомендациях — не меньше 1080 px. Снимать на реальных данных с установленной сборки.
- **App Store:** iPhone 6,9″ (1320×2868) — обязательно; 6,5″ (1284×2778) — желательно. 3–10 штук на каждый язык.

Предлагаемый порядок (с короткой подписью сверху):
1. Оферти — «Брошурите на всички вериги» / «Every chain's leaflet»
2. Кошница на седмицата — «Най-изгодното от седмицата» / «The best deals of the week»
3. План — «Знаете какво къде да купите» / «Know what to buy where»
4. Спестяване — «Спестете от всяка кошница» / «Save on every basket» (цифру «до N%» ставьте, только если она видна на самом скриншоте)
5. Любими продукти — «Следете любимите си продукти» / «Follow your favourite products»

Делайте скриншоты на **реальных данных** — демо-данные с вымышленными сетями Apple и Google отклонят.

---

## Закрытое тестирование (личный аккаунт Google Play)

Личный аккаунт, созданный после 13.11.2023, публикует приложение только после закрытого теста:
**не меньше 12 тестеров, подписанных 14 дней подряд**. Берите 15–20 с запасом и просите действительно пользоваться
приложением: после теста Google спрашивает, как он прошёл, и формальный тест может отклонить.

1. Play Console → Тестирование → Закрытое тестирование → трек *Alpha* → список тестеров (адреса Google-аккаунтов или Google-группа).
2. Загрузить `.aab` (`eas build --profile production --platform android`; первый раз — вручную, дальше `eas submit`, он отправляет в трек `alpha` черновиком).
3. Отправить ссылку для участия тестерам → «Стать тестером» → установка из Google Play.
4. Через 14 дней: Панель управления → «Запросить доступ к рабочей версии» → ответы о тесте → проверка Google.
