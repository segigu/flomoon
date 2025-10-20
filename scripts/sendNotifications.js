#!/usr/bin/env node

const webpush = require('web-push');

const fetch = (...args) => {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch(...args);
  }
  return import('node-fetch').then(({ default: fetchModule }) => fetchModule(...args));
};

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const CLAUDE_MODEL = 'claude-haiku-4-5';
const OPENAI_MODEL = 'gpt-4o-mini';

const CONFIG_FILE = 'nastia-config.json';
const PREVIEW_MODE = process.argv.includes('--preview-morning-brief');
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://segigu.github.io/nastia-calendar/';
const MORNING_BRIEF_URL = new URL('?open=daily-horoscope', APP_BASE_URL).toString();

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MOSCOW_TZ = 'Europe/Moscow';
const BERLIN_TZ = 'Europe/Berlin';
const NOTIFICATION_START_HOUR = 7;
const NOTIFICATION_END_HOUR = 21;
const NOTIFICATION_SLOT_MINUTES = 5;
const DEFAULT_MORNING_BRIEF_MINUTES = 6 * 60 + 45; // 06:45 Berlin time
const MIN_NOTIFICATION_MINUTES = NOTIFICATION_START_HOUR * 60;
const MAX_NOTIFICATION_MINUTES = NOTIFICATION_END_HOUR * 60 + (60 - NOTIFICATION_SLOT_MINUTES);
const NASTIA_BIRTH_YEAR = 1992;
const NASTIA_BIRTH_MONTH = 3; // April (0-indexed)
const NASTIA_BIRTH_DAY = 12;

if (!GITHUB_TOKEN && !PREVIEW_MODE) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(1);
}

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  if (!PREVIEW_MODE) {
    console.error('Missing VAPID keys');
    process.exit(1);
  }
}

if (!PREVIEW_MODE) {
  webpush.setVapidDetails(
    'mailto:noreply@nastia-calendar.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const responseSchema = {
  name: 'push_notification',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'body'],
    properties: {
      title: {
        type: 'string',
        description: 'Имя вымышленного персонажа на русском в 1-3 словах (только имя/фамилия/отчество), без эмодзи. ЗАПРЕЩЕНЫ имена: Игорь, Константин, Стас.',
        maxLength: 40,
        pattern: '^(?![Нн]аст)(?![нН]аст)[А-ЯЁ][А-ЯЁа-яё-]*(?:\\s[А-ЯЁ][А-ЯЁа-яё-]*){0,2}$',
      },
      body: {
        type: 'string',
        description: 'Push body МАКСИМУМ 60 символов с 1-2 эмодзи и едким саркастичным пинком.',
        maxLength: 60,
      },
    },
  },
};

const fallbackMessages = {
  fertile_window: {
    title: 'Людмила Фертильная',
    body: 'Настюш, зона риска, без защиты ни шагу! 💋',
  },
  ovulation_day: {
    title: 'Фёдор Плодовитый',
    body: 'Настёна, сегодня овуляция — прикрывайся! 🔥',
  },
  period_forecast: {
    title: 'Зоя ПМСова',
    body: 'Настюх, пара дней до шторма, запасайся! 🙄',
  },
  period_start: {
    title: 'Марфа Кровякова',
    body: 'Настёна, поток начался, грелку в зубы! 🩸',
  },
  period_check: {
    title: 'Вероника Контрольная',
    body: 'Настюх, день Х — проверься и отметь! 👀',
  },
  period_waiting: {
    title: 'Глаша Терпеливая',
    body: 'Настёна, задержка — прислушайся к себе! 🤔',
  },
  period_delay_warning: {
    title: 'Римма Тревожная',
    body: 'Настюш, тянет долго — может, тест? 😬',
  },
  period_confirmed_day0: {
    title: 'Тамара Пледовая',
    body: 'Настёна, старт! Плед, грелка, минимум подвигов. 🛋️',
  },
  period_confirmed_day1: {
    title: 'Соня Грелочникова',
    body: 'Настюш, второй день — грелку к пузику! 🔥',
  },
  period_confirmed_day2: {
    title: 'Инга Железистая',
    body: 'Настёна, третий день, пей воду, береги нервы! 💪',
  },
  birthday: {
    title: 'Галя Именинница',
    body: 'Настюш, с днюхой! Праздник без драмы! 🎉💜',
  },
  morning_brief: {
    title: 'Звёздный пинок',
    body: 'Настя, Марс рычит — вставай и держи оборону! 💥',
    url: MORNING_BRIEF_URL,
  },
};

const NOTIFICATIONS_URL = new URL('?open=notifications', APP_BASE_URL).toString();
const FORCE_MORNING_BRIEF = process.env.FORCE_MORNING_BRIEF === '1';

const TITLE_REGEX = /^(?![Нн]аст)[А-ЯЁ][А-ЯЁа-яё-]*(?:\s[А-ЯЁ][А-ЯЁа-яё-]*){0,2}$/;
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{1F004}-\u{1F9FF}]/u;
const FORBIDDEN_NAMES = ['игорь', 'константин', 'стас'];

function truncateWithEllipsis(text, limit = 60) {
  const trimmed = (text || '').trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function isValidPersonaTitle(value) {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (!TITLE_REGEX.test(trimmed)) {
    return false;
  }
  // Проверяем, что в имени нет запрещённых имён
  const lowerValue = trimmed.toLowerCase();
  for (const forbidden of FORBIDDEN_NAMES) {
    if (lowerValue.includes(forbidden)) {
      return false;
    }
  }
  return true;
}

function ensureEmojiPresent(text) {
  if (!text) {
    return 'Настюш, держи защиту. 🛡️';
  }
  const truncated = truncateWithEllipsis(text);
  if (EMOJI_REGEX.test(truncated)) {
    return truncated;
  }
  return truncateWithEllipsis(`${truncated} 🛡️`);
}

async function generateDailyHoroscopeNarrative(context) {
  const prompt = `Составь саркастичный дневной гороскоп для Насти.
Дата для тебя: ${context.todayHuman}. Не упоминай дату явно.

Требования:
- 2 абзаца по 2-3 предложения, каждый начинается с подходящего эмодзи.
- Обращайся к Насте напрямую (Настя, Настюш, Настёна и т.п.).
- Обязательно вплети планеты (Марс, Венера, Сатурн, Юпитер, Луна, Солнце) и их влияние на день.
- Подчеркни бытовые задачи, детей, отношения с Серёжей, подготовку к экзамену, жизнь в Германии.
- Используй чёрный юмор, допустим умеренный мат.
- Финал — жёсткий, но обнадёживающий.

Верни чистый текст без дополнительных пояснений.`;

  const systemPrompt = 'Ты Настя — язвительная подруга. Пиши по-русски, остро и поддерживающе. Никаких форматов кроме чистого текста.';

  const raw = await callAIWithFallback(prompt, systemPrompt);
  return raw.trim();
}

async function generateMorningBriefFromNarrative(narrative, context) {
  const prompt = `Вот дневной гороскоп для Насти:
"""
${narrative}
"""

Проанализируй гороскоп и сформируй push-уведомление утром в 06:45 по Берлину.
Формат JSON:
{
  "title": "фраза из 2-3 слов, описывающая главный вайб дня",
  "body": "жёсткая саркастичная строка СТРОГО до 55 символов с 1-2 эмодзи"
}

Требования:
1. Прочитай гороскоп и переведи его на ПРОСТОЙ ЧЕЛОВЕЧЕСКИЙ язык. Что РЕАЛЬНО ждёт Настю сегодня?
   - НЕ надо: "Марс против Сатурна", "Венера в квадрате"
   - НАДО: что это значит для жизни? Например:
     * Марс vs Сатурн → "конфликты и напряг весь день"
     * Венера помогает → "сегодня легко договориться"
     * Луна в углу → "интуиция работает, слушай себя"
     * Юпитер намекает → "можно выдохнуть и отложить дела"

2. Заголовок: 2-3 слова про вайб дня (примеры: "День выживания", "Лёгкая передышка", "Нервы на пределе", "Интуиция рулит")

3. Body: МАКСИМУМ 55 символов! Дай КОНКРЕТНЫЙ житейский совет или опиши, что будет:
   Примеры ХОРОШИЕ (про жизнь, не про планеты):
   - "Настя, сегодня конфликты — держи язык! 😤"
   - "Детвора бесится, экзамен давит — терпи! 💪"
   - "Вечером выдохнёшь, днём напряг! 🔥"
   - "Интуиция рулит — слушай себя! ✨"

   Примеры ПЛОХИЕ (про планеты):
   - ❌ "Марс против Сатурна — держись!"
   - ❌ "Венера в квадрате с Луной!"

4. НЕ используй астрологические термины в body! Только про ЖИЗНЬ: конфликты, отдых, дела, интуицию, детей, Серёжу, экзамен.
5. Обращайся к Насте напрямую (Настя, Настюш, Настёна)
6. 1-2 эмодзи, саркастичный тон, можно лёгкий мат
7. Ответ — строго JSON без дополнительного текста.`;

  const systemPrompt = 'Ты пишешь острые push-уведомления. Отвечай только JSON-объектом. КРИТИЧНО: body должен быть не длиннее 55 символов! Переводи астрологию на простой язык - что реально ждёт человека в жизни, а не какие планеты куда пошли.';

  const raw = await callAIWithFallback(prompt, systemPrompt);
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean);
  if (!parsed?.title || !parsed?.body) {
    throw new Error('Morning brief JSON missing fields');
  }
  return {
    title: truncateWithEllipsis(parsed.title.trim(), 40),
    body: ensureEmojiPresent(parsed.body.trim()),
    url: MORNING_BRIEF_URL,
  };
}

async function generateMorningBrief(context) {
  if (!CLAUDE_API_KEY && !OPENAI_API_KEY) {
    return {
      title: fallbackMessages.morning_brief.title,
      body: ensureEmojiPresent(fallbackMessages.morning_brief.body),
      url: fallbackMessages.morning_brief.url,
    };
  }

  try {
    const narrative = await generateDailyHoroscopeNarrative(context);
    const brief = await generateMorningBriefFromNarrative(narrative, context);
    return brief;
  } catch (error) {
    console.warn('Failed to generate morning brief via AI:', error);
    return {
      title: fallbackMessages.morning_brief.title,
      body: ensureEmojiPresent(fallbackMessages.morning_brief.body),
      url: fallbackMessages.morning_brief.url,
    };
  }
}

if (PREVIEW_MODE) {
  (async () => {
    const berlinNow = getBerlinNow();
    const today = berlinNow;
    const period = addDays(today, 3);
    const ovulation = addDays(today, 14);
    const context = {
      todayHuman: formatRussianDate(today),
      periodHuman: formatRussianDate(period),
      daysUntilPeriod: diffInDays(today, period),
      daysUntilPeriodWord: getDaysWord(Math.abs(diffInDays(today, period))),
      daysUntilOvulation: diffInDays(today, ovulation),
      daysWord: getDaysWord(Math.abs(diffInDays(today, ovulation))),
      daysPastPrediction: 0,
      daysPastPredictionWord: getDaysWord(0),
      periodStartHuman: formatRussianDate(addDays(today, -1)),
      daysSincePeriodStart: 1,
      daysSincePeriodStartWord: getDaysWord(1),
      birthdayHuman: formatRussianDate(today),
      birthdayAge: getNastiaAgeOn(today),
      isBirthday: isNastiaBirthday(today),
    };

    const message = await generateMorningBrief(context);
    console.log('Morning brief preview:');
    console.log(JSON.stringify(message, null, 2));
    process.exit(0);
  })().catch(error => {
    console.error('Preview generation failed:', error);
    process.exit(1);
  });
  return;
}

function toZonedDate(date, timeZone) {
  return new Date(date.toLocaleString('en-US', { timeZone }));
}

function getZonedNow(timeZone) {
  return toZonedDate(new Date(), timeZone);
}

function getBerlinNow() {
  return getZonedNow(BERLIN_TZ);
}

function getBerlinDayKey(date = new Date()) {
  const zoned = toZonedDate(date, BERLIN_TZ);
  zoned.setHours(0, 0, 0, 0);
  return zoned.toISOString();
}

function getMinutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isNastiaBirthday(date) {
  return date.getMonth() === NASTIA_BIRTH_MONTH && date.getDate() === NASTIA_BIRTH_DAY;
}

function getNastiaAgeOn(date) {
  let age = date.getFullYear() - NASTIA_BIRTH_YEAR;
  const hasBirthdayHappened =
    date.getMonth() > NASTIA_BIRTH_MONTH ||
    (date.getMonth() === NASTIA_BIRTH_MONTH && date.getDate() >= NASTIA_BIRTH_DAY);
  if (!hasBirthdayHappened) {
    age -= 1;
  }
  return age;
}

function formatClock(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatMinutesToClock(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function pickRandomNotificationMinutes() {
  const slots = Math.floor((MAX_NOTIFICATION_MINUTES - MIN_NOTIFICATION_MINUTES) / NOTIFICATION_SLOT_MINUTES) + 1;
  const slotIndex = Math.floor(Math.random() * slots);
  return MIN_NOTIFICATION_MINUTES + slotIndex * NOTIFICATION_SLOT_MINUTES;
}

function isMinutesWithinWindow(minutes) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
    return false;
  }
  if (minutes < MIN_NOTIFICATION_MINUTES || minutes > MAX_NOTIFICATION_MINUTES) {
    return false;
  }
  return minutes % NOTIFICATION_SLOT_MINUTES === 0;
}

function formatBerlinClockFromIso(value) {
  if (!value) {
    return 'unknown';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  const zoned = toZonedDate(date, BERLIN_TZ);
  return formatClock(zoned);
}

function getLatestNotificationForDay(log, dayKey, filterType) {
  if (!log || !Array.isArray(log.notifications)) {
    return null;
  }
  for (const entry of log.notifications) {
    if (!entry?.sentAt) {
      continue;
    }
    const entryKey = getBerlinDayKey(new Date(entry.sentAt));
    if (entryKey === dayKey && (!filterType || entry.type === filterType)) {
      return entry;
    }
  }
  return null;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getMoscowToday() {
  const now = new Date();
  const moscowString = now.toLocaleString('en-US', { timeZone: MOSCOW_TZ });
  const moscowDate = new Date(moscowString);
  moscowDate.setHours(0, 0, 0, 0);
  return moscowDate;
}

function diffInDays(from, to) {
  return Math.round((to.getTime() - from.getTime()) / MS_IN_DAY);
}

function formatRussianDate(date) {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
}

async function fetchFromGitHub(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  return response;
}

async function loadRepoJson(username, filename, fallbackValue) {
  const url = `https://api.github.com/repos/${username}/nastia-data/contents/${filename}`;
  const response = await fetchFromGitHub(url);

  if (response.status === 404) {
    console.warn(`File ${filename} not found (404), using fallback value`);
    return { value: fallbackValue, corrupted: true };
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${filename}: ${response.statusText}`);
  }

  const payload = await response.json();
  const content = Buffer.from(payload.content, 'base64').toString('utf8');

  // Handle empty or invalid content
  if (!content || content.trim() === '') {
    console.warn(`File ${filename} is empty, using fallback value`);
    return { value: fallbackValue, corrupted: true };
  }

  try {
    return { value: JSON.parse(content), corrupted: false };
  } catch (error) {
    console.warn(`File ${filename} contains invalid JSON, using fallback value:`, error.message);
    return { value: fallbackValue, corrupted: true };
  }
}

async function loadConfig(username) {
  try {
    const result = await loadRepoJson(username, CONFIG_FILE, null);
    return result.value;
  } catch (error) {
    console.warn('Failed to load config, continuing with defaults:', error.message);
    return null;
  }
}

async function saveConfig(username, config) {
  const url = `https://api.github.com/repos/${username}/nastia-data/contents/${CONFIG_FILE}`;

  const content = Buffer.from(JSON.stringify(config, null, 2)).toString('base64');

  let sha;
  const getResponse = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (getResponse.ok) {
    const fileData = await getResponse.json();
    sha = fileData.sha;
  }

  const putResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Update config ${new Date().toISOString()}`,
      content,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putResponse.ok) {
    const errorPayload = await putResponse.text();
    throw new Error(`Failed to save config: ${errorPayload}`);
  }
}

function ensureNotificationSchedule(config) {
  const todayKey = getBerlinDayKey();
  const existing = config?.notificationSchedule;
  const hasValidExisting =
    existing &&
    existing.dayKey === todayKey &&
    isMinutesWithinWindow(existing.targetMinutes);

  if (hasValidExisting) {
    const schedule = { ...existing };
    let scheduleUpdated = false;

    if (schedule.timezone !== BERLIN_TZ) {
      schedule.timezone = BERLIN_TZ;
      scheduleUpdated = true;
    }

    if (schedule.slotMinutes !== NOTIFICATION_SLOT_MINUTES) {
      schedule.slotMinutes = NOTIFICATION_SLOT_MINUTES;
      scheduleUpdated = true;
    }

    const expectedTargetTime = formatMinutesToClock(schedule.targetMinutes);
    if (schedule.targetTime !== expectedTargetTime) {
      schedule.targetTime = expectedTargetTime;
      scheduleUpdated = true;
    }

    if (!schedule.generatedAt) {
      schedule.generatedAt = new Date().toISOString();
      scheduleUpdated = true;
    }

    if (scheduleUpdated) {
      config.notificationSchedule = schedule;
    }

    return {
      schedule,
      updated: scheduleUpdated,
    };
  }

  const targetMinutes = pickRandomNotificationMinutes();
  const schedule = {
    dayKey: todayKey,
    targetMinutes,
    targetTime: formatMinutesToClock(targetMinutes),
    timezone: BERLIN_TZ,
    slotMinutes: NOTIFICATION_SLOT_MINUTES,
    generatedAt: new Date().toISOString(),
  };

  config.notificationSchedule = schedule;
  return { schedule, updated: true };
}

async function prepareConfigAndSchedule(username, trimmedClaudeKey) {
  const currentConfig = await loadConfig(username);
  const nextConfig = { ...(currentConfig ?? {}) };
  let configDirty = false;
  let claudeUpdated = false;

  if (trimmedClaudeKey) {
    const currentKey = currentConfig?.claude?.apiKey;
    if (currentKey !== trimmedClaudeKey) {
      nextConfig.claude = {
        ...(currentConfig?.claude ?? {}),
        apiKey: trimmedClaudeKey,
      };
      configDirty = true;
      claudeUpdated = true;
    }
  } else {
    console.warn('CLAUDE_API_KEY secret is empty; remote config not updated');
  }

  const scheduleResult = ensureNotificationSchedule(nextConfig);
  if (scheduleResult.updated) {
    configDirty = true;
  }

  if (configDirty) {
    nextConfig.updatedAt = new Date().toISOString();
    try {
      await saveConfig(username, nextConfig);
      if (claudeUpdated) {
        console.log('Configuration file updated with Claude API key');
      }
      if (scheduleResult.updated) {
        console.log(`Notification schedule for today set to ${scheduleResult.schedule.targetTime} (${BERLIN_TZ})`);
      }
    } catch (error) {
      console.error('Failed to update configuration file:', error.message);
    }
  }

  return {
    config: nextConfig,
    schedule: scheduleResult.schedule,
  };
}

function computeCycleStats(cycles) {
  if (!Array.isArray(cycles) || cycles.length === 0) {
    return null;
  }

  const sorted = [...cycles]
    .map(cycle => ({ ...cycle, startDate: startOfDay(new Date(cycle.startDate)) }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  if (sorted.length === 0) {
    return null;
  }

  const cycleLengths = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1].startDate;
    const current = sorted[i].startDate;
    cycleLengths.push(diffInDays(prev, current));
  }

  const averageLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length)
    : 28;

  const lastStart = sorted[sorted.length - 1].startDate;
  const nextPeriod = startOfDay(addDays(lastStart, averageLength));
  const ovulationDay = startOfDay(addDays(nextPeriod, -14));
  const fertileStart = startOfDay(addDays(ovulationDay, -5));

  return {
    lastStart,
    nextPeriod,
    averageLength,
    ovulationDay,
    fertileStart,
    fertileEnd: ovulationDay,
  };
}

function pickNotificationType(today, stats) {
  if (isNastiaBirthday(today)) {
    return {
      type: 'birthday',
      metadata: {
        birthdayAge: getNastiaAgeOn(today),
      },
    };
  }

  const predictedStart = startOfDay(stats.nextPeriod);
  const ovulationDay = startOfDay(stats.ovulationDay);
  const fertileStart = startOfDay(stats.fertileStart);
  const fertileEndExclusive = startOfDay(stats.fertileEnd);

  const daysUntilPeriod = diffInDays(today, predictedStart);
  const daysUntilOvulation = diffInDays(today, ovulationDay);

  let daysSinceLastStart = null;
  let lastStartIso = null;
  if (stats.lastStart) {
    const lastStart = startOfDay(stats.lastStart);
    daysSinceLastStart = diffInDays(lastStart, today);
    lastStartIso = lastStart.toISOString();
  }

  const hasRecentPeriodStart =
    typeof daysSinceLastStart === 'number' &&
    daysSinceLastStart >= 0 &&
    daysSinceLastStart <= 2;

  if (hasRecentPeriodStart) {
    if (daysSinceLastStart === 0) {
      return {
        type: 'period_confirmed_day0',
        metadata: {
          daysSincePeriodStart: daysSinceLastStart,
          periodStartDate: lastStartIso,
        },
      };
    }
    if (daysSinceLastStart === 1) {
      return {
        type: 'period_confirmed_day1',
        metadata: {
          daysSincePeriodStart: daysSinceLastStart,
          periodStartDate: lastStartIso,
        },
      };
    }
    return {
      type: 'period_confirmed_day2',
      metadata: {
        daysSincePeriodStart: daysSinceLastStart,
        periodStartDate: lastStartIso,
      },
    };
  }

  if (daysUntilPeriod === 0) {
    return {
      type: 'period_check',
      metadata: {
        daysUntilPeriod,
        predictedDateIso: predictedStart.toISOString(),
      },
    };
  }

  if (daysUntilPeriod > 0 && daysUntilPeriod <= 5) {
    return {
      type: 'period_forecast',
      metadata: {
        daysUntilPeriod,
        predictedDateIso: predictedStart.toISOString(),
      },
    };
  }

  if (daysUntilPeriod < 0) {
    const daysPastPrediction = Math.abs(daysUntilPeriod);
    if (daysPastPrediction <= 2) {
      return {
        type: 'period_waiting',
        metadata: {
          daysPastPrediction,
          predictedDateIso: predictedStart.toISOString(),
        },
      };
    }
    return {
      type: 'period_delay_warning',
      metadata: {
        daysPastPrediction,
        predictedDateIso: predictedStart.toISOString(),
      },
    };
  }

  if (daysUntilOvulation === 0) {
    return {
      type: 'ovulation_day',
      metadata: { daysUntilOvulation },
    };
  }

  if (today.getTime() >= fertileStart.getTime() && today.getTime() < fertileEndExclusive.getTime()) {
    return {
      type: 'fertile_window',
      metadata: {
        daysUntilOvulation,
      },
    };
  }

  return null;
}

function buildPrompt(type, context) {
  const base = `Ты — Настина лучшая подруга с жёстким, но поддерживающим женским сарказмом. Пиши по-русски дерзко и прямо, обращайся к Насте по-свойски (Настюш, Настён, Настёнка, Настюшка, Настёна, детка, иногда можно по фамилии - Орлова).
Задача: придумать push-уведомление для календаря цикла.
Формат:
- Заголовок из 1-3 слов: только вымышленное имя, фамилия и/или отчество персонажа. Персонаж должен быть новым в каждом уведомлении, с игривым оттенком, связанным с темой фертильности, гормонов, защиты, беременности и т.п. Никаких обращений к Насте. ЗАПРЕЩЕНО использовать имена: Игорь, Константин, Стас (в любой форме). Примеры (не повторяй дословно): «Людмила Фертильная», «Фёдор Плодовитый», «Олеся Овуляторовна», «Марфа Контрацептовна», «Гриша Презерваторов».
- Тело СТРОГО до 55 символов с обращением к Насте, 1-2 эмодзи и жёстким, но заботливым сарказмом. Пиши от лица персонажа из заголовка, будто он шлёт сообщение в чат. Будь краток и ёмок. Никакой мягкости, но и без обсценной лексики и унижений.
КРИТИЧНО: body должен быть максимум 55 символов, иначе обрежется!
Сегодня: ${context.todayHuman}. Прогноз старта менструации: ${context.periodHuman}.`;

  switch (type) {
    case 'fertile_window':
      return `${base}
Ситуация: фертильное окно, до овуляции ${Math.abs(context.daysUntilOvulation)} ${context.daysWord}. Жёстко и саркастично предупреди про риск залёта и необходимость защиты. Драма не нужна. Укладывайся в 55 символов!`;
    case 'ovulation_day':
      return `${base}
Ситуация: сегодня овуляция. Прямо и резко скажи про пик фертильности и что без контрацепции — играешь с огнём. Не больше 55 символов!`;
    case 'period_forecast':
      return `${base}
Ситуация: до менструации ${Math.abs(context.daysUntilPeriod)} ${context.daysWord}. Жёстко, но по-сестрински: напомни, что шторм на подходе. Грелку готовь! Максимум 55 символов!`;
    case 'period_check':
    case 'period_start':
      return `${base}
Ситуация: прогноз на ${context.periodHuman} — то есть сегодня. Саркастично попроси Настю проверить, не началось ли уже, и намекни отметить старт. До 55 символов!`;
    case 'period_waiting':
      return `${base}
Ситуация: менструация задерживается уже ${context.daysPastPrediction} ${context.daysPastPredictionWord}. Поддержи Настю, спроси про ощущения и тонко напомни отметить начало. Не больше 55 символов!`;
    case 'period_delay_warning':
      return `${base}
Ситуация: задержка длится ${context.daysPastPrediction} ${context.daysPastPredictionWord}. С сарказмом переживай, предложи прислушаться к телу, намекни про тест. Укладывайся в 55 символов!`;
    case 'period_confirmed_day0':
      return `${base}
Ситуация: Настя отметила, что менструация началась сегодня (${context.periodStartHuman}). Обними словами, подкини идеи ухода (грелка, плед). До 55 символов!`;
    case 'period_confirmed_day1': {
      const days = typeof context.daysSincePeriodStart === 'number' ? context.daysSincePeriodStart : 1;
      const dayWord = days === 1 ? 'второй день' : `${days + 1}-й день`;
      return `${base}
Ситуация: ${dayWord} менструации (старт был ${context.periodStartHuman}). Саркастично поддержи, спроси про самочувствие. Максимум 55 символов!`;
    }
    case 'period_confirmed_day2': {
      const days = typeof context.daysSincePeriodStart === 'number' ? context.daysSincePeriodStart : 2;
      const dayWord = days === 2 ? 'третий день' : `${days + 1}-й день`;
      return `${base}
Ситуация: ${dayWord} менструации (старт ${context.periodStartHuman}). Поддержи, напомни про спокойный режим. Не больше 55 символов!`;
    }
    case 'birthday':
      return `Ты — Настина лучшая подруга с жёстким, но поддерживающим сарказмом. Пиши по-русски, формат push: новый персонаж в заголовке (1-3 слова) и короткое тело СТРОГО до 55 символов с 1-2 эмодзи.
Сегодня ${context.todayHuman} и Настюше исполняется ${context.birthdayAge}. Поздравь её дерзко и тепло, будто подруга шлёт сообщение в чат. Будь краток. Без официоза и пафоса, только живая язвительная любовь. ЗАПРЕЩЕНО использовать имена: Игорь, Константин, Стас.`;
    case 'morning_brief':
      return `Ты — Настина лучшая подруга с чёрным юмором. Формат push: новый персонаж в заголовке (1-3 слова), тело СТРОГО до 55 символов, 1-2 эмодзи, острый сарказм допустим даже с лёгкими матами.
Ситуация: раннее утро (${context.todayHuman}), 06:45 по Берлину. Нужно разбудить Настю, задав тон дня. В заголовке — персонаж, отражающий вайб дня (например, «Аня Ранозоревая», «Марго Кофеинова», «Фёкла Будильникова»). ЗАПРЕЩЕНО использовать имена: Игорь, Константин, Стас. В тексте — жёсткий утренний брифинг: намекни планету и вайб дня. Будь кратка и ёмка. Можно использовать нецензурную лексику, но умно и по делу. Обязательно обращайся к Насте лично. КРИТИЧНО: максимум 55 символов!`;
    default:
      return base;
  }
}

function getDaysWord(value) {
  const absValue = Math.abs(value);
  if (absValue === 1) return 'день';
  if (absValue >= 2 && absValue <= 4) return 'дня';
  return 'дней';
}

async function callAIWithFallback(prompt, systemPrompt) {
  // Try Claude first
  if (CLAUDE_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 300,
          temperature: 0.95,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const payload = await response.json();
      const raw = payload?.content?.[0]?.text;
      if (!raw) {
        throw new Error('Claude returned empty content');
      }

      console.log('Generated notification using Claude API');
      return raw;
    } catch (claudeError) {
      console.warn('Claude API failed, trying OpenAI:', claudeError.message);
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.95,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const payload = await response.json();
      const raw = payload?.choices?.[0]?.message?.content;
      if (!raw) {
        throw new Error('OpenAI returned empty content');
      }

      console.log('Generated notification using OpenAI API');
      return raw;
    } catch (openAIError) {
      console.warn('OpenAI API also failed:', openAIError.message);
      throw new Error(`Both AI providers failed. Claude: ${claudeError?.message || 'No key'}. OpenAI: ${openAIError.message}`);
    }
  }

  throw new Error('No AI API keys available');
}

async function generateMessage(type, context, cache) {
  if (cache.has(type)) {
    return cache.get(type);
  }

  if (!CLAUDE_API_KEY && !OPENAI_API_KEY) {
    const fallback = applyPersonaTemplate(fallbackMessages[type]);
    cache.set(type, fallback);
    return fallback;
  }

  const prompt = buildPrompt(type, context) + '\n\nВерни ответ СТРОГО в формате JSON:\n{"title": "текст заголовка", "body": "текст уведомления"}';
  const systemPrompt = 'Ты Настя — язвительная, саркастичная подруга, которая пишет на русском. Всегда отвечай СТРОГО в формате JSON: {"title": "заголовок", "body": "текст"}. Без дополнительных пояснений, только JSON.';

  try {
    const raw = await callAIWithFallback(prompt, systemPrompt);

    // AI может обернуть JSON в markdown блок
    const cleanContent = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    if (!parsed.title || !parsed.body) {
      throw new Error('AI response missing fields');
    }

    if (!isValidPersonaTitle(parsed.title)) {
      throw new Error(`Generated title does not meet persona format: "${parsed.title}"`);
    }

    const normalized = {
      title: parsed.title.trim(),
      body: ensureEmojiPresent(parsed.body.trim()),
    };

    cache.set(type, normalized);
    return normalized;
  } catch (error) {
    console.warn(`Falling back to canned text for type ${type}:`, error.message);
    const fallback = {
      title: fallbackMessages[type].title,
      body: ensureEmojiPresent(fallbackMessages[type].body),
    };
    cache.set(type, fallback);
    return fallback;
  }
}

async function loadNotificationsLog(username) {
  const fallback = {
    notifications: [],
    lastUpdated: new Date().toISOString(),
  };

  const result = await loadRepoJson(username, 'nastia-notifications.json', fallback);

  // If the file was corrupted, force save to fix it
  if (result.corrupted) {
    console.warn('Notifications log was corrupted or missing, recreating...');
    try {
      await saveNotificationsLog(username, fallback);
      console.log('Notifications log recreated successfully');
    } catch (error) {
      console.error('Failed to recreate notifications log:', error.message);
    }
  }

  const data = result.value;
  if (!Array.isArray(data.notifications)) {
    data.notifications = [];
  }
  return data;
}

async function saveNotificationsLog(username, log) {
  const url = `https://api.github.com/repos/${username}/nastia-data/contents/nastia-notifications.json`;

  const content = Buffer.from(JSON.stringify(log, null, 2)).toString('base64');

  let sha;
  const getResponse = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (getResponse.ok) {
    const fileData = await getResponse.json();
    sha = fileData.sha;
  }

  const putResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Update notifications log ${new Date().toISOString()}`,
      content,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putResponse.ok) {
    const errorPayload = await putResponse.text();
    throw new Error(`Failed to save notifications log: ${errorPayload}`);
  }
}

function buildNotificationPayload(type, message, today) {
  return {
    id: `${today.toISOString()}-${type}`,
    type,
    title: message.title,
    body: message.body,
    sentAt: new Date().toISOString(),
    url: message.url ?? (type === 'morning_brief' ? MORNING_BRIEF_URL : NOTIFICATIONS_URL),
  };
}

async function dispatchNotificationToSubscriptions({
  type,
  context,
  subscriptions,
  messageCache,
  today,
  prebuiltMessage,
}) {
  let sent = 0;
  let logEntry;

  for (const subscription of subscriptions) {
    const settings = subscription.settings || {};
    const enabled = settings.enabled !== false;
    if (!enabled) {
      continue;
    }

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    };

    const message = prebuiltMessage ?? await generateMessage(type, context, messageCache ?? new Map());
    const targetUrl = message.url ?? (type === 'morning_brief' ? MORNING_BRIEF_URL : NOTIFICATIONS_URL);
    if (!logEntry) {
      logEntry = buildNotificationPayload(type, { ...message, url: targetUrl }, today);
    }

    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      id: logEntry.id,
      type,
      sentAt: logEntry.sentAt,
      url: targetUrl,
    });

    try {
      await webpush.sendNotification(
        pushSubscription,
        Buffer.from(payload, 'utf-8'),
        {
          contentEncoding: 'aes128gcm',
        }
      );
      sent += 1;
      console.log(`Notification (${type}) sent to ${subscription.endpoint.slice(-20)}`);
    } catch (error) {
      const status = error?.statusCode ?? error?.status ?? 'unknown-status';
      const responseBody = error?.body ? error.body.toString() : undefined;
      console.error(`Failed to send ${type} to ${subscription.endpoint.slice(-20)}:`, error.message, status, responseBody);
    }
  }

  return { sent, logEntry };
}

async function main() {
  try {
    const userResponse = await fetchFromGitHub('https://api.github.com/user');
    if (!userResponse.ok) {
      throw new Error('Failed to fetch GitHub user');
    }
    const userData = await userResponse.json();
    const username = userData.login;

    const trimmedClaudeKey = (CLAUDE_API_KEY || '').trim();
    const { schedule } = await prepareConfigAndSchedule(username, trimmedClaudeKey);

    const berlinNow = getBerlinNow();
    const berlinMinutesNow = getMinutesSinceMidnight(berlinNow);
    const currentBerlinTime = formatClock(berlinNow);
    const morningBriefMinutes = FORCE_MORNING_BRIEF
      ? berlinMinutesNow
      : DEFAULT_MORNING_BRIEF_MINUTES;
    const morningBriefTime = formatMinutesToClock(morningBriefMinutes);

    console.log(`Current time in ${BERLIN_TZ}: ${currentBerlinTime}`);
    if (FORCE_MORNING_BRIEF) {
      console.log(`Morning brief forced for immediate send (Berlin minutes: ${morningBriefMinutes})`);
    } else {
      console.log(`Morning brief planned time: ${morningBriefTime} (${BERLIN_TZ})`);
    }
    console.log(`Planned notification time: ${schedule.targetTime} (${BERLIN_TZ})`);
    const notificationsLog = await loadNotificationsLog(username);

    const todaysMorningNotification = getLatestNotificationForDay(notificationsLog, schedule.dayKey, 'morning_brief');

    let nastiaDataResult = await loadRepoJson(username, 'nastia-cycles.json', null);
    let nastiaData = nastiaDataResult.value;

    if (!nastiaData) {
      nastiaDataResult = await loadRepoJson(username, 'nastia-data.json', null);
      nastiaData = nastiaDataResult.value;
    }

    const cycleCount = nastiaData?.cycles?.length ?? 0;
    console.log(`Cycles loaded: ${cycleCount}`);

    const subscriptionsResult = await loadRepoJson(username, 'subscriptions.json', {
      subscriptions: [],
      lastUpdated: new Date().toISOString(),
    });
    const subscriptionsData = subscriptionsResult.value;

    console.log(`Subscriptions loaded: ${subscriptionsData.subscriptions.length}`);

    if (!nastiaData || !nastiaData.cycles || nastiaData.cycles.length === 0) {
      console.log('No cycles available, skipping notifications');
      return;
    }

    const stats = computeCycleStats(nastiaData.cycles);
    if (!stats) {
      console.log('Not enough data to compute stats');
      return;
    }

    const today = getMoscowToday();
    console.log('Today (Moscow):', today.toISOString());
    console.log('Next period:', stats.nextPeriod.toISOString(), 'Ovulation:', stats.ovulationDay.toISOString(), 'Fertile start:', stats.fertileStart.toISOString());

    const typeInfo = pickNotificationType(today, stats);
    const type = typeInfo?.type ?? null;
    const metadata = typeInfo?.metadata ?? {};
    console.log('Primary notification type:', type, metadata);
    const messageCache = new Map();

    const predictedDate = (() => {
      const iso = metadata?.predictedDateIso ?? stats.nextPeriod.toISOString();
      const candidate = new Date(iso);
      if (Number.isNaN(candidate.getTime())) {
        return startOfDay(stats.nextPeriod);
      }
      return startOfDay(candidate);
    })();

    const periodStartDate = (() => {
      const iso = metadata?.periodStartDate ?? (stats.lastStart ? stats.lastStart.toISOString() : null);
      if (!iso) {
        return null;
      }
      const candidate = new Date(iso);
      if (Number.isNaN(candidate.getTime())) {
        return null;
      }
      return startOfDay(candidate);
    })();

    const resolvedDaysUntilPeriod = metadata?.daysUntilPeriod ?? diffInDays(today, predictedDate);
    const resolvedDaysUntilOvulation = metadata?.daysUntilOvulation ?? diffInDays(today, stats.ovulationDay);
    const resolvedDaysPastPrediction =
      metadata?.daysPastPrediction ?? (resolvedDaysUntilPeriod < 0 ? Math.abs(resolvedDaysUntilPeriod) : 0);

    let resolvedDaysSincePeriodStart =
      typeof metadata?.daysSincePeriodStart === 'number' ? metadata.daysSincePeriodStart : null;
    if (resolvedDaysSincePeriodStart === null && periodStartDate) {
      const sinceStart = diffInDays(periodStartDate, today);
      if (sinceStart >= 0) {
        resolvedDaysSincePeriodStart = sinceStart;
      }
    }

    const context = {
      todayHuman: formatRussianDate(today),
      periodHuman: formatRussianDate(predictedDate),
      daysUntilPeriod: resolvedDaysUntilPeriod,
      daysUntilPeriodWord: getDaysWord(Math.abs(resolvedDaysUntilPeriod)),
      daysUntilOvulation: resolvedDaysUntilOvulation,
      daysWord: getDaysWord(
        Math.abs(
          metadata?.daysUntilPeriod ??
          metadata?.daysUntilOvulation ??
          resolvedDaysUntilPeriod
        )
      ),
      daysPastPrediction: resolvedDaysPastPrediction,
      daysPastPredictionWord: getDaysWord(Math.abs(resolvedDaysPastPrediction)),
      periodStartHuman: periodStartDate ? formatRussianDate(periodStartDate) : null,
      daysSincePeriodStart: resolvedDaysSincePeriodStart,
      daysSincePeriodStartWord:
        resolvedDaysSincePeriodStart != null ? getDaysWord(Math.abs(resolvedDaysSincePeriodStart)) : null,
      birthdayHuman: formatRussianDate(today),
      birthdayAge: typeof metadata?.birthdayAge === 'number' ? metadata.birthdayAge : getNastiaAgeOn(today),
      isBirthday: isNastiaBirthday(today),
    };

    if ((FORCE_MORNING_BRIEF || berlinMinutesNow >= morningBriefMinutes) && !todaysMorningNotification) {
      console.log('Generating morning brief notification...');
      const morningMessage = await generateMorningBrief(context);
      const { sent: morningSent, logEntry: morningLogEntry } = await dispatchNotificationToSubscriptions({
        type: 'morning_brief',
        context,
        subscriptions: subscriptionsData.subscriptions,
        messageCache: new Map(),
        today,
        prebuiltMessage: morningMessage,
      });

      if (morningSent > 0 && morningLogEntry) {
        notificationsLog.notifications.unshift(morningLogEntry);
        notificationsLog.notifications = notificationsLog.notifications.slice(0, 200);
        notificationsLog.lastUpdated = new Date().toISOString();
        try {
          await saveNotificationsLog(username, notificationsLog);
        } catch (error) {
          console.error('Failed to persist notifications log after morning brief:', error.message);
        }
      }
      console.log(`Morning brief notifications sent: ${morningSent}`);
    } else if (todaysMorningNotification) {
      const sentClock = formatBerlinClockFromIso(todaysMorningNotification.sentAt);
      console.log(`Morning brief already sent today at ${sentClock} (${BERLIN_TZ})`);
    } else {
      console.log(`Too early for morning brief, waiting until ${morningBriefTime} Berlin time.`);
    }

    if (!type) {
      console.log('No primary notification planned for today');
      return;
    }

    if (berlinMinutesNow < schedule.targetMinutes) {
      console.log('Main notification window not reached yet, skipping this run');
      return;
    }

    const todaysNotification = getLatestNotificationForDay(notificationsLog, schedule.dayKey, type);
    if (todaysNotification) {
      const sentClock = formatBerlinClockFromIso(todaysNotification.sentAt);
      console.log(`Notification already sent today at ${sentClock} (${BERLIN_TZ}), skipping`);
      return;
    }

    const { sent, logEntry } = await dispatchNotificationToSubscriptions({
      type,
      context,
      subscriptions: subscriptionsData.subscriptions,
      messageCache,
      today,
    });

    if (sent > 0 && logEntry) {
      notificationsLog.notifications.unshift(logEntry);
      notificationsLog.notifications = notificationsLog.notifications.slice(0, 200);
      notificationsLog.lastUpdated = new Date().toISOString();
      try {
        await saveNotificationsLog(username, notificationsLog);
      } catch (error) {
        console.error('Failed to persist notifications log:', error.message);
      }
    }

    console.log(`Total notifications sent: ${sent}`);
  } catch (error) {
    console.error('Error in notification job:', error);
    process.exit(1);
  }
}

if (PREVIEW_MODE) {
  (async () => {
    const berlinNow = getBerlinNow();
    const today = berlinNow;
    const period = addDays(today, 3);
    const ovulation = addDays(today, 14);
    const context = {
      todayHuman: formatRussianDate(today),
      periodHuman: formatRussianDate(period),
      daysUntilPeriod: diffInDays(today, period),
      daysUntilPeriodWord: getDaysWord(Math.abs(diffInDays(today, period))),
      daysUntilOvulation: diffInDays(today, ovulation),
      daysWord: getDaysWord(Math.abs(diffInDays(today, ovulation))),
      daysPastPrediction: 0,
      daysPastPredictionWord: getDaysWord(0),
      periodStartHuman: formatRussianDate(addDays(today, -1)),
      daysSincePeriodStart: 1,
      daysSincePeriodStartWord: getDaysWord(1),
      birthdayHuman: formatRussianDate(today),
      birthdayAge: getNastiaAgeOn(today),
      isBirthday: isNastiaBirthday(today),
    };

    const message = await generateMorningBrief(context);
    console.log('Morning brief preview:');
    console.log(JSON.stringify(message, null, 2));
    process.exit(0);
  })().catch(error => {
    console.error('Preview generation failed:', error);
    process.exit(1);
  });
} else {
  main();
}
