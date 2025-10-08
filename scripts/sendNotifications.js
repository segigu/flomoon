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
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

const CONFIG_FILE = 'nastia-config.json';

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MOSCOW_TZ = 'Europe/Moscow';
const BERLIN_TZ = 'Europe/Berlin';
const NOTIFICATION_START_HOUR = 7;
const NOTIFICATION_END_HOUR = 21;
const NOTIFICATION_SLOT_MINUTES = 5;
const MIN_NOTIFICATION_MINUTES = NOTIFICATION_START_HOUR * 60;
const MAX_NOTIFICATION_MINUTES = NOTIFICATION_END_HOUR * 60 + (60 - NOTIFICATION_SLOT_MINUTES);
const NASTIA_BIRTH_YEAR = 1992;
const NASTIA_BIRTH_MONTH = 3; // April (0-indexed)
const NASTIA_BIRTH_DAY = 12;

if (!GITHUB_TOKEN) {
  console.error('Missing GITHUB_TOKEN');
  process.exit(1);
}

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('Missing VAPID keys');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:noreply@nastia-calendar.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const responseSchema = {
  name: 'push_notification',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'body'],
    properties: {
      title: {
        type: 'string',
        description: 'Имя вымышленного персонажа на русском в 1-3 словах (только имя/фамилия/отчество), без эмодзи.',
        maxLength: 48,
        pattern: '^(?![Нн]аст)(?![нН]аст)[А-ЯЁ][А-ЯЁа-яё-]*(?:\\s[А-ЯЁ][А-ЯЁа-яё-]*){0,2}$',
      },
      body: {
        type: 'string',
        description: 'Push body up to 110 characters with 1-2 emojis and biting supportive sarcasm.',
        maxLength: 150,
      },
    },
  },
};

const fallbackMessages = {
  fertile_window: {
    title: 'Людмила Фертильная',
    body: 'Настюш, это Людмила Фертильная: зона риска, без защиты ни шагу. 💋',
  },
  ovulation_day: {
    title: 'Фёдор Плодовитый',
    body: 'Настёна, Фёдор Плодовитый на проводе: сегодня овуляция, прикрывайся! 🔥',
  },
  period_forecast: {
    title: 'Зоя ПМСова',
    body: 'Настюх, Зоя ПМСова предупреждает: пара дней до шторма, запасайся терпением. 🙄',
  },
  period_start: {
    title: 'Марфа Кровякова',
    body: 'Настёна, Марфа Кровякова рапортует: поток начался, грелку в зубы. 🩸',
  },
  period_check: {
    title: 'Вероника Контрольная',
    body: 'Настюх, Вероника Контрольная на связи: день Х сегодня, отметь, если уже пошло. 👀',
  },
  period_waiting: {
    title: 'Глаша Терпеливая',
    body: 'Настёна, Глаша Терпеливая: задержка день как, прислушайся и черкани в дневник. 🤔',
  },
  period_delay_warning: {
    title: 'Римма Тревожная',
    body: 'Настюш, Римма Тревожная в панике: уж больно тянет, может, тест на всякий? 😬',
  },
  period_confirmed_day0: {
    title: 'Тамара Пледовая',
    body: 'Настёна, Тамара Пледовая: старт принят, плед, грелка и минимум подвигов. 🛋️',
  },
  period_confirmed_day1: {
    title: 'Соня Грелочникова',
    body: 'Настюш, Соня Грелочникова: второй день — грелку к пузику и сериалы в бой. 🔥',
  },
  period_confirmed_day2: {
    title: 'Инга Железистая',
    body: 'Настёна, Инга Железистая: третий день, пей воду и береги нервы, слышишь? 💪',
  },
  birthday: {
    title: 'Галя Именинница',
    body: 'Настюш, с днюхой! Галя Именинница на связи: устроим шумный праздник и ноль драмы. 🎉💜',
  },
};

const TITLE_REGEX = /^(?![Нн]аст)[А-ЯЁ][А-ЯЁа-яё-]*(?:\s[А-ЯЁ][А-ЯЁа-яё-]*){0,2}$/;
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{1F004}-\u{1F9FF}]/u;

function truncateWithEllipsis(text, limit = 110) {
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
  return TITLE_REGEX.test(value.trim());
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

function getLatestNotificationForDay(log, dayKey) {
  if (!log || !Array.isArray(log.notifications)) {
    return null;
  }
  for (const entry of log.notifications) {
    if (!entry?.sentAt) {
      continue;
    }
    const entryKey = getBerlinDayKey(new Date(entry.sentAt));
    if (entryKey === dayKey) {
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
- Заголовок из 1-3 слов: только вымышленное имя, фамилия и/или отчество персонажа. Персонаж должен быть новым в каждом уведомлении, с игривым оттенком, связанным с темой фертильности, гормонов, защиты, беременности и т.п. Никаких обращений к Насте. Примеры (не повторяй дословно): «Людмила Фертильная», «Фёдор Плодовитый», «Олеся Овуляторовна», «Марфа Контрацептовна», «Гриша Презерваторов».
- Тело до 110 символов с обращением к Насте, 1-2 эмодзи и жёстким, но заботливым сарказмом. Пиши от лица персонажа из заголовка, будто он шлёт сообщение в чат. Никакой мягкости, но и без обсценной лексики и унижений.
Сегодня: ${context.todayHuman}. Прогноз старта менструации: ${context.periodHuman}.`;

  switch (type) {
    case 'fertile_window':
      return `${base}
Ситуация: фертильное окно, до овуляции ${Math.abs(context.daysUntilOvulation)} ${context.daysWord}. Жёстко и саркастично предупреди про риск залёта и необходимость защиты. Драма не нужна.`;
    case 'ovulation_day':
      return `${base}
Ситуация: сегодня овуляция. Прямо и резко скажи про пик фертильности и что без контрацепции — играешь с огнём.`;
    case 'period_forecast':
      return `${base}
Ситуация: до менструации ${Math.abs(context.daysUntilPeriod)} ${context.daysWord}. Жёстко, но по-сестрински: напомни, что шторм уже на подходе, подготовь грелку и шоколад.`;
    case 'period_check':
    case 'period_start':
      return `${base}
Ситуация: прогноз на ${context.periodHuman} — то есть сегодня. Саркастично попроси Настю проверить, не началось ли уже, и намекни отметить старт. Никакого морализаторства.`;
    case 'period_waiting':
      return `${base}
Ситуация: менструация задерживается уже ${context.daysPastPrediction} ${context.daysPastPredictionWord}. Поддержи Настю, спроси про ощущения и тонко напомни отметить начало, без занудства.`;
    case 'period_delay_warning':
      return `${base}
Ситуация: задержка длится ${context.daysPastPrediction} ${context.daysPastPredictionWord}. С сарказмом переживай, предложи прислушаться к телу, намекни про тест или консультацию, но без паники.`;
    case 'period_confirmed_day0':
      return `${base}
Ситуация: Настя отметила, что менструация началась сегодня (${context.periodStartHuman}). Обними словами, подкини идеи ухода (грелка, плед, покой) и похвали за отметку.`;
    case 'period_confirmed_day1': {
      const days = typeof context.daysSincePeriodStart === 'number' ? context.daysSincePeriodStart : 1;
      const dayWord = days === 1 ? 'второй день' : `${days + 1}-й день`;
      return `${base}
Ситуация: ${dayWord} менструации (старт был ${context.periodStartHuman}). Саркастично поддержи, спроси про самочувствие и напомни беречь силы.`;
    }
    case 'period_confirmed_day2': {
      const days = typeof context.daysSincePeriodStart === 'number' ? context.daysSincePeriodStart : 2;
      const dayWord = days === 2 ? 'третий день' : `${days + 1}-й день`;
      return `${base}
Ситуация: ${dayWord} менструации (старт ${context.periodStartHuman}). Поддержи, напомни про спокойный режим и намекни, что Настя всё держит под контролем.`;
    }
    case 'birthday':
      return `Ты — Настина лучшая подруга с жёстким, но поддерживающим сарказмом. Пиши по-русски, формат push: новый персонаж в заголовке (1-3 слова) и короткое тело с 1-2 эмодзи.
Сегодня ${context.todayHuman} и Настюше исполняется ${context.birthdayAge}. Поздравь её дерзко и тепло, будто подруга шлёт сообщение в чат. Сделай намёк на праздник, заботу о себе и её суперсилу вести цикл. Без официоза и пафоса, только живая язвительная любовь.`;
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

async function generateMessage(type, context, cache) {
  if (cache.has(type)) {
    return cache.get(type);
  }

  if (!CLAUDE_API_KEY) {
    const fallback = applyPersonaTemplate(fallbackMessages[type]);
    cache.set(type, fallback);
    return fallback;
  }

  const prompt = buildPrompt(type, context);

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
        system: 'Ты Настя — язвительная, саркастичная подруга, которая пишет на русском. Всегда отвечай СТРОГО в формате JSON: {"title": "заголовок", "body": "текст"}. Без дополнительных пояснений, только JSON.',
        messages: [
          {
            role: 'user',
            content: prompt + '\n\nВерни ответ СТРОГО в формате JSON:\n{"title": "текст заголовка", "body": "текст уведомления"}',
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

    // Claude может обернуть JSON в markdown блок
    const cleanContent = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    if (!parsed.title || !parsed.body) {
      throw new Error('Claude response missing fields');
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
  };
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

    console.log(`Current time in ${BERLIN_TZ}: ${currentBerlinTime}`);
    console.log(`Planned notification time: ${schedule.targetTime} (${BERLIN_TZ})`);

    if (berlinMinutesNow < schedule.targetMinutes) {
      console.log('Notification window not reached yet, skipping this run');
      return;
    }

    const notificationsLog = await loadNotificationsLog(username);
    const todaysNotification = getLatestNotificationForDay(notificationsLog, schedule.dayKey);
    if (todaysNotification) {
      const sentClock = formatBerlinClockFromIso(todaysNotification.sentAt);
      console.log(`Notification already sent today at ${sentClock} (${BERLIN_TZ}), skipping`);
      return;
    }

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

    if (!typeInfo) {
      console.log('No notification planned for today', {
        daysUntilPeriod: diffInDays(today, stats.nextPeriod),
        daysUntilOvulation: diffInDays(today, stats.ovulationDay),
      });
      return;
    }

    const { type, metadata } = typeInfo;
    console.log('Notification type selected:', type, metadata);
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

    let sent = 0;
    let logEntry;

    for (const subscription of subscriptionsData.subscriptions) {
      const settings = subscription.settings || {};
      const enabled = settings.enabled !== false;
      if (!enabled) {
        continue;
      }

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      const message = await generateMessage(type, context, messageCache);
      if (!logEntry) {
        logEntry = buildNotificationPayload(type, message, today);
      }

      console.log('Sending notification with context:', context);

      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        id: logEntry.id,
        type,
        sentAt: logEntry.sentAt,
      });

      try {
        await webpush.sendNotification(
          pushSubscription,
          Buffer.from(payload, 'utf-8'),
          {
            contentEncoding: 'aes128gcm'
          }
        );
        sent += 1;
        console.log(`Notification (${type}) sent to ${subscription.endpoint.slice(-20)}`);
      } catch (error) {
        const status = error?.statusCode ?? error?.status ?? 'unknown-status';
        const responseBody = error?.body ? error.body.toString() : undefined;
        console.error(`Failed to send to ${subscription.endpoint.slice(-20)}:`, error.message, status, responseBody);
      }
    }

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

main();
