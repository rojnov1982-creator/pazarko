// Марки в популярных группах товаров.
// Штрихкодов в данных КЗП нет, поэтому марку узнаём по названию товара.
// Формат: "Название марки": ["ВАРИАНТ 1", "ВАРИАНТ 2", ...] — варианты пишутся ЗАГЛАВНЫМИ,
// ищутся как целые слова (БОР ЧВОР найдёт и «БОР-ЧВОР»). Чтобы добавить марку — допишите строку.

const DAIRY = {
  "Верея": ["ВЕРЕЯ", "VEREYA"],
  "Саяна": ["САЯНА", "SAYANA"],
  "Боженци": ["БОЖЕНЦИ", "BOZHENTSI"],
  "Бор Чвор": ["БОР ЧВОР", "BOR CHVOR"],
  "Булгарче": ["БУЛГАРЧЕ"],
  "Маджаров": ["МАДЖАРОВ", "MADZHAROV"],
  "Олимпус": ["ОЛИМПУС", "OLYMPUS"],
  "Мегле": ["МЕГЛЕ", "МЕГГЛЕ", "MEGGLE"],
  "Белииса": ["БЕЛИИСА"],
  "Наборъ": ["НАБОРЪ", "НАБОРЬ"],
  "Тертер": ["ТЕРТЕР", "TERTER"],
  "Родопея": ["РОДОПЕЯ"],
  "Здравец": ["ЗДРАВЕЦ"],
  "Елена": ["ЕЛЕНА"],
  "Домлян": ["ДОМЛЯН"],
  "Мургаш": ["МУРГАШ"],
  "Лесидрен": ["ЛЕСИДРЕН"],
  "Ведраре": ["ВЕДРАРЕ"],
};

export const BRANDS = {
  // Прясно мляко
  6: {
    ...pick(DAIRY, ["Верея", "Саяна", "Боженци", "Бор Чвор", "Булгарче", "Маджаров", "Олимпус", "Мегле", "Белииса", "Наборъ", "Тертер", "Родопея"]),
    "Млекарката": ["МЛЕКАРКАТА"],
    "Булгареа": ["БУЛГАРЕА"],
    "Млековита": ["МЛЕКОВИТА", "MLEKOVITA"],
    "Лачиате": ["ЛАЧИАТЕ", "LATTIATE"],
  },
  // Кисело мляко
  7: {
    ...pick(DAIRY, ["Верея", "Саяна", "Боженци", "Бор Чвор", "Булгарче", "Маджаров", "Олимпус", "Мегле", "Белииса", "Наборъ", "Тертер", "Родопея", "Здравец", "Елена", "Домлян", "Мургаш", "Ведраре"]),
    "Ралица": ["РАЛИЦА"],
    "Родопчанка": ["РОДОПЧАНКА"],
    "Ситово": ["СИТОВО"],
    "Каймакани": ["КАЙМАКАНИ"],
  },
  // Сирене пакетирано
  9: {
    ...pick(DAIRY, ["Верея", "Саяна", "Боженци", "Бор Чвор", "Маджаров", "Олимпус", "Белииса", "Тертер", "Здравец", "Елена", "Домлян", "Мургаш", "Лесидрен", "Ведраре"]),
    "Президент": ["ПРЕЗИДЕНТ", "PRESIDENT"],
    "Дунавия": ["ДУНАВИЯ"],
    "Салакис": ["САЛАКИС", "SALAKIS"],
    "Пастир": ["ПАСТИР"],
    "Дестан": ["ДЕСТАН"],
    "Мероне": ["МЕРОНЕ"],
    "Ралица": ["РАЛИЦА"],
    "Киселово": ["КИСЕЛОВО"],
    "Хаджийски": ["ХАДЖИЙСКИ"],
    "Lacrima": ["LACRIMA", "ЛАКРИМА"],
  },
  // Кашкавал пакетиран
  11: {
    ...pick(DAIRY, ["Верея", "Саяна", "Боженци", "Бор Чвор", "Булгарче", "Маджаров", "Белииса", "Наборъ", "Здравец", "Елена", "Домлян", "Мургаш", "Лесидрен", "Ведраре"]),
    "Сакарела": ["САКАРЕЛА"],
    "Гюбек": ["ГЮБЕК"],
    "Мероне": ["МЕРОНЕ"],
    "Витоша": ["ВИТОША"],
    "Хаджийски": ["ХАДЖИЙСКИ"],
    "Дестан": ["ДЕСТАН"],
    "Милки": ["МИЛКИ", "MILKI"],
    "Родопчанка": ["РОДОПЧАНКА"],
    "Пастир": ["ПАСТИР"],
    "Медковец": ["МЕДКОВЕЦ"],
    "Бонония": ["БОНОНИЯ"],
  },
  // Краве масло
  12: {
    ...pick(DAIRY, ["Верея", "Саяна", "Бор Чвор", "Олимпус", "Мегле", "Белииса", "Родопея", "Лесидрен"]),
    "Президент": ["ПРЕЗИДЕНТ", "PRESIDENT"],
    "Маркенбутер": ["МАРКЕНБУТЕР", "MARKENBUTTER"],
    "Дойче": ["ДОЙЧЕ", "DEUTSCHE"],
    "Вълчев": ["ВЪЛЧЕВ"],
    "Милтекс": ["МИЛТЕКС"],
    "Хранинвест": ["ХРАНИНВЕСТ"],
    "Сакарела": ["САКАРЕЛА"],
    "Ростар": ["РОСТАР"],
    "Монарх": ["МОНАРХ", "MONARCH"],
    "Киселово": ["КИСЕЛОВО"],
    "Lurpak": ["LURPAK", "ЛУРПАК"],
    "Милки": ["МИЛКИ", "MILKI"],
  },
  // Слънчогледово олио
  42: {
    "Калиакра": ["КАЛИАКРА", "KALIAKRA"],
    "Бисер": ["БИСЕР"],
    "Клас": ["КЛАС"],
    "Кристал": ["КРИСТАЛ"],
    "Клио": ["КЛИО"],
    "Hosso": ["HOSSO", "ХОСО"],
    "Любекс": ["ЛЮБЕКС"],
    "Фамилекс": ["ФАМИЛЕКС", "FAMILEX"],
    "Шарлан": ["ШАРЛАН"],
    "Папас": ["ПАПАС"],
    "Златно добруджанско": ["ЗЛАТНО ДОБРУДЖАНСКО", "ДОБРУДЖАНСКО ЗЛАТО"],
  },
  // Мляно кафе
  70: {
    "Lavazza": ["LAVAZZA", "ЛАВАЦА"],
    "Jacobs": ["JACOBS", "ЯКОБС"],
    "Tchibo": ["TCHIBO", "ЧИБО"],
    "Eduscho": ["EDUSCHO", "ЕДУШО"],
    "Bianchi": ["BIANCHI", "БИАНЧИ"],
    "Nova Brasilia": ["NOVA BRASILIA", "НОВА БРАЗИЛИЯ"],
    "Davidoff": ["DAVIDOFF", "ДАВИДОФ"],
    "Illy": ["ILLY"],
    "Segafredo": ["SEGAFREDO", "СЕГАФРЕДО"],
  },
  // Светла бира 2 л
  74: {
    "Загорка": ["ЗАГОРКА", "ZAGORKA"],
    "Ариана": ["АРИАНА", "ARIANA"],
    "Пиринско": ["ПИРИНСКО", "PIRINSKO"],
    "Шуменско": ["ШУМЕНСКО", "SHUMENSKO"],
    "Бургаско": ["БУРГАСКО", "BURGASKO", "BOURGASKO"],
    "Каменица": ["КАМЕНИЦА", "KAMENITZA"],
    "Астика": ["АСТИКА", "ASTIKA"],
    "Бритос": ["БРИТОС", "BRITOS"],
    "Болярка": ["БОЛЯРКА", "BOLYARKA"],
    "Алмус": ["АЛМУС"],
  },
};

// --- Месо и колбаси ---
const CHICKEN = {
  "Градус": ["ГРАДУС", "GRADUS"],
  "Лудогорско пиле": ["ЛУДОГОРСКО"],
  "Roso": ["ROSO", "РОСО"],
  "Амета": ["АМЕТА", "AMETA"],
  "Пилко": ["ПИЛКО"],
};
const SAUSAGE = {
  "Леки": ["ЛЕКИ"],
  "Кен": ["КЕН", "KEN"],
  "Житница": ["ЖИТНИЦА"],
  "Фермата": ["ФЕРМАТА"],
  "Бони": ["БОНИ", "BONI"],
  "Градус": ["ГРАДУС", "GRADUS"],
  "Тандем": ["ТАНДЕМ", "TANDEM"],
  "Майстор Цветко": ["МАЙСТОР ЦВЕТКО"],
  "Маджаров": ["МАДЖАРОВ"],
  "Нолев": ["НОЛЕВ"],
  "Камчия": ["КАМЧИЯ"],
  "Чичовци": ["ЧИЧОВЦИ"],
  "Мушев": ["МУШЕВ"],
  "Орехите": ["ОРЕХИТЕ"],
  "Перелик": ["ПЕРЕЛИК"],
  "Еко Мес": ["ЕКО МЕС"],
  "Стефанов": ["СТЕФАНОВ"],
  "Родопа": ["РОДОПА"],
  "Елко": ["ЕЛКО"],
  "Мургаш": ["МУРГАШ"],
  "Веслец": ["ВЕСЛЕЦ"],
  "КФМ": ["КФМ"],
};
// Пилешко месо: цяло пиле, филе, бут
BRANDS[15] = CHICKEN;
BRANDS[16] = CHICKEN;
BRANDS[17] = CHICKEN;
// Кренвирши, пресни колбаси, сухи колбаси
BRANDS[26] = pick(SAUSAGE, ["Леки", "Кен", "Житница", "Фермата", "Бони", "Градус", "Тандем", "Майстор Цветко", "Маджаров", "Нолев"]);
BRANDS[27] = pick(SAUSAGE, ["Камчия", "Кен", "Фермата", "Житница", "Бони", "Леки", "Тандем", "Майстор Цветко", "Чичовци", "Мушев"]);
BRANDS[28] = pick(SAUSAGE, [
  "Кен", "Бони", "Орехите", "Перелик", "Чичовци", "Еко Мес", "Житница", "Маджаров", "Стефанов",
  "Фермата", "Родопа", "Елко", "Мушев", "Тандем", "Леки", "КФМ", "Майстор Цветко",
]);

// --- Собствени марки на веригите ---
// Ключ "@own" — в приложении показывается как «Собствена марка на веригата».
export const OWN = "@own";
/** Сеть (часть названия, ЗАГЛАВНЫМИ) → признаки собственной марки в названии товара */
export const OWN_BRAND_TOKENS = {
  "БИЛЛА": ["CLEVER", "КЛЕВЪР", "BILLA"],
  "МЕТРО": ["ARO", "АРО", "METRO CHEF", "MCH", "HORECA SELECT"],
  "БУРЛЕКС": ["АКЦЕНТ"], // CBA
  "КАУФЛАНД": ["K CLASSIC", "К КЛАСИК", "K BIO", "K FAVOURITES"],
};
/**
 * Сети, которые пишут свою марку без названия («Кашкавал от краве мляко БДС 400g»): товар без марки = собственная марка.
 * Товар с чужой маркой, которой нет в словаре группы, собственной маркой НЕ считается (раньше считался любой —
 * и чужой товар попадал в сравнение «собствени марки»). Признак чужой марки — латинское слово в названии,
 * которое не входит ни в собственные марки сети (OWN_LABELS), ни в общие слова (GENERIC_LATIN).
 * Ограничение: чужая марка, написанная кириллицей и не внесённая в словарь группы, так не распознаётся.
 */
const OWN_BY_DEFAULT = ["ЛИДЛ", "LIDL"];
/** Собственные марки таких сетей (Lidl): название с любой из них — собственная марка */
export const OWN_LABELS = [
  "MILBONA", "PILOS", "PIKOK", "DULANO", "FRESHONA", "SOLEVITA", "FREEWAY", "SAGUARO", "BELLAROM", "FIN CARRE", "FIN CARRÉ",
  "FAVORINA", "CRUSTI CROC", "SNACK DAY", "ALESTO", "COMBINO", "KANIA", "VITASIA", "ITALIAMO", "ERIDANOUS",
  "SOL MAR", "DELUXE", "CHEF SELECT", "LORD NELSON", "TASTINO", "SONDEY", "MISTER CHOC", "GELATELLI", "BON GELATI",
  "BELBAKE", "VITA D OR", "PRIMADONNA", "BARESA", "NIXE", "OCEAN SEA", "TRATTORIA ALFREDO", "MCENNEDY", "CULINEA",
  "MARIBEL", "GOLDEN SUN", "PERLENBACHER", "ARGUS", "GRAFENWALDER", "BIOTREND", "VEMONDO", "METZGERFRISCH",
  "CONFISERIE FIRENZE", "CRELANDO", "FORMIL", "HARVEST BASKET", "QUEEN MARGOT",
  // по колонке own_label в брошюре Lidl 16–22.11.2026
  "РОДНА СТРЯХА", "ПОРЦИЯ СВЕЖЕСТ", "ПИЛОС", "МИЛБОНА", "ПИКОК",
];
/** Латинские слова, которые не являются маркой: единицы, размеры, вид товара */
const GENERIC_LATIN = new Set([
  "XXL", "XL", "UHT", "OHT", "ESL", "BIO", "PET", "MIX", "LIGHT", "ZERO", "MAX", "MAXI", "MINI", "PREMIUM",
  "CLASSIC", "EXTRA", "FRESH", "NATURAL", "NATUR", "VEGAN", "PROTEIN", "PACK", "TETRA", "GRILL", "BBQ", "DUO",
  "TRIO", "FAMILY", "ORIGINAL", "GOLD", "BLACK", "WHITE", "RED", "GREEN", "ESPRESSO", "CREMA", "LUNGO", "CAFE",
  "COLA", "TONIC", "IPA", "LAGER", "PILS", "PILSNER", "DARK", "BLANC", "ROSE", "SMOOTHIE", "KETCHUP", "CHIPS",
  "TOAST", "BURGER", "PIZZA", "PASTA", "PENNE", "FUSILLI", "SPAGHETTI", "BASMATI", "JASMINE", "ARABICA",
  "ROBUSTA", "GOUDA", "EDAM", "EMMENTAL", "MOZZARELLA", "CHEDDAR", "FETA", "BRIE", "RICOTTA", "MASCARPONE",
  "PROSCIUTTO", "SALAMI", "CHORIZO", "BACON", "WURST", "FILET", "STEAK", "SUSHI", "TOFU", "MUESLI", "CORN",
  "FLAKES", "CHOCO", "CHOCOLATE", "VANILLA", "CARAMEL", "COCOA", "KAKAO", "ICE", "TEA", "MILK", "GREEK",
  "STYLE", "TYPE", "AND", "THE", "WITH", "NON", "ALC", "VOL", "PCS", "TBL", "CAPS",
]);
const latinWords = (n) => n.match(/(?<= )[A-Z]{3,}(?= )/g) ?? [];
const hasForeignLatinBrand = (n) => {
  let rest = n;
  for (const l of OWN_LABELS_N) rest = rest.replaceAll(l, " ");
  return latinWords(rest).some((w) => !GENERIC_LATIN.has(w));
};

function pick(src, names) {
  return Object.fromEntries(names.map((n) => [n, src[n]]));
}

const norm = (s) => " " + s.toUpperCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim() + " ";

// Предкомпилированные варианты: [марка, " ВАРИАНТ "]
const COMPILED = Object.fromEntries(
  Object.entries(BRANDS).map(([g, brands]) => [
    g,
    Object.entries(brands).flatMap(([brand, aliases]) => aliases.map((a) => [brand, norm(a)])),
  ]),
);

const OWN_COMPILED = Object.entries(OWN_BRAND_TOKENS).map(([chain, toks]) => [chain, toks.map(norm)]);
const OWN_LABELS_N = OWN_LABELS.map(norm);

/** Марка товара в группе или null. chain — название сети (для собственных марок). */
export function brandOf(groupId, productName, chain = "") {
  const list = COMPILED[groupId];
  if (!list) return null;
  const n = norm(productName);
  const c = chain.toUpperCase();
  for (const [ch, toks] of OWN_COMPILED) if (c.includes(ch) && toks.some((t) => n.includes(t))) return OWN;
  const ownByDefault = OWN_BY_DEFAULT.some((x) => c.includes(x));
  if (ownByDefault && OWN_LABELS_N.some((l) => n.includes(l))) return OWN;
  for (const [brand, alias] of list) if (n.includes(alias)) return brand;
  if (ownByDefault && !hasForeignLatinBrand(n)) return OWN;
  return null;
}
