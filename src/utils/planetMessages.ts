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

export interface PlanetMessage {
  planet: string;
  messages: string[];
}

export interface PersonalizedPlanetMessages {
  messages: PlanetMessage[];
  timestamp: number;
}

function serializeBirthData(profile: AstroProfile): string {
  const locationNote = profile.notes?.split('(')[0]?.trim() ?? 'Тикси, Россия';
  const time = profile.birthTime ?? '12:00';
  return `{
  "date": "${profile.birthDate}",
  "time": "${time}",
  "timezone": "${profile.timeZone}",
  "location": "${locationNote}",
  "latitude": ${profile.latitude},
  "longitude": ${profile.longitude}
}`;
}

function serializeChartAnalysis(analysis: NatalChartAnalysis): string {
  const formatSection = (label: string, values: string[]): string => {
    if (!values.length) {
      return `${label}: []`;
    }
    return `${label}:\n- ${values.join('\n- ')}`;
  };

  return [
    formatSection('core_placements', analysis.corePlacements),
    formatSection('hard_aspects', analysis.hardAspects),
    formatSection('soft_aspects', analysis.softAspects),
  ].join('\n');
}

function indent(text: string, spaces = 2): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => (line.length ? pad + line : line))
    .join('\n');
}

const NASTIA_PROFILE = ASTRO_PROFILES[PRIMARY_PROFILE_ID];
const NASTIA_CHART_ANALYSIS = buildNatalChartAnalysis(PRIMARY_PROFILE_ID);
const BIRTH_DATA_TEXT = serializeBirthData(NASTIA_PROFILE);
const CHART_ANALYSIS_TEXT = serializeChartAnalysis(NASTIA_CHART_ANALYSIS);

const STORAGE_KEY = 'nastia_personalized_planet_messages';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Загружает сообщения из localStorage
 */
function loadFromCache(): PersonalizedPlanetMessages | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;

    const parsed: PersonalizedPlanetMessages = JSON.parse(cached);

    // Проверяем, не устарел ли кеш (24 часа)
    const age = Date.now() - parsed.timestamp;
    if (age > CACHE_DURATION) {
      console.log('[PlanetMessages] Cache expired, will regenerate');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    console.log('[PlanetMessages] ✅ Loaded from cache');
    return parsed;
  } catch (error) {
    console.error('[PlanetMessages] Failed to load from cache:', error);
    return null;
  }
}

/**
 * Сохраняет сообщения в localStorage
 */
function saveToCache(messages: PersonalizedPlanetMessages): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    console.log('[PlanetMessages] ✅ Saved to cache');
  } catch (error) {
    console.error('[PlanetMessages] Failed to save to cache:', error);
  }
}

/**
 * Генерирует персонализированные сообщения от планет на основе натальной карты.
 * Каждая планета получает 5 сообщений, которые отражают реальные паттерны из карты.
 * Результат кешируется в localStorage на 24 часа.
 */
export async function generatePersonalizedPlanetMessages(
  claudeApiKey?: string,
  claudeProxyUrl?: string,
  openAIApiKey?: string,
  openAIProxyUrl?: string,
): Promise<PersonalizedPlanetMessages> {
  // Сначала проверяем кеш
  const cached = loadFromCache();
  if (cached) {
    return cached;
  }

  const prompt = `Ты — астролог, который создаёт персонализированные сообщения от планет.

🔹 ДАННЫЕ О ЧЕЛОВЕКЕ
birth_data:
${indent(BIRTH_DATA_TEXT, 2)}
chart_analysis:
${indent(CHART_ANALYSIS_TEXT, 2)}

🔹 ЗАДАНИЕ
Создай по 5 коротких сообщений от каждой из 10 планет: Луна, Плутон, Нептун, Уран, Венера, Сатурн, Хирон, Меркурий, Марс, Юпитер.

Каждое сообщение должно:
1. Быть написано от лица планеты (первое лицо: "Я вижу...", "Чувствую...")
2. Отражать реальные паттерны из натальной карты этого человека
3. Звучать как будто планеты между собой обсуждают этого человека, как будто знают его
4. Быть коротким (до 80 символов) и ёмким
5. НЕ использовать астрологические термины (без упоминания домов, градусов, аспектов)
6. Говорить о характере, поведении, эмоциях, паттернах — то, что человек узнает в себе

Примеры хороших сообщений:
- Луна: "Чувствую её настроение сегодня... непростое"
- Плутон: "Копаюсь в её подсознании... тут темнее, чем кажется"
- Венера: "Вижу, как она притворяется перед другими"
- Сатурн: "Проверяю её на честность с собой"

Примеры ПЛОХИХ сообщений (НЕ делай так):
- "Луна в 4-м доме делает её эмоциональной" (упоминание дома)
- "Квадрат к Сатурну создаёт напряжение" (упоминание аспекта)
- "Сегодня хороший день" (не персонализировано)

🔹 ФОРМАТ ОТВЕТА (JSON):
{
  "Луна": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Плутон": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Нептун": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Уран": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Венера": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Сатурн": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Хирон": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Меркурий": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Марс": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"],
  "Юпитер": ["сообщение 1", "сообщение 2", "сообщение 3", "сообщение 4", "сообщение 5"]
}

КРИТИЧЕСКИ ВАЖНО:
1. Все сообщения должны быть в одну строку без переносов
2. Отвечай ТОЛЬКО JSON без пояснений, комментариев и Markdown
3. Каждая планета должна иметь ровно 5 сообщений
4. Сообщения должны быть основаны на реальных данных из chart_analysis`;

  try {
    console.log('[PlanetMessages] Starting AI call to generate personalized messages');

    const result = await callAI({
      system:
        'Ты профессиональный астролог, который создаёт персонализированные сообщения на основе натальной карты. Отвечай только валидным JSON.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 2500,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
      openAIProxyUrl,
      preferOpenAI: true, // Используем OpenAI первым для скорости
      useGPT4oMini: true, // Используем gpt-4o-mini для скорости и экономии
    });

    console.log('[PlanetMessages] AI call completed, parsing response');

    let text = result.text.trim();
    text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error('[PlanetMessages] JSON parse error:', parseError);
      console.error('[PlanetMessages] Raw text (first 500 chars):', text.slice(0, 500));

      // Попытка исправить проблемы с форматированием
      try {
        const fixedText = text
          .replace(/[\r\n]+/g, ' ')
          .replace(/\s+/g, ' ');
        parsed = JSON.parse(fixedText);
        console.log('[PlanetMessages] ✅ Successfully parsed after fixing newlines');
      } catch (fixError) {
        console.error('[PlanetMessages] Failed to parse JSON, using fallback');
        throw parseError;
      }
    }

    // Преобразуем в нужный формат
    const messages: PlanetMessage[] = Object.entries(parsed).map(([planet, msgs]) => ({
      planet,
      messages: Array.isArray(msgs) ? msgs.slice(0, 5) : [],
    }));

    console.log('[PlanetMessages] Parsed messages for', messages.length, 'planets');

    // Проверяем, что у нас есть сообщения от всех планет
    const requiredPlanets = ['Луна', 'Плутон', 'Нептун', 'Уран', 'Венера', 'Сатурн', 'Хирон', 'Меркурий', 'Марс', 'Юпитер'];
    const existingPlanets = new Set(messages.map(m => m.planet));

    for (const planet of requiredPlanets) {
      if (!existingPlanets.has(planet)) {
        console.warn(`[PlanetMessages] Missing messages for ${planet}, using fallback`);
        messages.push({
          planet,
          messages: getFallbackMessages(planet),
        });
      }
    }

    console.log('[PlanetMessages] ✅ Successfully generated personalized messages for all planets');

    const finalResult: PersonalizedPlanetMessages = {
      messages,
      timestamp: Date.now(),
    };

    // Сохраняем в кеш
    saveToCache(finalResult);

    return finalResult;
  } catch (error) {
    console.warn('[PlanetMessages] Failed to generate via AI, using fallback', error);
    return getFallbackPlanetMessages();
  }
}

/**
 * Возвращает fallback сообщения для планеты
 */
function getFallbackMessages(planet: string): string[] {
  const fallbacks: Record<string, string[]> = {
    'Луна': [
      'Чувствую её настроение сегодня... непростое',
      'Она явно что-то скрывает от себя',
      'Вижу противоречие между тем, что она хочет и что делает',
      'Интересно, как она реагирует на свои эмоции',
      'Она боится показаться уязвимой',
    ],
    'Плутон': [
      'Копаюсь в её подсознании... тут темнее, чем кажется',
      'Вижу страх, который она не признаёт',
      'Обнаружил её теневую сторону',
      'Она прячет свою силу, боится её',
      'Нашёл то, от чего она убегает годами',
    ],
    'Нептун': [
      'Добавляю тумана... пусть поплутает между иллюзией и правдой',
      'Вижу, как она себя обманывает',
      'Растворяю границы между её желаниями и страхами',
      'Интересно, что она себе придумала на этот раз',
      'Она живёт в своих фантазиях больше, чем в реальности',
    ],
    'Уран': [
      'Встряхну её привычные паттерны',
      'Пора выбить её из зоны комфорта',
      'Подготовил несколько неожиданных поворотов',
      'Посмотрим, как она отреагирует на хаос',
      'Разрушу её иллюзию контроля',
    ],
    'Венера': [
      'Вижу, как она притворяется перед другими',
      'Интересно, что она на самом деле ценит',
      'Замечаю её маски в отношениях',
      'Она выбирает удобное, а не настоящее',
      'Посмотрю, готова ли она к честности с собой',
    ],
    'Сатурн': [
      'Проверяю её на честность с собой',
      'Вижу, где она сама себе врёт',
      'Установлю границы, посмотрим, выдержит ли',
      'Она избегает ответственности за свои решения',
      'Пора столкнуться с последствиями',
    ],
    'Хирон': [
      'Нащупал её главную рану',
      'Вижу, откуда растут её страхи',
      'Тут боль, с которой она не работала',
      'Обнаружил её слабое место',
      'Интересно, готова ли она к исцелению',
    ],
    'Меркурий': [
      'Формулирую её внутренний конфликт',
      'Вижу противоречие в её логике',
      'Составляю дилемму, где оба варианта её пугают',
      'Интересно, как она аргументирует свой выбор',
      'Она думает одно, говорит другое, делает третье',
    ],
    'Марс': [
      'Подбираю правильный градус напряжения',
      'Добавлю агрессии в её выборы',
      'Посмотрим, может ли она постоять за себя',
      'Проверю её на смелость',
      'Она часто уступает, когда надо бороться',
    ],
    'Юпитер': [
      'Расширяю контекст её истории',
      'Вижу более широкую картину',
      'Добавляю философский смысл',
      'Интересно, какой урок она извлечёт',
      'Показываю ей возможности, о которых она не думала',
    ],
  };

  return fallbacks[planet] || [
    'Наблюдаю за её поведением',
    'Вижу интересные паттерны',
    'Готовлю сюрпризы',
    'Посмотрим, как она справится',
    'Интересная личность',
  ];
}

/**
 * Возвращает полный набор fallback сообщений
 */
function getFallbackPlanetMessages(): PersonalizedPlanetMessages {
  const planets = ['Луна', 'Плутон', 'Нептун', 'Уран', 'Венера', 'Сатурн', 'Хирон', 'Меркурий', 'Марс', 'Юпитер'];

  return {
    messages: planets.map(planet => ({
      planet,
      messages: getFallbackMessages(planet),
    })),
    timestamp: Date.now(),
  };
}
