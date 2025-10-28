import { buildAstroHighlights } from './astro';
import type { AIRequestOptions, AIMessage } from './aiClient';
import { fetchDailyWeatherSummary, fetchWeeklyWeatherSummary } from './weather';
import { buildDailyCycleHint, buildSergeyCycleHint, buildWeeklyCycleHint } from './cyclePrompt';
import type { CycleData, HoroscopeMemoryEntry } from '../types';
import { getCurrentUser } from '../data/userProfile';
import { ASTRO_PROFILES } from '../data/astroProfiles';

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

const SERGEY_FALLBACK_LEADS = [
  { emoji: '🪐', lead: 'Сатурн фыркает:' },
  { emoji: '🔥', lead: 'Марс хмурится:' },
  { emoji: '🌀', lead: 'Юпитер наблюдает:' },
  { emoji: '💋', lead: 'Венера ухмыляется:' },
  { emoji: '📡', lead: 'Меркурий шепчет:' },
  { emoji: '⚡️', lead: 'Уран моргает:' },
  { emoji: '🧊', lead: 'Нептун вздыхает:' },
  { emoji: '🧯', lead: 'Плутон щёлкает зажигалкой:' },
];

const SERGEY_FALLBACK_MIDDLES = [
  'Серёжа опять листает чаты',
  'Серёжа пишет план номер восемь',
  'Серёжа кивает с видом спасителя',
  'Серёжа отдирает стикеры без цели',
  'Серёжа устраивает совещание с зеркалом',
  'Серёжа проверяет отчёт, которого нет',
  'Серёжа тренирует вдохновенный взгляд',
  'Серёжа клянётся, что всё под контролем',
  'Серёжа настраивает презентацию ради вида',
  'Серёжа жонглирует дедлайнами как шариками',
  'Серёжа подписывает сам себе поручение',
  'Серёжа закрывает мемы одним глазом',
];

const SERGEY_FALLBACK_ENDINGS = [
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

const SERGEY_STATIC_FALLBACK: HoroscopeLoadingMessage[] = [
  { emoji: '🧯', text: 'Марс проверяет, чем тушить очередной пожар, пока Серёжа дышит на пепелище.' },
  { emoji: '🛠️', text: 'Сатурн выдал Серёже новые ключи — чинить то, что рухнуло за ночь.' },
  { emoji: '🧾', text: 'Меркурий переписывает список дел Серёжи, потому что прежний уже сгорел нахуй.' },
  { emoji: '🚬', text: 'Плутон подкуривает Серёже сигарету и шепчет, что отдохнуть всё равно не выйдет.' },
  { emoji: '📦', text: 'Юпитер навалил задач, пока Серёжа таскал коробки и матерился сквозь зубы.' },
];

const pickRandom = <T,>(values: T[]): T => values[Math.floor(Math.random() * values.length)];

export function getSergeyLoadingFallback(count = 10): HoroscopeLoadingMessage[] {
  const results: HoroscopeLoadingMessage[] = [];
  const usedCombos = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 25;

  while (results.length < count && attempts < maxAttempts) {
    attempts += 1;
    const lead = pickRandom(SERGEY_FALLBACK_LEADS);
    const middle = pickRandom(SERGEY_FALLBACK_MIDDLES);
    const ending = pickRandom(SERGEY_FALLBACK_ENDINGS);
    const key = `${lead.lead}|${middle}|${ending}`;
    if (usedCombos.has(key)) {
      continue;
    }
    usedCombos.add(key);
    const text = `${lead.lead} ${middle}. ${ending}.`.replace(/\s+/g, ' ').trim();
    results.push({ emoji: lead.emoji, text });
  }

  if (results.length < count) {
    const extra = [...SERGEY_STATIC_FALLBACK];
    while (results.length < count && extra.length > 0) {
      const candidate = extra.shift()!;
      results.push(candidate);
    }
    while (results.length < count) {
      results.push({
        emoji: pickRandom(SERGEY_FALLBACK_LEADS).emoji,
        text: 'Звёзды мигнули: Серёжа снова продаёт видимость порядка.',
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

function formatMemoryDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(parsed);
}

function buildDailyMemoryReminders(
  memoryEntries: HoroscopeMemoryEntry[] | undefined,
): string[] {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];
  const partnerName = partner?.name || 'партнёр';

  const reminders: string[] = [
    `- Личные детали не мусоль без повода: держи фокус на сегодняшнем дне, ощущениях ${user.name} и взаимодействии с ${partnerName}.`,
    `- Заезженные образы (${STATIC_AVOID_THEMES.join(', ')}) либо обходи, либо радикально переосмысляй.`,
  ];

  const recent = selectRecentMemory(memoryEntries, 'daily');
  if (!recent.length) {
    return reminders;
  }

  const historyPieces = recent.map(entry => {
    const label = formatMemoryDateLabel(entry.date);
    const mainTheme = entry.keyThemes?.length
      ? entry.keyThemes.slice(0, 2).join(' / ')
      : entry.summary;
    return `${label} — ${mainTheme}`;
  });

  reminders.push(
    `- Из недавних дней уже звучало: ${historyPieces.join('; ')}. Найди свежий ракурс и новые детали.`,
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
      reminders.push(`- Не повторяй дословно формулировки ${formatted} — переупакуй мысли иначе.`);
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
      `- Темы ${staleThemes.join(', ')} уже звучали. Придумай другой повод или конфликт.`,
    );
  }

  return reminders;
}

function buildSergeyMemoryReminders(
  memoryEntries: HoroscopeMemoryEntry[] | undefined,
): string[] {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];
  const partnerName = partner?.name || 'партнёр';

  const reminders: string[] = [
    `- Шути язвительнее: находи новые бытовые приколы про ${partnerName}, не повторяй вчерашние мемы.`,
    `- Запрещённые клише: ${STATIC_SERGEY_AVOID_THEMES.join(', ')}.`,
    `- НЕ повторяй имя «${partnerName}» каждое предложение — используй местоимения «у него», «ему», «он».`,
    `- НЕ используй шаблонные фразы про ${user.name} типа «ты же, ${user.name}, держишься молодцом» — либо не упоминай её вообще, либо естественно.`,
  ];

  const recent = selectRecentMemory(memoryEntries, 'sergey');
  if (!recent.length) {
    return reminders;
  }

  const historyPieces = recent.map(entry => {
    const label = formatMemoryDateLabel(entry.date);
    const mainTheme = entry.keyThemes?.length
      ? entry.keyThemes.slice(0, 2).join(' / ')
      : entry.summary;
    return `${label} — ${mainTheme}`;
  });

  reminders.push(
    `- Уже звучало: ${historyPieces.join('; ')}. Найди свежую тему или новый поворот.`,
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
    reminders.push(`- Не повторяй дословно формулировки ${formatted} — придумай новую подачу.`);
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
      `- Темы ${staleThemes.join(', ')} уже были. Найди другой повод, лучше смешной.`,
    );
  }

  return reminders;
}

/**
 * Построить контекст для основного пользователя (для недельного гороскопа).
 * Извлекает данные из userProfile и astroProfiles.
 */
function buildUserContext(): string {
  const user = getCurrentUser();
  const astroProfile = ASTRO_PROFILES[user.astroProfileId];
  const partner = user.relationshipPartners?.[0];
  const partnerAstro = partner ? ASTRO_PROFILES[partner.profileId] : null;

  const traits = user.context.personalityTraits.join(', ');
  const partnerInfo = partner && partnerAstro
    ? `Главный близкий человек — ${partner.relationshipType === 'romantic' ? 'партнёр' : 'друг'} ${partner.name} (${partnerAstro.birthDate}). Они тащат быт вместе, подкалывают друг друга и лавируют между заботой и раздражением.`
    : '';

  return `
${user.name} — пользователь приложения, уехала из родного города и живёт в ${user.context.location}. Устала, но держится за счёт ${traits}.
Она ненавидит сахарные прогнозы и любит, когда говорят прямо, с матом и троллингом.
${partnerInfo}
Не выдумывай других родственников, детей, подруг и т.д. Если нет свежего повода — говори о текущих ощущениях, бытовых делах, планах, погоде, настроении.
`.trim();
}

/**
 * Построить контекст для партнёра пользователя (для дневного гороскопа).
 */
function buildPartnerContext(): string {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];

  if (!partner) {
    throw new Error(`User ${user.id} has no relationship partners defined`);
  }

  const partnerAstro = ASTRO_PROFILES[partner.profileId];

  return `
${partner.name} — партнёр ${user.name} (${partnerAstro.birthDate}). Живёт вместе с ней в ${user.context.location}, работает в IT и поддерживает это приложение.
Он перфекционист, любит порядок, списки дел и контроль. Хаос и пустые обещания выводят его из себя.
У ${partner.name} отдельный «офис» в квартире: он там зарывается в задачи, пьёт литры кофе и мечтает о тишине.
Любит велосипед, но редко выбирается кататься. Не курит и ненавидит перегар, поэтому часто троллит ${user.name} за её привычки.
${partner.name} вечно уставший, однако продолжает тащить всё на себе. ${user.name} в тексте поддерживай, ${partner.name} саркастично подначивай.
`.trim();
}

/**
 * Построить системный промпт для недельного гороскопа.
 */
function buildHoroscopeSystemPrompt(): string {
  const user = getCurrentUser();
  const astroProfile = ASTRO_PROFILES[user.astroProfileId];
  const userContext = buildUserContext();

  return `Ты пишешь недельный гороскоп для ${user.name} (${astroProfile.birthDate}, Овен ♈️).

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
function buildPartnerSystemPrompt(): string {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];

  if (!partner) {
    throw new Error(`User ${user.id} has no relationship partners defined`);
  }

  const partnerAstro = ASTRO_PROFILES[partner.profileId];
  const partnerContext = buildPartnerContext();

  return `Ты пишешь едкий дневной гороскоп про ${partner.name} (${partnerAstro.birthDate}) специально для ${user.name}.

КОНТЕКСТ:
${partnerContext}

СТИЛЬ:
- Адресуй текст ${user.name}, но НЕ используй шаблонные фразы типа «ты же, ${user.name}, держишься молодцом».
- ${user.name} упоминай ВАРИАТИВНО и естественно: можно вскользь поддержать или вообще не упоминать, если нет повода.
- Про ${partner.name} пиши в третьем лице: «у него», «ему», «его», «он». НЕ повторяй имя «${partner.name}» слишком часто — используй местоимения.
- Юмор обязателен: вставляй свежие шутки и конкретные бытовые наблюдения, не повторяя вчерашние.
- Не превращай ${partner.name} в «вечного угрюмца» — ищи другие поводья для сарказма (его привычки, перфекционизм, кофе, офис и т.д.).
- Мат используем по делу, чтобы усилить сарказм, а не заменить его.
- Не подбадривай ${partner.name} и не обещай ему светлого будущего. Финал — сухой или ехидный, без лучиков надежды.

ФОРМАТ:
- Один плотный абзац (3–4 предложения), начни с подходящего эмодзи и пробела.
- Без markdown, списков, заголовков.
- Заверши сухим/язвительным выводом без позитивного налёта.`;
}

function getWeekRange(isoDate: string): string {
  const startDate = new Date(isoDate);
  if (Number.isNaN(startDate.getTime())) {
    return isoDate;
  }

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', day: 'numeric' });
  const startMonth = monthFormatter.format(startDate).split(' ')[1]; // "21 октября" -> "октября"
  const endMonth = monthFormatter.format(endDate).split(' ')[1]; // "27 октября" -> "октября"

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
): string {
  const user = getCurrentUser();
  const weekRange = getWeekRange(isoDate);
  const partner = user.relationshipPartners?.[0];
  const partnerName = partner?.name || 'партнёр';

  return `Напиши жёсткий саркастичный гороскоп на ${weekRange}.

ТРЕБОВАНИЯ:
- 2–3 коротких абзаца, каждый с эмодзи
- МАКСИМУМ сарказма и иронии — говори правду в глаза, троллить без жалости
- Фокус: её настроение, бытовые задачи, планы, взаимодействие с ${partnerName} и собственным телом/циклами.
- Если упоминаешь ${partnerName}, делай это как про живого мужика: то поддерживает, то бесит, без придуманной драмы и новых персонажей.
- ОБЯЗАТЕЛЬНО используй нормальный мат (хуй, нахуй, блядь, пиздец, пиздато, хуёво, охуенно, ебанутый, ёбнутый и так далее) — не эвфемизмы, а прямо. Мат должен быть уместным и усиливать сарказм. Например: "послать на хуй", "какого хуя", "пиздец как устала" и т.д.
- НЕ упоминай знаки зодиака других людей в тексте (типа "${partnerName}-Стрелец")
- НЕ пиши "Овен", "твой знак", даты — это уже в заголовке
- НЕ используй markdown (**, ##, ---)
- Обязательно закончи полным предложением
- Финал: саркастично-ободряющий, типа "справишься, даже если всё идёт к хуям"
${weatherSummary ? `- Погода на неделю: ${weatherSummary}. Обыграй это язвительно, не называя город.` : ''}
${cycleHint ? `- Цикл ${user.name}: ${cycleHint}` : ''}

${astroHighlights.length ? `Вспомогательные заметки (для тебя, не перечисляй их списком, а вплети смысл в текст):\n${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n` : ''}${weatherSummary ? `Напоминание для тебя: погода на неделе — ${weatherSummary}. В тексте просто саркастично намекни на эти погодные приколы, место не называй.\n` : ''}${cycleHint ? `Запомни: цикл такой — ${cycleHint}. В тексте подчёркнуто намекни на это.` : ''}Пиши сразу текст, без вступлений.`;
}

function buildDailyPrompt(
  isoDate: string,
  astroHighlights: string[],
  weatherSummary?: string | null,
  cycleHint?: string | null,
  memoryEntries?: HoroscopeMemoryEntry[],
): string {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];
  const partnerName = partner?.name || 'партнёр';
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedDate = formatter.format(date);
  const memoryReminders = buildDailyMemoryReminders(memoryEntries);

  return `Составь язвительный дневной гороскоп для ${user.name} на сегодня (дата для тебя: ${formattedDate}, но в тексте её не называй).

ТРЕБОВАНИЯ:
- 2 коротких абзаца по 2–3 предложения, каждый с тематическими эмодзи в начале
- Сарказм и мат на месте, как у лучшей подруги, но без перебора
- Фокус: дела дня, настроение, взаимодействие с ${partnerName}, бытовая рутина и тело.
- Если упоминаешь ${partnerName} — показывай реальное взаимодействие, не выдумывай новых людей и драм.
${memoryReminders.length ? `${memoryReminders.join('\n')}\n` : ''}- Используй факты ниже, чтобы привязать события к реальным транзитам. Не перечисляй их как список и не ссылайся на "транзит" — просто интегрируй смысл.
- Не упоминай про недели, только про этот день
- Финал — жёстко поддерживающий, законченная мысль
${weatherSummary ? `- Погода на день: ${weatherSummary}. Вплети это в текст саркастично и без упоминания города.` : ''}
${cycleHint ? `- Цикл: ${cycleHint}` : ''}

${astroHighlights.length ? `Вспомогательные заметки (для тебя, не перечисляй их дословно):
${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}
` : ''}${weatherSummary ? `Справка по погоде: ${weatherSummary}. Просто сделай ехидный заход в тексте, не раскрывая локацию.\n` : ''}${cycleHint ? `Справка по циклу: ${cycleHint}. Используй это обязательно, чтоб подколоть и поддержать ${user.name}.\n` : ''}${memoryReminders.length ? `Эти ограничения про повторы учти, но не перечисляй явно — просто меняй сюжет.` : ''}Пиши цельный текст сразу, без вступлений.`;
}

function buildSergeyDailyPrompt(
  isoDate: string,
  astroHighlights: string[],
  weatherSummary?: string | null,
  cycleHint?: string | null,
  memoryEntries?: HoroscopeMemoryEntry[],
): string {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];

  if (!partner) {
    throw new Error(`User ${user.id} has no relationship partners defined`);
  }

  const partnerName = partner.name;
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedDate = formatter.format(date);
  const memoryReminders = buildSergeyMemoryReminders(memoryEntries);

  return `Составь едкий дневной гороскоп про ${partnerName} на сегодня (для тебя дата: ${formattedDate}, но не пиши её в тексте).

ТРЕБОВАНИЯ:
- Один цельный абзац из 3–4 коротких предложений, начни его с подходящего эмодзи и пробела.
- Пиши для ${user.name}, про ${partnerName} в ТРЕТЬЕМ ЛИЦЕ: «у него», «ему», «его», «он». НЕ повторяй имя «${partnerName}» каждое предложение — используй местоимения после первого упоминания.
- ${user.name} упоминай ТОЛЬКО если есть естественный повод, БЕЗ шаблонных фраз типа «ты же, ${user.name}, держишься молодцом». Можно вообще не упоминать, если гороскоп только про него.
- Тон: колкий, с матом по делу; никакого вдохновляющего оптимизма для ${partnerName}.
- Финал — саркастично-жёсткий, без лучика надежды.
- Не придумывай новых родственников и детей — достаточно ${partnerName} и его бытовых миссий.
- Не выдумывай бардак: у ${partnerName} порядок и чистота, шути на других контрастах (перфекционизм, кофе, офис, велосипед, контроль).
${memoryReminders.length ? `${memoryReminders.join('\n')}\n` : ''}${astroHighlights.length ? `- Используй нижние подсказки как фон (вплетай смысл, не повторяй дословно):
${astroHighlights.map((item, index) => `${index + 1}. ${item}`).join('\n')}
` : ''}${weatherSummary ? `- У него на улице ${weatherSummary}. Обязательно намекни на погодный вайб без цифр и конкретных значений.` : ''}${cycleHint ? `- ${cycleHint}` : ''}- Не используй списки и markdown. Верни только готовый текст.`;
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
): Promise<DailyHoroscope> {
  try {
    const astroHighlights = buildAstroHighlights(isoDate);
    const weatherSummary = await fetchWeeklyWeatherSummary(isoDate, signal);
    const cycleHint = cycles ? buildWeeklyCycleHint(cycles, isoDate) : null;
    const prompt = buildWeeklyPrompt(isoDate, astroHighlights, weatherSummary, cycleHint);
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
      buildHoroscopeSystemPrompt(),
    );

    console.log(`Generated weekly horoscope using ${result.provider}`);

    return {
      text: result.text,
      date: isoDate ?? null,
      provider: result.provider,
      weekRange: getWeekRange(isoDate),
      highlights: astroHighlights,
    };
  } catch (error) {
    console.error('Failed to generate AI horoscope:', error);
    return {
      text: getFallbackHoroscopeText('weekly', language),
      date: isoDate ?? null,
      provider: 'fallback',
      highlights: [],
    };
  }
}

function getFallbackHoroscopeText(type: 'weekly' | 'daily' | 'sergey', language = 'ru'): string {
  const userName = getCurrentUser().name;

  if (language === 'en') {
    if (type === 'weekly') {
      return `Today the horoscope hid behind the clouds, but ${userName} is sure: whatever happens, you'll handle it! 💖`;
    }
    if (type === 'daily') {
      return `Today the stars are busy with their own affairs, but ${userName} is confident you'll survive this day! ✨`;
    }
    // sergey
    return "🤦‍♂️ The stars shrugged: he's carrying the household alone again, and there's not even a flicker of light at the end of the tunnel.";
  }

  if (language === 'de') {
    if (type === 'weekly') {
      return `Heute hat sich das Horoskop hinter den Wolken versteckt, aber ${userName} ist sicher: was auch passiert, du schaffst das! 💖`;
    }
    if (type === 'daily') {
      return `Heute sind die Sterne mit ihren eigenen Angelegenheiten beschäftigt, aber ${userName} ist überzeugt, dass du den Tag überstehst! ✨`;
    }
    // sergey
    return "🤦‍♂️ Die Sterne zuckten mit den Schultern: er schleppt den Haushalt wieder alleine, und kein Licht am Ende des Tunnels blinkt auch nur.";
  }

  // Russian (default)
  if (type === 'weekly') {
    return `Сегодня гороскоп спрятался за облаками, но ${userName} уверена: что бы ни случилось, ты справишься! 💖`;
  }
  if (type === 'daily') {
    return `Сегодня звёзды заняты своими делами, но ${userName} уверена, что ты выдержишь этот день! ✨`;
  }
  // sergey
  return '🤦‍♂️ Звёзды пожали плечами: Серёжа опять тащит быт один, и никакой свет в конце тоннеля даже не мигает.';
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
): Promise<HoroscopeLoadingMessage[]> {
  const user = getCurrentUser();
  const { system, prompt } = buildLoadingMessagesPrompt(user.name, language);

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
): Promise<HoroscopeLoadingMessage[]> {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];
  const partnerName = partner?.name || 'партнёр';

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
    return getSergeyLoadingFallback();
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
): Promise<DailyHoroscope> {
  try {
    const astroHighlights = buildAstroHighlights(isoDate, 3);
    const weatherSummary = await fetchDailyWeatherSummary(isoDate, signal);
    const cycleHint = cycles ? buildDailyCycleHint(cycles, isoDate) : null;
    const prompt = buildDailyPrompt(isoDate, astroHighlights, weatherSummary, cycleHint, memory);
    if (astroHighlights.length > 0) {
      console.log('[Horoscope] Daily astro highlights:', astroHighlights);
    }

    const requestOptions: HoroscopeRequestOptions = {
      signal,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
    };

    const result = await requestHoroscopeText(prompt, requestOptions, 600, 850, buildHoroscopeSystemPrompt());

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
      text: getFallbackHoroscopeText('daily', language),
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
): Promise<DailyHoroscope> {
  try {
    const user = getCurrentUser();
    const partner = user.relationshipPartners?.[0];
    const partnerName = partner?.name || '';

    const allHighlights = buildAstroHighlights(isoDate, 6);
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
    const rawWeatherSummary = await fetchDailyWeatherSummary(isoDate, signal);
    const weatherSummary = simplifyWeatherSummary(rawWeatherSummary);
    const cycleHint = cycles ? buildSergeyCycleHint(cycles, isoDate) : null;
    const prompt = buildSergeyDailyPrompt(isoDate, astroHighlights, weatherSummary, cycleHint, memory);

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
      buildPartnerSystemPrompt(),
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
      text: getFallbackHoroscopeText('sergey', language),
      date: isoDate ?? null,
      provider: 'fallback',
      highlights: [],
    };
  }
}

function buildSergeyBannerSystemPrompt(): string {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];
  const partnerName = partner?.name || 'партнёр';

  return `Ты — язвительная копирайтерша, которая помогает ${user.name} формулировать карточку про ${partnerName}. Отвечай легко, по-современному и без пафоса.`;
}

function buildSergeyBannerPrompt(
  isoDate: string,
  memoryEntries?: HoroscopeMemoryEntry[],
): string {
  const user = getCurrentUser();
  const partner = user.relationshipPartners?.[0];
  const partnerName = partner?.name || 'партнёр';
  const parsedDate = new Date(isoDate);
  const formattedDate = Number.isNaN(parsedDate.getTime())
    ? 'сегодня'
    : new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
      }).format(parsedDate);

  const memoryReminders = buildSergeyMemoryReminders(memoryEntries);
  const remindersSection = memoryReminders.length
    ? `Дополнительные подсказки по тону и темам:\n${memoryReminders.join('\n')}\n`
    : '';

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
): Promise<SergeyBannerCopy> {
  const prompt = buildSergeyBannerPrompt(isoDate, memory);

  try {
    const { callAI } = await import('./aiClient');
    const response = await callAI({
      system: buildSergeyBannerSystemPrompt(),
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
