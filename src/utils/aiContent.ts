export interface PeriodModalContent {
  question: string;
  joke: {
    emoji: string;
    text: string;
  };
}

export interface GeneratePeriodContentOptions {
  userName?: string;
  cycleStartISODate: string;
  signal?: AbortSignal;
  apiKey?: string;
  openAIApiKey?: string;
}

const responseSchema = {
  name: 'period_modal_copy',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['question', 'joke'],
    properties: {
      question: {
        type: 'string',
        description: 'A concise invitation to start tracking the cycle addressed to the user by name.',
      },
      joke: {
        type: 'object',
        additionalProperties: false,
        required: ['emoji', 'text'],
        properties: {
          emoji: {
            type: 'string',
            description: 'One emoji or a short emoji combo.',
          },
          text: {
            type: 'string',
            description: 'A short punchline with playful female sarcasm and a supportive tone.',
          },
        },
      },
    },
  },
} as const;

export async function generatePeriodModalContent({
  userName,
  cycleStartISODate,
  signal,
  apiKey,
  openAIApiKey,
}: GeneratePeriodContentOptions): Promise<PeriodModalContent> {
  const effectiveUserName = (userName && userName.trim()) ? userName.trim() : 'Настя';

  const cycleDate = new Date(cycleStartISODate);
  const readableDate = cycleDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const instructions = `Ты — Настя-советчица: язвительная подруга с чёрным, но тёплым чувством юмора и железной поддержкой.
Обращайся к ${effectiveUserName}, допускаются уменьшительно-ласкательные формы, но без сиропа.
Категорически избегай слов «приложение», «трекинг», «помощник» и любых намёков на сервис. Говори как живая подруга, ворчащая рядом на диване.
Нужны две части: (1) одно приветствие (до 24 слов), где вы вместе отмечаете дату цикла с долей жёсткого сострадания; можешь упомянуть спазмы, PMS или заряд хандры. Приветствие без эмодзи. (2) одна «народная мудрость» — едкое, саркастичное наставление на один-два предложения, будто бабка у подъезда, но с твоим фирменным чёрным юмором. Обязательно дай ощущение приметы/поговорки, но без клише и морализаторства.
Эмодзи используй только в этой народной мудрости (1 штука, максимум 2, если очень уместно). Избегай позитивных клише и мотивационных лозунгов.

Верни ответ СТРОГО в JSON формате:
{
  "question": "текст приветствия без эмодзи",
  "joke": {
    "emoji": "1-2 эмодзи",
    "text": "текст народной мудрости"
  }
}`;

  const { callAI } = await import('./aiClient');

  const result = await callAI({
    system: 'Ты "Настя" — язвительная подруга, которая пишет на русском с остроумным, поддерживающим сарказмом. Всегда отвечай строго в формате JSON без дополнительных пояснений.',
    messages: [
      {
        role: 'user',
        content: instructions,
      },
    ],
    temperature: 0.9,
    maxTokens: 500,
    signal,
    claudeApiKey: apiKey,
    openAIApiKey,
  });

  console.log(`Generated period modal content using ${result.provider}`);

  let parsed: PeriodModalContent;
  try {
    // AI может обернуть JSON в markdown блок, убираем это
    const cleanContent = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleanContent);
  } catch (error) {
    throw new Error('Failed to parse AI response.');
  }

  return parsed;
}

export function getFallbackPeriodContent(userName = 'Настя'): PeriodModalContent {
  return {
    question: `Привет, ${userName}! Ну что, фиксируем премьеру цикла, пока организм не решил устроить неожиданный антракт?`,
    joke: {
      emoji: '🧙‍♀️',
      text: 'Народ гласит: кто в первый день цикла пледом укутался — тому гормоны гадости не устроят. Проверим теорию? 😉',
    },
  };
}
