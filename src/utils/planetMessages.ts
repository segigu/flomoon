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

ЗАДАЧА ПЛАНЕТ:
- Обсуждают, какую историю предложить Насте, ССЫЛАЯСЬ на конкретные аспекты (но С ПРИКОЛАМИ!)
- Каждая планета объясняет, КАК её влияние работает через аспекты (например: "У неё Луна квадрат Сатурн — я её эмоции тушу как МЧС")
- Предлагают конкретные сценарии, ТРОЛЛЯТ друг друга и Настю
- Спорят, какой косяк важнее проработать (с шутками и сарказмом)
- ФИНАЛ: вывод о главном паттерне, конкретная ситуация, но можно пошутить в конце

СТИЛЬ ДИАЛОГА:
- Короткие реплики до 100 символов
- МНОГО ЮМОРА, САРКАЗМА, ПОДКОЛОВ — планеты троллят друг друга и Настю
- Планеты СПОРЯТ, перебивают, критикуют идеи друг друга, шутят
- Обязательно ссылаются на КОНКРЕТНЫЕ аспекты из карты, но ЧЕРЕЗ ПРИКОЛЫ: "У неё Луна квадрат Сатурн — я её эмоции тушу как пожар"
- Используй разговорный язык, бытовые сравнения, мемы
- Начинается весело типа "Так, коллеги, собрались? Чего сегодня для Насти замутим?"

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
Луна: "Так, народ, собрались? Чё сегодня для Насти замутим?"
Сатурн: "Глянул карту — у неё Луна квадрат Сатурн. Я её эмоции тушу как МЧС."
Луна: "Ага, она боится чувства показать. Всё в себе копит, как хомяк."
Плутон: "Зато у меня с Венерой оппозиция! Отношения у неё — либо контроль, либо хаос."
Венера: "Плутон, не пугай! Просто боится в любви раствориться, вот и всё."
Марс: "А я в её карте слабенький. Она думает вместо действий — аналитик, бля."
Меркурий: "Вот-вот! Голова работает, а ноги стоят. Парализованная сова."
Нептун: "Ещё я её в туман погружаю... Мечтает вместо того, чтоб жить."
Уран: "Может, я ей сюрприз устрою? Резко из тапок вытряхну?"
Юпитер: "Погодите. В чём ГЛАВНЫЙ косяк? Она же боится быть неидеальной!"
Сатурн: "Вот именно. Моя строгость давит на её Луну — идеал или позор."
Хирон: "Рана в том, что уязвимость = слабость. Надо бы показать иначе."
Луна: "Ага. Выбор нужен: спрятаться в раковину или признать чувства."
Венера: "Давайте через отношения покажем? Там вся грязь наружу лезет."
Марс: "Не, через действие! Пусть решится что-то сделать, даже если облажается."
Плутон: "Или я устрою кризис. Когда выхода нет — тут вся правда всплывает."
Меркурий: "Логично звучит. Кризис + выбор = прозрение. По учебнику."
Нептун: "Только не переборщите, а то я её вообще в астрал унесу."
Уран: "Я за кризис! Но чтоб неожиданно — бац, и сюжетный твист!"
Юпитер: "Окей, подводим итог. Главный паттерн какой?"
Сатурн: "Страх показаться слабой. Луна-Сатурн квадрат — это база."
Луна: "Плюс Венера-Плутон — в отношениях боится контроля потерять."
Хирон: "Короче, рана в том, что уязвимость = поражение. Нужна ситуация-ловушка."
Венера: "Я предлагаю конфликт с близким. Где открыться или потерять связь."
Марс: "Или выбор действия! Сделать шаг, рискуя облажаться."
Плутон: "Главное — без запасных выходов. Пусть встретится с собой лицом к лицу."
Юпитер: "Решили. Ситуация: уязвимость VS защита. Выбор: открыться или закрыться."
Меркурий: "Фиксирую. План готов. Кто-нибудь кофе сварит?"
Уран: "Я на чай. С сюрпризом."
... (закрываем весело)

ФИНАЛ ДИАЛОГА (ОБЯЗАТЕЛЬНО, но с юмором):
Последние 3-5 фраз должны быть ВЫВОДОМ (можно с шутками, но КОНКРЕТНЫМ):
- Какой ГЛАВНЫЙ паттерн из натальной карты (ссылка на аспект!)?
- Какая КОНКРЕТНАЯ ситуация покажет этот косяк?
- Какой ВЫБОР нужен (два варианта: лёгкий VS правильный)?
Пример: "Решили. Луна-Сатурн квадрат = страх слабости. Ситуация: открыться или закрыться. Кто-нибудь кофе?"

JSON формат:
{"dialogue": [{"planet": "Луна", "message": "..."}, {"planet": "Плутон", "message": "..."}, ...]}

Верни ТОЛЬКО JSON, без пояснений.`;

  try {
    console.log('[PlanetMessages] Starting AI call');

    const result = await callAI({
      system: 'Создаёшь астрологический диалог планет, которые обсуждают натальную карту конкретного человека. Они ссылаются на реальные аспекты из карты и делают практические выводы о паттернах поведения. JSON только.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      maxTokens: 2500,
      claudeApiKey,
      claudeProxyUrl,
      openAIApiKey,
      openAIProxyUrl,
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
