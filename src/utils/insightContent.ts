import { callAI, type AIMessage } from './aiClient';

export interface InsightDescription {
  scientific: string;
  human: string;
}

interface InsightGenerationParams {
  metricType: 'cycle-length' | 'next-period' | 'fertile-window' | 'trend';
  metricData: {
    value: string;
    variability?: number;
    confidence?: number;
    trend?: number;
  };
  signal?: AbortSignal;
  apiKey?: string;
  claudeProxyUrl?: string;
  openAIApiKey?: string;
}

const METRIC_NAMES: Record<string, string> = {
  'cycle-length': 'средний цикл',
  'next-period': 'прогноз следующей менструации',
  'fertile-window': 'фертильное окно',
  'trend': 'тренд цикла',
};

const LOADING_PHRASES = [
  { emoji: '🔬', text: 'Звоним профессору гинекологии, он что-то там бормочет про яичники…' },
  { emoji: '📚', text: 'Листаем медицинские учебники, которые обычно никто не читает нахуй.' },
  { emoji: '🧬', text: 'Проверяем гормоны и пытаемся понять, кто сегодня главный — эстроген или прогестерон.' },
  { emoji: '🩺', text: 'Запрашиваем мнение у эндокринолога, но он опять опаздывает на встречу.' },
  { emoji: '🧪', text: 'Делаем анализ крови виртуально — ну почти как настоящий, только проще.' },
  { emoji: '💊', text: 'Звоним фармацевту узнать, какие таблетки помогли бы, но там автоответчик.' },
  { emoji: '🔍', text: 'Ищем в гугле научные статьи, а там одни платные подписки, блять.' },
  { emoji: '🧠', text: 'Консультируемся с нейроэндокринологом, но он говорит слишком умными словами.' },
];

export function getRandomLoadingPhrase() {
  return LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
}

function buildPrompt(params: InsightGenerationParams): string {
  const metricName = METRIC_NAMES[params.metricType];
  const { value, variability, confidence, trend } = params.metricData;

  let dataDescription = `Значение: ${value}`;
  if (variability !== undefined) {
    dataDescription += `, вариативность ±${variability.toFixed(1)}`;
  }
  if (confidence !== undefined) {
    dataDescription += `, уверенность ${confidence}%`;
  }
  if (trend !== undefined) {
    dataDescription += `, тренд ${trend > 0 ? 'увеличение' : 'уменьшение'} на ${Math.abs(trend).toFixed(1)} дн/цикл`;
  }

  return `Ты — помощник для женского менструального календаря. Тебе нужно описать показатель "${metricName}". ${dataDescription}

Напиши ДВА варианта описания — каждый не длиннее 100 слов:

1. **Научный стиль**: Объясни с медицинской точки зрения, что означает этот показатель. Используй настоящие медицинские термины (не придумывай слова!), будь точным и профессиональным. Упомяни какой-нибудь интересный факт или норму.

2. **Человеческий стиль**: Объясни простым языком, по-женски, с сарказмом и лёгким матом (1-2 слова). Добавь юмор и жизненность. Сделай так, чтобы было прикольно и понятно.

Формат ответа (строго JSON):
\`\`\`json
{
  "scientific": "Текст научного описания...",
  "human": "Текст человеческого описания..."
}
\`\`\``;
}

export async function generateInsightDescription(
  params: InsightGenerationParams
): Promise<InsightDescription> {
  console.log('[Insight Content] Generating description for:', params.metricType, 'with keys:', {
    hasClaudeKey: Boolean(params.apiKey),
    hasClaudeProxy: Boolean(params.claudeProxyUrl),
    hasOpenAIKey: Boolean(params.openAIApiKey),
  });

  const prompt = buildPrompt(params);

  const messages: AIMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const { text, provider } = await callAI({
      messages,
      signal: params.signal,
      claudeApiKey: params.apiKey,
      claudeProxyUrl: params.claudeProxyUrl,
      openAIApiKey: params.openAIApiKey,
      maxTokens: 800,
      temperature: 0.8,
    });

    console.log('[Insight Content] ✅ Generated via', provider);

    // Пытаемся распарсить JSON из ответа
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText) as InsightDescription;

      if (parsed.scientific && parsed.human) {
        return parsed;
      }
    }

    throw new Error('Неверный формат ответа от API');
  } catch (error) {
    console.error('[Insight Content] ❌ Failed to generate:', error);
    throw error;
  }
}

export function getFallbackInsightDescription(metricType: string): InsightDescription {
  const fallbacks: Record<string, InsightDescription> = {
    'cycle-length': {
      scientific: 'Средняя продолжительность менструального цикла составляет 28 дней, однако нормой считается диапазон от 21 до 35 дней. Регулярность цикла определяется гипоталамо-гипофизарно-яичниковой осью и может варьироваться под влиянием стресса, питания и других факторов.',
      human: 'Твой цикл крутится вокруг 28 дней, что вполне норм. Но если он скачет туда-сюда, не парься — это нормально, пока не выходит за рамки 21-35 дней. Организм тоже живой, ему тоже хочется немного хаоса иногда, блять.',
    },
    'next-period': {
      scientific: 'Прогнозирование следующей менструации основано на анализе предыдущих циклов с учётом их средней длительности и вариативности. Точность прогноза повышается при регулярных циклах и снижается при высокой вариативности.',
      human: 'Мы тут прикинули, когда у тебя следующие месячные, исходя из того, как они ходили раньше. Если цикл стабильный — попадём почти в точку. Если скачет — ну извини, мы не экстрасенсы, но постараемся.',
    },
    'fertile-window': {
      scientific: 'Фертильное окно — это период примерно 6 дней, когда вероятность зачатия максимальна. Оно включает 5 дней до овуляции и день овуляции. Овуляция обычно происходит за 14 дней до начала следующей менструации.',
      human: 'Фертильное окно — это когда твои яйцеклетки готовы к вечеринке. Длится примерно 6 дней: 5 дней до овуляции и сам день овуляции. Если не планируешь детей — будь начеку, если планируешь — самое время действовать.',
    },
    'trend': {
      scientific: 'Тренд цикла показывает, увеличивается или уменьшается его продолжительность со временем. Небольшие изменения (до 2-3 дней) считаются нормальными и могут быть связаны с возрастом, образом жизни или гормональными изменениями.',
      human: 'Тренд — это когда цикл либо удлиняется, либо укорачивается. Если на пару дней — норм, организм меняется. Если сильно скачет — стоит обратить внимание, может, что-то не так. Но паниковать рано, просто понаблюдай.',
    },
  };

  return fallbacks[metricType] || {
    scientific: 'Этот показатель отражает состояние вашего менструального цикла и может быть использован для прогнозирования и планирования.',
    human: 'Этот показатель помогает понять, что происходит с твоим циклом. В общем, полезная штука, следи за ним.',
  };
}
