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
  language?: string; // 'ru' | 'en' | 'de'
  signal?: AbortSignal;
  apiKey?: string;
  claudeProxyUrl?: string;
  openAIApiKey?: string;
}

function getMetricName(metricType: string, language: string): string {
  const names: Record<string, Record<string, string>> = {
    'cycle-length': {
      ru: 'средний цикл',
      en: 'average cycle',
      de: 'durchschnittlicher Zyklus',
    },
    'next-period': {
      ru: 'прогноз следующей менструации',
      en: 'next period forecast',
      de: 'nächste Perioden-Vorhersage',
    },
    'fertile-window': {
      ru: 'фертильное окно',
      en: 'fertile window',
      de: 'fruchtbares Fenster',
    },
    'trend': {
      ru: 'тренд цикла',
      en: 'cycle trend',
      de: 'Zyklustrend',
    },
  };

  return names[metricType]?.[language] || names[metricType]?.ru || metricType;
}

function getLoadingPhrases(language: string): Array<{ emoji: string; text: string }> {
  if (language === 'en') {
    return [
      { emoji: '🔬', text: "Calling the gynecology professor, he's mumbling something about ovaries…" },
      { emoji: '📚', text: "Flipping through medical textbooks that nobody actually reads, fuck." },
      { emoji: '🧬', text: "Checking hormones and trying to figure out who's in charge today — estrogen or progesterone." },
      { emoji: '🩺', text: "Asking the endocrinologist's opinion, but he's late to the meeting again." },
      { emoji: '🧪', text: "Doing a virtual blood test — almost like the real thing, just easier." },
      { emoji: '💊', text: "Calling the pharmacist to find out what pills would help, but it's just voicemail." },
      { emoji: '🔍', text: "Searching Google for scientific articles, and they're all behind paywalls, damn." },
      { emoji: '🧠', text: "Consulting with the neuroendocrinologist, but he speaks in words too smart." },
    ];
  }

  if (language === 'de') {
    return [
      { emoji: '🔬', text: "Rufen den Gynäkologie-Professor an, er murmelt etwas über Eierstöcke…" },
      { emoji: '📚', text: "Blättern durch medizinische Lehrbücher, die normalerweise niemand liest, verdammt." },
      { emoji: '🧬', text: "Überprüfen Hormone und versuchen zu verstehen, wer heute Chef ist — Östrogen oder Progesteron." },
      { emoji: '🩺', text: "Fragen den Endokrinologen um seine Meinung, aber er kommt wieder zu spät zum Treffen." },
      { emoji: '🧪', text: "Machen einen virtuellen Bluttest — fast wie echt, nur einfacher." },
      { emoji: '💊', text: "Rufen den Apotheker an um zu fragen, welche Tabletten helfen würden, aber nur Anrufbeantworter." },
      { emoji: '🔍', text: "Suchen bei Google nach wissenschaftlichen Artikeln, und alles ist kostenpflichtig, Mist." },
      { emoji: '🧠', text: "Konsultieren den Neuroendokrinologen, aber er spricht zu kluge Wörter." },
    ];
  }

  // Russian (default)
  return [
    { emoji: '🔬', text: 'Звоним профессору гинекологии, он что-то там бормочет про яичники…' },
    { emoji: '📚', text: 'Листаем медицинские учебники, которые обычно никто не читает нахуй.' },
    { emoji: '🧬', text: 'Проверяем гормоны и пытаемся понять, кто сегодня главный — эстроген или прогестерон.' },
    { emoji: '🩺', text: 'Запрашиваем мнение у эндокринолога, но он опять опаздывает на встречу.' },
    { emoji: '🧪', text: 'Делаем анализ крови виртуально — ну почти как настоящий, только проще.' },
    { emoji: '💊', text: 'Звоним фармацевту узнать, какие таблетки помогли бы, но там автоответчик.' },
    { emoji: '🔍', text: 'Ищем в гугле научные статьи, а там одни платные подписки, блять.' },
    { emoji: '🧠', text: 'Консультируемся с нейроэндокринологом, но он говорит слишком умными словами.' },
  ];
}

export function getRandomLoadingPhrase(language = 'ru') {
  const phrases = getLoadingPhrases(language);
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function buildPrompt(params: InsightGenerationParams): string {
  const language = params.language || 'ru';
  const metricName = getMetricName(params.metricType, language);
  const { value, variability, confidence, trend } = params.metricData;

  if (language === 'en') {
    let dataDescription = `Value: ${value}`;
    if (variability !== undefined) {
      dataDescription += `, variability ±${variability.toFixed(1)}`;
    }
    if (confidence !== undefined) {
      dataDescription += `, confidence ${confidence}%`;
    }
    if (trend !== undefined) {
      dataDescription += `, trend ${trend > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(trend).toFixed(1)} days/cycle`;
    }

    return `You are an assistant for a women's menstrual calendar. You need to describe the metric "${metricName}". ${dataDescription}

Write TWO versions of the description — each no longer than 100 words:

1. **Scientific style**: Explain from a medical point of view what this metric means. Use real medical terms (don't make up words!), be accurate and professional. Mention some interesting fact or norm.

2. **Human style**: Explain in simple language, with sarcasm and mild profanity (1-2 words). Add humor and liveliness. Make it fun and understandable.

Response format (strictly JSON):
\`\`\`json
{
  "scientific": "Scientific description text...",
  "human": "Human description text..."
}
\`\`\``;
  }

  if (language === 'de') {
    let dataDescription = `Wert: ${value}`;
    if (variability !== undefined) {
      dataDescription += `, Variabilität ±${variability.toFixed(1)}`;
    }
    if (confidence !== undefined) {
      dataDescription += `, Sicherheit ${confidence}%`;
    }
    if (trend !== undefined) {
      dataDescription += `, Trend ${trend > 0 ? 'steigend' : 'fallend'} um ${Math.abs(trend).toFixed(1)} Tage/Zyklus`;
    }

    return `Du bist eine Assistentin für einen weiblichen Menstruationskalender. Du musst die Metrik "${metricName}" beschreiben. ${dataDescription}

Schreibe ZWEI Versionen der Beschreibung — jede nicht länger als 100 Wörter:

1. **Wissenschaftlicher Stil**: Erkläre aus medizinischer Sicht, was diese Metrik bedeutet. Verwende echte medizinische Begriffe (erfinde keine Wörter!), sei genau und professionell. Erwähne einen interessanten Fakt oder eine Norm.

2. **Menschlicher Stil**: Erkläre in einfacher Sprache, mit Sarkasmus und milder Umgangssprache (1-2 Wörter). Füge Humor und Lebendigkeit hinzu. Mach es lustig und verständlich.

Antwortformat (strikt JSON):
\`\`\`json
{
  "scientific": "Wissenschaftlicher Beschreibungstext...",
  "human": "Menschlicher Beschreibungstext..."
}
\`\`\``;
  }

  // Russian (default)
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

export function getFallbackInsightDescription(metricType: string, language = 'ru'): InsightDescription {
  if (language === 'en') {
    const fallbacksEn: Record<string, InsightDescription> = {
      'cycle-length': {
        scientific: 'The average menstrual cycle length is 28 days, but the normal range is between 21 and 35 days. Cycle regularity is controlled by the hypothalamic-pituitary-ovarian axis and can vary due to stress, diet, and other factors.',
        human: "Your cycle hovers around 28 days, which is pretty standard. But if it jumps around a bit, don't stress — that's normal as long as it stays within 21-35 days. Your body's alive too, it likes a little chaos sometimes, damn.",
      },
      'next-period': {
        scientific: 'Predicting the next menstruation is based on analyzing previous cycles, considering their average duration and variability. Prediction accuracy improves with regular cycles and decreases with high variability.',
        human: "We've estimated when your next period will be based on how it's been going. If your cycle is stable, we'll be pretty close. If it bounces around — well, sorry, we're not psychics, but we'll do our best.",
      },
      'fertile-window': {
        scientific: 'The fertile window is approximately 6 days when the probability of conception is highest. It includes the 5 days before ovulation and the day of ovulation itself. Ovulation typically occurs 14 days before the start of the next menstruation.',
        human: "The fertile window is when your eggs are ready to party. Lasts about 6 days: 5 days before ovulation and ovulation day. If you're not planning kids — watch out, if you are — perfect timing to act.",
      },
      'trend': {
        scientific: 'The cycle trend shows whether its duration is increasing or decreasing over time. Small changes (2-3 days) are considered normal and may be related to age, lifestyle, or hormonal changes.',
        human: "Trend is when your cycle either lengthens or shortens. If it's by a couple days — no biggie, your body changes. If it jumps a lot — worth paying attention, maybe something's up. But don't panic yet, just keep an eye on it.",
      },
    };

    return fallbacksEn[metricType] || {
      scientific: 'This metric reflects the state of your menstrual cycle and can be used for forecasting and planning.',
      human: "This metric helps you understand what's going on with your cycle. Basically, a useful thing, keep track of it.",
    };
  }

  if (language === 'de') {
    const fallbacksDe: Record<string, InsightDescription> = {
      'cycle-length': {
        scientific: 'Die durchschnittliche Länge des Menstruationszyklus beträgt 28 Tage, aber der Normalbereich liegt zwischen 21 und 35 Tagen. Die Regelmäßigkeit des Zyklus wird durch die Hypothalamus-Hypophysen-Ovar-Achse gesteuert und kann durch Stress, Ernährung und andere Faktoren variieren.',
        human: 'Dein Zyklus liegt so um die 28 Tage, was völlig normal ist. Aber wenn er hin und her springt, keine Panik — das ist okay, solange es zwischen 21-35 Tagen bleibt. Dein Körper lebt auch, er braucht manchmal ein bisschen Chaos, verdammt.',
      },
      'next-period': {
        scientific: 'Die Vorhersage der nächsten Menstruation basiert auf der Analyse früherer Zyklen unter Berücksichtigung ihrer durchschnittlichen Dauer und Variabilität. Die Genauigkeit der Vorhersage steigt bei regelmäßigen Zyklen und sinkt bei hoher Variabilität.',
        human: 'Wir haben geschätzt, wann deine nächste Periode kommt, basierend auf dem bisherigen Verlauf. Wenn dein Zyklus stabil ist, liegen wir ziemlich richtig. Wenn er springt — tja, wir sind keine Hellseher, aber wir geben unser Bestes.',
      },
      'fertile-window': {
        scientific: 'Das fruchtbare Fenster ist ein Zeitraum von etwa 6 Tagen, in dem die Empfängniswahrscheinlichkeit am höchsten ist. Es umfasst die 5 Tage vor dem Eisprung und den Eisprung selbst. Der Eisprung tritt normalerweise 14 Tage vor Beginn der nächsten Menstruation auf.',
        human: 'Das fruchtbare Fenster ist, wenn deine Eizellen bereit für die Party sind. Dauert etwa 6 Tage: 5 Tage vor dem Eisprung und der Eisprung selbst. Wenn du keine Kinder planst — pass auf, wenn doch — perfekte Zeit zum Handeln.',
      },
      'trend': {
        scientific: 'Der Zyklustrend zeigt, ob seine Dauer im Laufe der Zeit zunimmt oder abnimmt. Kleine Änderungen (2-3 Tage) gelten als normal und können mit Alter, Lebensstil oder hormonellen Veränderungen zusammenhängen.',
        human: 'Trend bedeutet, dass dein Zyklus entweder länger oder kürzer wird. Wenn es ein paar Tage sind — kein Problem, dein Körper ändert sich. Wenn es stark springt — Aufmerksamkeit verdient, vielleicht stimmt was nicht. Aber keine Panik, beobachte es einfach.',
      },
    };

    return fallbacksDe[metricType] || {
      scientific: 'Diese Metrik spiegelt den Zustand Ihres Menstruationszyklus wider und kann für Prognosen und Planung verwendet werden.',
      human: 'Diese Metrik hilft dir zu verstehen, was mit deinem Zyklus los ist. Grundsätzlich eine nützliche Sache, behalte sie im Auge.',
    };
  }

  // Russian (default)
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
