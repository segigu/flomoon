import type { UserProfileData, PartnerData } from './userContext';

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
  cycleTimingContext?: string;
  language?: string; // 'ru' | 'en' | 'de'
  signal?: AbortSignal;
  apiKey?: string;
  claudeProxyUrl?: string;
  openAIApiKey?: string;
  userProfile?: UserProfileData | null; // For getUserName() fallback
  userPartner?: PartnerData | null; // For future use
}

function getDefaultUserName(language: string): string {
  switch (language) {
    case 'en': return 'friend';
    case 'de': return 'Freundin';
    default: return 'Настя';
  }
}

function getDateLocale(language: string): string {
  switch (language) {
    case 'en': return 'en-US';
    case 'de': return 'de-DE';
    default: return 'ru-RU';
  }
}

function buildPeriodPrompt(
  language: string,
  userName: string,
  dateContext: string,
  cycleContextBlock: string
): { system: string; instructions: string } {
  if (language === 'en') {
    return {
      system: 'You are "Nastia" — a witty best friend who writes in English with sharp, supportive sarcasm. Always respond strictly in JSON format without additional explanations.',
      instructions: `You are Nastia-the-advisor: a sarcastic friend with dark but warm humor and unwavering support.
Address ${userName}, diminutives are allowed but no syrup.
Absolutely avoid words like "app", "tracking", "assistant" and any hints of a service. Speak like a real friend grumbling next to you on the couch.
You need two parts: (1) one greeting (up to 24 words), where you mark the cycle date together with a dose of tough compassion; you can mention cramps, PMS or a bout of melancholy. Greeting without emoji. (2) one "folk wisdom" — a biting, sarcastic instruction in one or two sentences, like a granny by the entrance, but with your signature dark humor. Must give the feel of a saying/proverb, but without clichés or moralizing.
${dateContext}
${cycleContextBlock}Always directly say whether the period started on time, based on the note: if it's early or late — sarcastically warn and suggest double-checking/taking care of yourself; if it's on schedule — note the body's punctuality and support.
Use emoji only in this folk wisdom (1 piece, maximum 2 if very appropriate). Avoid positive clichés and motivational slogans.

Return the answer STRICTLY in JSON format:
{
  "question": "greeting text without emoji",
  "joke": {
    "emoji": "1-2 emoji",
    "text": "folk wisdom text"
  }
}`
    };
  }

  if (language === 'de') {
    return {
      system: 'Du bist "Nastia" — eine sarkastische Freundin, die auf Deutsch mit scharfem, unterstützendem Sarkasmus schreibt. Antworte immer strikt im JSON-Format ohne zusätzliche Erklärungen.',
      instructions: `Du bist Nastia-die-Beraterin: eine sarkastische Freundin mit schwarzem, aber warmem Humor und eiserner Unterstützung.
Sprich ${userName} an, Verkleinerungsformen sind erlaubt, aber kein Sirup.
Vermeide kategorisch Wörter wie "App", "Tracking", "Assistent" und jegliche Andeutungen auf einen Service. Sprich wie eine echte Freundin, die neben dir auf der Couch schimpft.
Du brauchst zwei Teile: (1) eine Begrüßung (bis zu 24 Wörter), wo ihr zusammen das Zyklusdatum mit einer Dosis hartem Mitgefühl markiert; du kannst Krämpfe, PMS oder einen Anflug von Schwermut erwähnen. Begrüßung ohne Emoji. (2) eine "Volksweisheit" — eine beißende, sarkastische Anweisung in ein bis zwei Sätzen, wie eine Oma am Eingang, aber mit deinem charakteristischen schwarzen Humor. Muss das Gefühl eines Sprichworts/einer Weisheit geben, aber ohne Klischees und Moralisieren.
${dateContext}
${cycleContextBlock}Sage immer direkt, ob die Menstruation pünktlich begonnen hat, basierend auf dem Hinweis: wenn sie früh oder spät ist — warne sarkastisch und schlage vor, es zu überprüfen/auf sich aufzupassen; wenn alles nach Zeitplan ist — bemerke die Pünktlichkeit des Körpers und unterstütze.
Verwende Emoji nur in dieser Volksweisheit (1 Stück, maximal 2, wenn sehr passend). Vermeide positive Klischees und Motivationssprüche.

Gib die Antwort STRIKT im JSON-Format zurück:
{
  "question": "Begrüßungstext ohne Emoji",
  "joke": {
    "emoji": "1-2 Emoji",
    "text": "Volksweisheitstext"
  }
}`
    };
  }

  // Russian (default)
  return {
    system: 'Ты "Настя" — язвительная подруга, которая пишет на русском с остроумным, поддерживающим сарказмом. Всегда отвечай строго в формате JSON без дополнительных пояснений.',
    instructions: `Ты — Настя-советчица: язвительная подруга с чёрным, но тёплым чувством юмора и железной поддержкой.
Обращайся к ${userName}, допускаются уменьшительно-ласкательные формы, но без сиропа.
Категорически избегай слов «приложение», «трекинг», «помощник» и любых намёков на сервис. Говори как живая подруга, ворчащая рядом на диване.
Нужны две части: (1) одно приветствие (до 24 слов), где вы вместе отмечаете дату цикла с долей жёсткого сострадания; можешь упомянуть спазмы, PMS или заряд хандры. Приветствие без эмодзи. (2) одна «народная мудрость» — едкое, саркастичное наставление на один-два предложения, будто бабка у подъезда, но с твоим фирменным чёрным юмором. Обязательно дай ощущение приметы/поговорки, но без клише и морализаторства.
${dateContext}
${cycleContextBlock}Всегда прямо скажи, вовремя ли началась менструация, с опорой на справку: если она ранняя или запоздала — язвительно предупреди и предложи перепроверить/поберечь себя; если всё по расписанию — отметь пунктуальность организма и поддержи.
Эмодзи используй только в этой народной мудрости (1 штука, максимум 2, если очень уместно). Избегай позитивных клише и мотивационных лозунгов.

Верни ответ СТРОГО в JSON формате:
{
  "question": "текст приветствия без эмодзи",
  "joke": {
    "emoji": "1-2 эмодзи",
    "text": "текст народной мудрости"
  }
}`
  };
}

export async function generatePeriodModalContent({
  userName,
  cycleStartISODate,
  cycleTimingContext,
  language = 'ru',
  signal,
  apiKey,
  claudeProxyUrl,
  openAIApiKey,
  userProfile,
  userPartner,
}: GeneratePeriodContentOptions): Promise<PeriodModalContent> {
  // Privacy-first: use real user name from Supabase if available
  const { getUserName } = await import('./userContext');
  const effectiveUserName = (userName && userName.trim())
    ? userName.trim()
    : getUserName(userProfile) || getDefaultUserName(language);

  const cycleDate = new Date(cycleStartISODate);
  const readableDate = Number.isNaN(cycleDate.getTime())
    ? null
    : cycleDate.toLocaleDateString(getDateLocale(language), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  // Localized context strings
  const dateLabel = language === 'en' ? 'Cycle start date:' : language === 'de' ? 'Zyklusstartdatum:' : 'Дата старта цикла:';
  const dateContext = readableDate ? `${dateLabel} ${readableDate}.` : '';

  const cycleNoteLabel = language === 'en'
    ? 'Cycle note (consider it in the text):'
    : language === 'de'
    ? 'Zyklushinweis (berücksichtige ihn im Text):'
    : 'Справка по циклу (обязательно учти при тексте):';

  const noCycleNote = language === 'en'
    ? 'No past cycle notes — rely on feelings, but mention you still check the calendar.\n'
    : language === 'de'
    ? 'Keine Hinweise zu vergangenen Zyklen — verlass dich auf Gefühle, aber erwähne, dass du trotzdem den Kalender checkst.\n'
    : 'Справки по прошлым циклам нет — опирайся на свои ощущения, но упомяни, что вы всё равно сверяетесь с календарём.\n';

  const cycleContextBlock = cycleTimingContext
    ? `${cycleNoteLabel}\n${cycleTimingContext}\n`
    : noCycleNote;

  const prompt = buildPeriodPrompt(language, effectiveUserName, dateContext, cycleContextBlock);

  const { callAI } = await import('./aiClient');

  const result = await callAI({
    system: prompt.system,
    messages: [
      {
        role: 'user',
        content: prompt.instructions,
      },
    ],
    temperature: 0.9,
    maxTokens: 500,
    signal,
    claudeApiKey: apiKey,
    claudeProxyUrl,
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

export function getFallbackPeriodContent(userName?: string, language = 'ru'): PeriodModalContent {
  const effectiveName = userName || getDefaultUserName(language);

  if (language === 'en') {
    return {
      question: `Hey, ${effectiveName}! So, shall we mark the cycle premiere before your body decides to throw an unexpected intermission?`,
      joke: {
        emoji: '🧙‍♀️',
        text: "Folk wisdom says: whoever wraps themselves in a blanket on the first day of their cycle — hormones won't mess with them. Shall we test the theory? 😉",
      },
    };
  }

  if (language === 'de') {
    return {
      question: `Hey, ${effectiveName}! Also, markieren wir die Zykluspremiere, bevor dein Körper eine unerwartete Pause einlegt?`,
      joke: {
        emoji: '🧙‍♀️',
        text: 'Die Volksweisheit sagt: Wer sich am ersten Tag des Zyklus in eine Decke wickelt — dem spielen die Hormone keine Streiche. Testen wir die Theorie? 😉',
      },
    };
  }

  // Russian (default)
  return {
    question: `Привет, ${effectiveName}! Ну что, фиксируем премьеру цикла, пока организм не решил устроить неожиданный антракт?`,
    joke: {
      emoji: '🧙‍♀️',
      text: 'Народ гласит: кто в первый день цикла пледом укутался — тому гормоны гадости не устроят. Проверим теорию? 😉',
    },
  };
}
