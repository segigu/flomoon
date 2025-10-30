import { buildAstroHighlights } from './astro';
import type { AIRequestOptions, AIMessage } from './aiClient';
import { fetchDailyWeatherSummary, fetchWeeklyWeatherSummary } from './weather';
import { buildDailyCycleHint, buildSergeyCycleHint, buildWeeklyCycleHint } from './cyclePrompt';
import type { CycleData, HoroscopeMemoryEntry } from '../types';
import { getCurrentUser } from '../data/userProfile.deprecated';
import { ASTRO_PROFILES } from '../data/astroProfiles';
import type { UserProfileData, PartnerData } from './userContext';
import {
  getUserName,
  getPartnerName,
  hasPartner,
  getUserCoordinates,
  isCycleTrackingEnabled,
} from './userContext';

/**
 * Helper: Get user data with fallback to getCurrentUser()
 * TODO: Remove fallback once all call sites pass userProfile/userPartner
 */
function getUserDataWithFallback(
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null
): { userName: string; partnerName: string; user: any; partner: any } {
  // If provided, use passed data
  if (userProfile !== undefined) {
    const userName = getUserName(userProfile);
    const partnerName = getPartnerName(userPartner);
    return {
      userName,
      partnerName,
      user: { name: userName },
      partner: userPartner ? { name: partnerName } : null,
    };
  }

  // Fallback to hardcoded data (legacy compatibility)
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];
  return {
    userName: user.name,
    partnerName: partner?.name || '',
    user,
    partner,
  };
}

export interface DailyHoroscope {
  text: string;
  date: string | null;
  provider?: 'claude' | 'openai' | 'fallback';
  weekRange?: string;
  highlights?: string[];
  memoryEntry?: HoroscopeMemoryEntry;
}

export interface HoroscopeLoadingMessage {
  emoji: string;
  text: string;
}

const PARTNER_FALLBACK_LEADS = [
  { emoji: '🪐', lead: 'Сатурн фыркает:' },
  { emoji: '🔥', lead: 'Марс хмурится:' },
  { emoji: '🌀', lead: 'Юпитер наблюдает:' },
  { emoji: '💋', lead: 'Венера ухмыляется:' },
  { emoji: '📡', lead: 'Меркурий шепчет:' },
  { emoji: '⚡️', lead: 'Уран моргает:' },
  { emoji: '🧊', lead: 'Нептун вздыхает:' },
  { emoji: '🧯', lead: 'Плутон щёлкает зажигалкой:' },
];

const getPartnerFallbackMiddles = (partnerName: string) => [
  `${partnerName} опять листает чаты`,
  `${partnerName} пишет план номер восемь`,
  `${partnerName} кивает с видом спасителя`,
  `${partnerName} отдирает стикеры без цели`,
  `${partnerName} устраивает совещание с зеркалом`,
  `${partnerName} проверяет отчёт, которого нет`,
  `${partnerName} тренирует вдохновенный взгляд`,
  `${partnerName} клянётся, что всё под контролем`,
  `${partnerName} настраивает презентацию ради вида`,
  `${partnerName} жонглирует дедлайнами как шариками`,
  `${partnerName} подписывает сам себе поручение`,
  `${partnerName} закрывает мемы одним глазом`,
];

const PARTNER_FALLBACK_ENDINGS = [
  'Команда делает ставки молча',
  'Чаты уже ёрничают в фоне',
  'Кофемашина катит глаза',
  'HR заводит новую таблицу',
  'Принтер пишет мемуары фейлов',
  'Офис прячет смех по углам',
  'Дедлайны открывают попкорн',
  'Уборщица ставит галочку «повтор»',
  'Стена шепчет «ага, конечно»',
  'Часы считают до падения',
  'Стикеры дрожат от сарказма',
  'Соседний отдел снимает сторис',
];

const getPartnerStaticFallback = (partnerName: string): HoroscopeLoadingMessage[] => [
  { emoji: '🧯', text: `Марс проверяет, чем тушить очередной пожар, пока ${partnerName} дышит на пепелище.` },
  { emoji: '🛠️', text: `Сатурн выдал ${partnerName} новые ключи — чинить то, что рухнуло за ночь.` },
  { emoji: '🧾', text: `Меркурий переписывает список дел ${partnerName}, потому что прежний уже сгорел нахуй.` },
  { emoji: '🚬', text: `Плутон подкуривает ${partnerName} сигарету и шепчет, что отдохнуть всё равно не выйдет.` },
  { emoji: '📦', text: `Юпитер навалил задач, пока ${partnerName} таскал коробки и матерился сквозь зубы.` },
];

const pickRandom = <T,>(values: T[]): T => values[Math.floor(Math.random() * values.length)];

export function getSergeyLoadingFallback(count = 10, userPartner?: PartnerData | null): HoroscopeLoadingMessage[] {
  const partnerName = getPartnerName(userPartner, 'партнёр');
  const partnerMiddles = getPartnerFallbackMiddles(partnerName);

  const results: HoroscopeLoadingMessage[] = [];
  const usedCombos = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 25;

  while (results.length < count && attempts < maxAttempts) {
    attempts += 1;
    const lead = pickRandom(PARTNER_FALLBACK_LEADS);
    const middle = pickRandom(partnerMiddles);
    const ending = pickRandom(PARTNER_FALLBACK_ENDINGS);
    const key = `${lead.lead}|${middle}|${ending}`;
    if (usedCombos.has(key)) {
      continue;
    }
    usedCombos.add(key);
    const text = `${lead.lead} ${middle}. ${ending}.`.replace(/\s+/g, ' ').trim();
    results.push({ emoji: lead.emoji, text });
  }

  if (results.length < count) {
    const extra = [...getPartnerStaticFallback(partnerName)];
    while (results.length < count && extra.length > 0) {
      const candidate = extra.shift()!;
      results.push(candidate);
    }
    while (results.length < count) {
      results.push({
        emoji: pickRandom(PARTNER_FALLBACK_LEADS).emoji,
        text: `Звёзды мигнули: ${partnerName} снова продаёт видимость порядка.`,
      });
    }
  }

  return results;
}

export interface SergeyBannerCopy {
  title: string;
  subtitle: string;
  primaryButton: string;
  secondaryButton: string;
}

const MAX_MEMORY_KEEP = 12;
const DAILY_MEMORY_LOOKBACK = 4;
const STATIC_AVOID_THEMES = [
  'заезженное нытьё про погоду',
  'вечное "начну с понедельника"',
  'бесконечные списки дел',
  'пятую кружку кофе "без него не просыпаюсь"',
  'сериалы, которые обещали бросить',
  'жалобы на бессонницу как мантру',
];
const STATIC_SERGEY_AVOID_THEMES = [
  'угрюм',
  'мрачн',
  'ходит тенью',
  'бурчит молча',
  'темно-серый день',
  'вечно выжатый',
  'бардак',
  'берлога',
  'хаос в офисе',
  'снова мутит',
  'опять затевает',
  'очередной план',
  'снова что-то',
];

function sortMemoryByRecency(entries: HoroscopeMemoryEntry[] | undefined): HoroscopeMemoryEntry[] {
  if (!entries?.length) {
    return [];
  }
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function selectRecentMemory(
  entries: HoroscopeMemoryEntry[] | undefined,
  source: HoroscopeMemoryEntry['source'],
  limit = DAILY_MEMORY_LOOKBACK,
): HoroscopeMemoryEntry[] {
  return sortMemoryByRecency(entries)
    .filter(entry => entry.source === source)
    .slice(0, limit);
}

function formatMemoryDateLabel(value: string, language = 'ru'): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
  }).format(parsed);
}

function buildDailyMemoryReminders(
  memoryEntries: HoroscopeMemoryEntry[] | undefined,
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string[] {
  const userName = getUserName(userProfile);
  const defaultPartnerName = language === 'en' ? 'partner' : language === 'de' ? 'Partner' : 'партнёр';
  const partnerName = getPartnerName(userPartner, defaultPartnerName);

  const reminders: string[] = [
    language === 'en'
      ? `- Don't rehash personal details unnecessarily: keep focus on today, ${userName}'s feelings, and interaction with ${partnerName}.`
      : language === 'de'
      ? `- Wiederkaue persönliche Details nicht grundlos: behalte den Fokus auf dem heutigen Tag, ${userName}s Gefühlen und der Interaktion mit ${partnerName}.`
      : `- Личные детали не мусоль без повода: держи фокус на сегодняшнем дне, ощущениях ${userName} и взаимодействии с ${partnerName}.`,
    language === 'en'
      ? `- Overused images (${STATIC_AVOID_THEMES.join(', ')}) — either avoid or radically reimagine.`
      : language === 'de'
      ? `- Abgedroschene Bilder (${STATIC_AVOID_THEMES.join(', ')}) — entweder umgehen oder radikal neu denken.`
      : `- Заезженные образы (${STATIC_AVOID_THEMES.join(', ')}) либо обходи, либо радикально переосмысляй.`,
  ];

  const recent = selectRecentMemory(memoryEntries, 'daily');
  if (!recent.length) {
    return reminders;
  }

  const historyPieces = recent.map(entry => {
    const label = formatMemoryDateLabel(entry.date, language);
    const mainTheme = entry.keyThemes?.length
      ? entry.keyThemes.slice(0, 2).join(' / ')
      : entry.summary;
    return `${label} — ${mainTheme}`;
  });

  reminders.push(
    language === 'en'
      ? `- Recent days already covered: ${historyPieces.join('; ')}. Find a fresh angle and new details.`
      : language === 'de'
      ? `- Aus den letzten Tagen bereits behandelt: ${historyPieces.join('; ')}. Finde einen frischen Blickwinkel und neue Details.`
      : `- Из недавних дней уже звучало: ${historyPieces.join('; ')}. Найди свежий ракурс и новые детали.`,
  );

  const avoidPhrases = Array.from(
    new Set(
      recent
        .flatMap(entry => entry.avoidPhrases ?? [])
        .filter((phrase): phrase is string => typeof phrase === 'string' && phrase.trim().length > 0),
    ),
  ).slice(0, 3);

  if (avoidPhrases.length > 0) {
    const formatted = avoidPhrases.map(phrase => `«${phrase}»`).join(', ');
    reminders.push(
      language === 'en'
        ? `- Don't repeat verbatim ${formatted} — repackage the thoughts differently.`
        : language === 'de'
        ? `- Wiederhole nicht wörtlich ${formatted} — verpacke die Gedanken anders.`
        : `- Не повторяй дословно формулировки ${formatted} — переупакуй мысли иначе.`,
    );
  }

  const staleThemeSet = new Set(
    new Set(
      recent
        .flatMap(entry => entry.keyThemes ?? [])
        .filter((theme): theme is string => typeof theme === 'string' && theme.trim().length > 0),
    ),
  );
  STATIC_AVOID_THEMES.forEach(theme => staleThemeSet.delete(theme));
  const staleThemes = Array.from(staleThemeSet).slice(0, 4);

  if (staleThemes.length > 0) {
    reminders.push(
      language === 'en'
        ? `- Themes ${staleThemes.join(', ')} already used. Come up with a different occasion or conflict.`
        : language === 'de'
        ? `- Themen ${staleThemes.join(', ')} wurden bereits verwendet. Erfinde einen anderen Anlass oder Konflikt.`
        : `- Темы ${staleThemes.join(', ')} уже звучали. Придумай другой повод или конфликт.`,
    );
  }

  return reminders;
}

function buildSergeyMemoryReminders(
  memoryEntries: HoroscopeMemoryEntry[] | undefined,
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string[] {
  const userName = getUserName(userProfile);
  const defaultPartnerName = language === 'en' ? 'partner' : language === 'de' ? 'Partner' : 'партнёр';
  const partnerName = getPartnerName(userPartner, defaultPartnerName);

  const reminders: string[] = [
    language === 'en'
      ? `- Be more sarcastic: find new everyday jokes about ${partnerName}, don't repeat yesterday's memes.`
      : language === 'de'
      ? `- Sei sarkastischer: finde neue alltägliche Witze über ${partnerName}, wiederhole nicht die gestrigen Memes.`
      : `- Шути язвительнее: находи новые бытовые приколы про ${partnerName}, не повторяй вчерашние мемы.`,
    language === 'en'
      ? `- Forbidden clichés: ${STATIC_SERGEY_AVOID_THEMES.join(', ')}.`
      : language === 'de'
      ? `- Verbotene Klischees: ${STATIC_SERGEY_AVOID_THEMES.join(', ')}.`
      : `- Запрещённые клише: ${STATIC_SERGEY_AVOID_THEMES.join(', ')}.`,
    language === 'en'
      ? `- DON'T repeat the name "${partnerName}" every sentence — use pronouns "his", "him", "he".`
      : language === 'de'
      ? `- Wiederhole NICHT den Namen „${partnerName}" in jedem Satz — verwende Pronomen „sein", „ihm", „er".`
      : `- НЕ повторяй имя «${partnerName}» каждое предложение — используй местоимения «у него», «ему», «он».`,
    language === 'en'
      ? `- DON'T use template phrases about ${userName} like "you, ${userName}, are holding up well" — either don't mention her at all, or do it naturally.`
      : language === 'de'
      ? `- Verwende KEINE Schablonensätze über ${userName} wie „du, ${userName}, hältst dich gut" — erwähne sie entweder gar nicht oder natürlich.`
      : `- НЕ используй шаблонные фразы про ${userName} типа «ты же, ${userName}, держишься молодцом» — либо не упоминай её вообще, либо естественно.`,
  ];

  const recent = selectRecentMemory(memoryEntries, 'sergey');
  if (!recent.length) {
    return reminders;
  }

  const historyPieces = recent.map(entry => {
    const label = formatMemoryDateLabel(entry.date, language);
    const mainTheme = entry.keyThemes?.length
      ? entry.keyThemes.slice(0, 2).join(' / ')
      : entry.summary;
    return `${label} — ${mainTheme}`;
  });

  reminders.push(
    language === 'en'
      ? `- Already covered: ${historyPieces.join('; ')}. Find a fresh topic or new twist.`
      : language === 'de'
      ? `- Bereits behandelt: ${historyPieces.join('; ')}. Finde ein frisches Thema oder eine neue Wendung.`
      : `- Уже звучало: ${historyPieces.join('; ')}. Найди свежую тему или новый поворот.`,
  );

  const avoidPhrases = Array.from(
    new Set(
      recent
        .flatMap(entry => entry.avoidPhrases ?? [])
        .filter((phrase): phrase is string => typeof phrase === 'string' && phrase.trim().length > 0),
    ),
  ).slice(0, 3);

  if (avoidPhrases.length > 0) {
    const formatted = avoidPhrases.map(phrase => `«${phrase}»`).join(', ');
    reminders.push(
      language === 'en'
        ? `- Don't repeat verbatim ${formatted} — come up with a new presentation.`
        : language === 'de'
        ? `- Wiederhole nicht wörtlich ${formatted} — erfinde eine neue Darstellung.`
        : `- Не повторяй дословно формулировки ${formatted} — придумай новую подачу.`,
    );
  }

  const staleThemeSet = new Set(
    new Set(
      recent
        .flatMap(entry => entry.keyThemes ?? [])
        .filter((theme): theme is string => typeof theme === 'string' && theme.trim().length > 0),
    ),
  );
  STATIC_SERGEY_AVOID_THEMES.forEach(theme => staleThemeSet.delete(theme));
  const staleThemes = Array.from(staleThemeSet).slice(0, 4);

  if (staleThemes.length > 0) {
    reminders.push(
      language === 'en'
        ? `- Themes ${staleThemes.join(', ')} already used. Find another occasion, preferably funny.`
        : language === 'de'
        ? `- Themen ${staleThemes.join(', ')} waren bereits da. Finde einen anderen Anlass, vorzugsweise lustig.`
        : `- Темы ${staleThemes.join(', ')} уже были. Найди другой повод, лучше смешной.`,
    );
  }

  return reminders;
}

/**
 * Построить контекст для основного пользователя (для недельного гороскопа).
 * Извлекает данные из userProfile и astroProfiles.
 */
function buildUserContext(
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const userName = getUserName(userProfile);
  const partnerName = getPartnerName(userPartner);

  // Build context from natal chart data only
  let birthInfo = '';
  if (userProfile?.birth_date) {
    birthInfo = `Дата рождения: ${userProfile.birth_date}`;
    if (userProfile.birth_time) {
      birthInfo += `, время: ${userProfile.birth_time}`;
    }
    if (userProfile.birth_place) {
      birthInfo += `, место: ${userProfile.birth_place}`;
    }
    birthInfo += '.';
  }

  const partnerInfo = partnerName
    ? `Партнёр: ${partnerName}.`
    : '';

  // Minimal context - only name, natal chart, and partner
  return `
${userName} — пользователь приложения.${birthInfo ? `\n${birthInfo}` : ''}
${partnerInfo}

Пиши на основе астрологических данных. Тон — ироничный и саркастичный, с ненормативной лексикой по делу.
Не придумывай родственников, детей или друзей. Если нет явного повода — говори о текущих ощущениях и планах на основе транзитов.
`.trim();
}

/**
 * Построить контекст для партнёра пользователя (для дневного гороскопа).
 */
function buildPartnerContext(
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const userName = getUserName(userProfile);
  const partnerName = getPartnerName(userPartner);

  if (!partnerName) {
    throw new Error('Partner not defined - cannot generate partner horoscope');
  }

  // Build context from natal chart data only
  let birthInfo = '';
  if (userPartner?.birth_date) {
    birthInfo = `Дата рождения: ${userPartner.birth_date}`;
    if (userPartner.birth_time) {
      birthInfo += `, время: ${userPartner.birth_time}`;
    }
    if (userPartner.birth_place) {
      birthInfo += `, место: ${userPartner.birth_place}`;
    }
    birthInfo += '.';
  }

  // Minimal context - only name and natal chart
  return `
${partnerName} — партнёр ${userName}.${birthInfo ? `\n${birthInfo}` : ''}

Пиши о ${partnerName} на основе астрологических данных. Тон — ироничный и саркастичный, без пафоса.
В тексте поддерживай ${userName}, а ${partnerName} саркастично подначивай.
`.trim();
}

/**
 * Построить системный промпт для недельного гороскопа.
 */
function buildHoroscopeSystemPrompt(
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const userName = getUserName(userProfile);
  const userContext = buildUserContext(userProfile, userPartner);

  // Fallback to hardcoded astro profile if no profile data
  let birthDate = 'Овен ♈️';
  if (!userProfile) {
    const user = getCurrentUser();
    const astroProfile = ASTRO_PROFILES[user.astroProfileId];
    birthDate = astroProfile.birthDate;
  }

  if (language === 'en') {
    return `You write a weekly horoscope for ${userName} (${birthDate}, Aries ♈️).

CONTEXT:
${userContext}

STYLE:
Write with MAXIMUM sarcasm and irony — like the wittiest best friend who tells the truth without sugarcoating. Use profanity (fuck, shit, damn, hell) — NOT mild, but full-on casual profanity, tasteful and appropriate. If you need to tell someone to fuck off — write it directly, no euphemisms. Profanity should enhance the sarcasm and make the text alive.

FORMAT:
DO NOT use markdown (**, ##, ---). Structure: 2-3 short paragraphs with emoji. ALWAYS end with a complete sentence!`;
  }

  if (language === 'de') {
    return `Du schreibst ein Wochenhoroskop für ${userName} (${birthDate}, Widder ♈️).

KONTEXT:
${userContext}

STIL:
Schreibe mit MAXIMALEM Sarkasmus und Ironie — wie die sarkastischste Freundin, die die Wahrheit ungeschminkt sagt. Verwende Schimpfwörter (Scheiße, verdammt, zum Teufel) — NICHT mild, sondern vollwertig, aber geschmackvoll und angemessen. Wenn du jemanden zum Teufel schicken musst — schreibe es direkt, keine Euphemismen. Schimpfwörter sollen den Sarkasmus verstärken und den Text lebendig machen.

FORMAT:
Verwende KEIN Markdown (**, ##, ---). Struktur: 2-3 kurze Absätze mit Emoji. Beende IMMER mit einem vollständigen Satz!`;
  }

  // Russian (default)
  return `Ты пишешь недельный гороскоп для ${userName} (${birthDate}, Овен ♈️).

КОНТЕКСТ:
${userContext}

СТИЛЬ:
Пиши с МАКСИМАЛЬНЫМ сарказмом и иронией — как самая язвительная подруга, которая говорит правду в глаза без прикрас. Обязательно используй ненормативную лексику (хуй, нахуй, блядь, пиздец и т.д.) — НЕ легкий мат, а полноценный, но уместный и со вкусом. Если нужно послать куда подальше — пиши прямо "на хуй", а не эвфемизмы. Мат должен усиливать сарказм и делать текст живым.

ФОРМАТ:
НЕ используй markdown (**, ##, ---). Структура: 2–3 коротких абзаца с эмодзи. ВСЕГДА заканчивай полным предложением!`;
}

/**
 * Построить системный промпт для дневного гороскопа партнёра.
 */
function buildPartnerSystemPrompt(
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const userName = getUserName(userProfile);
  const partnerName = getPartnerName(userPartner);

  if (!partnerName) {
    throw new Error('Partner not defined - cannot generate partner horoscope');
  }

  const partnerContext = buildPartnerContext(userProfile, userPartner);

  // Fallback to hardcoded astro profile if no profile data
  let birthDate = 'Стрелец ♐️';
  if (!userProfile) {
    const user = getCurrentUser();
    const partner = user.relationshipPartners?.[0];
    if (!partner) {
      throw new Error(`User ${user.id} has no relationship partners defined`);
    }
    const partnerAstro = ASTRO_PROFILES[partner.profileId];
    birthDate = partnerAstro.birthDate;
  }

  if (language === 'en') {
    return `You write a sharp daily horoscope about ${partnerName} (${birthDate}) specifically for ${userName}.

CONTEXT:
${partnerContext}

STYLE:
- Address the text to ${userName}, but DO NOT use template phrases like "you, ${userName}, are hanging in there".
- Mention ${userName} VARIABLY and naturally: you can support in passing or not mention at all if there's no reason.
- Write about ${partnerName} in the third person using appropriate pronouns. DO NOT repeat the name "${partnerName}" too often — use pronouns after first mention.
- Base your horoscope on astrological data and transits. Find sarcasm in cosmic patterns, not in hardcoded personality traits.
- Humor is mandatory: insert fresh jokes based on current astrological influences, not repeating previous horoscopes.
- Use profanity to the point, to enhance sarcasm, not replace it.
- Don't encourage ${partnerName} or promise a bright future. Ending — dry or sarcastic, without rays of hope.

FORMAT:
- One dense paragraph (3-4 sentences), start with a suitable emoji and space.
- No markdown, lists, headings.
- Finish with a dry/sarcastic conclusion without a positive tint.`;
  }

  if (language === 'de') {
    return `Du schreibst ein scharfes Tageshoroskop über ${partnerName} (${birthDate}) speziell für ${userName}.

KONTEXT:
${partnerContext}

STIL:
- Richte den Text an ${userName}, aber verwende KEINE Schablonensätze wie "du, ${userName}, hältst durch".
- Erwähne ${userName} VARIABEL und natürlich: du kannst beiläufig unterstützen oder gar nicht erwähnen, wenn es keinen Grund gibt.
- Schreibe über ${partnerName} in der dritten Person mit passenden Pronomen. Wiederhole NICHT zu oft den Namen "${partnerName}" — verwende Pronomen nach erster Erwähnung.
- Basiere dein Horoskop auf astrologischen Daten und Transiten. Finde Sarkasmus in kosmischen Mustern, nicht in fest codierten Persönlichkeitsmerkmalen.
- Humor ist obligatorisch: füge frische Witze ein, die auf aktuellen astrologischen Einflüssen basieren, wiederhole keine vorherigen Horoskope.
- Verwende Schimpfwörter gezielt, um Sarkasmus zu verstärken, nicht zu ersetzen.
- Ermutige ${partnerName} nicht und verspreche keine strahlende Zukunft. Ende — trocken oder hämisch, ohne Hoffnungsschimmer.

FORMAT:
- Ein dichter Absatz (3-4 Sätze), beginne mit passendem Emoji und Leerzeichen.
- Kein Markdown, Listen, Überschriften.
- Beende mit einer trockenen/sarkastischen Schlussfolgerung ohne positiven Anstrich.`;
  }

  // Russian (default)
  return `Ты пишешь едкий дневной гороскоп про ${partnerName} (${birthDate}) специально для ${userName}.

КОНТЕКСТ:
${partnerContext}

СТИЛЬ:
- Адресуй текст ${userName}, но НЕ используй шаблонные фразы типа «ты же, ${userName}, держишься молодцом».
- ${userName} упоминай ВАРИАТИВНО и естественно: можно вскользь поддержать или вообще не упоминать, если нет повода.
- Про ${partnerName} пиши в третьем лице, используя подходящие местоимения. НЕ повторяй имя «${partnerName}» слишком часто — используй местоимения после первого упоминания.
- Основывай гороскоп на астрологических данных и транзитах. Находи сарказм в космических паттернах, а не в захардкоженных чертах характера.
- Юмор обязателен: вставляй свежие шутки на основе текущих астрологических влияний, не повторяя предыдущие гороскопы.
- Мат используем по делу, чтобы усилить сарказм, а не заменить его.
- Не подбадривай ${partnerName} и не обещай светлого будущего. Финал — сухой или ехидный, без лучиков надежды.

ФОРМАТ:
- Один плотный абзац (3–4 предложения), начни с подходящего эмодзи и пробела.
- Без markdown, списков, заголовков.
- Заверши сухим/язвительным выводом без позитивного налёта.`;
}

function getWeekRange(isoDate: string, language = 'ru'): string {
  const startDate = new Date(isoDate);
  if (Number.isNaN(startDate.getTime())) {
    return isoDate;
  }

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  // Map language to locale
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';

  // Use separate formatters to ensure correct month extraction
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long' });
  const startMonth = monthFormatter.format(startDate); // "октября", "October", "Oktober"
  const endMonth = monthFormatter.format(endDate);

  // Если месяцы разные
  if (startMonth !== endMonth) {
    return `${startDay} ${startMonth} — ${endDay} ${endMonth}`;
  }

  // Если один месяц
  return `${startDay}–${endDay} ${startMonth}`;
}

function simplifyWeatherSummary(summary: string | null | undefined): string | null {
  if (!summary) {
    return null;
  }

  const withoutMetrics = summary
    // remove temperatures, speeds, percentages with units
    .replace(/-?\d+[.,]?\d*\s*(?:°C|°|градус(?:ов|а|)|мм|миллиметр(?:ов|а|)|км\/ч|процент(?:ов|а|)|%)/gi, '')
    // remove leftover numeric tokens
    .replace(/-?\d+[.,]?\d*/g, '')
    // remove duplicate spaces and space before punctuation
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s+([!?;:])/g, '$1')
    .trim();

  return withoutMetrics || null;
}

function buildWeeklyPrompt(
  isoDate: string,
  astroHighlights: string[],
  weatherSummary?: string | null,
  cycleHint?: string | null,
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const userName = getUserName(userProfile);
  const weekRange = getWeekRange(isoDate, language);

  // Privacy-first: only include partner if they exist
  const hasPartnerData = hasPartner(userPartner);
  const defaultPartnerName = language === 'en'
    ? 'partner'
    : language === 'de'
    ? 'Partner'
    : 'партнёр';

  const partnerName = hasPartnerData ? getPartnerName(userPartner) : defaultPartnerName;

  if (language === 'en') {
    return `Write a sharp sarcastic horoscope for ${weekRange}.

REQUIREMENTS:
- 2-3 short paragraphs, each with emoji
- MAXIMUM sarcasm and irony — tell the truth straight, troll without mercy
- Focus: her mood, everyday tasks, plans, ${hasPartnerData ? `interaction with ${partnerName} and ` : ''}her own body/cycles.
${hasPartnerData ? `- If you mention ${partnerName}, do it like he's a real dude: sometimes supportive, sometimes annoying, no made-up drama or new characters.\n` : ''}
- MUST use casual profanity (fuck, fucking, shit, damn, hell, pissed off, fucked up, etc.) — not euphemisms, but direct. Profanity should be appropriate and enhance sarcasm. For example: "fuck off", "what the fuck", "damn tired", etc.
- DON'T mention zodiac signs of other people (like "${partnerName}-Sagittarius")
- DON'T write "Aries", "your sign", dates — that's already in the header
- DON'T use markdown (**, ##, ---)
- Must end with a complete sentence
- Ending: sarcastically encouraging, like "you'll handle it, even if everything's going to shit"
${weatherSummary ? `- Weather for the week: ${weatherSummary}. Play this sarcastically, don't name the city.` : ''}
${cycleHint ? `- ${userName}'s cycle: ${cycleHint}` : ''}

${astroHighlights.length ? `Supporting notes (for you, don't list them, weave the meaning into the text):\n${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n` : ''}${weatherSummary ? `Reminder for you: weather for the week — ${weatherSummary}. In the text just sarcastically hint at these weather quirks, don't name the place.\n` : ''}${cycleHint ? `Remember: cycle is like this — ${cycleHint}. In the text emphatically hint at this.` : ''}Write the text directly, no introductions.`;
  }

  if (language === 'de') {
    return `Schreibe ein scharfes sarkastisches Horoskop für ${weekRange}.

ANFORDERUNGEN:
- 2-3 kurze Absätze, jeder mit Emoji
- MAXIMALER Sarkasmus und Ironie — sage die Wahrheit direkt ins Gesicht, trolle ohne Gnade
- Fokus: ihre Stimmung, alltägliche Aufgaben, Pläne, ${hasPartnerData ? `Interaktion mit ${partnerName} und ` : ''}ihrem eigenen Körper/Zyklen.
${hasPartnerData ? `- Wenn du ${partnerName} erwähnst, mache es wie bei einem echten Kerl: manchmal unterstützend, manchmal nervend, kein erfundenes Drama oder neue Charaktere.\n` : ''}
- MUSS Schimpfwörter verwenden (Scheiße, verdammt, zum Teufel, verflucht, beschissen, etc.) — keine Euphemismen, sondern direkt. Schimpfwörter sollten angemessen sein und den Sarkasmus verstärken. Zum Beispiel: "verpiss dich", "was zur Hölle", "verdammt müde", etc.
- Erwähne KEINE Sternzeichen anderer Menschen (wie "${partnerName}-Schütze")
- Schreibe NICHT "Widder", "dein Zeichen", Daten — das steht schon in der Überschrift
- Verwende KEIN Markdown (**, ##, ---)
- Muss mit einem vollständigen Satz enden
- Ende: sarkastisch-aufmunternd, wie "du wirst es schaffen, auch wenn alles zur Hölle geht"
${weatherSummary ? `- Wetter für die Woche: ${weatherSummary}. Spiele das sarkastisch aus, nenne nicht die Stadt.` : ''}
${cycleHint ? `- ${userName}s Zyklus: ${cycleHint}` : ''}

${astroHighlights.length ? `Unterstützende Notizen (für dich, liste sie nicht auf, webe die Bedeutung in den Text):\n${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n` : ''}${weatherSummary ? `Erinnerung für dich: Wetter für die Woche — ${weatherSummary}. Im Text deute nur sarkastisch auf diese Wettereigenheiten hin, nenne nicht den Ort.\n` : ''}${cycleHint ? `Merke dir: Zyklus ist so — ${cycleHint}. Im Text weise betont darauf hin.` : ''}Schreibe den Text direkt, keine Einleitungen.`;
  }

  // Russian (default)
  return `Напиши жёсткий саркастичный гороскоп на ${weekRange}.

ТРЕБОВАНИЯ:
- 2–3 коротких абзаца, каждый с эмодзи
- МАКСИМУМ сарказма и иронии — говори правду в глаза, троллить без жалости
- Фокус: её настроение, бытовые задачи, планы, ${hasPartnerData ? `взаимодействие с ${partnerName} и ` : ''}собственным телом/циклами.
${hasPartnerData ? `- Если упоминаешь ${partnerName}, делай это как про живого мужика: то поддерживает, то бесит, без придуманной драмы и новых персонажей.\n` : ''}
- ОБЯЗАТЕЛЬНО используй нормальный мат (хуй, нахуй, блядь, пиздец, пиздато, хуёво, охуенно, ебанутый, ёбнутый и так далее) — не эвфемизмы, а прямо. Мат должен быть уместным и усиливать сарказм. Например: "послать на хуй", "какого хуя", "пиздец как устала" и т.д.
- НЕ упоминай знаки зодиака других людей в тексте (типа "${partnerName}-Стрелец")
- НЕ пиши "Овен", "твой знак", даты — это уже в заголовке
- НЕ используй markdown (**, ##, ---)
- Обязательно закончи полным предложением
- Финал: саркастично-ободряющий, типа "справишься, даже если всё идёт к хуям"
${weatherSummary ? `- Погода на неделю: ${weatherSummary}. Обыграй это язвительно, не называя город.` : ''}
${cycleHint ? `- Цикл ${userName}: ${cycleHint}` : ''}

${astroHighlights.length ? `Вспомогательные заметки (для тебя, не перечисляй их списком, а вплети смысл в текст):\n${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n` : ''}${weatherSummary ? `Напоминание для тебя: погода на неделе — ${weatherSummary}. В тексте просто саркастично намекни на эти погодные приколы, место не называй.\n` : ''}${cycleHint ? `Запомни: цикл такой — ${cycleHint}. В тексте подчёркнуто намекни на это.` : ''}Пиши сразу текст, без вступлений.`;
}

export function buildDailyPrompt(
  isoDate: string,
  astroHighlights: string[],
  weatherSummary?: string | null,
  cycleHint?: string | null,
  memoryEntries?: HoroscopeMemoryEntry[],
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const userName = getUserName(userProfile);

  // Privacy-first: only include partner if they exist
  const hasPartnerData = hasPartner(userPartner);
  const defaultPartnerName = language === 'en'
    ? 'partner'
    : language === 'de'
    ? 'Partner'
    : 'партнёр';

  const partnerName = hasPartnerData ? getPartnerName(userPartner) : defaultPartnerName;

  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedDate = formatter.format(date);
  const memoryReminders = buildDailyMemoryReminders(memoryEntries, language, userProfile, userPartner);

  if (language === 'en') {
    return `Write a sharp daily horoscope for ${userName} for today (date for you: ${formattedDate}, but don't mention it in the text).

REQUIREMENTS:
- 2 short paragraphs of 2-3 sentences each, each with thematic emoji at the start
- Sarcasm and profanity in place, like from a best friend, but without overdoing it
- Focus: day's tasks, mood, ${hasPartnerData ? `interaction with ${partnerName}, ` : ''}everyday routine and body.
${hasPartnerData ? `- If you mention ${partnerName} — show real interaction, don't invent new people or drama.\n` : ''}${memoryReminders.length ? `${memoryReminders.join('\n')}\n` : ''}- Use the facts below to tie events to real transits. Don't list them and don't mention "transit" — just integrate the meaning.
- Don't mention weeks, only this day
- Ending — tough but supportive, complete thought
${weatherSummary ? `- Weather for the day: ${weatherSummary}. Weave this into the text sarcastically without mentioning the city.` : ''}
${cycleHint ? `- Cycle: ${cycleHint}` : ''}

${astroHighlights.length ? `Supporting notes (for you, don't list them verbatim):
${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}
` : ''}${weatherSummary ? `Weather note: ${weatherSummary}. Just make a snarky reference in the text without revealing the location.\n` : ''}${cycleHint ? `Cycle note: ${cycleHint}. Use this definitely to poke and support ${userName}.\n` : ''}${memoryReminders.length ? `Consider these repeat restrictions, but don't list them explicitly — just vary the plot.` : ''}Write complete text directly, no introductions.`;
  }

  if (language === 'de') {
    return `Schreibe ein scharfes Tageshoroskop für ${userName} für heute (Datum für dich: ${formattedDate}, aber erwähne es nicht im Text).

ANFORDERUNGEN:
- 2 kurze Absätze mit je 2-3 Sätzen, jeder mit thematischen Emoji am Anfang
- Sarkasmus und Schimpfwörter am Platz, wie von einer besten Freundin, aber ohne Übertreibung
- Fokus: Tagesaufgaben, Stimmung, ${hasPartnerData ? `Interaktion mit ${partnerName}, ` : ''}alltägliche Routine und Körper.
${hasPartnerData ? `- Wenn du ${partnerName} erwähnst — zeige echte Interaktion, erfinde keine neuen Menschen oder Drama.\n` : ''}${memoryReminders.length ? `${memoryReminders.join('\n')}\n` : ''}- Verwende die Fakten unten, um Ereignisse mit echten Transiten zu verknüpfen. Liste sie nicht auf und erwähne nicht "Transit" — integriere einfach die Bedeutung.
- Erwähne keine Wochen, nur diesen Tag
- Ende — hart aber unterstützend, vollständiger Gedanke
${weatherSummary ? `- Wetter für den Tag: ${weatherSummary}. Webe das sarkastisch in den Text ein, ohne die Stadt zu erwähnen.` : ''}
${cycleHint ? `- Zyklus: ${cycleHint}` : ''}

${astroHighlights.length ? `Unterstützende Notizen (für dich, liste sie nicht wörtlich auf):
${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}
` : ''}${weatherSummary ? `Wetterhinweis: ${weatherSummary}. Mache einfach eine bissige Anspielung im Text, ohne den Ort zu verraten.\n` : ''}${cycleHint ? `Zyklushinweis: ${cycleHint}. Verwende das unbedingt, um ${userName} zu sticheln und zu unterstützen.\n` : ''}${memoryReminders.length ? `Berücksichtige diese Wiederholungsbeschränkungen, aber liste sie nicht explizit auf — variiere einfach die Handlung.` : ''}Schreibe kompletten Text direkt, keine Einleitungen.`;
  }

  // Russian (default)
  return `Составь язвительный дневной гороскоп для ${userName} на сегодня (дата для тебя: ${formattedDate}, но в тексте её не называй).

ТРЕБОВАНИЯ:
- 2 коротких абзаца по 2–3 предложения, каждый с тематическими эмодзи в начале
- Сарказм и мат на месте, как у лучшей подруги, но без перебора
- Фокус: дела дня, настроение, ${hasPartnerData ? `взаимодействие с ${partnerName}, ` : ''}бытовая рутина и тело.
${hasPartnerData ? `- Если упоминаешь ${partnerName} — показывай реальное взаимодействие, не выдумывай новых людей и драм.\n` : ''}${memoryReminders.length ? `${memoryReminders.join('\n')}\n` : ''}- Используй факты ниже, чтобы привязать события к реальным транзитам. Не перечисляй их как список и не ссылайся на "транзит" — просто интегрируй смысл.
- Не упоминай про недели, только про этот день
- Финал — жёстко поддерживающий, законченная мысль
${weatherSummary ? `- Погода на день: ${weatherSummary}. Вплети это в текст саркастично и без упоминания города.` : ''}
${cycleHint ? `- Цикл: ${cycleHint}` : ''}

${astroHighlights.length ? `Вспомогательные заметки (для тебя, не перечисляй их дословно):
${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}
` : ''}${weatherSummary ? `Справка по погоде: ${weatherSummary}. Просто сделай ехидный заход в тексте, не раскрывая локацию.\n` : ''}${cycleHint ? `Справка по циклу: ${cycleHint}. Используй это обязательно, чтоб подколоть и поддержать ${userName}.\n` : ''}${memoryReminders.length ? `Эти ограничения про повторы учти, но не перечисляй явно — просто меняй сюжет.` : ''}Пиши цельный текст сразу, без вступлений.`;
}

function buildSergeyDailyPrompt(
  isoDate: string,
  astroHighlights: string[],
  weatherSummary?: string | null,
  cycleHint?: string | null,
  memoryEntries?: HoroscopeMemoryEntry[],
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const userName = getUserName(userProfile);

  // Privacy-first: partner horoscope requires partner with name AND birth date
  if (!hasPartner(userPartner)) {
    throw new Error('Partner not defined or missing birth date - cannot generate partner horoscope');
  }

  const partnerName = getPartnerName(userPartner);
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedDate = formatter.format(date);
  const memoryReminders = buildSergeyMemoryReminders(memoryEntries, language, userProfile, userPartner);

  if (language === 'en') {
    return `Write a sharp daily horoscope about ${partnerName} for today (date for you: ${formattedDate}, but don't write it in the text).

REQUIREMENTS:
- One solid paragraph of 3-4 short sentences, start it with a suitable emoji and space.
- Write for ${userName}, about ${partnerName} in THIRD PERSON using appropriate pronouns. DON'T repeat the name "${partnerName}" every sentence — use pronouns after the first mention.
- Mention ${userName} ONLY if there's a natural reason, WITHOUT template phrases like "you, ${userName}, are holding up well". Can skip mentioning at all if the horoscope is only about ${partnerName}.
- Tone: sharp, with profanity to the point; no inspiring optimism for ${partnerName}.
- Ending — sarcastically harsh, without a glimmer of hope.
- Base your horoscope on astrological data and transits. Don't invent hardcoded personality traits.
- Don't invent new relatives or children.
${memoryReminders.length ? `${memoryReminders.join('\n')}\n` : ''}${astroHighlights.length ? `- Use the hints below as background (weave the meaning, don't repeat verbatim):
${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}
` : ''}${weatherSummary ? `- Weather outside is ${weatherSummary}. Make sure to hint at the weather vibe without numbers or specific values.` : ''}${cycleHint ? `- ${cycleHint}` : ''}- Don't use lists or markdown. Return only the finished text.`;
  }

  if (language === 'de') {
    return `Schreibe ein scharfes Tageshoroskop über ${partnerName} für heute (Datum für dich: ${formattedDate}, aber schreibe es nicht im Text).

ANFORDERUNGEN:
- Ein durchgehender Absatz mit 3-4 kurzen Sätzen, beginne ihn mit einem passenden Emoji und Leerzeichen.
- Schreibe für ${userName}, über ${partnerName} in der DRITTEN PERSON mit passenden Pronomen. Wiederhole NICHT den Namen "${partnerName}" in jedem Satz — verwende Pronomen nach der ersten Erwähnung.
- Erwähne ${userName} NUR wenn es einen natürlichen Anlass gibt, OHNE Schablonensätze wie "du, ${userName}, hältst dich wacker". Kann ganz weggelassen werden, wenn das Horoskop nur über ${partnerName} ist.
- Ton: scharf, mit Schimpfwörtern am Platz; kein inspirierender Optimismus für ${partnerName}.
- Ende — sarkastisch-hart, ohne Hoffnungsschimmer.
- Basiere dein Horoskop auf astrologischen Daten und Transiten. Erfinde keine fest codierten Persönlichkeitsmerkmale.
- Erfinde keine neuen Verwandten oder Kinder.
${memoryReminders.length ? `${memoryReminders.join('\n')}\n` : ''}${astroHighlights.length ? `- Verwende die Hinweise unten als Hintergrund (webe die Bedeutung ein, wiederhole nicht wörtlich):
${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}
` : ''}${weatherSummary ? `- Das Wetter draußen ist ${weatherSummary}. Deute unbedingt auf die Wetterstimmung hin, ohne Zahlen oder konkrete Werte.` : ''}${cycleHint ? `- ${cycleHint}` : ''}- Verwende keine Listen oder Markdown. Gib nur den fertigen Text zurück.`;
  }

  // Russian (default)
  return `Составь едкий дневной гороскоп про ${partnerName} на сегодня (для тебя дата: ${formattedDate}, но не пиши её в тексте).

ТРЕБОВАНИЯ:
- Один цельный абзац из 3–4 коротких предложений, начни его с подходящего эмодзи и пробела.
- Пиши для ${userName}, про ${partnerName} в ТРЕТЬЕМ ЛИЦЕ, используя подходящие местоимения. НЕ повторяй имя «${partnerName}» каждое предложение — используй местоимения после первого упоминания.
- ${userName} упоминай ТОЛЬКО если есть естественный повод, БЕЗ шаблонных фраз типа «ты же, ${userName}, держишься молодцом». Можно вообще не упоминать, если гороскоп только про ${partnerName}.
- Тон: колкий, с матом по делу; никакого вдохновляющего оптимизма для ${partnerName}.
- Финал — саркастично-жёсткий, без лучика надежды.
- Основывай гороскоп на астрологических данных и транзитах. Не придумывай захардкоженные черты характера.
- Не придумывай новых родственников и детей.
${memoryReminders.length ? `${memoryReminders.join('\n')}\n` : ''}${astroHighlights.length ? `- Используй нижние подсказки как фон (вплетай смысл, не повторяй дословно):
${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}
` : ''}${weatherSummary ? `- На улице ${weatherSummary}. Обязательно намекни на погодный вайб без цифр и конкретных значений.` : ''}${cycleHint ? `- ${cycleHint}` : ''}- Не используй списки и markdown. Верни только готовый текст.`;
}

function isLikelyTruncated(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  const endings = '.!?…';
  const closingQuotes = '»"”\'';

  const lastChar = trimmed.slice(-1);
  if (closingQuotes.includes(lastChar)) {
    const beforeQuote = trimmed.slice(0, -1).trim().slice(-1);
    if (beforeQuote && endings.includes(beforeQuote)) {
      return false;
    }
  }

  if (!endings.includes(lastChar)) {
    return true;
  }

  const sentences = trimmed.split(/[.!?…]/).map(part => part.trim()).filter(Boolean);
  if (sentences.length === 0) {
    return true;
  }
  const lastSentence = sentences[sentences.length - 1];
  return lastSentence.length < 20;
}

interface HoroscopeRequestOptions {
  signal?: AbortSignal;
  claudeApiKey?: string;
  claudeProxyUrl?: string;
  openAIApiKey?: string;
}

async function requestHoroscopeText(
  prompt: string,
  options: HoroscopeRequestOptions,
  baseMaxTokens = 700,
  retryMaxTokens = 950,
  systemPrompt: string,
): Promise<{ text: string; provider: 'claude' | 'openai' }>
{
  const { callAI } = await import('./aiClient');

  const makeMessages = (content: string): AIMessage[] => [
    {
      role: 'user',
      content,
    },
  ];

  const baseRequest: AIRequestOptions = {
    system: systemPrompt,
    messages: makeMessages(prompt),
    temperature: 0.85,
    maxTokens: baseMaxTokens,
    signal: options.signal,
    claudeApiKey: options.claudeApiKey,
    claudeProxyUrl: options.claudeProxyUrl,
    openAIApiKey: options.openAIApiKey,
  };

  let result = await callAI(baseRequest);
  let text = result.text.trim();

  if (!text || isLikelyTruncated(text)) {
    console.warn('[Horoscope] First attempt looks truncated, requesting rewrite with more tokens.');
    try {
      const retryRequest: AIRequestOptions = {
        ...baseRequest,
        maxTokens: retryMaxTokens,
        messages: makeMessages(
          `${prompt}\n\nПерепиши полностью заново. Заверши каждое предложение и весь текст, не оставляй обрезанных фраз. Финал должен быть законченной мыслью.`,
        ),
      };
      const retryResult = await callAI(retryRequest);
      const retryText = retryResult.text.trim();
      if (retryText) {
        result = retryResult;
        text = retryText;
      }
    } catch (retryError) {
      console.warn('[Horoscope] Retry attempt failed:', retryError);
    }
  }

  if (!text) {
    throw new Error('AI returned empty horoscope text');
  }

  if (isLikelyTruncated(text)) {
    console.warn('[Horoscope] Horoscope still appears truncated after retry.');
  }

  return {
    text,
    provider: result.provider,
  };
}

export async function fetchDailyHoroscope(
  isoDate: string,
  signal?: AbortSignal,
  claudeApiKey?: string,
  claudeProxyUrl?: string,
  openAIApiKey?: string,
  cycles?: CycleData[],
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): Promise<DailyHoroscope> {
  try {
    const userName = getUserName(userProfile);

    // Privacy-first: only use partner if they have both name AND birth date
    const partnerName = hasPartner(userPartner) ? getPartnerName(userPartner) : null;

    const astroHighlights = buildAstroHighlights(isoDate, 4, userName, partnerName || '');

    // Privacy-first: only fetch weather if user granted location access
    const coords = getUserCoordinates(userProfile);
    const weatherSummary = coords
      ? await fetchWeeklyWeatherSummary(isoDate, signal, language, coords.latitude, coords.longitude)
      : null;

    // Privacy-first: only include cycle hint if cycle tracking is enabled
    const cycleHint = (cycles && isCycleTrackingEnabled(userProfile))
      ? buildWeeklyCycleHint(cycles, isoDate, language)
      : null;

    const prompt = buildWeeklyPrompt(isoDate, astroHighlights, weatherSummary, cycleHint, language, userProfile, userPartner);
    if (astroHighlights.length > 0) {
      console.log('[Horoscope] Astro highlights:', astroHighlights);
    }

    const result = await requestHoroscopeText(
      prompt,
      {
        signal,
        claudeApiKey,
        claudeProxyUrl,
        openAIApiKey,
      },
      700,  // baseMaxTokens
      950,  // retryMaxTokens
      buildHoroscopeSystemPrompt(language),
    );

    console.log(`Generated weekly horoscope using ${result.provider}`);

    return {
      text: result.text,
      date: isoDate ?? null,
      provider: result.provider,
      weekRange: getWeekRange(isoDate, language),
      highlights: astroHighlights,
    };
  } catch (error) {
    console.error('Failed to generate AI horoscope:', error);
    return {
      text: getFallbackHoroscopeText('weekly', language, userProfile, userPartner),
      date: isoDate ?? null,
      provider: 'fallback',
      highlights: [],
    };
  }
}

function getFallbackHoroscopeText(
  type: 'weekly' | 'daily' | 'sergey',
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const userName = getUserName(userProfile);

  if (language === 'en') {
    if (type === 'weekly') {
      return `Today the horoscope hid behind the clouds, but ${userName} is sure: whatever happens, you'll handle it! 💖`;
    }
    if (type === 'daily') {
      return `Today the stars are busy with their own affairs, but ${userName} is confident you'll survive this day! ✨`;
    }
    // partner
    const partnerName = getPartnerName(userPartner, 'partner');
    return `🤦‍♂️ The stars shrugged: ${partnerName}'s carrying the household alone again, and there's not even a flicker of light at the end of the tunnel.`;
  }

  if (language === 'de') {
    if (type === 'weekly') {
      return `Heute hat sich das Horoskop hinter den Wolken versteckt, aber ${userName} ist sicher: was auch passiert, du schaffst das! 💖`;
    }
    if (type === 'daily') {
      return `Heute sind die Sterne mit ihren eigenen Angelegenheiten beschäftigt, aber ${userName} ist überzeugt, dass du den Tag überstehst! ✨`;
    }
    // partner
    const partnerName = getPartnerName(userPartner, 'Partner');
    return `🤦‍♂️ Die Sterne zuckten mit den Schultern: ${partnerName} schleppt den Haushalt wieder alleine, und kein Licht am Ende des Tunnels blinkt auch nur.`;
  }

  // Russian (default)
  if (type === 'weekly') {
    return `Сегодня гороскоп спрятался за облаками, но ${userName} уверена: что бы ни случилось, ты справишься! 💖`;
  }
  if (type === 'daily') {
    return `Сегодня звёзды заняты своими делами, но ${userName} уверена, что ты выдержишь этот день! ✨`;
  }
  // partner
  const partnerName = getPartnerName(userPartner, 'партнёр');
  return `🤦‍♂️ Звёзды пожали плечами: ${partnerName} опять тащит быт один, и никакой свет в конце тоннеля даже не мигает.`;
}

function getFallbackLoadingMessages(language = 'ru'): HoroscopeLoadingMessage[] {
  if (language === 'en') {
    return [
      { emoji: '☎️', text: "Calling Mars — finding out who's in charge of your drive today." },
      { emoji: '💌', text: "Sending a letter through Venus — checking how much tenderness is allocated for the day." },
      { emoji: '🛰️', text: "Catching connection with Jupiter — seeing if luck will arrive unannounced." },
      { emoji: '☕️', text: "Saturn is finishing coffee and writing today's obligations list." },
      { emoji: '🧹', text: "Pluto is tidying up the subconscious — give it a couple minutes of chaos." },
      { emoji: '🌕', text: "Moon is trying on moods — picking the right level of drama for you." },
    ];
  }

  if (language === 'de') {
    return [
      { emoji: '☎️', text: 'Rufen Mars an — finden heraus, wer heute deinen Antrieb leitet.' },
      { emoji: '💌', text: 'Schicken Brief durch Venus — prüfen, wie viel Zärtlichkeit für den Tag vorgesehen ist.' },
      { emoji: '🛰️', text: 'Empfangen Verbindung mit Jupiter — schauen, ob Glück unangekündigt kommt.' },
      { emoji: '☕️', text: 'Saturn trinkt Kaffee aus und schreibt die Pflichtenliste für heute.' },
      { emoji: '🧹', text: 'Pluto macht Aufräumen im Unterbewusstsein — gib ihm ein paar Minuten Chaos.' },
      { emoji: '🌕', text: 'Mond probiert Stimmungen an — wählt das richtige Drama-Level für dich.' },
    ];
  }

  // Russian (default)
  return [
    { emoji: '☎️', text: 'Звоним Марсу — выясняем, кто сегодня заведует твоим драйвом.' },
    { emoji: '💌', text: 'Через Венеру шлём письмо — уточняем, сколько нежности выделено на день.' },
    { emoji: '🛰️', text: 'Связь с Юпитером ловим — проверяем, прилетит ли удача без предупреждения.' },
    { emoji: '☕️', text: 'Сатурн допивает кофе и пишет список обязанностей на сегодня.' },
    { emoji: '🧹', text: 'Плутон делает уборку в подсознании — оставь ему пару минут хаоса.' },
    { emoji: '🌕', text: 'Луна примеряет настроение — подбирает тебе правильный уровень драматизма.' },
  ];
}

const FALLBACK_LOADING_MESSAGES: HoroscopeLoadingMessage[] = getFallbackLoadingMessages();

function buildLoadingMessagesPrompt(userName: string, language: string): { system: string; prompt: string } {
  if (language === 'en') {
    return {
      system: 'You create witty status messages for the loading screen. Respond strictly with a JSON array.',
      prompt: `Generate 6 funny status messages about the horoscope loading process. Each status should:
- start with one suitable emoji;
- be 8-14 words long;
- mention real planets or celestial bodies (Mars, Venus, Saturn, Pluto, Jupiter, Moon, Sun, etc.);
- sound like ${userName} is ironically explaining the process (e.g., "calling Mars", "waiting for Venus to reply");
- not repeat in meaning or tone;
- not use lists, quotes, or the word "status".

Return strictly a JSON array of objects like [{"emoji":"✨","text":"..."}] without explanations.`,
    };
  }

  if (language === 'de') {
    return {
      system: 'Du erfindest witzige Statusnachrichten für den Ladebildschirm. Antworte strikt mit einem JSON-Array.',
      prompt: `Generiere 6 lustige Statusnachrichten über den Horoskop-Ladevorgang. Jede Nachricht sollte:
- mit einem passenden Emoji beginnen;
- 8-14 Wörter lang sein;
- echte Planeten oder Himmelskörper erwähnen (Mars, Venus, Saturn, Pluto, Jupiter, Mond, Sonne usw.);
- klingen, als würde ${userName} ironisch den Prozess erklären (z.B. "Mars anrufen", "auf Antwort von Venus warten");
- sich in Bedeutung und Ton nicht wiederholen;
- keine Listen, Anführungszeichen oder das Wort "Status" verwenden.

Gib strikt ein JSON-Array von Objekten zurück wie [{"emoji":"✨","text":"..."}] ohne Erklärungen.`,
    };
  }

  // Russian (default)
  return {
    system: 'Ты придумываешь остроумные статусы для экрана загрузки. Отвечай строго JSON-массивом.',
    prompt: `Сгенерируй 6 смешных статусов о том, что идёт загрузка гороскопа. Каждый статус должен:
- начинаться с одного подходящего эмодзи;
- быть длиной 8-14 слов;
- упоминать реальные планеты или небесные тела (Марс, Венера, Сатурн, Плутон, Юпитер, Луна, Солнце и т.д.);
- звучать так, будто ${userName} иронично объясняет процесс (например: «звоним Марсу», «ждём ответ от Венеры»);
- не повторяться по смыслу и тону;
- не использовать списки, кавычки или слово «статус».

Верни строго JSON-массив объектов вида [{"emoji":"✨","text":"..."}] без пояснений.`,
  };
}

export async function fetchHoroscopeLoadingMessages(
  claudeApiKey?: string,
  claudeProxyUrl?: string,
  openAIApiKey?: string,
  signal?: AbortSignal,
  language = 'ru',
  userProfile?: UserProfileData | null,
): Promise<HoroscopeLoadingMessage[]> {
  const userName = getUserName(userProfile);
  const { system, prompt } = buildLoadingMessagesPrompt(userName, language);

  try {
    const { callAI } = await import('./aiClient');
    const response = await callAI({
      system,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.95,
      maxTokens: 320,
      signal,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
    });

    const cleaned = response.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as HoroscopeLoadingMessage[];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty loading messages array');
    }

    return parsed
      .filter(entry => entry && typeof entry.emoji === 'string' && typeof entry.text === 'string')
      .map(entry => ({
        emoji: entry.emoji.trim(),
        text: entry.text.trim(),
      }))
      .filter(entry => entry.emoji && entry.text)
      .slice(0, 6);
  } catch (error) {
    console.warn('Failed to fetch custom loading messages, using fallback:', error);
    return getFallbackLoadingMessages(language);
  }
}

export async function fetchSergeyLoadingMessages(
  claudeApiKey?: string,
  claudeProxyUrl?: string,
  openAIApiKey?: string,
  signal?: AbortSignal,
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): Promise<HoroscopeLoadingMessage[]> {
  const defaultPartnerName = language === 'en'
    ? 'partner'
    : language === 'de'
    ? 'Partner'
    : 'партнёр';

  const partnerName = getPartnerName(userPartner, defaultPartnerName);

  const prompt = `Сгенерируй 10 язвительных статусов для загрузки гороскопа ${partnerName}.
Правила для КАЖДОГО статуса:
- начинается с одного подходящего эмодзи и пробела;
- одно ёмкое предложение (12–20 слов), БЕЗ точек внутри, БЕЗ переносов строк;
- саркастично намекает, что ${partnerName} снова притворяется продуктивным (с отсылками к планетам, космосу, небесной бюрократии);
- допускается лёгкий мат типа «нахрена», но избегай жёсткой брани;
- все статусы различаются смыслом и образами;
- ВАЖНО: весь текст в одну строку, БЕЗ переносов, все кавычки внутри текста должны быть экранированы.

Верни ТОЛЬКО валидный JSON-массив вида [{"emoji":"✨","text":"..."}] БЕЗ markdown, БЕЗ пояснений, БЕЗ переносов строк внутри text.`;

  try {
    const { callAI } = await import('./aiClient');
    const response = await callAI({
      system: `Ты язвительно объясняешь, почему гороскоп ${partnerName} ещё грузится. Отвечай только JSON.`,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 600,
      signal,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
    });

    let cleaned = response.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Дополнительная очистка: убрать переносы строк внутри JSON
    cleaned = cleaned.replace(/\n/g, ' ').replace(/\r/g, '');

    const parsed = JSON.parse(cleaned) as HoroscopeLoadingMessage[];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Empty Sergey loading messages array');
    }

    return parsed
      .filter(entry => entry && typeof entry.emoji === 'string' && typeof entry.text === 'string')
      .map(entry => ({
        emoji: entry.emoji.trim(),
        text: entry.text.replace(/\s+/g, ' ').trim(),
      }))
      .filter(entry => entry.emoji && entry.text)
      .slice(0, 10);
  } catch (error) {
    console.warn('Failed to fetch Sergey loading messages, using fallback:', error);
    return getSergeyLoadingFallback(10, userPartner);
  }
}

export async function fetchDailyHoroscopeForDate(
  isoDate: string,
  signal?: AbortSignal,
  claudeApiKey?: string,
  claudeProxyUrl?: string,
  openAIApiKey?: string,
  cycles?: CycleData[],
  memory?: HoroscopeMemoryEntry[],
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): Promise<DailyHoroscope> {
  try {
    const userName = getUserName(userProfile);

    // Privacy-first: only use partner if they have both name AND birth date
    const partnerName = hasPartner(userPartner) ? getPartnerName(userPartner) : null;

    const astroHighlights = buildAstroHighlights(isoDate, 3, userName, partnerName || '');

    // Privacy-first: only fetch weather if user granted location access
    const coords = getUserCoordinates(userProfile);
    const weatherSummary = coords
      ? await fetchDailyWeatherSummary(isoDate, signal, language, coords.latitude, coords.longitude)
      : null;

    // Privacy-first: only include cycle hint if cycle tracking is enabled
    const cycleHint = (cycles && isCycleTrackingEnabled(userProfile))
      ? buildDailyCycleHint(cycles, isoDate, language, userName)
      : null;

    const prompt = buildDailyPrompt(isoDate, astroHighlights, weatherSummary, cycleHint, memory, language, userProfile, userPartner);
    if (astroHighlights.length > 0) {
      console.log('[Horoscope] Daily astro highlights:', astroHighlights);
    }

    const requestOptions: HoroscopeRequestOptions = {
      signal,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
    };

    const result = await requestHoroscopeText(prompt, requestOptions, 600, 850, buildHoroscopeSystemPrompt(language));

    let memoryEntry: HoroscopeMemoryEntry | undefined;
    if (result.text) {
      const extracted = await extractHoroscopeMemoryEntry(result.text, isoDate, 'daily', requestOptions);
      if (extracted) {
        memoryEntry = extracted;
      }
    }

    console.log(`Generated daily horoscope using ${result.provider}`);

    return {
      text: result.text,
      date: isoDate ?? null,
      provider: result.provider,
      highlights: astroHighlights,
      memoryEntry,
    };
  } catch (error) {
    console.error('Failed to generate daily horoscope:', error);
    return {
      text: getFallbackHoroscopeText('daily', language, userProfile, userPartner),
      date: isoDate ?? null,
      provider: 'fallback',
      highlights: [],
    };
  }
}

export async function fetchSergeyDailyHoroscopeForDate(
  isoDate: string,
  signal?: AbortSignal,
  claudeApiKey?: string,
  claudeProxyUrl?: string,
  openAIApiKey?: string,
  cycles?: CycleData[],
  memory?: HoroscopeMemoryEntry[],
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): Promise<DailyHoroscope> {
  try {
    const userName = getUserName(userProfile);

    // Privacy-first: partner horoscope requires partner with name AND birth date
    if (!hasPartner(userPartner)) {
      throw new Error('Partner not defined or missing birth date - cannot generate partner horoscope');
    }

    const partnerName = getPartnerName(userPartner);

    const allHighlights = buildAstroHighlights(isoDate, 6, userName, partnerName);
    // Фильтруем хайлайты, связанные с партнером или отношениями
    const partnerSpecific = allHighlights.filter(entry => {
      const lowerEntry = entry.toLowerCase();
      const lowerPartnerName = partnerName.toLowerCase();
      return (
        lowerEntry.includes(lowerPartnerName) ||
        lowerEntry.includes('отношени') ||
        lowerEntry.includes('партнер')
      );
    });
    const astroHighlights = partnerSpecific.length > 0 ? partnerSpecific : allHighlights.slice(0, 3);

    // Privacy-first: only fetch weather if user granted location access
    const coords = getUserCoordinates(userProfile);
    const rawWeatherSummary = coords
      ? await fetchDailyWeatherSummary(isoDate, signal, language, coords.latitude, coords.longitude)
      : null;
    const weatherSummary = simplifyWeatherSummary(rawWeatherSummary);

    // Privacy-first: only include cycle hint if cycle tracking is enabled
    const cycleHint = (cycles && isCycleTrackingEnabled(userProfile))
      ? buildSergeyCycleHint(cycles, isoDate, language, userName, partnerName)
      : null;
    const prompt = buildSergeyDailyPrompt(isoDate, astroHighlights, weatherSummary, cycleHint, memory, language, userProfile, userPartner);

    const requestOptions: HoroscopeRequestOptions = {
      signal,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
    };

    const result = await requestHoroscopeText(
      prompt,
      requestOptions,
      520,
      680,
      buildPartnerSystemPrompt(language, userProfile, userPartner),
    );

    let memoryEntry: HoroscopeMemoryEntry | undefined;
    if (result.text) {
      const extracted = await extractHoroscopeMemoryEntry(result.text, isoDate, 'sergey', requestOptions);
      if (extracted) {
        memoryEntry = extracted;
      }
    }

    console.log(`Generated Sergey daily horoscope using ${result.provider}`);

    return {
      text: result.text,
      date: isoDate ?? null,
      provider: result.provider,
      highlights: astroHighlights,
      memoryEntry,
    };
  } catch (error) {
    console.error('Failed to generate Sergey daily horoscope:', error);
    return {
      text: getFallbackHoroscopeText('sergey', language, userProfile, userPartner),
      date: isoDate ?? null,
      provider: 'fallback',
      highlights: [],
    };
  }
}

function buildSergeyBannerSystemPrompt(
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null
): string {
  const userName = getUserName(userProfile, language === 'en' ? 'user' : language === 'de' ? 'Benutzer' : 'пользователь');
  const defaultPartnerName = language === 'en'
    ? 'partner'
    : language === 'de'
    ? 'Partner'
    : 'партнёр';
  const partnerName = getPartnerName(userPartner, defaultPartnerName);

  if (language === 'en') {
    return `You're a witty copywriter helping ${userName} formulate a card about ${partnerName}. Write casually, modern, and without pompousness.`;
  }

  if (language === 'de') {
    return `Du bist eine sarkastische Texterin, die ${userName} hilft, eine Karte über ${partnerName} zu formulieren. Antworte locker, modern und ohne Pathos.`;
  }

  // Russian (default)
  return `Ты — язвительная копирайтерша, которая помогает ${userName} формулировать карточку про ${partnerName}. Отвечай легко, по-современному и без пафоса.`;
}

function buildSergeyBannerPrompt(
  isoDate: string,
  memoryEntries?: HoroscopeMemoryEntry[],
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): string {
  const defaultPartnerName = language === 'en'
    ? 'partner'
    : language === 'de'
    ? 'Partner'
    : 'партнёр';
  const partnerName = getPartnerName(userPartner, defaultPartnerName);
  const userName = getUserName(userProfile, language === 'en' ? 'user' : language === 'de' ? 'Benutzer' : 'пользователь');

  // Create user object for compatibility with existing template strings
  const user = { name: userName };

  const todayFallback = language === 'en' ? 'today' : language === 'de' ? 'heute' : 'сегодня';
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';

  const parsedDate = new Date(isoDate);
  const formattedDate = Number.isNaN(parsedDate.getTime())
    ? todayFallback
    : new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
      }).format(parsedDate);

  const memoryReminders = buildSergeyMemoryReminders(memoryEntries, language);
  const remindersSection = memoryReminders.length
    ? (language === 'en'
        ? `Additional hints on tone and themes:\n${memoryReminders.join('\n')}\n`
        : language === 'de'
        ? `Zusätzliche Hinweise zu Ton und Themen:\n${memoryReminders.join('\n')}\n`
        : `Дополнительные подсказки по тону и темам:\n${memoryReminders.join('\n')}\n`)
    : '';

  if (language === 'en') {
    return `Need to update the card texts "What's up with ${partnerName}?" for ${formattedDate}.

Give four short phrases with the same meaning but in new wordings:
- title — a question of 4-7 words with intrigue like "What's up with ${partnerName}?" (keep the name ${partnerName} in any case).
- subtitle — one dense sentence (up to 22 words) with light sarcasm about today; WITHOUT clichés like "again stirring things up", "horoscope will tell all", "let's find out the truth". Come up with a fresh wording about what's happening with him today (for example: "Seems like today he's ready to redo...", "He's having the kind of day when...", "There's suspicion that plans...").
- primaryButton — 2-3 words, a call to check the horoscope.
- secondaryButton — 1-2 words, a playful excuse like "Don't care".

Rules:
- Conversational English, light sarcasm is ok, but no swearing or insults.
- No emoji or quotes.
- Button captions without period at the end.
- Subtitle about today, but WITHOUT repeating templates.
- Don't mention ${user.name} directly and don't address the reader with "you" — make wordings impersonal ("Seems like ${partnerName}...", "There's suspicion that...").
${remindersSection}Return exactly one line of JSON without comments:
{"title":"...","subtitle":"...","primaryButton":"...","secondaryButton":"..."}
`;
  }

  if (language === 'de') {
    return `Es müssen die Kartentexte "Was ist los mit ${partnerName}?" für ${formattedDate} aktualisiert werden.

Gib vier kurze Sätze mit der gleichen Bedeutung, aber in neuen Formulierungen:
- title — eine Frage mit 4-7 Wörtern mit Intrige wie "Was ist los mit ${partnerName}?" (behalte den Namen ${partnerName} in beliebigem Fall).
- subtitle — ein dichter Satz (bis zu 22 Wörter) mit leichtem Sarkasmus über heute; OHNE Klischees wie "wieder am Intrigieren", "Horoskop wird alles erzählen", "finden wir die Wahrheit heraus". Erfinde eine frische Formulierung über das, was heute mit ihm passiert (zum Beispiel: "Scheint, als wäre er heute bereit, zu überarbeiten...", "Er hat so einen Tag, an dem...", "Es gibt den Verdacht, dass Pläne...").
- primaryButton — 2-3 Wörter, ein Aufruf, ins Horoskop zu schauen.
- secondaryButton — 1-2 Wörter, eine spielerische Ausrede wie "Ist mir egal".

Regeln:
- Umgangssprachliches Deutsch, leichter Sarkasmus ist ok, aber keine Schimpfwörter oder Beleidigungen.
- Keine Emoji oder Anführungszeichen.
- Buttonbeschriftungen ohne Punkt am Ende.
- Untertitel über heute, aber OHNE sich wiederholende Vorlagen.
- Erwähne ${user.name} nicht direkt und sprich den Leser nicht mit "du" an — mache Formulierungen unpersönlich ("Scheint, als ob ${partnerName}...", "Es gibt den Verdacht, dass...").
${remindersSection}Gib genau eine Zeile JSON ohne Kommentare zurück:
{"title":"...","subtitle":"...","primaryButton":"...","secondaryButton":"..."}
`;
  }

  // Russian (default)
  return `Нужно обновить тексты карточки «Что там у ${partnerName}?» на ${formattedDate}.

Дай четыре короткие фразы с тем же смыслом, но в новых формулировках:
- title — вопрос на 4-7 слов с интригой вроде «А что там у ${partnerName}?» (оставь имя ${partnerName} в любом падеже).
- subtitle — одно плотное предложение (до 22 слов) с лёгким сарказмом про сегодняшний день; БЕЗ клише типа «снова мутит», «опять затевает», «гороскоп всё расскажет», «узнаем правду». Придумай свежую формулировку про то, что происходит у него сегодня (например: «Кажется, сегодня он готов переделать...», «У него такой день, когда...», «Есть подозрение, что планы...»).
- primaryButton — 2-3 слова, призыв заглянуть в гороскоп.
- secondaryButton — 1-2 слова, играющая отмазка в духе «Мне пофиг».

Правила:
- Разговорный русский, можно лёгкий сарказм, но без мата и оскорблений.
- Никаких эмодзи и кавычек.
- Подписи на кнопках без точки на конце.
- Подзаголовок про сегодняшний день, но БЕЗ повторяющихся шаблонов.
- Не упоминай прямо ${user.name} и не обращайся к читательнице на «ты» — делай формулировки обезличенными («Кажется, ${partnerName}…», «Есть подозрение, что…»).
${remindersSection}Верни ровно одну строку JSON без комментариев:
{"title":"...","subtitle":"...","primaryButton":"...","secondaryButton":"..."}
`;
}

export async function fetchSergeyBannerCopy(
  isoDate: string,
  signal?: AbortSignal,
  claudeApiKey?: string,
  claudeProxyUrl?: string,
  openAIApiKey?: string,
  memory?: HoroscopeMemoryEntry[],
  language = 'ru',
  userProfile?: UserProfileData | null,
  userPartner?: PartnerData | null,
): Promise<SergeyBannerCopy> {
  const prompt = buildSergeyBannerPrompt(isoDate, memory, language, userProfile, userPartner);

  try {
    const { callAI } = await import('./aiClient');
    const response = await callAI({
      system: buildSergeyBannerSystemPrompt(language, userProfile, userPartner),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.75,
      maxTokens: 220,
      signal,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
    });

    const cleaned = response.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<SergeyBannerCopy>;

    const normalize = (value: unknown): string =>
      typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

    const result: SergeyBannerCopy = {
      title: normalize(parsed.title),
      subtitle: normalize(parsed.subtitle),
      primaryButton: normalize(parsed.primaryButton),
      secondaryButton: normalize(parsed.secondaryButton),
    };

    if (!result.title || !result.subtitle || !result.primaryButton || !result.secondaryButton) {
      throw new Error('Sergey banner copy is incomplete');
    }

    console.log('[Horoscope] Generated Sergey banner copy using', response.provider);
    return result;
  } catch (error) {
    console.error('Failed to fetch Sergey banner copy:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function extractHoroscopeMemoryEntry(
  text: string,
  isoDate: string,
  source: HoroscopeMemoryEntry['source'],
  options: HoroscopeRequestOptions,
): Promise<HoroscopeMemoryEntry | null> {
  if (!text.trim()) {
    return null;
  }

  try {
    const { callAI } = await import('./aiClient');
    const prompt = `Проанализируй дневной гороскоп (источник: ${source}) и кратко зафиксируй, о чём он.

Текст:
"""
${text}
"""

Верни JSON вида {
  "summary": "одно предложение, объясняющее главный конфликт/сюжет",
  "keyThemes": ["2-4 ключевых темы короткими фразами"],
  "avoidPhrases": ["1-3 внятных формулировки из текста, которые не стоит повторять дословно завтра"],
  "tone": "positive | neutral | negative | mixed"
}

Без пояснений, только JSON.`;

    const response = await callAI({
      system: 'Ты выделяешь заметки о содержании гороскопов. Отвечай строго JSON-объектом.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      maxTokens: 320,
      signal: options.signal,
      claudeApiKey: options.claudeApiKey,
      claudeProxyUrl: options.claudeProxyUrl,
      openAIApiKey: options.openAIApiKey,
    });

    const cleaned = response.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      summary?: unknown;
      keyThemes?: unknown;
      avoidPhrases?: unknown;
      tone?: unknown;
    };

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : '';
    if (!summary) {
      return null;
    }

    const keyThemes = Array.isArray(parsed.keyThemes)
      ? parsed.keyThemes
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, 4)
          .map(item => item.trim())
      : [];

    const avoidPhrases = Array.isArray(parsed.avoidPhrases)
      ? parsed.avoidPhrases
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, 3)
          .map(item => item.trim())
      : [];

    const tone =
      parsed.tone === 'positive' ||
      parsed.tone === 'neutral' ||
      parsed.tone === 'negative' ||
      parsed.tone === 'mixed'
        ? parsed.tone
        : 'mixed';

    const entry: HoroscopeMemoryEntry = {
      id: `${source}-${isoDate}`,
      source,
      date: isoDate,
      summary,
      keyThemes,
      avoidPhrases,
      tone,
      createdAt: new Date().toISOString(),
    };

    return entry;
  } catch (error) {
    console.warn('Failed to extract horoscope memory entry:', error);
    return null;
  }
}

export function mergeHoroscopeMemoryEntries(
  existing: HoroscopeMemoryEntry[],
  next: HoroscopeMemoryEntry,
  maxEntries = MAX_MEMORY_KEEP,
): HoroscopeMemoryEntry[] {
  const deduped = existing.filter(
    entry => !(entry.source === next.source && entry.date === next.date),
  );

  const merged = [...deduped, next].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  if (merged.length > maxEntries) {
    return merged.slice(merged.length - maxEntries);
  }

  return merged;
}
