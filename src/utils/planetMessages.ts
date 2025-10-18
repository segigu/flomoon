import { callAI } from './aiClient';
import {
  ASTRO_PROFILES,
  PRIMARY_PROFILE_ID,
  type AstroProfile,
} from '../data/astroProfiles';
import {
  buildNatalChartAnalysis,
  type NatalChartAnalysis,
} from './astro';

export interface PlanetDialogueMessage {
  planet: string;
  message: string;
}

/**
 * Настройки темпа печати для каждой планеты.
 * - typingSpeed: базовая скорость печати (мс на символ)
 * - pauseBeforeRange: диапазон паузы перед началом печати [min, max] (мс)
 * - pauseAfterRange: диапазон паузы после сообщения перед следующим [min, max] (мс)
 */
export interface PlanetTypingConfig {
  typingSpeed: number;
  pauseBeforeRange: [number, number];
  pauseAfterRange: [number, number];
}

/**
 * Конфигурация темпа печати для каждой планеты.
 * Отражает характер планеты через скорость и паузы.
 */
export const PLANET_TYPING_CONFIGS: Record<string, PlanetTypingConfig> = {
  'Луна': {
    typingSpeed: 40,              // Мягкая, спокойная
    pauseBeforeRange: [800, 1200],
    pauseAfterRange: [600, 1000],
  },
  'Плутон': {
    typingSpeed: 35,              // Медленная, зловещая
    pauseBeforeRange: [1200, 1800],
    pauseAfterRange: [800, 1400],
  },
  'Венера': {
    typingSpeed: 25,              // Быстрая, легкая
    pauseBeforeRange: [400, 800],
    pauseAfterRange: [300, 600],
  },
  'Марс': {
    typingSpeed: 20,              // Очень быстрая, резкая
    pauseBeforeRange: [200, 500],
    pauseAfterRange: [200, 400],
  },
  'Сатурн': {
    typingSpeed: 45,              // Медленная, размеренная
    pauseBeforeRange: [1000, 1500],
    pauseAfterRange: [700, 1200],
  },
  'Меркурий': {
    typingSpeed: 15,              // Самая быстрая, логичная
    pauseBeforeRange: [300, 600],
    pauseAfterRange: [250, 500],
  },
  'Нептун': {
    typingSpeed: 50,              // Очень медленная, туманная
    pauseBeforeRange: [1500, 2200],
    pauseAfterRange: [1000, 1800],
  },
  'Уран': {
    typingSpeed: 18,              // Быстрая, непредсказуемая
    pauseBeforeRange: [100, 700],  // Широкий разброс!
    pauseAfterRange: [200, 800],   // Очень непредсказуемо
  },
  'Юпитер': {
    typingSpeed: 35,              // Умеренная, философская
    pauseBeforeRange: [900, 1400],
    pauseAfterRange: [600, 1100],
  },
  'Хирон': {
    typingSpeed: 38,              // Задумчивая, глубокая
    pauseBeforeRange: [1100, 1600],
    pauseAfterRange: [700, 1300],
  },
};

/**
 * Получает конфигурацию печати для планеты.
 * Если планета не найдена, возвращает дефолтные настройки.
 */
export function getPlanetTypingConfig(planet: string): PlanetTypingConfig {
  return PLANET_TYPING_CONFIGS[planet] || {
    typingSpeed: 30,
    pauseBeforeRange: [500, 1000],
    pauseAfterRange: [400, 800],
  };
}

/**
 * Рассчитывает длительность печати сообщения на основе конфигурации планеты.
 */
export function calculateTypingDuration(message: string, planet: string): number {
  const config = getPlanetTypingConfig(planet);
  return message.length * config.typingSpeed;
}

/**
 * Рассчитывает паузу перед началом печати для планеты.
 */
export function calculatePauseBefore(planet: string): number {
  const config = getPlanetTypingConfig(planet);
  const [min, max] = config.pauseBeforeRange;
  return min + Math.random() * (max - min);
}

/**
 * Рассчитывает паузу после сообщения перед следующим.
 */
export function calculatePauseAfter(planet: string): number {
  const config = getPlanetTypingConfig(planet);
  const [min, max] = config.pauseAfterRange;
  return min + Math.random() * (max - min);
}

export interface PersonalizedPlanetMessages {
  dialogue: PlanetDialogueMessage[];
  timestamp: number;
}

function serializeBirthData(profile: AstroProfile): string {
  const loc = profile.notes?.split('(')[0]?.trim() ?? 'Тикси';
  return `${profile.birthDate}, ${profile.birthTime ?? '12:00'}, ${loc}`;
}

function serializeChartAnalysis(analysis: NatalChartAnalysis): string {
  // Находим позицию Солнца (знак зодиака) - это ВАЖНО для понимания характера
  const sunPlacement = analysis.corePlacements.find(p => p.includes('Солнце'));

  // Берём остальные планеты (без Солнца)
  const otherPlacements = analysis.corePlacements
    .filter(p => !p.includes('Солнце'))
    .slice(0, 4);

  // Солнце ВСЕГДА первым, потом остальные
  const placements = sunPlacement
    ? [sunPlacement, ...otherPlacements]
    : analysis.corePlacements.slice(0, 5);

  return `Планеты: ${placements.join(', ')}. Напряжения: ${analysis.hardAspects.slice(0, 3).join(', ')}.`;
}

const NASTIA_PROFILE = ASTRO_PROFILES[PRIMARY_PROFILE_ID];
const NASTIA_CHART_ANALYSIS = buildNatalChartAnalysis(PRIMARY_PROFILE_ID);
const BIRTH_DATA_TEXT = serializeBirthData(NASTIA_PROFILE);
const CHART_ANALYSIS_TEXT = serializeChartAnalysis(NASTIA_CHART_ANALYSIS);

/**
 * Получает текущее время и день недели по берлинскому времени (Europe/Berlin).
 * Возвращает контекстное описание времени дня и дня недели.
 */
function getBerlinTimeContext(): {
  hour: number;
  dayOfWeek: string;
  timeOfDay: string;
  dayContext: string;
  greeting: string;
} {
  // Парсим час
  const hour = parseInt(new Date().toLocaleString('en-US', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    hour12: false,
  }));

  // Получаем день недели
  const dayOfWeek = new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Berlin',
    weekday: 'long',
  });

  // Определяем время суток
  let timeOfDay: string;
  let greeting: string;

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'утро';
    greeting = 'Доброе утро';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'день';
    greeting = 'Добрый день';
  } else if (hour >= 17 && hour < 22) {
    timeOfDay = 'вечер';
    greeting = 'Добрый вечер';
  } else {
    timeOfDay = 'ночь';
    greeting = 'Доброй ночи';
  }

  // Генерируем контекст с учётом дня недели
  const dayContextVariants: Record<string, string[]> = {
    'понедельник': [
      `Понедельник ${timeOfDay}, планеты собрались на рабочее совещание`,
      `Начало недели, планеты встречаются ${timeOfDay === 'утро' ? 'с кофе' : 'обсудить планы'}`,
      `Понедельничный ${timeOfDay}, планеты в рабочем настрое`,
    ],
    'вторник': [
      `Вторник ${timeOfDay}, планеты уже в рабочем ритме`,
      `Середина рабочей недели начинается, планеты собрались ${timeOfDay === 'утро' ? 'рано утром' : 'на планёрку'}`,
    ],
    'среда': [
      `Среда ${timeOfDay}, планеты на экстренном совещании`,
      `Середина недели, планеты устроили встречу ${timeOfDay === 'утро' ? 'после завтрака' : 'в разгар дня'}`,
    ],
    'четверг': [
      `Четверг ${timeOfDay}, планеты уже устали, но работают`,
      `Предпятничный день, планеты встречаются ${timeOfDay === 'вечер' ? 'перед выходными' : 'доделать дела'}`,
    ],
    'пятница': [
      `Пятница ${timeOfDay}, планеты уставшие, но в хорошем настроении`,
      `ПЯТНИЦА! Планеты собрались ${timeOfDay === 'вечер' ? 'отметить конец недели' : 'доделать последние дела'}`,
      `Конец рабочей недели, планеты встречаются ${timeOfDay === 'утро' ? 'с предвкушением выходных' : 'уже думая об отдыхе'}`,
    ],
    'суббота': [
      `Суббота ${timeOfDay}, планеты встретились в выходной, атмосфера расслабленная`,
      `Выходной день, планеты собрались ${timeOfDay === 'утро' ? 'не спеша, без будильников' : 'в свободной обстановке'}`,
    ],
    'воскресенье': [
      `Воскресенье ${timeOfDay}, планеты на незапланированной встрече в выходной`,
      `Последний день выходных, планеты собрались ${timeOfDay === 'вечер' ? 'перед новой неделей' : 'в расслабленной атмосфере'}`,
    ],
  };

  const contextOptions = dayContextVariants[dayOfWeek] || [
    `${dayOfWeek} ${timeOfDay}, планеты собрались на встречу`,
  ];

  const dayContext = contextOptions[Math.floor(Math.random() * contextOptions.length)];

  return {
    hour,
    dayOfWeek,
    timeOfDay,
    dayContext,
    greeting,
  };
}

/**
 * Генерирует случайный контекст для диалога планет, чтобы добавить разнообразие.
 */
function generateRandomDialogueContext(): {
  mood: string;
  focusAspect: string;
  dayContext: string;
  primaryPlanet: string;
  timeContext: ReturnType<typeof getBerlinTimeContext>;
} {
  // Получаем реальное время по Берлину
  const timeContext = getBerlinTimeContext();

  const moods = [
    'энергичное и шутливое',
    'задумчивое и философское',
    'напряжённое, с лёгкими спорами',
    'весёлое, с подколами',
    'серьёзное и сосредоточенное',
    'ироничное и саркастичное',
    'тёплое и поддерживающее',
    'хаотичное, все перебивают друг друга',
  ];

  // Выбираем случайный аспект из натальной карты для фокуса
  const allAspects = [
    ...NASTIA_CHART_ANALYSIS.hardAspects,
    ...NASTIA_CHART_ANALYSIS.softAspects,
  ];
  const focusAspect = allAspects[Math.floor(Math.random() * allAspects.length)] || 'общие напряжения карты';

  // Случайная планета, которая будет вести обсуждение
  const planets = ['Луна', 'Плутон', 'Венера', 'Марс', 'Сатурн', 'Меркурий', 'Нептун', 'Уран', 'Юпитер', 'Хирон'];
  const primaryPlanet = planets[Math.floor(Math.random() * planets.length)];

  return {
    mood: moods[Math.floor(Math.random() * moods.length)],
    focusAspect,
    dayContext: timeContext.dayContext, // Используем реальный контекст времени
    primaryPlanet,
    timeContext, // Передаём полный временной контекст
  };
}


/**
 * Генерирует персонализированный диалог планет (25-30 фраз) на основе натальной карты.
 * Планеты обсуждают, какую интерактивную историю предложить, ссылаясь на конкретные
 * аспекты из карты (квадраты, оппозиции, трины). Диалог завершается выводом о главном
 * паттерне и конкретной ситуации для проработки.
 */
export async function generatePersonalizedPlanetMessages(
  claudeApiKey?: string,
  claudeProxyUrl?: string,
  openAIApiKey?: string,
  openAIProxyUrl?: string,
): Promise<PersonalizedPlanetMessages> {

  // Получаем детальные аспекты для промпта
  const hardAspectsText = NASTIA_CHART_ANALYSIS.hardAspects.slice(0, 3).join('\n');
  const softAspectsText = NASTIA_CHART_ANALYSIS.softAspects.slice(0, 3).join('\n');

  // Генерируем случайный контекст для разнообразия
  const context = generateRandomDialogueContext();

  const prompt = `Создай 25-30 фраз РАБОЧЕГО СОВЕЩАНИЯ планет (Луна, Плутон, Нептун, Уран, Венера, Сатурн, Хирон, Меркурий, Марс, Юпитер).
Они собрались обсудить, какую интерактивную историю придумать для Насти, ОСНОВЫВАЯСЬ НА ЕЁ НАТАЛЬНОЙ КАРТЕ.

НАТАЛЬНЫЕ ДАННЫЕ:
Настя родилась: ${BIRTH_DATA_TEXT}

АСТРОЛОГИЧЕСКИЙ КОНТЕКСТ:
${CHART_ANALYSIS_TEXT}

КЛЮЧЕВЫЕ НАПРЯЖЕНИЯ (квадраты и оппозиции из натальной карты):
${hardAspectsText}

РЕСУРСЫ (трины и секстили из натальной карты):
${softAspectsText}

ТЕКУЩЕЕ ВРЕМЯ И КОНТЕКСТ:
- Сейчас: ${context.timeContext.greeting} (${context.timeContext.dayOfWeek}, ${context.timeContext.timeOfDay}, ~${context.timeContext.hour}:00 по Берлину)
- Приветствие: планеты должны начать с приветствия, соответствующего времени суток ("${context.timeContext.greeting}", НЕ "доброе утро" если сейчас вечер!)
- Контекст времени: ${context.dayContext}

КОНТЕКСТ СОВЕЩАНИЯ:
- Настроение: ${context.mood}
- Главная планета-модератор: ${context.primaryPlanet} (эта планета чаще задаёт вопросы, ведёт обсуждение)
- Фокус обсуждения: обязательно упомяните и обсудите аспект "${context.focusAspect}"

ЗАДАЧА ПЛАНЕТ:
- Обсуждают, какую историю предложить Насте, говоря ЧЕЛОВЕЧЕСКИМ ЯЗЫКОМ (без астрологических терминов!)
- Каждая планета объясняет своё влияние ПРОСТЫМИ СЛОВАМИ через бытовые сравнения:
  ✅ "Я её эмоции тушу как пожарный" (вместо "квадрат Сатурна")
  ✅ "Мы с Венерой тянем её в разные стороны" (вместо "оппозиция")
  ✅ "Она со мной в гармонии, расслабляется" (вместо "трин")
  ❌ НЕТ слов: "квадрат", "оппозиция", "трин", "секстиль", "аспект"
- Предлагают конкретные сценарии, ТРОЛЛЯТ друг друга и Настю
- Спорят, какой косяк важнее проработать (с шутками и сарказмом)
- ОБЯЗАТЕЛЬНО обсуждают фокусную тему влияния: ${context.focusAspect} (но простым языком!)
- ФИНАЛ: вывод о главном паттерне, конкретная ситуация, но можно пошутить в конце

СТИЛЬ ДИАЛОГА:
- Короткие реплики до 100 символов
- Настроение диалога: ${context.mood}
- МНОГО ЮМОРА, САРКАЗМА, ПОДКОЛОВ — планеты троллят друг друга и Настю
- Планеты СПОРЯТ, перебивают, критикуют идеи друг друга, шутят
- Объясняют влияние ПРОСТЫМ ЯЗЫКОМ через бытовые метафоры:
  ✅ "Я её эмоции тушу как МЧС пожар"
  ✅ "Мы с Плутоном дёргаем её в разные стороны"
  ✅ "Она при мне расслабляется и мечтает"
  ❌ НЕТ астрологических терминов: "квадрат", "оппозиция", "трин", "аспект"
- Используй разговорный язык, бытовые сравнения, мемы
- ${context.primaryPlanet} ВЕДЁТ обсуждение, задаёт больше вопросов другим планетам
- Начало отражает контекст: ${context.dayContext}

ХАРАКТЕРЫ ПЛАНЕТ (с ЮМОРОМ):
- Луна: эмпатичная мамочка, переживает за всех, но и подкалывает мягко
- Плутон: тёмный троль, любит копать грязь, провоцирует, говорит страшные правды со смешком
- Венера: романтичная штучка, про любовь и красоту, но не дура — видит манипуляции
- Марс: агрессивный качок, рубит с плеча, орёт "ДЕЙСТВУЙ!", терпеть не может нытиков
- Сатурн: строгий препод, читает мораль, но иногда с сарказмом "Ну и кто тут взрослый?"
- Меркурий: умник-ботан, всё раскладывает по полочкам, троллит логикой
- Нептун: туманный мечтатель, вечно где-то витает, запутывает всех специально
- Уран: бунтарь-психопат, предлагает безумные идеи, всех бесит своей непредсказуемостью
- Юпитер: мудрый философ, видит картину целиком, но любит поучать
- Хирон: грустный психотерапевт, знает про раны, говорит больно, но помогает

ПРИМЕР ДИАЛОГА (25-30 фраз, С ЮМОРОМ):
ВАЖНО: Это только ПРИМЕР структуры! НЕ копируй его дословно!
Используй КОНТЕКСТ СОВЕЩАНИЯ выше для создания УНИКАЛЬНОГО диалога:
- ПЕРВАЯ фраза ОБЯЗАТЕЛЬНО должна содержать приветствие "${context.timeContext.greeting}" (соответствует реальному времени!)
- Начни с контекста: ${context.dayContext}
- Веди диалог в настроении: ${context.mood}
- ${context.primaryPlanet} должна быть модератором (задаёт вопросы, ведёт обсуждение)
- ОБЯЗАТЕЛЬНО обсуди аспект: ${context.focusAspect}

[Пример только для понимания структуры - НЕ КОПИРУЙ ДОСЛОВНО]
Луна: "${context.timeContext.greeting}, народ! Собрались? ${context.dayContext}. Чё для Насти сегодня замутим?"
Сатурн: "Глянул карту — у неё Луна квадрат Сатурн. Я её эмоции тушу как МЧС."
[...25-30 фраз с ЮМОРОМ, СПОРАМИ, обсуждением конкретных аспектов...]
Юпитер: "Решили. Ситуация: уязвимость VS защита. Выбор: открыться или закрыться."
Меркурий: "Фиксирую. План готов. ${context.timeContext.timeOfDay === 'утро' ? 'Кто кофе сварит?' : context.timeContext.timeOfDay === 'вечер' ? 'Пора по домам!' : 'Обед не помешает!'}"
[...закрываем весело с учётом настроения и времени суток]

ФИНАЛ ДИАЛОГА (ОБЯЗАТЕЛЬНО, но с юмором):
Последние 3-5 фраз должны быть ВЫВОДОМ (можно с шутками, но КОНКРЕТНЫМ):
- Какой ГЛАВНЫЙ паттерн (ПРОСТЫМ ЯЗЫКОМ, без астротерминов)?
- Какая КОНКРЕТНАЯ ситуация покажет этот косяк?
- Какой ВЫБОР нужен (два варианта: лёгкий VS правильный)?
Пример: "Решили. Она прячет эмоции, боится быть слабой. Ситуация: открыться или закрыться. Кто кофе?"

JSON формат:
{"dialogue": [{"planet": "Луна", "message": "..."}, {"planet": "Плутон", "message": "..."}, ...]}

Верни ТОЛЬКО JSON, без пояснений.`;

  try {
    console.log('[PlanetMessages] Starting AI call with OpenAI GPT-4o-mini');

    const result = await callAI({
      system: 'Создаёшь астрологический диалог планет, которые обсуждают натальную карту конкретного человека. Они ссылаются на реальные аспекты из карты и делают практические выводы о паттернах поведения. JSON только.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      maxTokens: 2500,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
      openAIProxyUrl,
      preferOpenAI: true,      // Используем OpenAI в первую очередь
      useGPT4oMini: true,       // Используем GPT-4o-mini для скорости
    });

    let text = result.text.trim().replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);

    const dialogue: PlanetDialogueMessage[] = (parsed?.dialogue || [])
      .filter((msg: any) => msg?.planet && msg?.message)
      .map((msg: any) => ({
        planet: msg.planet.trim(),
        message: msg.message.trim(),
      }));

    if (dialogue.length < 20) {
      throw new Error('Недостаточно фраз в диалоге');
    }

    console.log('[PlanetMessages] ✅ Generated', dialogue.length, 'messages');

    return {
      dialogue,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[PlanetMessages] Failed to generate via AI:', error);
    throw new Error('Планеты ушли на перекур 🌙☕ Попробуй обновить страницу!');
  }
}
