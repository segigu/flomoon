import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';
import { motion } from 'framer-motion';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Mic,
  Loader2,
  RotateCcw,
  Square,
} from 'lucide-react';
import { GlassTabBar, type TabId } from './GlassTabBar';
import { DiscoverTabV2 } from './DiscoverTabV2';
import MiniCalendar from './MiniCalendar';
import { AuthModal } from './AuthModal';
import { ProfileSetupModal } from './ProfileSetupModal';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { fetchUserProfile, fetchPartner, deletePartner, updateUserLanguage } from '../utils/supabaseProfile';
import { fetchCycles, createCycle, deleteCycle as deleteSupabaseCycle, dateToISOString, isoStringToDate } from '../utils/supabaseCycles';
import {
  CycleData,
  type HoroscopeMemoryEntry,
  NastiaData,
  NotificationCategory,
  NotificationItem,
} from '../types';
import {
  formatDate,
  formatShortDate,
  isToday,
  getMonthYear,
  diffInDays,
  addDays,
} from '../utils/dateUtils';
import {
  calculateCycleStats,
  isPredictedPeriod,
  isPeriodStartDay,
  getDaysUntilNext,
  calculateFertileWindow,
  isFertileDay,
  isOvulationDay
} from '../utils/cycleUtils';
import { saveData, loadData } from '../utils/storage';
import { hasUnreadChoices, markChoicesAsRead } from '../utils/discoverTabStorage';
import CycleLengthChart from './CycleLengthChart';
import {
  registerServiceWorker,
  isNotificationSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationSettings,
  saveNotificationSettings,
  sendTestNotification,
  type NotificationSettings
} from '../utils/pushNotifications';
// saveSubscription, removeSubscription removed - cloud sync deprecated
import {
  loadLocalNotifications,
  saveLocalNotifications,
  loadReadSet,
  saveReadSet,
  clearLocalNotifications,
  markAllAsRead,
  addSingleNotification,
  type StoredNotification,
} from '../utils/notificationsStorage';
// Remote sync removed - using only Supabase now
import {
  fetchDailyHoroscope,
  fetchDailyHoroscopeForDate,
  fetchHoroscopeLoadingMessages,
  fetchSergeyBannerCopy,
  fetchSergeyLoadingMessages,
  fetchSergeyDailyHoroscopeForDate,
  mergeHoroscopeMemoryEntries,
  type DailyHoroscope,
  type HoroscopeLoadingMessage,
  type SergeyBannerCopy,
  getSergeyLoadingFallback,
} from '../utils/horoscope';
import {
  generatePeriodModalContent,
  getFallbackPeriodContent,
  type PeriodModalContent,
} from '../utils/aiContent';
import {
  getPsychContractHistorySnapshot,
  hydratePsychContractHistory,
} from '../utils/psychContractHistory';
import {
  generateInsightDescription,
  getFallbackInsightDescription,
  getRandomLoadingPhrase,
  type InsightDescription,
} from '../utils/insightContent';
import {
  generateHistoryStoryChunk,
  generateCustomHistoryOption,
  type HistoryStoryMeta,
  type HistoryStoryOption,
  clearPsychContractContext,
} from '../utils/historyStory';
import { transcribeAudioBlob } from '../utils/audioTranscription';
import {
  generatePersonalizedPlanetMessages,
  type PersonalizedPlanetMessages,
  calculateTypingDuration,
  calculatePauseBefore,
  calculatePauseAfter,
} from '../utils/planetMessages';
import { getDisplayName } from '../utils/transliteration';
import styles from './NastiaApp.module.css';

const ENV_CLAUDE_KEY = (process.env.REACT_APP_CLAUDE_API_KEY ?? '').trim();
const ENV_CLAUDE_PROXY = (process.env.REACT_APP_CLAUDE_PROXY_URL ?? '').trim();
const ENV_OPENAI_KEY = (process.env.REACT_APP_OPENAI_API_KEY ?? '').trim();
const ENV_OPENAI_PROXY = (process.env.REACT_APP_OPENAI_PROXY_URL ?? '').trim();

const PRIMARY_USER_NAME = 'Настя';
const MAX_STORED_NOTIFICATIONS = 200;
const HOROSCOPE_MEMORY_LIMIT = 12;
const STORY_ARC_LIMIT = 6;

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const pluralizeDays = (value: number): string => {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;
  if (abs >= 11 && abs <= 14) {
    return 'дней';
  }
  if (last === 1) {
    return 'день';
  }
  if (last >= 2 && last <= 4) {
    return 'дня';
  }
  return 'дней';
};

const normalizeDate = (input: Date): Date => {
  const normalized = new Date(input);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const formatDayCount = (value: number): string => `${value} ${pluralizeDays(value)}`;

const buildPeriodTimingContext = (targetDate: Date, cycles: CycleData[]): string | null => {
  if (!targetDate) {
    return null;
  }

  const normalizedCycles: CycleData[] = [];

  for (const cycle of cycles) {
    if (!cycle?.startDate) {
      continue;
    }
    const start = new Date(cycle.startDate);
    if (Number.isNaN(start.getTime())) {
      continue;
    }
    normalizedCycles.push({
      ...cycle,
      startDate: start,
      endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
    });
  }

  if (!normalizedCycles.length) {
    return 'История циклов пустая, так что просто скажи, что фиксируете дату и наблюдаете за организмом.';
  }

  const stats = calculateCycleStats(normalizedCycles);
  const averageLength = stats.averageLength6Months || stats.averageLength;

  const summaryLines: string[] = [];

  if (averageLength) {
    summaryLines.push(`Средний цикл по журналу: около ${averageLength} ${pluralizeDays(averageLength)}.`);
  }

  if (stats.lastCycleLength) {
    summaryLines.push(`Прошлый цикл длился ${stats.lastCycleLength} ${pluralizeDays(stats.lastCycleLength)}.`);
  }

  if (stats.predictionConfidence) {
    summaryLines.push(`Уверенность прогноза: около ${stats.predictionConfidence}%.`);
  }

  const normalizedTarget = normalizeDate(targetDate);

  let predictedDiffDays: number | null = null;

  if (stats.nextPrediction instanceof Date && !Number.isNaN(stats.nextPrediction.getTime())) {
    const predicted = normalizeDate(stats.nextPrediction);
    predictedDiffDays = Math.round((normalizedTarget.getTime() - predicted.getTime()) / MS_IN_DAY);

    const diffPhrase =
      predictedDiffDays === 0
        ? 'совпадает с прогнозом'
        : predictedDiffDays > 0
          ? `опаздывает на ${formatDayCount(predictedDiffDays)}`
          : `пришла раньше на ${formatDayCount(Math.abs(predictedDiffDays))}`;

    summaryLines.push(`Прогноз ждал старт ${formatDate(predicted)}, факт ${diffPhrase}.`);
  } else {
    summaryLines.push('Прогноз по дате пока ненадёжный — данных мало.');
  }

  let ovulationDiffDays: number | null = null;

  if (stats.nextPrediction instanceof Date && !Number.isNaN(stats.nextPrediction.getTime())) {
    const ovulationEstimate = normalizeDate(addDays(stats.nextPrediction, -14));
    ovulationDiffDays = Math.round((normalizedTarget.getTime() - ovulationEstimate.getTime()) / MS_IN_DAY);

    if (ovulationDiffDays === 0) {
      summaryLines.push('Расчётная овуляция должна быть прямо сегодня — для менструации это крайне рано.');
    } else if (ovulationDiffDays < 0) {
      summaryLines.push(`По расчётам до овуляции ещё ${formatDayCount(Math.abs(ovulationDiffDays))} — организм резко ускорился.`);
    } else {
      const baseLine = `С расчётной овуляции прошло ${formatDayCount(ovulationDiffDays)}.`;
      if (ovulationDiffDays < 12) {
        summaryLines.push(`${baseLine} Это короче типичной лютеиновой фазы — тело явно торопится.`);
      } else if (ovulationDiffDays > 18) {
        summaryLines.push(`${baseLine} Это дольше обычного ожидания — можно подколоть организм за затяжку.`);
      } else {
        summaryLines.push(`${baseLine} Это вписывается в привычные 12–16 дней.`);
      }
    }
  }

  let directive: string;

  if (predictedDiffDays == null) {
    directive = 'Статистики мало — поддержи Настю, подбодри и предложи продолжать наблюдение.';
  } else if (predictedDiffDays === 0) {
    directive = 'Подчеркни, что организм отработал по расписанию и можно язвительно гордиться пунктуальностью.';
  } else if (predictedDiffDays > 0) {
    const delayText = formatDayCount(predictedDiffDays);
    directive =
      predictedDiffDays <= 2
        ? `Отметь, что месячные припозднились на ${delayText} — поддержи и намекни на стресс или недосып.`
        : `Подколи тело за задержку на ${delayText} и мягко предложи понаблюдать или обсудить с врачом, если такое повторяется.`;
  } else {
    const earlyDays = Math.abs(predictedDiffDays);
    const earlyText = formatDayCount(earlyDays);
    directive =
      earlyDays <= 2
        ? `Подметь, что цикл стартовал на ${earlyText} раньше и организм не стал ждать пикового ПМС.`
        : `Скажи, что месячные пришли слишком рано (на ${earlyText}) — саркастично попроси перепроверить дату и прислушаться к самочувствию.`;
  }

  if (ovulationDiffDays != null) {
    if (ovulationDiffDays <= 1) {
      directive =
        'По расчётам овуляция ещё совсем рядом, так что начало цикла выглядит подозрительно ранним — язвительно попроси Настю перепроверить дату и исключить ложную тревогу.';
    } else if (ovulationDiffDays < 10) {
      directive += ` Упомяни, что лютеиновая фаза вышла короткой (${formatDayCount(ovulationDiffDays)}) — посоветуй поберечь себя и наблюдать.`;
    } else if (ovulationDiffDays > 18) {
      directive += ` Добавь, что ожидание после овуляции растянулось на ${formatDayCount(ovulationDiffDays)} — подшути над организмом, который тянул до последнего.`;
    }
  }

  return `${summaryLines.join('\n')}\nРекомендация рассказчице: ${directive}`.trim();
};

function getDefaultLoadingMessages(language: string): HoroscopeLoadingMessage[] {
  if (language === 'en') {
    return [
      { emoji: '☎️', text: 'Calling Mars — checking who\'s in charge of your drive today.' },
      { emoji: '💌', text: 'Sending a letter through Venus — waiting to see what sweetens the day.' },
      { emoji: '🛰️', text: 'Catching Jupiter\'s signal — maybe a luck bonus will arrive.' },
      { emoji: '☕️', text: 'Saturn\'s finishing coffee and writing the obligations list — bear with it.' },
      { emoji: '🧹', text: 'Pluto\'s tidying up the subconscious, clearing the piles of worries.' },
      { emoji: '🌕', text: 'Moon\'s trying on moods, picking the perfect drama level.' },
    ];
  }

  if (language === 'de') {
    return [
      { emoji: '☎️', text: 'Rufen Mars an — fragen, wer heute deinen Antrieb leitet.' },
      { emoji: '💌', text: 'Schicken Brief durch Venus — warten, womit sie den Tag versüßt.' },
      { emoji: '🛰️', text: 'Empfangen Signal von Jupiter — vielleicht kommt Glücksbonus an.' },
      { emoji: '☕️', text: 'Saturn trinkt Kaffee aus und schreibt Pflichtenliste — ertragen wir\'s.' },
      { emoji: '🧹', text: 'Pluto räumt Unterbewusstsein auf, beseitigt Sorgen-Haufen.' },
      { emoji: '🌕', text: 'Mond probiert Stimmungen an, wählt perfekten Drama-Grad.' },
    ];
  }

  // Russian (default)
  return [
    { emoji: '☎️', text: 'Звоним Марсу — уточняем, кто сегодня заведует твоим драйвом.' },
    { emoji: '💌', text: 'Через Венеру шлём письмо — ждём, чем она подсластит день.' },
    { emoji: '🛰️', text: 'Ловим сигнал от Юпитера — вдруг прилетит бонус удачи.' },
    { emoji: '☕️', text: 'Сатурн допивает кофе и пишет список обязанностей — терпим.' },
    { emoji: '🧹', text: 'Плутон наводит порядок в подсознании, разгребает завалы тревог.' },
    { emoji: '🌕', text: 'Луна примеряет настроение, подбирает идеальный градус драмы.' },
  ];
}


interface StoryAuthor {
  id: string;
  name: string;
  prompt: string;
  genre: string;
}

const STORY_AUTHORS: StoryAuthor[] = [
  {
    id: 'globa-mystic',
    name: 'Павел Глоба',
    genre: 'мистика',
    prompt: 'Смешивай бытовые детали и тревожную странность, наращивай тихое напряжение без громких эффектов. Фразы должны быть короткими, прямыми и чуть холодными.',
  },
  {
    id: 'shestopalov-thriller',
    name: 'Сергей Шестопалов',
    genre: 'триллер',
    prompt: 'Строй сцену как кинематографичный саспенс: густой воздух, навязчивые детали, ощущение, что за углом кто-то дышит. Держи кадр чётким и чувственным.',
  },
  {
    id: 'levina-psy',
    name: 'Светлана Левина',
    genre: 'психологическая драма',
    prompt: 'Показывай внутреннюю трансформацию через диалог с миром; философский тон держи мягким, но конкретные детали тела и пространства делай ощутимыми.',
  },
  {
    id: 'volguine-stream',
    name: 'Александр Волгин',
    genre: 'психологическая драма',
    prompt: 'Веди поток сознания плавно, через дыхание, свет и крошечные жесты. Детали должны цепляться друг за друга, создавая ощущение хрупкого равновесия.',
  },
  {
    id: 'zhuravel-dystopia',
    name: 'Олеся Журавель',
    genre: 'антиутопия',
    prompt: 'Соединяй иронию и холодную аналитику; показывай, как тело и быт реагируют на систему. Делай язык точным, с лёгким сарказмом.',
  },
  {
    id: 'kopaev-intense',
    name: 'Константин Дараган',
    genre: 'психологическая драма',
    prompt: 'Пиши с пронзительной интимностью: контраст между хрупкостью и яростью, телесные детали и откровенный внутренний монолог.',
  },
  {
    id: 'zaharov-introspective',
    name: 'Михаил Захаров',
    genre: 'психологическая драма',
    prompt: 'Исследуй внутренний монолог, задавай острые вопросы к себе, соединяй абстракцию и конкретные вещи, оставляя лёгкую загадку.',
  },
  {
    id: 'kopaev-gothic',
    name: 'Денис Куталёв',
    genre: 'мистика',
    prompt: 'Сочетай чувственность и готическую мрачность: шелк, кровь, свечи, мрамор. Пусть темнота будет соблазнительной и тягучей.',
  },
  {
    id: 'safonova-thriller',
    name: 'Вероника Сафонова',
    genre: 'триллер',
    prompt: 'Строй сцену как расследование: тихо, точно, с вниманием к запахам и фактам. Держи напряжение в каждом наблюдении.',
  },
  {
    id: 'geraskina-romance',
    name: 'Елена Герасимова',
    genre: 'роман',
    prompt: 'Подчёркивай социальные нюансы и внутренние сомнения. Лёгкая ирония, чёткие детали быта и эмоций, никаких лишних украшений.',
  },
];

// Саркастические фразы для начального экрана истории
const HISTORY_START_PROMPTS = [
  'Давай проверим, насколько ты правдива с собой сегодня',
  'Готова разобрать себя на части? Звёзды уже наточили скальпель',
  'Что если астрология знает о тебе больше, чем ты думаешь?',
  'Твоя карта готова рассказать правду — ты?',
  'Проверь себя на честность, пока никто не видит',
  'Узнаем, где ты врёшь себе сегодня',
  'Твоя тень хочет поговорить. Впустишь?',
  'Давай посмотрим, что прячешь даже от себя',
  'Готова услышать то, что знают планеты?',
  'Пора разобраться, кто ты на самом деле',
  'Проверь, где твои маски начинают трещать',
  'Давай найдём твою слабую точку',
  'Готова к честному разговору с собой?',
  'Узнаем, что карта нашёптывает о тебе',
  'Проверим, где ты играешь роль',
  'Давай посмотрим на тебя без фильтров',
  'Готова признать, что не всё под контролем?',
  'Узнаем, где прячется твой внутренний конфликт',
  'Пора взглянуть в зеркало, которое не врёт',
  'Проверь себя — вдруг что-то забыла про себя',
  'Давай найдём, где ты сама себе врёшь',
  'Готова к неудобной правде?',
  'Узнаем, что прячется за твоими привычками',
  'Проверим твои внутренние противоречия',
  'Давай посмотрим, где ты не такая, как думаешь',
  'Готова увидеть себя глазами звёзд?',
  'Узнаем, где ты притворяешься',
  'Проверь, насколько хорошо знаешь себя',
  'Давай найдём твои скрытые паттерны',
  'Готова к встрече с собой настоящей?',
];

// Названия кнопок для начального экрана
const HISTORY_START_BUTTONS = [
  'Начать историю',
  'Проверить себя',
  'Узнать правду',
  'Начать разбор',
  'Погнали',
  'Давай',
  'Покажи',
  'Начнём',
  'Валяй',
  'Попробуем',
  'Посмотрим',
  'Начать',
  'Вперёд',
  'Поехали',
  'Ну давай',
  'Запускай',
  'Включай',
  'Жду',
  'Готова',
  'Интересно',
  'Ладно',
  'Начать тест',
  'Проверим',
  'Узнать',
  'Открыть',
  'Посмотреть',
  'Начать путь',
  'Погрузиться',
  'Раскрыть',
  'Исследовать',
];

// Описания для начального экрана истории (что будет дальше)
const HISTORY_START_DESCRIPTIONS = [
  'Я создам для тебя персональную историю, в которой ты будешь делать выборы. А потом разберу каждое твоё решение по косточкам — покажу, где ты действуешь согласно своей природе, а где пытаешься казаться не той, кто ты есть',
  'Тебя ждёт интерактивная история с выборами. В конце я проанализирую твои решения и скажу, где ты была честна с собой, а где играла роль',
  'Пройдёшь через историю с развилками. Я буду следить за твоими выборами, а потом расскажу, что они говорят о тебе — включая то, что ты предпочла бы не слышать',
  'Я построю для тебя сюжет с несколькими ключевыми точками выбора. А в финале разберу, какие решения были настоящими, а какие — социально правильными',
  'Впереди короткая история, где ты принимаешь решения. Потом я покажу, где твои выборы совпадают с натальной картой, а где ты врала себе',
  'Сейчас ты попадёшь в ситуацию с выборами. Я запомню каждое решение, а потом объясню, что из этого правда твоё, а что — маска',
  'Ты пройдёшь через сценарий с развилками. В конце я сравню твои выборы с астрологическим профилем и скажу, где ты притворялась',
  'Персональная история на основе твоей карты. Ты делаешь выборы, я их записываю. А потом разбираю: где природа, где игра на публику',
  'Я запущу для тебя интерактивный сюжет. Твоя задача — принимать решения. Моя — потом рассказать, какие из них были честными, а какие нет',
  'Пройди историю с точками выбора, а я в конце объясню, где ты вела себя как обычно, а где пыталась выглядеть правильно',
];


const DEFAULT_SERGEY_BANNER_COPY: SergeyBannerCopy = {
  title: 'А что там у Сережи?',
  subtitle: 'Серёжа опять что-то мудрит. Подглянем, что ему сулят звёзды на сегодня?',
  primaryButton: 'Посмотреть гороскоп',
  secondaryButton: 'Мне пофиг',
};

type HistoryStorySegmentKind = 'arc' | 'finale';

interface HistoryStorySegment {
  id: string;
  kind: HistoryStorySegmentKind;
  arcNumber?: number;
  stageLabel?: string;
  text: string;
  authorId: string;
  authorName: string;
  option?: HistoryStoryOption;
  choices?: HistoryStoryOption[];
  selectedOptionId?: string;
  timestamp: string; // ISO timestamp
}

type HistoryCustomOptionStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'generating'
  | 'ready'
  | 'error';

interface HistoryCustomOptionState {
  status: HistoryCustomOptionStatus;
  option: HistoryStoryOption | null;
  transcript?: string;
  error?: string;
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationCategory, string> = {
  fertile_window: 'Фертильное окно',
  ovulation_day: 'День овуляции',
  period_forecast: 'Прогноз менструации',
  period_start: 'День менструации',
  period_check: 'Проверка начала менструации',
  period_waiting: 'Ожидание менструации',
  period_delay_warning: 'Возможная задержка',
  period_confirmed_day0: 'Менструация началась',
  period_confirmed_day1: 'Менструация — поддержка',
  period_confirmed_day2: 'Менструация — поддержка',
  birthday: 'День рождения',
  morning_brief: 'Гороскоп',
  generic: 'Напоминание',
};

const ModernNastiaApp: React.FC = () => {
  const { t, i18n } = useTranslation('calendar');

  // App versioning for cache invalidation
  const APP_VERSION = packageJson.version;
  const VERSION_KEY = 'flomoon-app-version';

  // 🚧 Флаг для постепенной миграции на ChatManager
  const USE_NEW_CHAT_MANAGER = false; // TODO: включить после переноса всей логики

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [horoscopeMemory, setHoroscopeMemory] = useState<HoroscopeMemoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('calendar');
  const [showSettings, setShowSettings] = useState(false);
  const [hasNewStoryMessage, setHasNewStoryMessage] = useState(false); // Флаг для badge "Узнай себя"
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSetupMode, setProfileSetupMode] = useState<'setup' | 'edit'>('setup');
  const [authChecked, setAuthChecked] = useState(false); // Флаг проверки сессии
  const [userProfile, setUserProfile] = useState<any>(null); // Профиль из БД
  const [userPartner, setUserPartner] = useState<any>(null); // Партнёр из БД

  // AI credentials - используем только ENV переменные (без remote cloud sync)
  const effectiveClaudeKey = useMemo(() => {
    return ENV_CLAUDE_KEY.length > 0 ? ENV_CLAUDE_KEY : undefined;
  }, []);

  const effectiveClaudeProxyUrl = useMemo(() => {
    return ENV_CLAUDE_PROXY.length > 0 ? ENV_CLAUDE_PROXY : undefined;
  }, []);

  const effectiveOpenAIKey = useMemo(() => {
    return ENV_OPENAI_KEY.length > 0 ? ENV_OPENAI_KEY : undefined;
  }, []);

  const effectiveOpenAIProxyUrl = useMemo(() => {
    return ENV_OPENAI_PROXY.length > 0 ? ENV_OPENAI_PROXY : undefined;
  }, []);

  const hasAiCredentials = useMemo(() => {
    return Boolean(effectiveClaudeKey || effectiveClaudeProxyUrl || effectiveOpenAIKey || effectiveOpenAIProxyUrl);
  }, [effectiveClaudeKey, effectiveClaudeProxyUrl, effectiveOpenAIKey, effectiveOpenAIProxyUrl]);
  const [periodContent, setPeriodContent] = useState<PeriodModalContent | null>(null);
  const [periodContentStatus, setPeriodContentStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [periodContentError, setPeriodContentError] = useState<string | null>(null);
  const [periodHoroscope, setPeriodHoroscope] = useState<DailyHoroscope | null>(null);
  const [periodHoroscopeStatus, setPeriodHoroscopeStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [horoscopeVisible, setHoroscopeVisible] = useState(false);
  const [showDailyHoroscopeModal, setShowDailyHoroscopeModal] = useState(false);
  const [dailyHoroscope, setDailyHoroscope] = useState<DailyHoroscope | null>(null);
  const [dailyHoroscopeStatus, setDailyHoroscopeStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [dailyHoroscopeError, setDailyHoroscopeError] = useState<string | null>(null);
  const [dailyLoadingMessages, setDailyLoadingMessages] = useState<HoroscopeLoadingMessage[]>([]);
  const [dailyLoadingIndex, setDailyLoadingIndex] = useState(0);
  const [sergeyBannerDismissed, setSergeyBannerDismissed] = useState(false);
  const [sergeyHoroscope, setSergeyHoroscope] = useState<DailyHoroscope | null>(null);
  const [sergeyHoroscopeStatus, setSergeyHoroscopeStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [sergeyHoroscopeError, setSergeyHoroscopeError] = useState<string | null>(null);
  const initialSergeyLoadingMessages = useMemo(() => getSergeyLoadingFallback(), []);
  const [sergeyLoadingIndex, setSergeyLoadingIndex] = useState(0);
  const [sergeyLoadingMessages, setSergeyLoadingMessages] = useState<HoroscopeLoadingMessage[]>(initialSergeyLoadingMessages);
  const [sergeyLoadingMaxHeight, setSergeyLoadingMaxHeight] = useState<number | null>(null);
  const [sergeyBannerCopy, setSergeyBannerCopy] = useState<SergeyBannerCopy | null>(null);
  const [sergeyBannerCopyStatus, setSergeyBannerCopyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [, setSergeyBannerCopyError] = useState<string | null>(null);
  const [showQuestionBubble, setShowQuestionBubble] = useState(false);
  const [showJokeBubble, setShowJokeBubble] = useState(false);

  // Состояние для раскрывающихся описаний инсайтов
  type InsightType = 'cycle-length' | 'next-period' | 'fertile-window' | 'trend';
  const [expandedInsights, setExpandedInsights] = useState<Set<InsightType>>(new Set());
  const [insightDescriptions, setInsightDescriptions] = useState<Record<InsightType, InsightDescription | null>>({
    'cycle-length': null,
    'next-period': null,
    'fertile-window': null,
    'trend': null,
  });
  const [insightLoadingStates, setInsightLoadingStates] = useState<Record<InsightType, boolean>>({
    'cycle-length': false,
    'next-period': false,
    'fertile-window': false,
    'trend': false,
  });
  const [insightStyleMode, setInsightStyleMode] = useState<Record<InsightType, 'scientific' | 'human'>>({
    'cycle-length': 'scientific',
    'next-period': 'scientific',
    'fertile-window': 'scientific',
    'trend': 'scientific',
  });
  const [insightLoadingPhrases, setInsightLoadingPhrases] = useState<Record<InsightType, { emoji: string; text: string } | null>>({
    'cycle-length': null,
    'next-period': null,
    'fertile-window': null,
    'trend': null,
  });
  const insightControllersRef = useRef<Record<InsightType, AbortController | null>>({
    'cycle-length': null,
    'next-period': null,
    'fertile-window': null,
    'trend': null,
  });

  // Состояние для уведомлений
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<StoredNotification[]>(() =>
    loadLocalNotifications()
      .map(notification => ({ ...notification, read: Boolean(notification.read) }))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
  );
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const storedSet = loadReadSet();
    if (storedSet.size === 0) {
      const locallyStored = loadLocalNotifications();
      for (const entry of locallyStored) {
        if (entry.read) {
          storedSet.add(entry.id);
        }
      }
    }
    return storedSet;
  });
  const [visibleNotificationIds, setVisibleNotificationIds] = useState<string[]>([]);
  const [visibleCycleIds, setVisibleCycleIds] = useState<string[]>([]);
  const [visibleCalendarElements, setVisibleCalendarElements] = useState<string[]>([]);
  const [visibleDiscoverElements, setVisibleDiscoverElements] = useState<string[]>([]);
  const [historyStoryAuthor, setHistoryStoryAuthor] = useState<StoryAuthor>(() => {
    const index = Math.floor(Math.random() * STORY_AUTHORS.length);
    return STORY_AUTHORS[index];
  });
  const [historyStoryAwaitingKeys, setHistoryStoryAwaitingKeys] = useState(false);
  const [historyStoryMenuOpen, setHistoryStoryMenuOpen] = useState(false);
  const [historyStorySegments, setHistoryStorySegments] = useState<HistoryStorySegment[]>([]);
  const historyStorySegmentsRef = useRef<HistoryStorySegment[]>([]);
  const historyStorySummaryRef = useRef('');
  const [historyStoryMeta, setHistoryStoryMeta] = useState<HistoryStoryMeta | null>(null);
  const historyStoryMetaRef = useRef<HistoryStoryMeta | null>(null);
  const [historyStoryOptions, setHistoryStoryOptions] = useState<HistoryStoryOption[]>([]);
  const [historyCustomOption, setHistoryCustomOption] = useState<HistoryCustomOptionState>({
    status: 'idle',
    option: null,
    transcript: undefined,
    error: undefined,
  });
  const [historyCustomRecordingLevel, setHistoryCustomRecordingLevel] = useState(0);
  const [historyStoryLoading, setHistoryStoryLoading] = useState(false);
  const [historyStoryError, setHistoryStoryError] = useState<string | null>(null);
  const [historyStoryMode, setHistoryStoryMode] = useState<'story' | 'cycles'>('story');
  const [historyStoryTyping, setHistoryStoryTyping] = useState(false);
  const [historyStoryPhase, setHistoryStoryPhase] = useState<'idle' | 'generating' | 'clearing' | 'ready'>('idle');
  const [historyStartPrompt, setHistoryStartPrompt] = useState('');
  const [historyStartButton, setHistoryStartButton] = useState('');
  const [historyStartDescription, setHistoryStartDescription] = useState('');

  // Новые состояния для чат-интерфейса генерации
  const [planetChatMessages, setPlanetChatMessages] = useState<Array<{ planet: string; message: string; id: string; time: string; isSystem?: boolean }>>([]);
  const [currentTypingPlanet, setCurrentTypingPlanet] = useState<string | null>(null);
  const currentTypingPlanetRef = useRef<string | null>(null); // Ref для синхронного доступа
  const planetMessagesTimeoutRef = useRef<number[]>([]);
  const [planetMessagesClearing, setPlanetMessagesClearing] = useState(false);
  const planetMessagesGenerationStartedRef = useRef(false);

  // Персонализированные сообщения от планет на основе натальной карты
  const [personalizedPlanetMessages, setPersonalizedPlanetMessages] = useState<PersonalizedPlanetMessages | null>(null);
  const personalizedPlanetMessagesRef = useRef<PersonalizedPlanetMessages | null>(null);
  const [isLoadingPersonalizedMessages, setIsLoadingPersonalizedMessages] = useState(false);
  const isLoadingPersonalizedMessagesRef = useRef(false);
  const personalizedMessagesAbortControllerRef = useRef<AbortController | null>(null);
  const [historyButtonsHiding, setHistoryButtonsHiding] = useState(false);
  const [visibleButtonsCount, setVisibleButtonsCount] = useState(0);
  const [historyStoryFinalSummary, setHistoryStoryFinalSummary] = useState<{ human: string; astrological: string } | null>(null);
  const [finaleInterpretationMode, setFinaleInterpretationMode] = useState<'human' | 'astrological'>('human');
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null);
  const historyStoryPendingOptionsRef = useRef<HistoryStoryOption[] | null>(null);
  const [introMessagesVisible, setIntroMessagesVisible] = useState<number>(0); // 0-4 для показа интро-сообщений
  const [introTyping, setIntroTyping] = useState<boolean>(false);
  const introAnimationTimeoutsRef = useRef<number[]>([]);
  const buttonAnimationTimeoutsRef = useRef<number[]>([]);
  const historyStoryPendingChoiceRef = useRef<HistoryStoryOption | undefined>(undefined);
  const historyStoryMenuRef = useRef<HTMLDivElement | null>(null);
  const historyStoryMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const historyStoryTypingTimeoutRef = useRef<number | null>(null);
  const historyStoryFetchControllerRef = useRef<AbortController | null>(null);
  const historyCustomOptionAbortRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array | null>(null);
  const recordingAnimationFrameRef = useRef<number | null>(null);
  const historyMessagesRef = useRef<HTMLDivElement | null>(null);
  const historyScrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const historyScrollTimeoutRef = useRef<number | null>(null);
  const historyScrollContainerRef = useRef<HTMLElement | null>(null);
  const moonScrollPerformedRef = useRef(false);
  const clearHistoryStoryTypingTimer = useCallback(() => {
    if (historyStoryTypingTimeoutRef.current !== null) {
      window.clearTimeout(historyStoryTypingTimeoutRef.current);
      historyStoryTypingTimeoutRef.current = null;
    }
  }, []);

  const abortHistoryStoryRequest = useCallback(() => {
    if (historyStoryFetchControllerRef.current) {
      historyStoryFetchControllerRef.current.abort();
      historyStoryFetchControllerRef.current = null;
    }
  }, []);

  const clearButtonAnimationTimers = useCallback(() => {
    buttonAnimationTimeoutsRef.current.forEach(id => window.clearTimeout(id));
    buttonAnimationTimeoutsRef.current = [];
  }, []);

  const clearIntroAnimationTimers = useCallback(() => {
    introAnimationTimeoutsRef.current.forEach(id => window.clearTimeout(id));
    introAnimationTimeoutsRef.current = [];
  }, []);

  const stopGenerationAnimation = useCallback(() => {
    // Очищаем все таймеры планет
    planetMessagesTimeoutRef.current.forEach(timer => window.clearTimeout(timer));
    planetMessagesTimeoutRef.current = [];
  }, []);

  // Функция ожидания завершения печати планеты
  const waitForTypingComplete = useCallback((callback: () => void, maxWaitMs = 5000) => {
    const startTime = Date.now();
    const checkInterval = 100; // Проверяем каждые 100ms

    const check = () => {
      const elapsed = Date.now() - startTime;

      // Если планета закончила печатать или превышено максимальное время ожидания
      if (currentTypingPlanetRef.current === null || elapsed >= maxWaitMs) {
        if (elapsed >= maxWaitMs && currentTypingPlanetRef.current !== null) {
          console.warn('[WaitForTyping] Timeout waiting for planet typing to complete');
        } else {
          console.log('[WaitForTyping] Planet typing complete, proceeding');
        }
        callback();
      } else {
        // Планета еще печатает, проверяем снова через интервал
        console.log('[WaitForTyping] Planet still typing:', currentTypingPlanetRef.current);
        setTimeout(check, checkInterval);
      }
    };

    check();
  }, []);

  const resetHistoryStoryState = useCallback(() => {
    abortHistoryStoryRequest();
    clearHistoryStoryTypingTimer();
    clearButtonAnimationTimers();
    clearIntroAnimationTimers();

    // Останавливаем анимацию генерации
    stopGenerationAnimation();
    setPlanetChatMessages([]);
    setPlanetMessagesClearing(false);
    planetMessagesGenerationStartedRef.current = false;

    clearPsychContractContext();
    historyStoryPendingOptionsRef.current = null;
    historyStoryPendingChoiceRef.current = undefined;
    historyStorySegmentsRef.current = [];
    historyStorySummaryRef.current = '';
    historyStoryMetaRef.current = null;
    moonScrollPerformedRef.current = false;
    if (historyCustomOptionAbortRef.current) {
      historyCustomOptionAbortRef.current.abort();
      historyCustomOptionAbortRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('[HistoryStory] Failed to stop media track', error);
        }
      });
      mediaStreamRef.current = null;
    }
    if (recordingAnimationFrameRef.current !== null) {
      cancelAnimationFrame(recordingAnimationFrameRef.current);
      recordingAnimationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      audioAnalyserRef.current = null;
      analyserDataRef.current = null;
      void context.close().catch(error => {
        console.warn('[HistoryStory] Failed to close audio context', error);
      });
    } else {
      audioAnalyserRef.current = null;
      analyserDataRef.current = null;
    }
    audioChunksRef.current = [];
    setHistoryCustomRecordingLevel(0);
    setHistoryStorySegments([]);
    setHistoryStoryOptions([]);
    setHistoryCustomOption({
      status: 'idle',
      option: null,
      transcript: undefined,
      error: undefined,
    });
    setHistoryStoryMeta(null);
    setHistoryStoryFinalSummary(null);
    setHistoryStoryError(null);
    setHistoryStoryLoading(false);
    setHistoryStoryTyping(false);
    setHistoryStoryMode('story');
    setHistoryStoryMenuOpen(false);
    setVisibleButtonsCount(0);
    setHistoryStoryPhase('idle');
    setIntroMessagesVisible(0);
    setIntroTyping(false);
    historyScrollContainerRef.current = null;
  }, [
    abortHistoryStoryRequest,
    clearHistoryStoryTypingTimer,
    clearButtonAnimationTimers,
    clearIntroAnimationTimers,
    stopGenerationAnimation,
  ]);

  const startTypingHistorySegment = useCallback((segment: HistoryStorySegment) => {
    clearHistoryStoryTypingTimer();
    const chunk = segment.text;

    if (!chunk) {
      setHistoryStoryTyping(false);
      const pending = historyStoryPendingOptionsRef.current;
      if (pending) {
        setHistoryStoryOptions(pending);
        historyStoryPendingOptionsRef.current = null;
      }
      return;
    }

    // Показываем индикатор "печатает..."
    setHistoryStoryTyping(true);
    setHistoryStoryOptions([]);

    // Вычисляем время показа индикатора на основе длины текста (минимум 1с, максимум 3с)
    const typingDuration = Math.min(Math.max(chunk.length * 15, 1000), 3000);

    // После задержки показываем сообщение целиком
    historyStoryTypingTimeoutRef.current = window.setTimeout(() => {
      setHistoryStoryTyping(false);
      setHistoryStorySegments(prev => {
        const updated = [...prev, segment];
        historyStorySegmentsRef.current = updated;
        return updated;
      });
      const pending = historyStoryPendingOptionsRef.current;
      if (pending) {
        setHistoryStoryOptions(pending);
        historyStoryPendingOptionsRef.current = null;
      }
    }, typingDuration);
  }, [clearHistoryStoryTypingTimer]);

  const updateHistoryStorySummary = useCallback((segments: HistoryStorySegment[]) => {
    const CONTEXT_SEGMENTS = 4;
    const arcSegments = segments.filter(segment => segment.kind === 'arc');

    if (arcSegments.length <= CONTEXT_SEGMENTS) {
      historyStorySummaryRef.current = '';
      return;
    }

    const older = arcSegments.slice(0, arcSegments.length - CONTEXT_SEGMENTS);
    const summaryChunks = older.map((segment, index) => {
      const prefix = index + 1;
      return `${prefix}. ${segment.authorName}: ${segment.text}`;
    });

    let summary = summaryChunks.join(' ');
    summary = summary.replace(/\s+/g, ' ').trim();

    if (summary.length > 420) {
      summary = `${summary.slice(0, 420).trimEnd()}…`;
    }

    historyStorySummaryRef.current = `Сжатая сводка предыдущих событий: ${summary}`;
  }, []);

  const fetchHistoryStoryChunk = useCallback(
    async (choice?: HistoryStoryOption, authorOverride?: StoryAuthor) => {
      if (!hasAiCredentials) {
        setHistoryStoryLoading(false);
        if (!historyStoryAwaitingKeys) {
          setHistoryStoryAwaitingKeys(true);
        }
        historyStoryPendingChoiceRef.current = choice;
        return;
      }

      abortHistoryStoryRequest();

      const controller = new AbortController();
      historyStoryFetchControllerRef.current = controller;

      setHistoryStoryLoading(true);
      setHistoryStoryError(null);
      historyStoryPendingChoiceRef.current = choice;

      try {
        const activeAuthor = authorOverride ?? historyStoryAuthor;
        if (!activeAuthor) {
          throw new Error('History story author is not available');
        }

        const arcSegments = historyStorySegmentsRef.current.filter(segment => segment.kind === 'arc');
        const recentSegments = arcSegments.slice(-4);
        const response = await generateHistoryStoryChunk({
          segments: recentSegments.map((segment, index) => ({
            text: segment.text,
            arc: segment.arcNumber ?? arcSegments.length - recentSegments.length + index + 1,
            optionTitle: segment.option?.title,
            optionDescription: segment.option?.description,
            optionTranscript: segment.option?.transcript,
            optionKind: segment.option?.kind,
          })),
          currentChoice: choice,
          summary: historyStorySummaryRef.current || undefined,
          author: {
            name: activeAuthor.name,
            stylePrompt: activeAuthor.prompt,
            genre: activeAuthor.genre,
          },
          arcLimit: STORY_ARC_LIMIT,
          mode: 'arc',
          currentArc: arcSegments.length + 1,
          contract: historyStoryMetaRef.current?.contract,
          signal: controller.signal,
          claudeApiKey: effectiveClaudeKey,
          claudeProxyUrl: effectiveClaudeProxyUrl,
          openAIApiKey: effectiveOpenAIKey,
          openAIProxyUrl: effectiveOpenAIProxyUrl,
          language: i18n.language,
          userProfile,
          userPartner,
        });

        if (controller.signal.aborted) {
          return;
        }

        if (response.meta) {
          setHistoryStoryMeta(response.meta);
          historyStoryMetaRef.current = response.meta;
        }

        // Останавливаем анимацию генерации
        stopGenerationAnimation();

        // Ждем, пока планета закончит печатать, перед переходом в 'clearing'
        // Это предотвращает преждевременное переключение на Луну
        waitForTypingComplete(() => {
          console.log('[HistoryStory] Planet typing complete, transitioning to clearing phase');
          setHistoryStoryPhase('clearing');
        });

        const newSegment: HistoryStorySegment = {
          id: `segment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          kind: 'arc',
          arcNumber: response.node?.arc ?? arcSegments.length + 1,
          stageLabel: response.node?.stage,
          text: response.node?.scene ?? '',
          authorId: activeAuthor.id,
          authorName: activeAuthor.name,
          option: choice,
          choices: response.options,
          timestamp: new Date().toISOString(),
        };

        historyStoryPendingOptionsRef.current = response.options;
        startTypingHistorySegment(newSegment);
        historyStoryPendingChoiceRef.current = undefined;
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to generate history story chunk', error);
        setHistoryStoryError('Не удалось придумать продолжение. Попробуй ещё раз.');
        historyStoryPendingOptionsRef.current = null;
        setHistoryStoryOptions([]);
        setHistoryStoryTyping(false);
      } finally {
        if (!controller.signal.aborted) {
          setHistoryStoryLoading(false);
          historyStoryFetchControllerRef.current = null;
        }
      }
    },
    [
      abortHistoryStoryRequest,
      historyStoryAuthor,
      hasAiCredentials,
      historyStoryAwaitingKeys,
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      effectiveOpenAIProxyUrl,
      startTypingHistorySegment,
      stopGenerationAnimation,
      waitForTypingComplete,
    ],
  );

  const fetchHistoryStoryFinale = useCallback(
    async (choice?: HistoryStoryOption) => {
      if (!hasAiCredentials) {
        setHistoryStoryLoading(false);
        if (!historyStoryAwaitingKeys) {
          setHistoryStoryAwaitingKeys(true);
        }
        historyStoryPendingChoiceRef.current = choice;
        return;
      }

      abortHistoryStoryRequest();

      const controller = new AbortController();
      historyStoryFetchControllerRef.current = controller;

      setHistoryStoryLoading(true);
      setHistoryStoryError(null);
      historyStoryPendingChoiceRef.current = choice;

      try {
        const activeAuthor = historyStoryAuthor;
        if (!activeAuthor) {
          throw new Error('History story author is not available');
        }

        const arcSegments = historyStorySegmentsRef.current.filter(segment => segment.kind === 'arc');
        const recentSegments = arcSegments.slice(-4);

        const response = await generateHistoryStoryChunk({
          segments: recentSegments.map((segment, index) => ({
            text: segment.text,
            arc: segment.arcNumber ?? arcSegments.length - recentSegments.length + index + 1,
            optionTitle: segment.option?.title,
            optionDescription: segment.option?.description,
            optionTranscript: segment.option?.transcript,
            optionKind: segment.option?.kind,
          })),
          currentChoice: choice,
          summary: historyStorySummaryRef.current || undefined,
          author: {
            name: activeAuthor.name,
            stylePrompt: activeAuthor.prompt,
            genre: activeAuthor.genre,
          },
          arcLimit: STORY_ARC_LIMIT,
          mode: 'finale',
          contract: historyStoryMetaRef.current?.contract,
          signal: controller.signal,
          claudeApiKey: effectiveClaudeKey,
          claudeProxyUrl: effectiveClaudeProxyUrl,
          openAIApiKey: effectiveOpenAIKey,
          openAIProxyUrl: effectiveOpenAIProxyUrl,
          language: i18n.language,
          userProfile,
          userPartner,
        });

        if (controller.signal.aborted) {
          return;
        }

        if (response.meta) {
          setHistoryStoryMeta(response.meta);
          historyStoryMetaRef.current = response.meta;
        }

        historyStoryPendingOptionsRef.current = null;
        setHistoryStoryOptions([]);

        if (response.finale) {
          const finaleSegment: HistoryStorySegment = {
            id: `segment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            kind: 'finale',
            stageLabel: 'Финал',
            text: response.finale.resolution,
            authorId: activeAuthor.id,
            authorName: activeAuthor.name,
            option: choice,
            timestamp: new Date().toISOString(),
          };
          startTypingHistorySegment(finaleSegment);

          setHistoryStoryFinalSummary({
            human: response.finale.humanInterpretation,
            astrological: response.finale.astrologicalInterpretation,
          });
        } else {
          setHistoryStoryFinalSummary(null);
        }

        historyStoryPendingChoiceRef.current = undefined;
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to generate history story finale', error);
        setHistoryStoryError('Не удалось сформировать финал. Попробуй ещё раз.');
        setHistoryStoryTyping(false);
      } finally {
        if (!controller.signal.aborted) {
          setHistoryStoryLoading(false);
          historyStoryFetchControllerRef.current = null;
        }
      }
    },
    [
      abortHistoryStoryRequest,
      historyStoryAuthor,
      hasAiCredentials,
      historyStoryAwaitingKeys,
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      effectiveOpenAIProxyUrl,
      startTypingHistorySegment,
    ],
  );

  const startGenerationAnimation = useCallback(() => {
    // Очищаем предыдущие таймеры
    planetMessagesTimeoutRef.current.forEach(timer => window.clearTimeout(timer));
    planetMessagesTimeoutRef.current = [];

    // Сбрасываем сообщения
    setPlanetChatMessages([]);
    setCurrentTypingPlanet(null);

    let messagePoolRef: Array<{ planet: string; message: string }> = [];

    // ВСЕГДА показываем пролог и подключения планет
    showIntroductionMessage();

    // Проверяем статус персонализированных сообщений
    if (personalizedPlanetMessages &&
        personalizedPlanetMessages.dialogue &&
        Array.isArray(personalizedPlanetMessages.dialogue) &&
        personalizedPlanetMessages.dialogue.length > 0) {
      // Персонализированный диалог уже загружен - запускаем его ПОСЛЕ подключения планет
      console.log('[GenerationAnimation] ✅ Personalized dialogue ready, will start after planets connect');

      // Задержка после последнего подключения планет (Нептун: 4800ms) + пауза 600ms
      const startDialogueTimer = window.setTimeout(() => {
        console.log('[GenerationAnimation] Starting personalized dialogue');
        const pool: Array<{ planet: string; message: string }> = [];
        for (const dialogueMessage of personalizedPlanetMessages.dialogue) {
          pool.push({ planet: dialogueMessage.planet, message: dialogueMessage.message });
        }
        startMessageGeneration(pool, false);
      }, 5400);

      planetMessagesTimeoutRef.current.push(startDialogueTimer);
    } else if (isLoadingPersonalizedMessages) {
      // Диалог загружается - ждём
      console.log('[GenerationAnimation] ⏳ Waiting for personalized dialogue to load...');
      waitForPersonalizedMessages();
    } else {
      console.log('[GenerationAnimation] ⚠️ No personalized dialogue available and not loading');
    }

    // Функция показа вступительного сообщения и подключения планет
    function showIntroductionMessage() {
      const messageTime = new Date();
      const hours = messageTime.getHours().toString().padStart(2, '0');
      const minutes = messageTime.getMinutes().toString().padStart(2, '0');

      // Сначала приветствие от Луны
      setPlanetChatMessages([{
        planet: 'Луна',
        message: 'Так, коллеги, собираемся! Сейчас обсудим, какую историю для Насти придумать...',
        time: `${hours}:${minutes}`,
        id: 'intro-message',
      }]);

      // Потом планеты по очереди подключаются с индивидуальными задержками
      // Задержки отражают характер планеты: быстрые подключаются раньше, медленные позже
      const planetsWithDelays = [
        { planet: 'Меркурий', delay: 600 },   // Самый быстрый - первый
        { planet: 'Марс', delay: 900 },       // Быстрый, решительный
        { planet: 'Венера', delay: 1300 },    // Легкая, но не спешит
        { planet: 'Уран', delay: 1500 },      // Непредсказуемый - может и быстро
        { planet: 'Плутон', delay: 2200 },    // Медленный, тяжеловесный
        { planet: 'Юпитер', delay: 2700 },    // Философский, неторопливый
        { planet: 'Сатурн', delay: 3300 },    // Строгий, размеренный
        { planet: 'Хирон', delay: 4000 },     // Задумчивый, медленный
        { planet: 'Нептун', delay: 4800 },    // Самый медленный - последний
      ];

      planetsWithDelays.forEach(({ planet, delay }) => {
        const timer = window.setTimeout(() => {
          const time = new Date();
          const h = time.getHours().toString().padStart(2, '0');
          const m = time.getMinutes().toString().padStart(2, '0');

          setPlanetChatMessages(prev => [
            ...prev,
            {
              planet,
              message: `подключился к чату...`,
              id: `planet-join-${planet}-${Date.now()}`,
              time: `${h}:${m}`,
              isSystem: true,
            },
          ]);
        }, delay);

        planetMessagesTimeoutRef.current.push(timer);
      });
    }

    // Функция ожидания загрузки персонализированных сообщений
    function waitForPersonalizedMessages() {
      const checkInterval = 200;
      let checkCount = 0;
      const maxChecks = 150; // Максимум 30 секунд (150 * 200ms)

      const checkMessages = () => {
        checkCount++;

        const currentMessages = personalizedPlanetMessagesRef.current;
        const currentLoading = isLoadingPersonalizedMessagesRef.current;

        // Проверяем, загрузились ли сообщения
        if (currentMessages &&
            currentMessages.dialogue &&
            Array.isArray(currentMessages.dialogue) &&
            currentMessages.dialogue.length > 0) {
          console.log('[GenerationAnimation] ✅ Personalized dialogue loaded, continuing dialogue!');

          // Проверяем, не запущена ли уже генерация
          if (planetMessagesGenerationStartedRef.current) {
            console.log('[GenerationAnimation] ⚠️ Generation already started, skipping duplicate');
            return;
          }

          // НЕ очищаем чат - диалог продолжается в том же чате!
          // Создаём пул сообщений
          const newPool: Array<{ planet: string; message: string }> = [];
          for (const dialogueMessage of currentMessages.dialogue) {
            newPool.push({ planet: dialogueMessage.planet, message: dialogueMessage.message });
          }

          // Запускаем анимацию - сообщения добавятся к уже существующим
          planetMessagesGenerationStartedRef.current = true;
          startMessageGeneration(newPool, false);
          return;
        }

        // Если произошла ошибка
        if (!currentLoading) {
          console.log('[GenerationAnimation] ❌ Failed to load personalized messages');
          return;
        }

        // Продолжаем проверять
        if (checkCount < maxChecks) {
          const timer = window.setTimeout(checkMessages, checkInterval);
          planetMessagesTimeoutRef.current.push(timer);
        } else {
          console.log('[GenerationAnimation] ⏱️ Timeout waiting for personalized messages');
        }
      };

      // Начинаем проверять
      const timer = window.setTimeout(checkMessages, checkInterval);
      planetMessagesTimeoutRef.current.push(timer);
    }

    // Функция для запуска генерации сообщений
    function startMessageGeneration(
      initialMessagePool: Array<{ planet: string; message: string }>,
      shouldWatchForPersonalized: boolean
    ) {
      // Диалог идёт строго по порядку - это связный разговор!
      let shuffledPool = [...initialMessagePool];
      let messageIndex = 0;

      // Функция для генерации одного сообщения с индивидуальными задержками для каждой планеты
      const generatePlanetMessage = (delay: number) => {
        // Если сообщения закончились, останавливаем генерацию
        if (messageIndex >= shuffledPool.length) {
          console.log('[GenerationAnimation] ✅ All personalized messages shown');
          return;
        }

        const { planet, message } = shuffledPool[messageIndex];
        messageIndex++;

        // Рассчитываем индивидуальную паузу перед началом печати для этой планеты
        const pauseBefore = calculatePauseBefore(planet);

        // Показываем индикатор печати с индивидуальной задержкой
        const typingTimer = window.setTimeout(() => {
          setCurrentTypingPlanet(planet);
        }, delay + pauseBefore);
        planetMessagesTimeoutRef.current.push(typingTimer);

        // Рассчитываем индивидуальную длительность печати на основе длины сообщения и скорости планеты
        const typingDuration = calculateTypingDuration(message, planet);
        const messageId = `planet-msg-${Date.now()}-${Math.random()}`;

        const messageTimer = window.setTimeout(() => {
          setCurrentTypingPlanet(null);

          // Рассчитываем время для сообщения
          const messageTime = new Date();
          const hours = messageTime.getHours().toString().padStart(2, '0');
          const minutes = messageTime.getMinutes().toString().padStart(2, '0');

          // Добавляем сообщение
          setPlanetChatMessages(prev => [
            ...prev,
            {
              planet,
              message,
              id: messageId,
              time: `${hours}:${minutes}`,
            },
          ]);

          // Рассчитываем индивидуальную паузу после сообщения для этой планеты
          const pauseAfter = calculatePauseAfter(planet);
          generatePlanetMessage(pauseAfter);
        }, delay + pauseBefore + typingDuration);
        planetMessagesTimeoutRef.current.push(messageTimer);
      };

      // Запускаем первое сообщение через небольшую начальную задержку
      generatePlanetMessage(0);
    }
  }, [personalizedPlanetMessages, isLoadingPersonalizedMessages]);

  const startIntroMessagesAnimation = useCallback(() => {
    clearIntroAnimationTimers();
    setIntroMessagesVisible(0);
    setIntroTyping(false);

    const now = new Date();
    const moonSummary = historyStoryMetaRef.current?.moonSummary;
    let delay = 600;

    // Если есть сообщение от Луны (только в Arc 1), показываем его
    if (moonSummary && moonSummary.trim().length > 0) {
      // Показываем индикатор печати от Луны
      const moonTypingTimer = window.setTimeout(() => {
        setCurrentTypingPlanet('Луна');
      }, delay);
      introAnimationTimeoutsRef.current.push(moonTypingTimer);

      delay += 1500; // Время печати Луны

      // Показываем сообщение от Луны
      const moonMessageTimer = window.setTimeout(() => {
        setCurrentTypingPlanet(null);
        const messageTime = new Date(now.getTime() + delay);
        const hours = messageTime.getHours().toString().padStart(2, '0');
        const minutes = messageTime.getMinutes().toString().padStart(2, '0');
        const moonMessage = {
          planet: 'Луна',
          message: moonSummary,
          id: `story-moon-${Date.now()}`,
          time: `${hours}:${minutes}`,
        };
        setPlanetChatMessages(prev => [...prev, moonMessage]);

        // После показа Луны переходим в ready
        setIntroMessagesVisible(4);
      }, delay);
      introAnimationTimeoutsRef.current.push(moonMessageTimer);
    } else {
      // Если нет сообщения от Луны, сразу переходим в ready
      setIntroMessagesVisible(4);
    }
  }, [clearIntroAnimationTimers]);

  const handleCancelGeneration = useCallback(() => {
    console.log('[HistoryStory] Cancelling generation');
    resetHistoryStoryState();
    setHistoryStoryPhase('idle');
  }, [resetHistoryStoryState]);

  // Вспомогательная функция для скролла до конца страницы
  const getScrollToBottomPosition = useCallback(() => {
    // Просто скроллим до конца - отступ от tab bar уже учтён в padding-bottom контейнера
    return document.documentElement.scrollHeight;
  }, []);

  const handleFinaleInterpretationToggle = useCallback((mode: 'human' | 'astrological') => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    setFinaleInterpretationMode(mode);
    // Используем тройной requestAnimationFrame для гарантированного восстановления позиции после рендера
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: currentScroll, behavior: 'auto' });
        });
      });
    });
  }, []);

  const initiateHistoryStory = useCallback(() => {
    if (!hasAiCredentials) {
      if (!historyStoryAwaitingKeys) {
        console.log('[HistoryStory] Waiting for AI credentials before starting story');
        setHistoryStoryAwaitingKeys(true);
      }
      return;
    }

    if (historyStoryAwaitingKeys) {
      setHistoryStoryAwaitingKeys(false);
    }

    resetHistoryStoryState();

    // Переходим в фазу генерации
    setHistoryStoryPhase('generating');

    // Сразу запускаем анимацию - она будет ждать загрузки персонализированных сообщений
    startGenerationAnimation();

    const persona = STORY_AUTHORS[Math.floor(Math.random() * STORY_AUTHORS.length)];
    setHistoryStoryAuthor(persona);

    // Запускаем генерацию истории
    void fetchHistoryStoryChunk(undefined, persona);
  }, [
    fetchHistoryStoryChunk,
    hasAiCredentials,
    historyStoryAwaitingKeys,
    resetHistoryStoryState,
    startGenerationAnimation,
  ]);

  const handleHistoryOptionSelect = useCallback(
    (option: HistoryStoryOption) => {
      setHistoryStoryMode('story');
      setHistoryButtonsHiding(true);
      clearButtonAnimationTimers();
      setVisibleButtonsCount(0);

      setHistoryStorySegments(prevSegments => {
        const updated = [...prevSegments];
        for (let index = updated.length - 1; index >= 0; index -= 1) {
          const segment = updated[index];
          if (segment.kind === 'arc') {
            if (segment.selectedOptionId === option.id) {
              break;
            }
            updated[index] = { ...segment, selectedOptionId: option.id, option: option };
            break;
          }
        }
        historyStorySegmentsRef.current = updated;
        return updated;
      });

      const arcCount = historyStorySegmentsRef.current.filter(segment => segment.kind === 'arc').length;

      setTimeout(() => {
        setHistoryStoryOptions([]);
        setHistoryButtonsHiding(false);
        // Показываем индикатор загрузки сразу
        setHistoryStoryLoading(true);
        if (arcCount >= STORY_ARC_LIMIT) {
          void fetchHistoryStoryFinale(option);
        } else {
          void fetchHistoryStoryChunk(option);
        }
      }, 550); // 350ms анимация + 160ms последняя задержка + запас
    },
    [clearButtonAnimationTimers, fetchHistoryStoryChunk, fetchHistoryStoryFinale],
  );


  const handleHistoryRetry = useCallback(() => {
    if (historyStoryLoading) {
      return;
    }

    const arcSegments = historyStorySegmentsRef.current.filter(segment => segment.kind === 'arc');
    const isFinalPhase = arcSegments.length >= STORY_ARC_LIMIT;

    const pendingChoice = historyStoryPendingChoiceRef.current;
    if (pendingChoice) {
      if (isFinalPhase) {
        void fetchHistoryStoryFinale(pendingChoice);
      } else {
        void fetchHistoryStoryChunk(pendingChoice);
      }
      return;
    }

    const lastSegment = historyStorySegmentsRef.current[historyStorySegmentsRef.current.length - 1];
    if (lastSegment?.option) {
      if (isFinalPhase) {
        void fetchHistoryStoryFinale(lastSegment.option);
      } else {
        void fetchHistoryStoryChunk(lastSegment.option);
      }
      return;
    }

    initiateHistoryStory();
  }, [fetchHistoryStoryChunk, fetchHistoryStoryFinale, historyStoryLoading, initiateHistoryStory]);

  const cleanupCustomOptionResources = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.warn('[HistoryStory] Failed to stop recorder during cleanup', error);
        }
      }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('[HistoryStory] Failed to stop media track', error);
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const cancelHistoryCustomOptionProcessing = useCallback(() => {
    if (historyCustomOptionAbortRef.current) {
      historyCustomOptionAbortRef.current.abort();
      historyCustomOptionAbortRef.current = null;
    }
  }, []);

  const processRecordedCustomOption = useCallback(async () => {
    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];

    if (chunks.length === 0) {
      setHistoryCustomOption(prev => ({
        status: 'error',
        option: prev.option && prev.status === 'ready' ? prev.option : null,
        transcript: undefined,
        error: 'Кажется, запись получилась пустой. Попробуй ещё раз.',
      }));
      return;
    }

    cleanupCustomOptionResources();

    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
    const controller = new AbortController();
    historyCustomOptionAbortRef.current = controller;

    setHistoryCustomOption(prev => ({
      status: 'transcribing',
      option: prev.option && prev.status === 'ready' ? prev.option : null,
      transcript: undefined,
      error: undefined,
    }));

    try {
      const transcript = await transcribeAudioBlob(audioBlob, {
        openAIApiKey: effectiveOpenAIKey,
        openAIProxyUrl: effectiveOpenAIProxyUrl,
        language: 'ru',
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      setHistoryCustomOption(prev => ({
        status: 'generating',
        option: prev.option && prev.status === 'ready' ? prev.option : null,
        transcript,
        error: undefined,
      }));

      const arcSegments = historyStorySegmentsRef.current
        .filter(segment => segment.kind === 'arc')
        .map((segment, index) => ({
          text: segment.text,
          arc: segment.arcNumber ?? index + 1,
          optionTitle: segment.option?.title,
          optionDescription: segment.option?.description,
        }));

      const activeAuthor = historyStoryAuthor ?? STORY_AUTHORS[0];
      const activeAuthorStyle = {
        name: activeAuthor.name,
        stylePrompt: activeAuthor.prompt,
        genre: activeAuthor.genre,
      };

      const customOption = await generateCustomHistoryOption({
        transcript,
        segments: arcSegments,
        summary: historyStorySummaryRef.current || undefined,
        author: activeAuthorStyle,
        signal: controller.signal,
        claudeApiKey: effectiveClaudeKey,
        claudeProxyUrl: effectiveClaudeProxyUrl,
        openAIApiKey: effectiveOpenAIKey,
        openAIProxyUrl: effectiveOpenAIProxyUrl,
        userProfile,
        userPartner,
      });

      if (controller.signal.aborted) {
        return;
      }

      setHistoryCustomOption({
        status: 'ready',
        option: customOption,
        transcript,
        error: undefined,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        console.warn('[HistoryStory] Custom option processing aborted');
        return;
      }
      console.error('[HistoryStory] Failed to process custom option', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось обработать запись. Попробуй ещё раз.';
      setHistoryCustomOption({
        status: 'error',
        option: null,
        transcript: undefined,
        error: message,
      });
    } finally {
      if (historyCustomOptionAbortRef.current === controller) {
        historyCustomOptionAbortRef.current = null;
      }
    }
  }, [
    cleanupCustomOptionResources,
    effectiveClaudeKey,
    effectiveClaudeProxyUrl,
    effectiveOpenAIKey,
    effectiveOpenAIProxyUrl,
    historyStoryAuthor,
  ]);

  const stopHistoryCustomRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch (error) {
        console.error('[HistoryStory] Failed to stop recording', error);
        cleanupCustomOptionResources();
        setHistoryCustomOption(prev => ({
          status: 'error',
          option: prev.option && prev.status === 'ready' ? prev.option : null,
          transcript: undefined,
          error: 'Не получилось остановить запись. Попробуй снова.',
        }));
      }
    }
  }, [cleanupCustomOptionResources]);

  const startRecordingLevelMonitor = useCallback(async (stream: MediaStream) => {
    try {
      const AudioContextClass: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      const audioContext = new AudioContextClass();
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (error) {
          console.warn('[HistoryStory] Failed to resume audio context', error);
        }
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      audioContextRef.current = audioContext;
      audioAnalyserRef.current = analyser;
      analyserDataRef.current = dataArray;

      const updateLevel = () => {
        if (!audioAnalyserRef.current || !analyserDataRef.current) {
          return;
        }

        audioAnalyserRef.current.getByteTimeDomainData(analyserDataRef.current as Uint8Array<ArrayBuffer>);
        let sumSquares = 0;
        for (let index = 0; index < analyserDataRef.current.length; index += 1) {
          const deviation = analyserDataRef.current[index] - 128;
          sumSquares += deviation * deviation;
        }
        const rms = Math.sqrt(sumSquares / analyserDataRef.current.length) / 128;
        const normalized = Math.min(1, rms * 2.4);

        setHistoryCustomRecordingLevel(prev => prev * 0.55 + normalized * 0.45);

        recordingAnimationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      recordingAnimationFrameRef.current = requestAnimationFrame(updateLevel);
    } catch (error) {
      console.warn('[HistoryStory] Failed to initialize audio analyser', error);
    }
  }, []);

  const startHistoryCustomRecording = useCallback(async () => {
    const activeRecorder = mediaRecorderRef.current;
    if (activeRecorder && activeRecorder.state === 'recording') {
      stopHistoryCustomRecording();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setHistoryCustomOption(prev => ({
        status: 'error',
        option: prev.status === 'ready' ? prev.option : null,
        transcript: undefined,
        error: 'Браузер не поддерживает запись звука.',
      }));
      return;
    }

    cancelHistoryCustomOptionProcessing();
    cleanupCustomOptionResources();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        },
      });

      let recorder: MediaRecorder | null = null;
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ];

      for (const candidate of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidate)) {
          try {
            recorder = new MediaRecorder(stream, { mimeType: candidate });
            break;
          } catch {
            recorder = null;
          }
        }
      }

      if (!recorder) {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      recorder.addEventListener('dataavailable', event => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        cleanupCustomOptionResources();
        void processRecordedCustomOption();
      });

      setHistoryCustomOption(prev => ({
        status: 'recording',
        option: prev.option && prev.status === 'ready' ? prev.option : null,
        transcript: undefined,
        error: undefined,
      }));

      void startRecordingLevelMonitor(stream);

      recorder.start();
    } catch (error) {
      console.error('[HistoryStory] Failed to start recording', error);
      cleanupCustomOptionResources();
      setHistoryCustomOption(prev => ({
        status: 'error',
        option: prev.option && prev.status === 'ready' ? prev.option : null,
        transcript: undefined,
        error: error instanceof Error
          ? error.message
          : 'Не удалось получить доступ к микрофону. Проверь настройки и попробуй снова.',
      }));
    }
  }, [
    cancelHistoryCustomOptionProcessing,
    cleanupCustomOptionResources,
    processRecordedCustomOption,
    stopHistoryCustomRecording,
    startRecordingLevelMonitor,
  ]);

  // Загрузка данных профиля и партнёра
  const loadUserProfileData = useCallback(async () => {
    console.log('🔄 loadUserProfileData called');
    try {
      const [profile, partner] = await Promise.all([
        fetchUserProfile(),
        fetchPartner(),
      ]);

      console.log('✅ Profile loaded:', {
        hasProfile: !!profile,
        displayName: profile?.display_name,
        email: profile?.email
      });
      console.log('📊 Partner loaded:', {
        hasPartner: !!partner,
        partnerName: partner?.name,
        partnerId: partner?.id
      });

      setUserProfile(profile);
      setUserPartner(partner);

      // Load language from database and sync with i18n
      if (profile?.language_code) {
        const dbLanguage = profile.language_code;
        const currentLanguage = i18n.language;

        // Only change if different to avoid unnecessary re-renders
        if (dbLanguage !== currentLanguage) {
          console.log(`🌍 Loading language from DB: ${dbLanguage} (was: ${currentLanguage})`);
          await i18n.changeLanguage(dbLanguage);
        } else {
          console.log(`✅ Language already synced: ${dbLanguage}`);
        }
      } else {
        console.log('⚠️ No language_code in profile, keeping current:', i18n.language);
      }
    } catch (error) {
      console.error('❌ Error loading profile data:', error);
    }
  }, [i18n]);

  // Проверка auth сессии при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setAuthUser(session.user);
        } else {
          setShowAuthModal(true); // Показать модалку если не авторизован
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        setShowAuthModal(true);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();

    // Подписка на изменения auth состояния
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        setShowAuthModal(false);
        // Загружаем профиль после авторизации
        await loadUserProfileData();
      } else {
        setAuthUser(null);
        setShowAuthModal(true);
        setUserProfile(null);
        setUserPartner(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfileData]);

  // Cleanup old localStorage language key (one-time migration)
  useEffect(() => {
    const oldKey = 'i18nextLng';
    if (localStorage.getItem(oldKey)) {
      console.log('🧹 Cleaning up old localStorage language key:', oldKey);
      localStorage.removeItem(oldKey);
    }
  }, []);

  // Version check - logout and clear cache on app update
  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);

    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log(`🔄 App updated: ${storedVersion} → ${APP_VERSION}`);
      console.log('🧹 Clearing cache and logging out...');

      // Logout user
      supabase.auth.signOut();
      setAuthUser(null);
      setUserProfile(null);
      setUserPartner(null);

      // Clear all localStorage except version key (will be updated below)
      const keysToKeep = [VERSION_KEY];
      Object.keys(localStorage).forEach((key) => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Clear service worker caches
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.delete(cacheName);
          });
        });
      }

      // Update stored version
      localStorage.setItem(VERSION_KEY, APP_VERSION);

      // Show auth modal
      setShowAuthModal(true);

      alert(t('settings:appUpdated'));
    } else if (!storedVersion) {
      // First launch - set version
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  }, [APP_VERSION, VERSION_KEY, t]);

  // Загрузка циклов из БД при авторизации
  useEffect(() => {
    const loadCyclesFromDB = async () => {
      if (!authUser) {
        // Пользователь вышел - очистить циклы
        setCycles([]);
        return;
      }

      try {
        console.log('🔄 Loading cycles from Supabase...');
        const supabaseCycles = await fetchCycles();

        // Конвертируем Supabase формат в legacy CycleData формат
        const convertedCycles: CycleData[] = supabaseCycles.map(cycle => ({
          id: cycle.id,
          startDate: isoStringToDate(cycle.start_date),
          notes: '', // Пока notes не используются в БД
        }));

        console.log(`✅ Loaded ${convertedCycles.length} cycles from Supabase`, convertedCycles);
        setCycles(convertedCycles);
      } catch (error) {
        console.error('❌ Error loading cycles from Supabase:', error);
        // Не показываем alert, просто логируем ошибку
      }
    };

    loadCyclesFromDB();
  }, [authUser]);

  useEffect(() => {
    return () => {
      cancelHistoryCustomOptionProcessing();
      cleanupCustomOptionResources();
    };
  }, [cancelHistoryCustomOptionProcessing, cleanupCustomOptionResources]);

  // Загрузка профиля при открытии Settings
  useEffect(() => {
    const loadProfileIfNeeded = async () => {
      console.log('🔍 Settings useEffect:', { showSettings, authUser: !!authUser, userProfile: !!userProfile });
      console.log('🔍 userProfile exact value:', userProfile);
      console.log('🔍 Condition check:', {
        notShowSettings: !showSettings,
        hasUserProfile: !!userProfile,
        willReturn: !showSettings || userProfile
      });

      if (!showSettings || userProfile) {
        console.log('⏹ Early return - either not showing settings or profile already loaded');
        return; // Settings не открыты или профиль уже загружен
      }

      console.log('✅ Passed condition check, proceeding to session check');

      // Проверяем сессию напрямую, не полагаясь на authUser state
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 Session check:', { hasSession: !!session });

        if (session?.user) {
          console.log('✨ Triggering loadUserProfileData from Settings open');
          await loadUserProfileData();
        } else {
          console.log('⚠️ No active session, cannot load profile');
        }
      } catch (error) {
        console.error('❌ Error checking session:', error);
      }
    };

    loadProfileIfNeeded();
  }, [showSettings, userProfile, loadUserProfileData]);

  const readIdsRef = useRef(readIds);
  const notificationsRequestSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const sergeyRequestControllerRef = useRef<AbortController | null>(null);
  const sergeyBannerCopyControllerRef = useRef<AbortController | null>(null);
  const sergeyLoadingControllerRef = useRef<AbortController | null>(null);
  const sergeyLoadingMeasureRef = useRef<HTMLDivElement | null>(null);
  const dataHydratedRef = useRef(false);
  const horoscopeMemoryRef = useRef<HoroscopeMemoryEntry[]>([]);
  const cyclesRef = useRef<CycleData[]>([]);
  const dailyHoroscopeBodyRef = useRef<HTMLDivElement | null>(null);
  const sergeyBannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    readIdsRef.current = readIds;
  }, [readIds]);

  useEffect(() => {
    historyStoryMetaRef.current = historyStoryMeta;
  }, [historyStoryMeta]);

  useEffect(() => {
    historyStorySegmentsRef.current = historyStorySegments;
  }, [historyStorySegments]);

  useEffect(() => {
    currentTypingPlanetRef.current = currentTypingPlanet;
  }, [currentTypingPlanet]);

  useEffect(() => {
    updateHistoryStorySummary(historyStorySegments);
  }, [historyStorySegments, updateHistoryStorySummary]);

  useEffect(() => {
    if (historyStoryOptions.length === 0) {
      return;
    }
    setHistoryCustomOption(prev => {
      if (prev.status === 'recording' || prev.status === 'transcribing' || prev.status === 'generating') {
        return prev;
      }
      return {
        status: 'idle',
        option: null,
        transcript: undefined,
        error: undefined,
      };
    });
  }, [historyStoryOptions]);

  useEffect(() => {
    if (historyCustomOption.status !== 'recording') {
      setHistoryCustomRecordingLevel(0);
    }
  }, [historyCustomOption.status]);

  useEffect(() => {
    if (!historyStoryMenuOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (historyStoryMenuRef.current?.contains(target)) {
        return;
      }
      if (historyStoryMenuButtonRef.current?.contains(target)) {
        return;
      }
      setHistoryStoryMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [historyStoryMenuOpen]);

  // Глобальный перехватчик скроллов (для отладки)
  useEffect(() => {
    const originalScrollTo = window.scrollTo;
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    let scrollCount = 0;

    window.scrollTo = function(...args: any[]) {
      scrollCount++;
      const stack = new Error().stack;
      console.log(`[SCROLL #${scrollCount}] window.scrollTo called:`, args, '\nStack:', stack?.split('\n').slice(2, 5).join('\n'));
      return originalScrollTo.apply(this, args as any);
    };

    Element.prototype.scrollIntoView = function(...args: any[]) {
      scrollCount++;
      const stack = new Error().stack;
      console.log(`[SCROLL #${scrollCount}] scrollIntoView called on:`, this, '\nStack:', stack?.split('\n').slice(2, 5).join('\n'));
      return originalScrollIntoView.apply(this, args as any);
    };

    return () => {
      window.scrollTo = originalScrollTo;
      Element.prototype.scrollIntoView = originalScrollIntoView;
    };
  }, []);

  // Автоскролл при переключении вкладок
  useEffect(() => {
    // Используем тройной requestAnimationFrame для гарантированного рендера
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (activeTab === 'calendar' || activeTab === 'cycles') {
            // Календарь и Циклы → наверх
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            console.log(`[Tab Switch] Scrolled to TOP for tab: ${activeTab}`);
          } else if (activeTab === 'discover') {
            // Узнать себя (чат) → вниз (с учетом высоты tab bar)
            window.scrollTo({
              top: getScrollToBottomPosition(),
              behavior: 'smooth'
            });
            console.log(`[Tab Switch] Scrolled to BOTTOM (with tab bar offset) for tab: ${activeTab}`);
          }
        });
      });
    });
  }, [activeTab, getScrollToBottomPosition]);

  // Автоскролл для планетарных сообщений в фазе generating (НЕ clearing!)
  useEffect(() => {
    console.log('[AutoScroll GEN/CLEAR] Effect fired, phase:', historyStoryPhase, 'messages:', planetChatMessages.length);
    if (historyStoryPhase !== 'generating') {
      console.log('[AutoScroll GEN/CLEAR] Skipping - wrong phase');
      return;
    }

    if (planetChatMessages.length === 0 && !currentTypingPlanet) {
      console.log('[AutoScroll GEN/CLEAR] Skipping - no messages or typing');
      return;
    }

    console.log('[AutoScroll GEN/CLEAR] ✅ Scrolling to BOTTOM');
    // Используем тройной requestAnimationFrame для гарантированного ожидания рендера
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Скроллим весь window до конца страницы (с учетом высоты tab bar)
          window.scrollTo({
            top: getScrollToBottomPosition(),
            behavior: 'smooth'
          });
        });
      });
    });
  }, [planetChatMessages, currentTypingPlanet, historyStoryPhase, getScrollToBottomPosition]);

  // Автоскролл для сообщений истории в фазе ready
  useEffect(() => {
    console.log('[AutoScroll READY] Effect fired, phase:', historyStoryPhase);
    if (historyStoryPhase !== 'ready') {
      console.log('[AutoScroll READY] Skipping - wrong phase');
      return;
    }

    // Проверяем, это Arc 1 или последующие
    const currentArc = historyStorySegments.length > 0 ? historyStorySegments[historyStorySegments.length - 1].arcNumber : 1;
    const isArc1 = currentArc === 1;
    const hasChoices = historyStoryOptions.length > 0;
    console.log('[AutoScroll READY] Arc:', currentArc, 'isArc1:', isArc1, 'hasChoices:', hasChoices);

    // Если кнопок еще нет - не скроллим, ждем следующего рендера (для всех Arc)
    if (!hasChoices) {
      console.log('[AutoScroll READY] Skipping - choices not loaded yet');
      return;
    }

    // Ждём, пока история и кнопки полностью отрендерятся
    const scrollTimeout = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (isArc1 && hasChoices) {
              // Arc 1: прокручиваем к последнему сообщению Луны (с moon_summary)
              const moonElements = document.querySelectorAll('[data-author="Луна"]');
              console.log('[AutoScroll READY] Found', moonElements.length, 'Moon elements');
              if (moonElements.length > 0) {
                const lastMoonEl = moonElements[moonElements.length - 1] as HTMLElement;
                const rect = lastMoonEl.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetTop = scrollTop + rect.top - 120; // 120px отступ сверху для видимости под заголовком

                console.log('[AutoScroll READY] ✅ Scrolling to MOON, targetTop:', targetTop, 'at', Date.now());
                window.scrollTo({
                  top: targetTop,
                  behavior: 'smooth'
                });

                // Запускаем анимацию подсветки после завершения скролла (500ms - длительность smooth scroll)
                setTimeout(() => {
                  const moonIndex = moonElements.length - 1;
                  console.log('[Highlight] Activating highlight for moon message index:', moonIndex);
                  setHighlightedMessageIndex(moonIndex);

                  // Убираем подсветку через 2.5 секунды (длительность анимации)
                  setTimeout(() => {
                    console.log('[Highlight] Removing highlight');
                    setHighlightedMessageIndex(null);
                  }, 2500);
                }, 500);

                // Проверяем, что будет через 2 секунды
                setTimeout(() => {
                  const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                  console.log('[AutoScroll READY] After 2s: scrollTop =', currentScrollTop, 'expected ~', targetTop);
                }, 2000);
              } else {
                console.log('[AutoScroll READY] ✅ No Moon elements, scrolling to BOTTOM');
                window.scrollTo({
                  top: getScrollToBottomPosition(),
                  behavior: 'smooth'
                });
              }
            } else {
              // Остальные дуги: прокручиваем вниз к истории и кнопкам (с учетом высоты tab bar)
              console.log('[AutoScroll READY] ✅ Not Arc 1, scrolling to BOTTOM');
              window.scrollTo({
                top: getScrollToBottomPosition(),
                behavior: 'smooth'
              });
            }
          });
        });
      });
    }, 1000); // Задержка 1000ms для гарантированного рендера истории и кнопок

    return () => {
      window.clearTimeout(scrollTimeout);
    };
  }, [historyStorySegments, historyStoryLoading, historyStoryTyping, historyStoryPhase, historyStoryOptions, getScrollToBottomPosition]);

  // Показ сообщения от Луны при переходе в фазу 'clearing'
  useEffect(() => {
    if (historyStoryPhase !== 'clearing') {
      return;
    }

    console.log('[HistoryStory] Story is ready, adding Moon message to dialogue');

    // НЕ удаляем сообщения планет - они остаются в чате!
    // Просто добавляем к ним сообщение от Луны (если есть)

    // Сразу запускаем анимацию показа Луны
    const moonTimer = window.setTimeout(() => {
      console.log('[HistoryStory] Starting intro messages animation (Moon)');
      // Показываем сообщение от Луны с анимацией печати
      startIntroMessagesAnimation();
    }, 200);

    // Переходим в фазу 'ready' после показа Луны:
    // 200ms (пауза) + 600 (задержка) + 1500 (печать) = 2300ms
    const hasMoonSummary = historyStoryMetaRef.current?.moonSummary && historyStoryMetaRef.current.moonSummary.trim().length > 0;
    const animationTime = hasMoonSummary ? 2100 : 0;
    const readyTimer = window.setTimeout(() => {
      setHistoryStoryPhase('ready');
      console.log('[HistoryStory] Showing story');
    }, 200 + animationTime);

    return () => {
      window.clearTimeout(moonTimer);
      window.clearTimeout(readyTimer);
    };
  }, [historyStoryPhase]);

  // Управление прокруткой при переключении вкладок
  useEffect(() => {
    console.log('[AutoScroll TAB] Effect fired, activeTab:', activeTab, 'phase:', historyStoryPhase);
    if (activeTab === 'discover') {
      // Сбрасываем badge при переходе на вкладку "Узнай себя"
      setHasNewStoryMessage(false);
      // Помечаем варианты выбора как прочитанные
      markChoicesAsRead();

      // НЕ скроллим, если мы в фазе ready, generating или clearing -
      // в этих фазах за скролл отвечают специализированные эффекты выше
      if (historyStoryPhase === 'ready' || historyStoryPhase === 'generating' || historyStoryPhase === 'clearing') {
        console.log('[AutoScroll TAB] Skipping - story in progress');
        return;
      }

      console.log('[AutoScroll TAB] ✅ Scrolling to BOTTOM');
      // Прокручиваем до конца содержимого вкладки "Узнай себя" (с учетом высоты tab bar)
      // Используем тройной requestAnimationFrame для гарантированного ожидания рендера
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({
              top: getScrollToBottomPosition(),
              behavior: 'smooth'
            });
          });
        });
      });
    } else if (activeTab === 'calendar' || activeTab === 'cycles') {
      // Прокручиваем на самый верх для вкладок "Календарь" и "Циклы"
      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
  }, [activeTab, historyStoryPhase, getScrollToBottomPosition]);

  // Устанавливаем badge, когда появляются новые варианты выбора
  useEffect(() => {
    if (
      historyStoryPhase === 'ready' &&
      historyStoryOptions.length > 0 &&
      !historyStoryLoading &&
      !historyStoryTyping &&
      activeTab !== 'discover'
    ) {
      setHasNewStoryMessage(true);
    }
  }, [historyStoryPhase, historyStoryOptions.length, historyStoryLoading, historyStoryTyping, activeTab]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sergeyRequestControllerRef.current) {
        sergeyRequestControllerRef.current.abort();
        sergeyRequestControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      abortHistoryStoryRequest();
      clearHistoryStoryTypingTimer();
    };
  }, [abortHistoryStoryRequest, clearHistoryStoryTypingTimer]);

  useEffect(() => {
    horoscopeMemoryRef.current = horoscopeMemory;
  }, [horoscopeMemory]);

  useEffect(() => {
    cyclesRef.current = cycles;
  }, [cycles]);

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') {
        return;
      }
      if (historyScrollTimeoutRef.current !== null) {
        window.clearTimeout(historyScrollTimeoutRef.current);
        historyScrollTimeoutRef.current = null;
      }
      historyScrollContainerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (historyStoryMode !== 'story' && historyScrollTimeoutRef.current !== null) {
      window.clearTimeout(historyScrollTimeoutRef.current);
      historyScrollTimeoutRef.current = null;
    }
    if (historyStoryMode !== 'story') {
      historyScrollContainerRef.current = null;
    }
  }, [historyStoryMode]);

  // Устанавливаем случайную фразу при открытии вкладки
  useEffect(() => {
    if (activeTab !== 'discover') {
      setHistoryStoryMenuOpen(false);
      return;
    }

    // Устанавливаем случайную фразу, если она ещё не установлена
    if (!historyStartPrompt) {
      const randomPromptIndex = Math.floor(Math.random() * HISTORY_START_PROMPTS.length);
      const randomButtonIndex = Math.floor(Math.random() * HISTORY_START_BUTTONS.length);
      const randomDescriptionIndex = Math.floor(Math.random() * HISTORY_START_DESCRIPTIONS.length);
      setHistoryStartPrompt(HISTORY_START_PROMPTS[randomPromptIndex]);
      setHistoryStartButton(HISTORY_START_BUTTONS[randomButtonIndex]);
      setHistoryStartDescription(HISTORY_START_DESCRIPTIONS[randomDescriptionIndex]);
    }
  }, [activeTab, historyStartPrompt]);

  // Автозапуск отключен - теперь история запускается только по кнопке
  // useEffect(() => {
  //   if (!historyStoryAwaitingKeys) {
  //     return;
  //   }
  //   if (!hasAiCredentials) {
  //     return;
  //   }
  //   if (historyStorySegmentsRef.current.length > 0 || historyStoryLoading) {
  //     return;
  //   }
  //   if (activeTab !== 'discover') {
  //     return;
  //   }
  //   initiateHistoryStory();
  // }, [
  //   activeTab,
  //   hasAiCredentials,
  //   historyStoryAwaitingKeys,
  //   historyStoryLoading,
  //   initiateHistoryStory,
  // ]);

  useEffect(() => {
    if (activeTab !== 'cycles' || cycles.length === 0) {
      setVisibleCycleIds([]);
      return;
    }

    setVisibleCycleIds([]);
    const sortedCycles = [...cycles].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    const timers = sortedCycles.map((cycle, index) =>
      window.setTimeout(() => {
        setVisibleCycleIds(prev => (prev.includes(cycle.id) ? prev : [...prev, cycle.id]));
      }, 150 * index + 100)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [activeTab, cycles]);

  // Анимация элементов календаря
  useEffect(() => {
    if (activeTab !== 'calendar') {
      setVisibleCalendarElements([]);
      return;
    }

    setVisibleCalendarElements([]);

    // Определяем элементы для анимации в порядке сверху вниз
    const elementsToAnimate = [
      'calendar-header',
      'calendar-weekdays',
      'calendar-grid',
      'calendar-legend',
      'insights-card',
      'stats-card',
    ];

    const timers = elementsToAnimate.map((elementId, index) =>
      window.setTimeout(() => {
        setVisibleCalendarElements(prev => (prev.includes(elementId) ? prev : [...prev, elementId]));
      }, 80 * index + 50)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [activeTab, currentDate]);

  // Синхронизация ref с state для персонализированных сообщений
  useEffect(() => {
    personalizedPlanetMessagesRef.current = personalizedPlanetMessages;
  }, [personalizedPlanetMessages]);

  useEffect(() => {
    isLoadingPersonalizedMessagesRef.current = isLoadingPersonalizedMessages;
  }, [isLoadingPersonalizedMessages]);

  // Фоновая загрузка персонализированных сообщений от планет при переходе на вкладку "Узнай себя"
  useEffect(() => {
    if (activeTab !== 'discover') {
      return;
    }

    // ВСЕГДА генерируем новые сообщения при открытии вкладки (не кэшируем)
    // Очищаем предыдущие сообщения
    setPersonalizedPlanetMessages(null);

    // Если уже идет загрузка, не запускаем новую (используем ref для проверки)
    if (isLoadingPersonalizedMessagesRef.current) {
      return;
    }

    // Очищаем старый кэш (одноразово)
    try {
      localStorage.removeItem('nastia_personalized_planet_messages');
    } catch (e) {
      // ignore
    }

    // Проверяем наличие API ключей
    if (!hasAiCredentials) {
      console.log('[PersonalizedMessages] No AI credentials available');
      return;
    }

    // Запускаем фоновую загрузку
    console.log('[PersonalizedMessages] Starting background load');
    setIsLoadingPersonalizedMessages(true);

    const abortController = new AbortController();
    personalizedMessagesAbortControllerRef.current = abortController;

    void generatePersonalizedPlanetMessages(
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      effectiveOpenAIProxyUrl
    )
      .then(messages => {
        if (!abortController.signal.aborted) {
          console.log('[PersonalizedMessages] Successfully loaded personalized messages');
          setPersonalizedPlanetMessages(messages);
          setIsLoadingPersonalizedMessages(false);
        }
      })
      .catch(error => {
        if (!abortController.signal.aborted) {
          console.error('[PersonalizedMessages] Failed to load:', error);
          setIsLoadingPersonalizedMessages(false);
        }
      });

    return () => {
      abortController.abort();
      personalizedMessagesAbortControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasAiCredentials, effectiveClaudeKey, effectiveClaudeProxyUrl, effectiveOpenAIKey, effectiveOpenAIProxyUrl]);

  // Анимация элементов вкладки "Узнай себя"
  useEffect(() => {
    if (activeTab !== 'discover') {
      setVisibleDiscoverElements([]);
      return;
    }

    setVisibleDiscoverElements([]);

    // Определяем элементы для анимации в зависимости от фазы
    const elementsToAnimate: string[] = [];

    if (historyStoryPhase === 'idle') {
      elementsToAnimate.push('discover-start-icon', 'discover-start-prompt', 'discover-start-description', 'discover-start-button');
    } else if (historyStoryPhase === 'generating') {
      elementsToAnimate.push('discover-gen-icon', 'discover-gen-phrase');
    } else if (historyStoryPhase === 'ready') {
      elementsToAnimate.push('discover-meta-bar', 'discover-messages');
    }

    const timers = elementsToAnimate.map((elementId, index) =>
      window.setTimeout(() => {
        setVisibleDiscoverElements(prev => (prev.includes(elementId) ? prev : [...prev, elementId]));
      }, 100 * index + 50)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [activeTab, historyStoryPhase]);

  // Удалён дублирующий useEffect - анимация уже запускается в фазе 'clearing'

  const resolveHistoryScrollContainer = useCallback((): HTMLElement | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    const existing = historyScrollContainerRef.current;
    if (existing && existing.isConnected) {
      return existing;
    }

    const messagesElement = historyMessagesRef.current;
    if (!messagesElement) {
      return null;
    }

    let current: HTMLElement | null = messagesElement.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const overflow = style.overflow;
      const isScrollable =
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay' ||
        overflow === 'auto' ||
        overflow === 'scroll' ||
        overflow === 'overlay';

      if (isScrollable) {
        historyScrollContainerRef.current = current;
        return current;
      }

      current = current.parentElement;
    }

    const documentElement =
      (document.scrollingElement as HTMLElement | null) ?? document.documentElement ?? document.body ?? null;
    historyScrollContainerRef.current = documentElement;
    return documentElement;
  }, []);

  useEffect(() => {
    if (historyStoryMode !== 'story') {
      return;
    }
    resolveHistoryScrollContainer();
  }, [historyStoryMode, resolveHistoryScrollContainer]);

  // Функция для плавного скролла
  const scrollToBottom = useCallback(
    ({ delay = 0, behavior = 'smooth' }: { delay?: number; behavior?: ScrollBehavior } = {}) => {
      if (typeof window === 'undefined') {
        return;
      }

      const scheduleScroll = () => {
        if (typeof window === 'undefined') {
          return;
        }

        const scrollContainer = resolveHistoryScrollContainer();
        const anchor =
          historyScrollAnchorRef.current ??
          (historyMessagesRef.current?.lastElementChild as HTMLElement | null);

        if (!scrollContainer || !anchor) {
          return;
        }

        const execute = () => {
          if (!scrollContainer.isConnected) {
            historyScrollContainerRef.current = null;
            return;
          }

          const anchorRect = anchor.getBoundingClientRect();

          const containerRect =
            scrollContainer === document.documentElement || scrollContainer === document.body
              ? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
              : scrollContainer.getBoundingClientRect();

          const delta = anchorRect.bottom - containerRect.bottom;

          if (delta <= 1) {
            return;
          }

          const scrollByOptions = { top: delta, behavior } as ScrollToOptions;

          if (scrollContainer === document.documentElement || scrollContainer === document.body) {
            window.scrollBy(scrollByOptions);
            return;
          }

          if (typeof scrollContainer.scrollBy === 'function') {
            scrollContainer.scrollBy(scrollByOptions);
            return;
          }

          if (typeof scrollContainer.scrollTo === 'function') {
            scrollContainer.scrollTo({
              top: scrollContainer.scrollTop + delta,
              behavior,
            });
            return;
          }

          scrollContainer.scrollTop += delta;
        };

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(execute);
        });
      };

      if (historyScrollTimeoutRef.current !== null) {
        window.clearTimeout(historyScrollTimeoutRef.current);
        historyScrollTimeoutRef.current = null;
      }

      if (delay > 0) {
        historyScrollTimeoutRef.current = window.setTimeout(() => {
          scheduleScroll();
          historyScrollTimeoutRef.current = null;
        }, delay);
        return;
      }

      scheduleScroll();
    },
    [resolveHistoryScrollContainer],
  );

  // Автоскролл при появлении интро-сообщений (НЕ для Arc 1 - там используется автоскролл READY к Луне)
  useEffect(() => {
    if (historyStoryPhase === 'ready' && historyStoryMode === 'story' && introMessagesVisible > 0) {
      const currentArc = historyStorySegments.length > 0 ? historyStorySegments[historyStorySegments.length - 1].arcNumber : 1;
      const isArc1 = currentArc === 1;
      if (!isArc1) {
        scrollToBottom({ delay: 200 });
      }
    }
  }, [introMessagesVisible, historyStoryPhase, historyStoryMode, scrollToBottom, historyStorySegments]);

  // ResizeObserver для автоскролла при изменении размера контейнера (НЕ для Arc 1 в фазе ready)
  useEffect(() => {
    if (historyStoryMode !== 'story') {
      return;
    }
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const container = historyMessagesRef.current;
    if (!container) {
      return;
    }

    let rafId: number | null = null;

    const observer = new ResizeObserver(entries => {
      if (!entries.length) {
        return;
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        // НЕ скроллим для Arc 1 в фазе ready - там используется автоскролл READY к Луне
        const currentArc = historyStorySegments.length > 0 ? historyStorySegments[historyStorySegments.length - 1].arcNumber : 1;
        const isArc1 = currentArc === 1;
        if (!(isArc1 && historyStoryPhase === 'ready')) {
          scrollToBottom({ behavior: 'smooth' });
        }
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [historyStoryMode, scrollToBottom, historyStorySegments, historyStoryPhase]);

  // Автоскролл при появлении typing indicator - ОТКЛЮЧЕН
  // Индикатор печати и так виден, не нужно скроллить
  // (раньше вызывал прыжок вниз для Arc 2+ пока показываются три точки)
  useEffect(() => {
    if (historyStoryMode !== 'story') {
      return;
    }

    // ОТКЛЮЧЕНО: не скроллим при появлении typing indicator
    // if (historyStoryTyping) {
    //   const currentArc = historyStorySegments.length > 0 ? historyStorySegments[historyStorySegments.length - 1].arcNumber : 1;
    //   const isArc1 = currentArc === 1;
    //   if (!(isArc1 && historyStoryPhase === 'ready')) {
    //     scrollToBottom({ delay: 350 });
    //   }
    // }
  }, [historyStoryTyping, historyStoryMode, scrollToBottom, historyStorySegments, historyStoryPhase]);

  // Автоскролл при появлении нового сообщения (НЕ для Arc 1 в фазе ready)
  useEffect(() => {
    if (historyStoryMode !== 'story') {
      return;
    }

    if (historyStorySegments.length > 0 && !historyStoryTyping) {
      const currentArc = historyStorySegments.length > 0 ? historyStorySegments[historyStorySegments.length - 1].arcNumber : 1;
      const isArc1 = currentArc === 1;
      if (!(isArc1 && historyStoryPhase === 'ready')) {
        scrollToBottom({ delay: 400 });
      }
    }
  }, [historyStorySegments.length, historyStoryTyping, historyStoryMode, scrollToBottom, historyStorySegments, historyStoryPhase]);

  // Автоскролл при выборе опции (добавлении сообщения от Насти) - НЕ для Arc 1
  useEffect(() => {
    if (historyStoryMode !== 'story') {
      return;
    }

    const lastSegment = historyStorySegments[historyStorySegments.length - 1];
    if (lastSegment?.selectedOptionId) {
      const currentArc = lastSegment.arcNumber;
      const isArc1 = currentArc === 1;
      if (!isArc1) {
        scrollToBottom({ delay: 150 });
      }
    }
  }, [historyStorySegments, historyStoryMode, scrollToBottom]);

  // Последовательное появление кнопок с прокруткой после каждой
  useEffect(() => {
    if (historyStoryMode !== 'story') {
      return;
    }

    if (historyStoryOptions.length === 0) {
      setVisibleButtonsCount(0);
      return;
    }

    if (historyStoryTyping || historyButtonsHiding) {
      return;
    }

    clearButtonAnimationTimers();

    // Определяем текущий Arc
    const currentArc = historyStorySegments.length > 0 ? historyStorySegments[historyStorySegments.length - 1].arcNumber : 1;
    const isArc1 = currentArc === 1;

    // Начинаем показывать кнопки по одной
    const totalButtons = historyStoryOptions.length + 1;
    const delayBetweenButtons = 500; // Задержка между кнопками

    for (let i = 0; i < totalButtons; i++) {
      const timeoutId = window.setTimeout(() => {
        setVisibleButtonsCount(i + 1);
        // Arc 1: НЕ скроллим вниз, потому что есть специальный скролл к Луне
        // Arc 2+: скроллим вниз к кнопкам
        if (!isArc1) {
          scrollToBottom({ delay: 200 });
        }
      }, delayBetweenButtons * (i + 1));

      buttonAnimationTimeoutsRef.current.push(timeoutId);
    }

    return () => {
      clearButtonAnimationTimers();
    };
  }, [historyStoryOptions, historyStoryMode, historyStoryTyping, historyButtonsHiding, historyStorySegments, scrollToBottom, clearButtonAnimationTimers]);

  const customOptionStatus = historyCustomOption.status;
  const customOptionReady = historyCustomOption.option;
  const isCustomOptionProcessing = customOptionStatus === 'transcribing' || customOptionStatus === 'generating';
  const showCustomOption = historyStoryOptions.length > 0;
  const showLiveRecordingDot = customOptionStatus === 'recording';

  const handleCustomOptionClick = useCallback(() => {
    if (customOptionStatus === 'recording') {
      stopHistoryCustomRecording();
      return;
    }

    if (customOptionStatus === 'ready' && customOptionReady && !historyStoryLoading) {
      handleHistoryOptionSelect(customOptionReady);
      return;
    }

    if (customOptionStatus === 'transcribing' || customOptionStatus === 'generating') {
      return;
    }

    void startHistoryCustomRecording();
  }, [
    customOptionReady,
    customOptionStatus,
    handleHistoryOptionSelect,
    historyStoryLoading,
    startHistoryCustomRecording,
    stopHistoryCustomRecording,
  ]);

  // Автоскролл при изменении состояния кнопки своего варианта
  useEffect(() => {
    // Только если мы на вкладке "Узнай себя" и кнопка видима
    if (activeTab !== 'discover' || !customOptionStatus) {
      return;
    }

    console.log('[AutoScroll CUSTOM OPTION] Status changed to:', customOptionStatus);

    // Используем тройной requestAnimationFrame для гарантированного ожидания рендера после изменения высоты кнопки
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Скроллим весь window до конца страницы (с учетом высоты tab bar)
          window.scrollTo({
            top: getScrollToBottomPosition(),
            behavior: 'smooth'
          });
          console.log('[AutoScroll CUSTOM OPTION] ✅ Scrolled to BOTTOM after status change');
        });
      });
    });
  }, [customOptionStatus, activeTab, getScrollToBottomPosition]);

  const customButtonClassNames = [styles.historyCustomButton, styles.historyCustomButtonIdle];
  let customIconWrapperClass = `${styles.historyCustomIconCircle} ${styles.historyCustomIconIdle}`;
  let customButtonTitle: React.ReactNode = 'Свой вариант';
  let customButtonDescription = 'Продиктуй, как бы ты продолжила историю.';
  let customButtonIcon: React.ReactNode = <Mic size={18} strokeWidth={2.2} />;
  let customButtonAriaLabel = 'Записать свой вариант голосом';
  let customButtonDisabled = (historyStoryLoading && customOptionStatus !== 'recording') || isCustomOptionProcessing;

  switch (customOptionStatus) {
    case 'idle':
      break;
    case 'recording':
      customButtonClassNames.push(styles.historyCustomButtonRecording);
      customIconWrapperClass = `${styles.historyCustomIconCircle} ${styles.historyCustomIconRecording}`;
      customButtonTitle = 'Идёт запись…';
      customButtonDescription = 'Нажмите, чтобы остановить';
      customButtonIcon = <Square size={12} strokeWidth={2.5} fill="white" />;
      customButtonAriaLabel = 'Остановить запись';
      customButtonDisabled = false;
      break;
    case 'transcribing':
      customButtonClassNames.push(styles.historyCustomButtonProcessing);
      customIconWrapperClass = `${styles.historyCustomIconCircle} ${styles.historyCustomIconProcessing}`;
      customButtonTitle = 'Обрабатываем запись…';
      customButtonDescription = 'Перевожу голос в текст.';
      customButtonIcon = <Loader2 size={18} className={styles.historyCustomLoaderIcon} strokeWidth={2.4} />;
      customButtonAriaLabel = 'Распознаём аудио';
      customButtonDisabled = true;
      break;
    case 'generating':
      customButtonClassNames.push(styles.historyCustomButtonProcessing);
      customIconWrapperClass = `${styles.historyCustomIconCircle} ${styles.historyCustomIconProcessing}`;
      customButtonTitle = 'Придумываем формулировку…';
      customButtonDescription = 'Собираю заголовок и описание из твоих слов.';
      customButtonIcon = <Loader2 size={18} className={styles.historyCustomLoaderIcon} strokeWidth={2.4} />;
      customButtonAriaLabel = 'Готовим карточку из записи';
      customButtonDisabled = true;
      break;
    case 'error':
      customButtonClassNames.push(styles.historyCustomButtonError);
      customIconWrapperClass = `${styles.historyCustomIconCircle} ${styles.historyCustomIconError}`;
      customButtonTitle = 'Не удалось распознать';
      customButtonDescription = historyCustomOption.error ?? 'Попробуем записать снова?';
      customButtonIcon = <RotateCcw size={18} strokeWidth={2.4} />;
      customButtonAriaLabel = 'Попробовать записать ещё раз';
      customButtonDisabled = false;
      break;
    case 'ready':
      customButtonClassNames.push(styles.historyCustomButtonReady);
      customIconWrapperClass = `${styles.historyCustomIconCircle} ${styles.historyCustomIconReady}`;
      customButtonTitle = customOptionReady?.title ?? 'Свой вариант';
      customButtonDescription =
        customOptionReady?.description ??
        historyCustomOption.transcript ??
        'Проверь, всё ли звучит, как тебе хочется.';
      customButtonIcon = <RotateCcw size={20} strokeWidth={2} />;
      customButtonAriaLabel = 'Выбрать свой вариант';
      customButtonDisabled = historyStoryLoading;
      break;
    default:
      break;
  }

  const customButtonClassName = customButtonClassNames.join(' ');
  const customButtonStyle: (React.CSSProperties & Record<string, string | number>) = {};

  if (customOptionStatus === 'recording') {
    const glow = Math.min(0.95, 0.28 + historyCustomRecordingLevel * 0.55);
    const borderAlpha = Math.min(0.95, 0.5 + historyCustomRecordingLevel * 0.4);
    const pulse = Math.min(0.95, 0.4 + historyCustomRecordingLevel * 0.6);
    customButtonStyle['--recording-glow'] = glow;
    customButtonStyle['--recording-border-alpha'] = borderAlpha;
    customButtonStyle['--recording-pulse'] = pulse;
    const borderGradient = `linear-gradient(135deg, rgba(244, 114, 182, ${borderAlpha}), rgba(139, 92, 246, ${borderAlpha}))`;
    customButtonStyle['--custom-border'] = borderGradient;
    customButtonStyle['--custom-shadow'] = `rgba(139, 92, 246, ${Math.max(0.2, glow)})`;
  }

  const fallbackPeriodContent = useMemo(
    () => getFallbackPeriodContent(getDisplayName(PRIMARY_USER_NAME, i18n.language), i18n.language),
    [i18n.language],
  );

  const renderedPeriodContent = periodContent ?? (periodContentStatus !== 'loading' ? fallbackPeriodContent : null);
  useEffect(() => {
    if (!selectedDate || periodContentStatus === 'loading') {
      setShowQuestionBubble(false);
      setShowJokeBubble(false);
      return;
    }

    setShowQuestionBubble(false);
    setShowJokeBubble(false);

    const questionTimer = window.setTimeout(() => setShowQuestionBubble(true), 80);
    const jokeTimer = window.setTimeout(() => setShowJokeBubble(true), 420);

    return () => {
      window.clearTimeout(questionTimer);
      window.clearTimeout(jokeTimer);
    };
  }, [selectedDate, periodContentStatus, renderedPeriodContent]);

  const activePeriodContent = renderedPeriodContent ?? fallbackPeriodContent;

  const stats = useMemo(() => calculateCycleStats(cycles), [cycles]);
  const nextPredictionDate = stats.nextPrediction;
  const fertileWindow = useMemo(() => calculateFertileWindow(cycles), [cycles]);
  const unreadCount = useMemo(
    () => notifications.reduce((count, notification) => count + (notification.read ? 0 : 1), 0),
    [notifications]
  );

  const currentDailyLoadingMessage = dailyLoadingMessages[dailyLoadingIndex] ?? getDefaultLoadingMessages(i18n.language)[0];
  const currentSergeyLoadingMessage =
    sergeyLoadingMessages.length > 0
      ? sergeyLoadingMessages[sergeyLoadingIndex % sergeyLoadingMessages.length]
      : initialSergeyLoadingMessages[0];
  const effectiveSergeyBannerCopy = useMemo(
    () => sergeyBannerCopy ?? DEFAULT_SERGEY_BANNER_COPY,
    [sergeyBannerCopy]
  );

  useEffect(() => {
    if (!showNotifications) {
      setVisibleNotificationIds([]);
      return;
    }
    if (notificationsLoading) {
      setVisibleNotificationIds([]);
      return;
    }
    if (notifications.length === 0) {
      setVisibleNotificationIds([]);
      return;
    }

    setVisibleNotificationIds([]);
    const timers = notifications.map((notification, index) =>
      window.setTimeout(() => {
        setVisibleNotificationIds(prev =>
          prev.includes(notification.id) ? prev : [...prev, notification.id]
        );
      }, 140 * index + 120)
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [showNotifications, notificationsLoading, notifications]);

  const persistNotifications = useCallback((items: StoredNotification[]): StoredNotification[] => {
    const limited = items.slice(0, MAX_STORED_NOTIFICATIONS);
    saveLocalNotifications(limited);
    return limited;
  }, []);

  useEffect(() => {
    setNotifications(prev => persistNotifications(prev));
  }, [persistNotifications]);

  // Remote notifications sync removed - using only local storage now

  const normalizeNotificationType = (value?: string): NotificationCategory => {
    switch (value) {
      case 'fertile_window':
      case 'ovulation_day':
      case 'period_forecast':
      case 'period_start':
      case 'period_check':
      case 'period_waiting':
      case 'period_delay_warning':
      case 'period_confirmed_day0':
      case 'period_confirmed_day1':
      case 'period_confirmed_day2':
      case 'birthday':
        return value;
      default:
        return 'generic';
    }
  };

  const formatNotificationTimestamp = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationTypeLabel = (type?: string): string => {
    const normalized = normalizeNotificationType(type);
    return NOTIFICATION_TYPE_LABELS[normalized];
  };

  const handleOpenNotifications = useCallback(() => {
    clearLocalNotifications();
    setNotifications([]);
    const emptySet = new Set<string>();
    setReadIds(emptySet);
    readIdsRef.current = emptySet;
    setVisibleNotificationIds([]);
    setNotificationsError(null);
    setShowNotifications(true);
    // Remote notifications removed - using only local storage
  }, []);

  const handleCloseNotifications = () => {
    setShowNotifications(false);
    setNotificationsError(null);
  };

  // Загрузка данных при запуске
  useEffect(() => {
    // Инициализация Service Worker и уведомлений
    initNotifications();

    loadInitialData();

    // Загружаем badge для вкладки "Узнай себя"
    if (hasUnreadChoices()) {
      setHasNewStoryMessage(true);
      console.log('[ModernNastiaApp] Badge loaded: has unread choices');
    }
  }, []);

  // Подготавливаем текст модалки при выборе даты; ключ берём из GitHub-конфига или из env.
  useEffect(() => {
    if (!selectedDate) {
      setPeriodContent(null);
      setPeriodContentStatus('idle');
      setPeriodContentError(null);
      setPeriodHoroscope(null);
      setPeriodHoroscopeStatus('idle');
      setHoroscopeVisible(false);
      return;
    }

    const controller = new AbortController();
    setPeriodContentStatus('loading');
    setPeriodContentError(null);
    setPeriodContent(null);
    const timingContext = buildPeriodTimingContext(selectedDate, cycles);

    generatePeriodModalContent({
      userName: getDisplayName(PRIMARY_USER_NAME, i18n.language),
      cycleStartISODate: selectedDate.toISOString(),
      cycleTimingContext: timingContext ?? undefined,
      signal: controller.signal,
      apiKey: effectiveClaudeKey,
      claudeProxyUrl: effectiveClaudeProxyUrl,
      openAIApiKey: effectiveOpenAIKey,
      language: i18n.language,
    })
      .then(content => {
        setPeriodContent(content);
        setPeriodContentStatus('idle');
      })
      .catch(error => {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Не удалось получить текст для модального окна', error);
        setPeriodContent(fallbackPeriodContent);
        setPeriodContentStatus('error');
        setPeriodContentError(
          'Похоже, Настенька не успела подготовить свежий текст. Показан запасной вариант.',
        );
      });

    return () => {
      controller.abort();
    };
  }, [
    selectedDate,
    cycles,
    effectiveClaudeKey,
    effectiveClaudeProxyUrl,
    effectiveOpenAIKey,
    fallbackPeriodContent,
    i18n.language,
  ]);

  useEffect(() => {
    if (!selectedDate || !horoscopeVisible) {
      if (!selectedDate) {
        setHoroscopeVisible(false);
      }
      return;
    }

    const controller = new AbortController();
    setPeriodHoroscopeStatus('loading');
    setPeriodHoroscope(null);

    const isoDate = selectedDate.toISOString().split('T')[0];

    fetchDailyHoroscope(
      isoDate,
      controller.signal,
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      cycles,
      i18n.language,
      userProfile,
      userPartner,
    )
      .then(result => {
        const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'de' ? 'de-DE' : 'ru-RU';
        const dateFormatter = new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const formattedDate = dateFormatter.format(selectedDate);

        setPeriodHoroscope({
          text: result.text,
          date: result.date || formattedDate,
          weekRange: result.weekRange,
        });
        setPeriodHoroscopeStatus('idle');
      })
      .catch(error => {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Не удалось получить гороскоп для Насти:', error);
        setPeriodHoroscopeStatus('error');
      });

    return () => {
      controller.abort();
    };
  }, [
    selectedDate,
    horoscopeVisible,
    effectiveClaudeKey,
    effectiveClaudeProxyUrl,
    effectiveOpenAIKey,
    cycles,
    i18n.language,
  ]);

  useEffect(() => {
    if (!showDailyHoroscopeModal) {
      setDailyHoroscope(null);
      setDailyHoroscopeStatus('idle');
      setDailyHoroscopeError(null);
      setDailyLoadingMessages([]);
      setDailyLoadingIndex(0);
      setSergeyBannerDismissed(false);
      setSergeyHoroscope(null);
      setSergeyHoroscopeStatus('idle');
      setSergeyHoroscopeError(null);
      setSergeyLoadingIndex(0);
      setSergeyLoadingMessages(getSergeyLoadingFallback());
      setSergeyLoadingMaxHeight(null);
      setSergeyBannerCopy(null);
      setSergeyBannerCopyStatus('idle');
      setSergeyBannerCopyError(null);
      if (sergeyRequestControllerRef.current) {
        sergeyRequestControllerRef.current.abort();
        sergeyRequestControllerRef.current = null;
      }
      if (sergeyBannerCopyControllerRef.current) {
        sergeyBannerCopyControllerRef.current.abort();
        sergeyBannerCopyControllerRef.current = null;
      }
      if (sergeyLoadingControllerRef.current) {
        sergeyLoadingControllerRef.current.abort();
        sergeyLoadingControllerRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    const sergeyCopyController = new AbortController();
    const sergeyLoadingController = new AbortController();
    sergeyBannerCopyControllerRef.current = sergeyCopyController;
    sergeyLoadingControllerRef.current = sergeyLoadingController;
    const todayIso = new Date().toISOString().split('T')[0];

    setDailyHoroscopeStatus('loading');
    setDailyHoroscopeError(null);
    setDailyLoadingMessages(getDefaultLoadingMessages(i18n.language));
    setDailyLoadingIndex(0);
    setSergeyBannerCopy(null);
    setSergeyBannerCopyStatus('loading');
    setSergeyBannerCopyError(null);
    setSergeyLoadingIndex(0);
    setSergeyLoadingMessages(getSergeyLoadingFallback());
    setSergeyLoadingMaxHeight(null);

    fetchHoroscopeLoadingMessages(
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      controller.signal,
      i18n.language,
    )
      .then(messages => {
        if (!controller.signal.aborted && messages.length > 0) {
          setDailyLoadingMessages(messages);
          setDailyLoadingIndex(0);
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          console.warn('Не удалось получить шуточные статусы загрузки:', error);
        }
      });

    fetchDailyHoroscopeForDate(
      todayIso,
      controller.signal,
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      cyclesRef.current,
      horoscopeMemoryRef.current,
      i18n.language,
      userProfile,
      userPartner,
    )
      .then(result => {
        if (controller.signal.aborted) {
          return;
        }
        const memoryEntry = result.memoryEntry;
        if (memoryEntry) {
          setHoroscopeMemory(prev => mergeHoroscopeMemoryEntries(prev, memoryEntry));
        }
        setDailyHoroscope(result);
        setDailyHoroscopeStatus('idle');
      })
      .catch(error => {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Не удалось получить дневной гороскоп:', error);
        setDailyHoroscope(null);
        setDailyHoroscopeStatus('error');
        setDailyHoroscopeError('Не удалось загрузить гороскоп. Попробуй ещё раз позже.');
      });

    fetchSergeyBannerCopy(
      todayIso,
      sergeyCopyController.signal,
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      horoscopeMemoryRef.current,
      i18n.language,
      userProfile,
      userPartner,
    )
      .then(copy => {
        if (sergeyCopyController.signal.aborted) {
          return;
        }
        sergeyBannerCopyControllerRef.current = null;
        setSergeyBannerCopy(copy);
        setSergeyBannerCopyStatus('success');
      })
      .catch(error => {
        if (sergeyCopyController.signal.aborted) {
          return;
        }
        sergeyBannerCopyControllerRef.current = null;
        console.error('Не удалось получить тексты карточки Серёжи:', error);
        setSergeyBannerCopy(DEFAULT_SERGEY_BANNER_COPY);
        setSergeyBannerCopyStatus('error');
        setSergeyBannerCopyError(
          error instanceof Error ? error.message : 'Не удалось придумать новые фразы.',
        );
      });

    fetchSergeyLoadingMessages(
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      sergeyLoadingController.signal,
      i18n.language,
    )
      .then(messages => {
        if (sergeyLoadingController.signal.aborted) {
          return;
        }
        sergeyLoadingControllerRef.current = null;
        if (messages.length > 0) {
          setSergeyLoadingMessages(messages);
        } else {
          setSergeyLoadingMessages(getSergeyLoadingFallback());
        }
      })
      .catch(error => {
        if (sergeyLoadingController.signal.aborted) {
          return;
        }
        console.warn('Не удалось получить статусы загрузки Серёжи:', error);
        sergeyLoadingControllerRef.current = null;
        setSergeyLoadingMessages(getSergeyLoadingFallback());
      });

    return () => {
      controller.abort();
      sergeyCopyController.abort();
      sergeyLoadingController.abort();
      if (sergeyBannerCopyControllerRef.current === sergeyCopyController) {
        sergeyBannerCopyControllerRef.current = null;
      }
      if (sergeyLoadingControllerRef.current === sergeyLoadingController) {
        sergeyLoadingControllerRef.current = null;
      }
    };
  }, [
    showDailyHoroscopeModal,
    effectiveClaudeKey,
    effectiveClaudeProxyUrl,
    effectiveOpenAIKey,
    i18n.language,
  ]);

  useEffect(() => {
    if (!showDailyHoroscopeModal || dailyHoroscopeStatus !== 'loading' || dailyLoadingMessages.length === 0) {
      return () => undefined;
    }

    const interval = window.setInterval(() => {
      setDailyLoadingIndex(prev => (prev + 1) % dailyLoadingMessages.length);
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [showDailyHoroscopeModal, dailyHoroscopeStatus, dailyLoadingMessages]);

  useEffect(() => {
    if (
      !showDailyHoroscopeModal ||
      sergeyHoroscopeStatus !== 'loading' ||
      sergeyLoadingMessages.length === 0
    ) {
      return () => undefined;
    }

    const interval = window.setInterval(() => {
      setSergeyLoadingIndex(prev => (prev + 1) % sergeyLoadingMessages.length);
    }, 2600);

    return () => {
      window.clearInterval(interval);
    };
  }, [showDailyHoroscopeModal, sergeyHoroscopeStatus, sergeyLoadingMessages.length]);

  useEffect(() => {
    setSergeyLoadingIndex(0);
  }, [sergeyLoadingMessages]);

  useEffect(() => {
    if (!showDailyHoroscopeModal) {
      setSergeyLoadingMaxHeight(null);
      return;
    }
    if (sergeyLoadingMessages.length === 0) {
      setSergeyLoadingMaxHeight(null);
      return;
    }

    const measure = () => {
      const container = sergeyLoadingMeasureRef.current;
      if (!container) {
        return;
      }
      const heights = Array.from(container.children).map(child =>
        (child as HTMLElement).getBoundingClientRect().height,
      );
      if (heights.length === 0) {
        setSergeyLoadingMaxHeight(null);
        return;
      }
      setSergeyLoadingMaxHeight(Math.max(...heights));
    };

    const raf = window.requestAnimationFrame(measure);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [sergeyLoadingMessages, showDailyHoroscopeModal]);

  useEffect(() => {
    if (
      !showDailyHoroscopeModal ||
      (sergeyHoroscopeStatus !== 'loading' && sergeyHoroscopeStatus !== 'success')
    ) {
      return;
    }
    const banner = sergeyBannerRef.current;
    if (!banner) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [sergeyHoroscopeStatus, showDailyHoroscopeModal]);

  const handleSergeyBannerDismiss = useCallback(() => {
    if (sergeyRequestControllerRef.current) {
      sergeyRequestControllerRef.current.abort();
      sergeyRequestControllerRef.current = null;
    }
    setSergeyBannerDismissed(true);
    setSergeyHoroscopeStatus('idle');
    setSergeyHoroscopeError(null);
    setSergeyHoroscope(null);
    setSergeyLoadingIndex(0);
  }, []);

  const handleSergeyHoroscopeRequest = useCallback(() => {
    if (sergeyHoroscopeStatus === 'loading') {
      return;
    }

    const controller = new AbortController();
    sergeyRequestControllerRef.current = controller;

    setSergeyHoroscopeStatus('loading');
    setSergeyHoroscopeError(null);
    setSergeyHoroscope(null);
    setSergeyLoadingIndex(0);

    const todayIso = new Date().toISOString().split('T')[0];

    fetchSergeyDailyHoroscopeForDate(
      todayIso,
      controller.signal,
      effectiveClaudeKey,
      effectiveClaudeProxyUrl,
      effectiveOpenAIKey,
      cyclesRef.current,
      horoscopeMemoryRef.current,
      i18n.language,
      userProfile,
      userPartner,
    )
      .then(result => {
        if (controller.signal.aborted) {
          return;
        }
        sergeyRequestControllerRef.current = null;
        const memoryEntry = result.memoryEntry;
        if (memoryEntry) {
          setHoroscopeMemory(prev => mergeHoroscopeMemoryEntries(prev, memoryEntry));
        }
        setSergeyHoroscope(result);
        setSergeyHoroscopeStatus('success');
      })
      .catch(error => {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Не удалось получить гороскоп для Серёжи:', error);
        sergeyRequestControllerRef.current = null;
        setSergeyHoroscopeStatus('error');
        setSergeyHoroscopeError('Звёзды послали Серёжу подождать. Попробуй ещё раз позже.');
      });
  }, [
    sergeyHoroscopeStatus,
    effectiveClaudeKey,
    effectiveClaudeProxyUrl,
    effectiveOpenAIKey,
  ]);

  const handleInsightToggle = useCallback((type: InsightType) => {
    // Проверяем, открыт ли этот инсайт
    const isExpanded = expandedInsights.has(type);

    if (isExpanded) {
      // Закрываем инсайт
      setExpandedInsights(prev => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });

      // Отменяем запрос для этого инсайта, если он есть
      if (insightControllersRef.current[type]) {
        insightControllersRef.current[type]!.abort();
        insightControllersRef.current[type] = null;
      }
      return;
    }

    // Раскрываем инсайт
    setExpandedInsights(prev => {
      const next = new Set(prev);
      next.add(type);
      return next;
    });

    // Сбрасываем стиль на "научный" при новом раскрытии
    setInsightStyleMode(prev => ({ ...prev, [type]: 'scientific' }));

    // Отменяем предыдущий запрос для этого инсайта, если есть
    if (insightControllersRef.current[type]) {
      insightControllersRef.current[type]!.abort();
      insightControllersRef.current[type] = null;
    }

    // ВСЕГДА делаем новый запрос при раскрытии — сбрасываем старый контент
    setInsightDescriptions(prev => ({ ...prev, [type]: null }));
    setInsightLoadingStates(prev => ({ ...prev, [type]: true }));
    setInsightLoadingPhrases(prev => ({ ...prev, [type]: getRandomLoadingPhrase(i18n.language) }));

    const controller = new AbortController();
    insightControllersRef.current[type] = controller;

    // Подготавливаем данные в зависимости от типа
    let metricData: { value: string; variability?: number; confidence?: number; trend?: number };
    switch (type) {
      case 'cycle-length':
        metricData = {
          value: `${stats.averageLength6Months} дней`,
          variability: stats.variability,
        };
        break;
      case 'next-period':
        metricData = {
          value: formatShortDate(stats.nextPrediction),
          variability: stats.variability,
          confidence: stats.predictionConfidence,
        };
        break;
      case 'fertile-window':
        metricData = {
          value: fertileWindow
            ? `${formatShortDate(fertileWindow.fertileStart)} - ${formatShortDate(fertileWindow.ovulationDay)}`
            : 'Недостаточно данных',
        };
        break;
      case 'trend':
        metricData = {
          value: stats.trend > 0 ? 'Увеличение' : 'Уменьшение',
          trend: stats.trend,
        };
        break;
    }

    generateInsightDescription({
      metricType: type,
      metricData,
      language: i18n.language,
      signal: controller.signal,
      apiKey: effectiveClaudeKey,
      claudeProxyUrl: effectiveClaudeProxyUrl,
      openAIApiKey: effectiveOpenAIKey,
    })
      .then(description => {
        if (controller.signal.aborted) {
          return;
        }
        setInsightDescriptions(prev => ({ ...prev, [type]: description }));
        setInsightLoadingStates(prev => ({ ...prev, [type]: false }));
        insightControllersRef.current[type] = null;
      })
      .catch(error => {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to generate insight description:', error);
        // Используем fallback
        const fallback = getFallbackInsightDescription(type, i18n.language);
        setInsightDescriptions(prev => ({ ...prev, [type]: fallback }));
        setInsightLoadingStates(prev => ({ ...prev, [type]: false }));
        insightControllersRef.current[type] = null;
      });
  }, [
    expandedInsights,
    stats,
    fertileWindow,
    effectiveClaudeKey,
    effectiveClaudeProxyUrl,
    effectiveOpenAIKey,
    i18n.language,
  ]);

  const handleInsightStyleToggle = useCallback((type: InsightType) => {
    setInsightStyleMode(prev => ({
      ...prev,
      [type]: prev[type] === 'scientific' ? 'human' : 'scientific',
    }));
  }, []);

  // Remote config loading removed - using only ENV variables

  const handleDeepLink = useCallback((url: string) => {
    try {
      const parsed = new URL(url, window.location.origin);
      const openValue = parsed.searchParams.get('open');
      if (openValue === 'daily-horoscope') {
        setShowDailyHoroscopeModal(true);
      } else if (openValue === 'notifications') {
        handleOpenNotifications();
      }
    } catch (error) {
      console.warn('Failed to handle deep link:', error);
    }
  }, [handleOpenNotifications]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) {
        return;
      }

      if (data.type === 'nastia-open' && data.payload?.url) {
        handleDeepLink(String(data.payload.url));
        return;
      }

      if (data.type !== 'nastia-notification' || !data.payload) {
        return;
      }

      const payload = data.payload as {
        id?: string;
        title?: string;
        body?: string;
        type?: string;
        sentAt?: string;
        url?: string;
      };

      if (!payload.id) {
        return;
      }

      const notification: NotificationItem = {
        id: payload.id,
        title: payload.title ?? 'Nastia Calendar',
        body: payload.body ?? '',
        sentAt: payload.sentAt ?? new Date().toISOString(),
        type: normalizeNotificationType(payload.type),
      };

      setNotifications(prev => {
        const updated = addSingleNotification(notification, prev, readIdsRef.current);
        return persistNotifications(updated);
      });
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [handleDeepLink, persistNotifications]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const openValue = params.get('open');
      if (openValue === 'daily-horoscope') {
        setShowDailyHoroscopeModal(true);
        params.delete('open');
        const nextQuery = params.toString();
        const newUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (error) {
      console.warn('Failed to parse query params for deep link:', error);
    }
  }, []);

  // Инициализация уведомлений
  const initNotifications = async () => {
    // Проверяем поддержку
    const supported = isNotificationSupported();
    setNotificationSupported(supported);

    if (!supported) {
      console.log('Push notifications not supported');
      return;
    }

    // Регистрируем Service Worker
    await registerServiceWorker();

    // Проверяем текущее разрешение
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const loadInitialData = async () => {
    try {
      // Cloud sync removed - загружаем только из localStorage
      const localData = loadData();
      if (localData) {
        hydratePsychContractHistory(localData.psychContractHistory);
        setCycles(localData.cycles);
        const localMemory = (localData.horoscopeMemory ?? []).slice(-HOROSCOPE_MEMORY_LIMIT);
        setHoroscopeMemory(localMemory);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      dataHydratedRef.current = true;
    }
  };

  // Сохранение данных при изменении
  useEffect(() => {
    if (!dataHydratedRef.current) {
      return;
    }

    const nastiaData: NastiaData = {
      cycles,
      settings: {
        averageCycleLength: 28,
        periodLength: 5,
        notifications: true,
      },
      horoscopeMemory,
      psychContractHistory: getPsychContractHistorySnapshot(),
    };

    // Сохраняем локально
    saveData(nastiaData);

    // Cloud sync removed - using only Supabase now
  }, [cycles, horoscopeMemory]);

  // syncToCloud function removed - using only Supabase now

  // Обработчики авторизации
  const handleAuthSuccess = async () => {
    // После успешной авторизации проверяем профиль
    try {
      const profile = await fetchUserProfile();

      if (!profile || !profile.display_name) {
        // Профиль не заполнен - показываем ProfileSetupModal
        setShowAuthModal(false);
        setProfileSetupMode('setup');
        setShowProfileSetup(true);
      } else {
        // Профиль заполнен - переходим к основному приложению
        setShowAuthModal(false);
        await loadUserProfileData();
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      // В случае ошибки всё равно показываем ProfileSetupModal
      setShowAuthModal(false);
      setProfileSetupMode('setup');
      setShowProfileSetup(true);
    }
  };

  /**
   * Reset all generated content and UI state (called on language change)
   * Keeps: cycles, user data, auth state
   * Clears: all modals, generated content, loading states
   */
  const resetAppState = useCallback(() => {
    console.log('🔄 Resetting app state (language changed)...');

    // Close all modals
    setShowSettings(false);
    setShowDailyHoroscopeModal(false);
    setShowNotifications(false);
    setShowQuestionBubble(false);
    setShowJokeBubble(false);
    setSelectedDate(null); // Closes period modal

    // Clear all generated content
    setPeriodContent(null);
    setPeriodHoroscope(null);
    setDailyHoroscope(null);
    setSergeyHoroscope(null);
    setSergeyBannerCopy(null);

    // Reset loading states
    setPeriodContentStatus('idle');
    setPeriodHoroscopeStatus('idle');
    setDailyHoroscopeStatus('idle');
    setSergeyHoroscopeStatus('idle');
    setSergeyBannerCopyStatus('idle');

    // Clear errors
    setPeriodContentError(null);
    setDailyHoroscopeError(null);
    setSergeyHoroscopeError(null);
    setSergeyBannerCopyError(null);

    // Reset loading messages
    setDailyLoadingMessages([]);
    setDailyLoadingIndex(0);
    setSergeyLoadingMessages(getSergeyLoadingFallback());
    setSergeyLoadingIndex(0);

    // Clear insight descriptions
    setInsightDescriptions({
      'cycle-length': null,
      'next-period': null,
      'fertile-window': null,
      'trend': null,
    });
    setInsightLoadingStates({
      'cycle-length': false,
      'next-period': false,
      'fertile-window': false,
      'trend': false,
    });
    setInsightLoadingPhrases({
      'cycle-length': null,
      'next-period': null,
      'fertile-window': null,
      'trend': null,
    });

    // Cancel all ongoing insight requests
    Object.values(insightControllersRef.current).forEach((controller) => {
      if (controller) {
        controller.abort();
      }
    });
    insightControllersRef.current = {
      'cycle-length': null,
      'next-period': null,
      'fertile-window': null,
      'trend': null,
    };

    console.log('✅ App state reset complete');
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAuthUser(null);
      setShowAuthModal(true);
      setUserProfile(null);
      setUserPartner(null);
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Ошибка при выходе из аккаунта');
    }
  };

  // Cloud settings removed - using only Supabase now

  // Обработчики для уведомлений
  const handleEnableNotifications = async () => {
    if (!notificationSupported) {
      alert('Push-уведомления не поддерживаются в этом браузере');
      return;
    }

    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        const subscription = await subscribeToPush();
        if (subscription) {
          // Push subscription saved locally
          alert('Уведомления успешно включены');
        } else{
          await updateNotificationSettings({ enabled: false });
          alert('Не удалось создать подписку на уведомления');
        }
      } else {
        alert('Необходимо разрешение на уведомления');
        await updateNotificationSettings({ enabled: false });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      await updateNotificationSettings({ enabled: false });
      alert('Ошибка при включении уведомлений');
    }
  };

  const handleDisableNotifications = async () => {
    try {
      // Получаем текущую подписку перед отпиской
      const registration = await navigator.serviceWorker.ready;
      // Push subscription removed locally
      await unsubscribeFromPush();
      alert('Уведомления отключены');
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  };

  const updateNotificationSettings = async (settings: NotificationSettings) => {
    setNotificationSettings(settings);
    saveNotificationSettings(settings);
    // Cloud subscription sync removed - using only local storage
  };

  const handleTestNotification = async () => {
    if (notificationPermission !== 'granted') {
      alert('Сначала разрешите уведомления');
      return;
    }
    try {
      await sendTestNotification();
      alert('Тестовое уведомление отправлено! Проверьте уведомления.');
    } catch (error) {
      console.error('Test notification failed:', error);
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Не удалось отправить уведомление'}`);
    }
  };

  // Получение дней месяца для календаря
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    // Преобразуем: воскресенье (0) становится 6, понедельник (1) становится 0, и т.д.
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days = [];

    // Добавляем пустые дни для выравнивания (начиная с понедельника)
    for (let i = 0; i < adjustedStartingDay; i++) {
      days.push(null);
    }

    // Добавляем дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Переключение месяца
  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  // Добавление нового цикла
  const addCycle = async (date: Date) => {
    if (!authUser) {
      alert('Войдите в аккаунт чтобы добавить цикл');
      return;
    }

    try {
      // Создаём цикл в Supabase
      const supabaseCycle = await createCycle({
        start_date: dateToISOString(date),
      });

      // Конвертируем в старый формат CycleData для совместимости
      const newCycle: CycleData = {
        id: supabaseCycle.id,
        startDate: isoStringToDate(supabaseCycle.start_date),
        notes: '',
      };

      console.log('✅ Created cycle:', newCycle);
      setCycles([...cycles, newCycle]);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error adding cycle:', error);
      alert('Ошибка при добавлении цикла');
    }
  };

  // Удаление цикла
  const deleteCycle = async (cycleId: string) => {
    if (!authUser) {
      alert(t('alerts.loginRequired'));
      return;
    }

    console.log('🗑️ Deleting cycle:', cycleId);
    console.log('Current cycles:', cycles.map(c => c.id));

    try {
      // Удаляем из Supabase
      await deleteSupabaseCycle(cycleId);
      console.log('✅ Deleted from Supabase');

      // Обновляем локальный state
      const updatedCycles = cycles.filter(cycle => cycle.id !== cycleId);
      console.log('✅ Updated cycles:', updatedCycles.map(c => c.id));
      setCycles(updatedCycles);
    } catch (error) {
      console.error('❌ Error deleting cycle:', error);
      alert(t('alerts.deleteCycleError'));
    }
  };

  // Обработчик клика на дату - открывает модальное окно для добавления начала менструации
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Получение CSS класса для дня
  const getDayClasses = (date: Date | null) => {
    if (!date) return `${styles.dayCell} ${styles.invisible}`;

    let classes = styles.dayCell;

    if (isToday(date)) {
      classes += ` ${styles.today}`;
    } else if (isPeriodStartDay(date, cycles)) {
      // Показываем только первый день цикла (начало менструации)
      classes += ` ${styles.period}`;
    } else if (isPredictedPeriod(date, cycles)) {
      classes += ` ${styles.predicted}`;
      if (nextPredictionDate && diffInDays(date, nextPredictionDate) === 0) {
        classes += ` ${styles.predictedFocus}`;
      }
    } else if (isOvulationDay(date, cycles)) {
      classes += ` ${styles.ovulation}`;
    } else if (isFertileDay(date, cycles)) {
      classes += ` ${styles.fertile}`;
    }

    return classes;
  };

  const monthDays = getMonthDays(currentDate);
  const daysUntilNext = getDaysUntilNext(cycles);

  return (
    <div className={styles.container}>
      <div className={styles.appWrapper}>
        {/* Заголовок */}
        {/* Header скрыт на вкладке "Узнай себя" */}
        {activeTab !== 'discover' && (
          <div className={styles.header}>
            {/* Cloud sync indicator removed - using only Supabase now */}

            <div className={styles.headerHoroscopeCard}>
              <button
                className={styles.headerHoroscopeButton}
                onClick={() => setShowDailyHoroscopeModal(true)}
                type="button"
              >
                <span className={styles.dailyHoroscopeIcon} aria-hidden="true">🔮</span>
                <div>
                  <div className={styles.dailyHoroscopeTitle}>{t('header.horoscopeButton.title')}</div>
                  <div className={styles.dailyHoroscopeSubtitle}>{t('header.horoscopeButton.subtitle')}</div>
                </div>
              </button>
              <button
                onClick={handleOpenNotifications}
                className={styles.headerNotificationButton}
                type="button"
                aria-label={unreadCount > 0 ? t('header.notificationButton.hasUnread', { count: unreadCount }) : t('header.notificationButton.open')}
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Старая навигация убрана - теперь используется GlassTabBar внизу */}

        {/* Календарь */}
        {activeTab === 'calendar' && (
          <div className={styles.calendarPanel}>
            {/* Навигация по месяцам */}
            <div className={`${styles.calendarHeader} ${styles.calendarElementAnimated} ${visibleCalendarElements.includes('calendar-header') ? styles.calendarElementVisible : ''}`}>
              <button
                onClick={() => changeMonth('prev')}
                className={styles.navButton}
              >
                <ChevronLeft size={20} color="var(--nastia-dark)" />
              </button>
              <h2 className={styles.monthTitle}>
                {getMonthYear(currentDate, i18n.language === 'en' ? 'en-US' : i18n.language === 'de' ? 'de-DE' : 'ru-RU')}
              </h2>
              <button
                onClick={() => changeMonth('next')}
                className={styles.navButton}
              >
                <ChevronRight size={20} color="var(--nastia-dark)" />
              </button>
            </div>

            {/* Дни недели */}
            <div className={`${styles.weekDays} ${styles.calendarElementAnimated} ${visibleCalendarElements.includes('calendar-weekdays') ? styles.calendarElementVisible : ''}`}>
              {[t('weekDays.mon'), t('weekDays.tue'), t('weekDays.wed'), t('weekDays.thu'), t('weekDays.fri'), t('weekDays.sat'), t('weekDays.sun')].map(day => (
                <div key={day} className={styles.weekDay}>
                  {day}
                </div>
              ))}
            </div>

            {/* Дни месяца */}
            <div className={`${styles.calendarGrid} ${styles.calendarElementAnimated} ${visibleCalendarElements.includes('calendar-grid') ? styles.calendarElementVisible : ''}`}>
              {monthDays.map((date, index) => (
                <button
                  key={index}
                  className={getDayClasses(date)}
                  onClick={() => date && handleDateClick(date)}
                >
                  <div className={styles.dayNumber}>{date ? date.getDate() : ''}</div>
                </button>
              ))}
            </div>

            {/* Легенда */}
            <div className={`${styles.legend} ${styles.calendarElementAnimated} ${visibleCalendarElements.includes('calendar-legend') ? styles.calendarElementVisible : ''}`}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.period}`}></div>
                <span>{t('legend.period')}</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.predicted}`}></div>
                <span>{t('legend.forecast')}</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.ovulation}`}></div>
                <span>{t('legend.ovulation')}</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.fertile}`}></div>
                <span>{t('legend.fertile')}</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.today}`}></div>
                <span>{t('legend.today')}</span>
              </div>
            </div>

          </div>
        )}
        {/* Insights панель */}
        {cycles.length >= 2 && activeTab === 'calendar' && (
          <div className={`${styles.insightsCard} ${styles.calendarElementAnimated} ${visibleCalendarElements.includes('insights-card') ? styles.calendarElementVisible : ''}`}>
            <h3 className={styles.insightsTitle}>{t('insights.title')}</h3>

            <div className={styles.insightsGrid}>
              {/* Средняя длина и вариативность */}
              <div className={styles.insightCard}>
                <div className={styles.insightHeader}>
                  <div>
                    <div className={styles.insightLabel}>{t('insights.averageCycle')}</div>
                    <div className={styles.insightValue}>
                      {stats.averageLength6Months} {t('insights.days')}
                      {stats.variability > 0 && (
                        <span className={styles.insightVariability}>
                          ±{stats.variability.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {stats.variability <= 2 && (
                      <div className={styles.insightBadge + ' ' + styles.good}>{t('insights.excellentStability')}</div>
                    )}
                    {stats.variability > 2 && stats.variability <= 5 && (
                      <div className={styles.insightBadge + ' ' + styles.normal}>{t('insights.normal')}</div>
                    )}
                    {stats.variability > 5 && (
                      <div className={styles.insightBadge + ' ' + styles.warning}>{t('insights.highVariability')}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`${styles.insightExpandButton} ${expandedInsights.has('cycle-length') ? styles.expanded : ''}`}
                    onClick={() => handleInsightToggle('cycle-length')}
                    aria-label={t('insights.expandDescription')}
                  >
                    <ChevronDown size={24} />
                  </button>
                </div>
                {expandedInsights.has('cycle-length') && (
                  <div className={styles.insightExpandedContent}>
                    {insightLoadingStates['cycle-length'] ? (
                      <div className={styles.insightLoading}>
                        <div className={styles.insightLoadingEmoji}>{insightLoadingPhrases['cycle-length']?.emoji}</div>
                        <div className={styles.insightLoadingText}>{insightLoadingPhrases['cycle-length']?.text}</div>
                      </div>
                    ) : insightDescriptions['cycle-length'] ? (
                      <>
                        <div className={styles.insightStyleToggle}>
                          <button
                            type="button"
                            className={`${styles.insightStyleButton} ${insightStyleMode['cycle-length'] === 'scientific' ? styles.active : ''}`}
                            onClick={() => handleInsightStyleToggle('cycle-length')}
                          >
                            {t('insights.scientific')}
                          </button>
                          <button
                            type="button"
                            className={`${styles.insightStyleButton} ${insightStyleMode['cycle-length'] === 'human' ? styles.active : ''}`}
                            onClick={() => handleInsightStyleToggle('cycle-length')}
                          >
                            {t('insights.human')}
                          </button>
                        </div>
                        <div key={insightStyleMode['cycle-length']} className={styles.insightDescription}>
                          {insightStyleMode['cycle-length'] === 'scientific'
                            ? insightDescriptions['cycle-length'].scientific
                            : insightDescriptions['cycle-length'].human}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Следующая менструация */}
              <div className={styles.insightCard}>
                <div className={styles.insightHeader}>
                  <div>
                    <div className={styles.insightLabel}>{t('insights.nextPeriod')}</div>
                    <div className={styles.insightValue}>
                      {formatShortDate(stats.nextPrediction)}
                      {stats.variability > 0 && (
                        <span className={styles.insightRange}>
                          ±{Math.ceil(stats.variability)} {t('insights.daysShort')}
                        </span>
                      )}
                    </div>
                    {stats.predictionConfidence > 0 && (
                      <div className={styles.insightConfidence}>
                        {t('insights.confidence', { value: stats.predictionConfidence })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`${styles.insightExpandButton} ${expandedInsights.has('next-period') ? styles.expanded : ''}`}
                    onClick={() => handleInsightToggle('next-period')}
                    aria-label={t('insights.expandDescription')}
                  >
                    <ChevronDown size={24} />
                  </button>
                </div>
                {expandedInsights.has('next-period') && (
                  <div className={styles.insightExpandedContent}>
                    {insightLoadingStates['next-period'] ? (
                      <div className={styles.insightLoading}>
                        <div className={styles.insightLoadingEmoji}>{insightLoadingPhrases['next-period']?.emoji}</div>
                        <div className={styles.insightLoadingText}>{insightLoadingPhrases['next-period']?.text}</div>
                      </div>
                    ) : insightDescriptions['next-period'] ? (
                      <>
                        <div className={styles.insightStyleToggle}>
                          <button
                            type="button"
                            className={`${styles.insightStyleButton} ${insightStyleMode['next-period'] === 'scientific' ? styles.active : ''}`}
                            onClick={() => handleInsightStyleToggle('next-period')}
                          >
                            {t('insights.scientific')}
                          </button>
                          <button
                            type="button"
                            className={`${styles.insightStyleButton} ${insightStyleMode['next-period'] === 'human' ? styles.active : ''}`}
                            onClick={() => handleInsightStyleToggle('next-period')}
                          >
                            {t('insights.human')}
                          </button>
                        </div>
                        <div key={insightStyleMode['next-period']} className={styles.insightDescription}>
                          {insightStyleMode['next-period'] === 'scientific'
                            ? insightDescriptions['next-period'].scientific
                            : insightDescriptions['next-period'].human}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Фертильное окно */}
              {fertileWindow && (
                <div className={styles.insightCard}>
                  <div className={styles.insightHeader}>
                    <div>
                      <div className={styles.insightLabel}>{t('insights.fertileWindow')}</div>
                      <div className={styles.insightValue}>
                        {formatShortDate(fertileWindow.fertileStart)} - {formatShortDate(fertileWindow.ovulationDay)}
                      </div>
                      <div className={styles.insightSubtext}>
                        {t('insights.ovulationDay', { date: formatShortDate(fertileWindow.ovulationDay) })}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.insightExpandButton} ${expandedInsights.has('fertile-window') ? styles.expanded : ''}`}
                      onClick={() => handleInsightToggle('fertile-window')}
                      aria-label={t('insights.expandDescription')}
                    >
                      <ChevronDown size={24} />
                    </button>
                  </div>
                  {expandedInsights.has('fertile-window') && (
                    <div className={styles.insightExpandedContent}>
                      {insightLoadingStates['fertile-window'] ? (
                        <div className={styles.insightLoading}>
                          <div className={styles.insightLoadingEmoji}>{insightLoadingPhrases['fertile-window']?.emoji}</div>
                          <div className={styles.insightLoadingText}>{insightLoadingPhrases['fertile-window']?.text}</div>
                        </div>
                      ) : insightDescriptions['fertile-window'] ? (
                        <>
                          <div className={styles.insightStyleToggle}>
                            <button
                              type="button"
                              className={`${styles.insightStyleButton} ${insightStyleMode['fertile-window'] === 'scientific' ? styles.active : ''}`}
                              onClick={() => handleInsightStyleToggle('fertile-window')}
                            >
                              {t('insights.scientific')}
                            </button>
                            <button
                              type="button"
                              className={`${styles.insightStyleButton} ${insightStyleMode['fertile-window'] === 'human' ? styles.active : ''}`}
                              onClick={() => handleInsightStyleToggle('fertile-window')}
                            >
                              {t('insights.human')}
                            </button>
                          </div>
                          <div key={insightStyleMode['fertile-window']} className={styles.insightDescription}>
                            {insightStyleMode['fertile-window'] === 'scientific'
                              ? insightDescriptions['fertile-window'].scientific
                              : insightDescriptions['fertile-window'].human}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Тренд */}
              {Math.abs(stats.trend) > 0.1 && (
                <div className={styles.insightCard}>
                  <div className={styles.insightHeader}>
                    <div>
                      <div className={styles.insightLabel}>{t('insights.trend')}</div>
                      <div className={styles.insightValue}>
                        {stats.trend > 0 ? t('insights.increasing') : t('insights.decreasing')}
                      </div>
                      <div className={styles.insightSubtext}>
                        {Math.abs(stats.trend).toFixed(1)} {t('insights.daysPerCycle')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.insightExpandButton} ${expandedInsights.has('trend') ? styles.expanded : ''}`}
                      onClick={() => handleInsightToggle('trend')}
                      aria-label={t('insights.expandDescription')}
                    >
                      <ChevronDown size={24} />
                    </button>
                  </div>
                  {expandedInsights.has('trend') && (
                    <div className={styles.insightExpandedContent}>
                      {insightLoadingStates['trend'] ? (
                        <div className={styles.insightLoading}>
                          <div className={styles.insightLoadingEmoji}>{insightLoadingPhrases['trend']?.emoji}</div>
                          <div className={styles.insightLoadingText}>{insightLoadingPhrases['trend']?.text}</div>
                        </div>
                      ) : insightDescriptions['trend'] ? (
                        <>
                          <div className={styles.insightStyleToggle}>
                            <button
                              type="button"
                              className={`${styles.insightStyleButton} ${insightStyleMode['trend'] === 'scientific' ? styles.active : ''}`}
                              onClick={() => handleInsightStyleToggle('trend')}
                            >
                              {t('insights.scientific')}
                            </button>
                            <button
                              type="button"
                              className={`${styles.insightStyleButton} ${insightStyleMode['trend'] === 'human' ? styles.active : ''}`}
                              onClick={() => handleInsightStyleToggle('trend')}
                            >
                              {t('insights.human')}
                            </button>
                          </div>
                          <div key={insightStyleMode['trend']} className={styles.insightDescription}>
                            {insightStyleMode['trend'] === 'scientific'
                              ? insightDescriptions['trend'].scientific
                              : insightDescriptions['trend'].human}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Краткая статистика */}
        {activeTab === 'calendar' && (
          <div className={`${styles.card} ${styles.statsCard} ${styles.calendarElementAnimated} ${visibleCalendarElements.includes('stats-card') ? styles.calendarElementVisible : ''}`}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{daysUntilNext}</div>
                <div className={styles.statLabel}>{t('stats.daysUntilNext')}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{stats.cycleCount}</div>
                <div className={styles.statLabel}>{t('stats.cyclesTracked')}</div>
              </div>
            </div>

            {/* График длины циклов */}
            {cycles.length >= 2 && (
              <div className={styles.chartSection}>
                <CycleLengthChart cycles={cycles} />
              </div>
            )}
          </div>
        )}

        {/* Вкладка: Узнай себя (интерактивная история) */}
        {/* ВАЖНО: Рендерим всегда, но скрываем через CSS, чтобы процесс продолжался в фоне */}
        <div style={{ display: activeTab === 'discover' ? 'block' : 'none' }}>
          <DiscoverTabV2
            hasAiCredentials={hasAiCredentials}
            effectiveClaudeKey={effectiveClaudeKey}
            effectiveClaudeProxyUrl={effectiveClaudeProxyUrl}
            effectiveOpenAIKey={effectiveOpenAIKey}
            effectiveOpenAIProxyUrl={effectiveOpenAIProxyUrl}
            personalizedPlanetMessages={personalizedPlanetMessages}
            isLoadingPersonalizedMessages={isLoadingPersonalizedMessages}
            onNewStoryMessage={() => setHasNewStoryMessage(true)}
          />
        </div>

        {/* Вкладка: Циклы */}
        {activeTab === 'cycles' && (
          <div className={`${styles.card} ${styles.historyCyclesCard}`}>
            <div className={styles.historyCyclesHeader}>
              <h3 className={styles.statsTitle}>{t('cycles.title', { count: cycles.length })}</h3>
            </div>
            {cycles.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{t('cycles.noRecords')}</p>
                <p className={styles.emptyStateHint}>
                  {t('cycles.emptyHint')}
                </p>
              </div>
            ) : (
              <div className={styles.cyclesListContainer}>
                {cycles
                  .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  .map((cycle, index, sortedCycles) => {
                    const nextCycle = sortedCycles[index + 1];
                    const daysBetween = nextCycle
                      ? diffInDays(new Date(cycle.startDate), new Date(nextCycle.startDate))
                      : null;
                    const isVisible = visibleCycleIds.includes(cycle.id);

                    // Определяем картинку по номеру месяца (01-12)
                    const cycleDate = new Date(cycle.startDate);
                    const monthNumber = (cycleDate.getMonth() + 1).toString().padStart(2, '0'); // 01-12
                    const monthImageUrl = `${process.env.PUBLIC_URL}/images/calendar-months/${monthNumber}.png`;

                    return (
                      <React.Fragment key={cycle.id}>
                        <div className={`${styles.cycleItem} ${isVisible ? styles.cycleItemVisible : ''}`}>
                          <MiniCalendar
                            date={cycleDate}
                            imageUrl={monthImageUrl}
                            onDelete={() => deleteCycle(cycle.id)}
                          />
                        </div>
                        {daysBetween !== null && (
                          <div className={`${styles.timelineGap} ${isVisible ? styles.timelineGapVisible : ''}`}>
                            <div className={styles.timelineGapLine} />
                            <div className={styles.timelineGapBadge}>
                              <span className={styles.timelineGapDays}>{daysBetween}</span>
                              <span className={styles.timelineGapLabel}>
                                {t('cycles.daysLabel', { count: daysBetween })}
                              </span>
                            </div>
                            <div className={styles.timelineGapLine} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {showNotifications && (
        <div className={styles.modal}>
          <div className={styles.notificationsModal}>
            <div className={styles.notificationsHeader}>
              <h3 className={styles.settingsTitle}>{t('notifications.title')}</h3>
              <button
                onClick={handleCloseNotifications}
                className={styles.closeButton}
                aria-label={t('common:close')}
              >
                ✕
              </button>
            </div>

            <div className={styles.notificationsBody}>
              {notificationsLoading ? (
                <div className={styles.notificationsSkeletonList}>
                  {[0, 1, 2].map(index => (
                    <div key={index} className={styles.notificationSkeletonCard}>
                      <div className={styles.notificationSkeletonTitle} />
                      <div className={styles.notificationSkeletonLine} />
                      <div className={styles.notificationSkeletonMeta}>
                        <span />
                        <span />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notificationsError ? (
                <div className={styles.notificationErrorState}>
                  <p>{notificationsError}</p>
                  <button
                    type="button"
                    className={styles.notificationRetryButton}
                    onClick={() => {
                      setNotificationsError(null);
                      // Remote notifications removed - no retry functionality
                    }}
                  >
                    {t('common:close')}
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className={styles.notificationEmptyState}>
                  <img
                    src={process.env.PUBLIC_URL + '/nastia-empty.png'}
                    alt={t('notifications.emptyAlt')}
                    className={styles.emptyStateImage}
                  />
                  <p className={styles.notificationEmpty}>
                    {t('notifications.emptyMessage')}
                  </p>
                </div>
              ) : (
                <div className={styles.notificationsList}>
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`${styles.notificationCard} ${visibleNotificationIds.includes(notification.id) ? styles.notificationCardVisible : ''}`}
                    >
                      <div className={styles.notificationTitle}>
                        {notification.title}
                      </div>
                      <div className={styles.notificationBody}>{notification.body}</div>
                      <div className={styles.notificationMeta}>
                        <span>{getNotificationTypeLabel(notification.type)}</span>
                        <span>{formatNotificationTimestamp(notification.sentAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для добавления начала менструации */}
      {selectedDate && (
        <div className={styles.modal}>
          <div className={`${styles.modalContent} ${styles.periodModal}`}>
            <div className={`${styles.settingsHeader} ${styles.periodHeader}`}>
              <h3 className={styles.settingsTitle}>
                {t('periodModal.title')}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className={styles.closeButton}
                aria-label={t('common:close')}
              >
                ✕
              </button>
            </div>
            <div className={styles.periodModalBody}>
              <div className={styles.periodIconWrapper}>
                <div className={styles.periodIcon}>🌸</div>
              </div>

              <div className={styles.periodContent}>
                <p className={styles.periodDate}>
                  {formatDate(selectedDate, i18n.language === 'en' ? 'en-US' : i18n.language === 'de' ? 'de-DE' : 'ru-RU')}
                </p>

                {periodContentStatus === 'loading' ? (
                  <div className={styles.periodChatSkeleton}>
                    <div className={styles.periodSkeletonBubble} style={{ width: '78%' }}></div>
                    <div className={styles.periodSkeletonBubble} style={{ width: '90%' }}></div>
                  </div>
                ) : (
                  <div className={styles.periodMessages} aria-live="polite">
                    <div
                      className={`${styles.periodMessage} ${styles.questionBubble} ${showQuestionBubble ? styles.periodMessageVisible : ''}`}
                    >
                      {activePeriodContent.question}
                    </div>
                    <div
                      className={`${styles.periodMessage} ${styles.jokeBubble} ${showJokeBubble ? styles.periodMessageVisible : ''}`}
                    >
                      <span className={styles.periodWisdomLabel}>{t('periodModal.wisdomLabel')}</span>
                      <div className={styles.periodWisdomContent}>
                        {activePeriodContent.joke.emoji ? (
                          <span className={styles.periodHintEmoji} aria-hidden="true">
                            {activePeriodContent.joke.emoji}
                          </span>
                        ) : null}
                        <span>{activePeriodContent.joke.text}</span>
                      </div>
                    </div>
                  </div>
                )}

                {periodContentStatus === 'error' && periodContentError && (
                  <p className={styles.periodContentError}>{periodContentError}</p>
                )}
              </div>

              <div className={styles.periodHoroscopeSection}>
                {horoscopeVisible ? (
                  periodHoroscopeStatus === 'loading' ? (
                    <div className={styles.periodHoroscopeSkeleton}>
                      <div className={styles.periodHoroscopeSkeletonHeader} />
                      <div className={styles.periodHoroscopeSkeletonLine} />
                      <div className={styles.periodHoroscopeSkeletonLine} style={{ width: '85%' }} />
                      <div className={styles.periodHoroscopeSkeletonLine} style={{ width: '78%' }} />
                    </div>
                  ) : periodHoroscope ? (
                    <div className={styles.periodHoroscopeCard}>
                      <div className={styles.periodHoroscopeHeader}>
                        <span className={styles.periodHoroscopeTitle}>{t('periodModal.horoscope.title')}</span>
                        {periodHoroscope.weekRange ? (
                          <span className={styles.periodHoroscopeRange}>{periodHoroscope.weekRange}</span>
                        ) : null}
                      </div>
                      <div className={styles.periodHoroscopeText}>
                        {periodHoroscope.text.split('\n\n').map((paragraph, index) => (
                          <p key={index}>{paragraph.replace(/\*\*/g, '').replace(/\*\*/g, '')}</p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.periodHoroscopeError}>
                      {t('periodModal.horoscope.error')}
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    className={styles.periodHoroscopeCTA}
                    onClick={() => {
                      setHoroscopeVisible(true);
                      setPeriodHoroscopeStatus('loading');
                    }}
                  >
                    <span className={styles.periodHoroscopeCTAIcon}>🔮</span>
                    <div>
                      <div className={styles.periodHoroscopeCTATitle}>{t('periodModal.horoscope.ctaTitle')}</div>
                      <div className={styles.periodHoroscopeCTASubtitle}>
                        {t('periodModal.horoscope.ctaSubtitle')}
                      </div>
                    </div>
                  </button>
                )}
              </div>

              <div className={styles.periodActions}>
                <button
                  onClick={() => addCycle(selectedDate)}
                  className={`${styles.bigButton} ${styles.primaryButton}`}
                >
                  {t('periodModal.buttons.add')}
                </button>
                <button
                  onClick={() => setSelectedDate(null)}
                  className={`${styles.bigButton} ${styles.secondaryButton}`}
                >
                  {t('periodModal.buttons.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно настроек */}
      {showSettings && (
        <div className={styles.modal}>
          <div className={`${styles.modalContent} ${styles.settingsModal}`}>
            <div className={styles.settingsHeader}>
              <h3 className={styles.settingsTitle}>
                {t('settings:title')}
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className={styles.closeButton}
                aria-label={t('common:close')}
              >
                ✕
              </button>
            </div>

            <div className={styles.settingsForm}>
              {/* Cloud sync section removed - using only Supabase now */}

              {/* Секция уведомлений */}
              <h4 className={styles.sectionTitle}>
                {t('settings:pushNotifications.sectionTitle')}
              </h4>

              {!notificationSupported ? (
                <p className={styles.formInfo}>
                  {t('settings:pushNotifications.notSupported')}
                </p>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <input
                        type="checkbox"
                        checked={notificationSettings.enabled}
                        onChange={async (e) => {
                          const enabled = e.target.checked;
                          await updateNotificationSettings({ enabled });
                          if (enabled) {
                            handleEnableNotifications();
                          } else {
                            handleDisableNotifications();
                          }
                        }}
                        className={styles.checkbox}
                      />
                      <span>{t('settings:pushNotifications.enable')}</span>
                    </label>
                  </div>

                  {notificationPermission === 'denied' && (
                    <p className={styles.formInfo} style={{ color: '#ef4444' }}>
                      {t('settings:pushNotifications.denied')}
                    </p>
                  )}


                  {notificationPermission === 'granted' && (
                    <div className={styles.formGroup}>
                      <button
                        onClick={handleTestNotification}
                        className={styles.bigButton}
                      >
                        {t('settings:pushNotifications.testButton')}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Разделитель */}
              <div className={styles.sectionDivider}></div>

              {/* Секция языка */}
              <h4 className={styles.sectionTitle}>
                {t('settings:language.sectionTitle')}
              </h4>

              <p className={styles.formInfo} style={{ marginBottom: '0.75rem' }}>
                {t('settings:language.description')}
              </p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <input
                    type="radio"
                    name="language"
                    value="ru"
                    checked={i18n.language === 'ru'}
                    onChange={async () => {
                      await i18n.changeLanguage('ru');
                      const success = await updateUserLanguage('ru');
                      if (!success) {
                        console.error('Failed to save language to database');
                      }
                      resetAppState(); // Clear all generated content
                    }}
                    className={styles.radio}
                  />
                  <span>{t('settings:language.russian')}</span>
                </label>
                <label className={styles.formLabel}>
                  <input
                    type="radio"
                    name="language"
                    value="en"
                    checked={i18n.language === 'en'}
                    onChange={async () => {
                      await i18n.changeLanguage('en');
                      const success = await updateUserLanguage('en');
                      if (!success) {
                        console.error('Failed to save language to database');
                      }
                      resetAppState(); // Clear all generated content
                    }}
                    className={styles.radio}
                  />
                  <span>{t('settings:language.english')}</span>
                </label>
                <label className={styles.formLabel}>
                  <input
                    type="radio"
                    name="language"
                    value="de"
                    checked={i18n.language === 'de'}
                    onChange={async () => {
                      await i18n.changeLanguage('de');
                      const success = await updateUserLanguage('de');
                      if (!success) {
                        console.error('Failed to save language to database');
                      }
                      resetAppState(); // Clear all generated content
                    }}
                    className={styles.radio}
                  />
                  <span>{t('settings:language.german')}</span>
                </label>
              </div>

              {/* Разделитель */}
              <div className={styles.sectionDivider}></div>

              {/* Секция профиля */}
              <h4 className={styles.sectionTitle}>
                {t('settings:profile.sectionTitle')}
              </h4>

              {userProfile ? (
                <>
                  <div className={styles.formGroup}>
                    <p className={styles.formInfo}>
                      👤 <strong>{userProfile.display_name ? getDisplayName(userProfile.display_name, i18n.language) : t('settings:profile.notSpecified')}</strong>
                    </p>
                    {userProfile.birth_date && (
                      <p className={styles.formInfo}>
                        🎂 {new Date(userProfile.birth_date).toLocaleDateString(
                          i18n.language === 'en' ? 'en-US' : i18n.language === 'de' ? 'de-DE' : 'ru-RU'
                        )}
                        {userProfile.birth_time && ` ${i18n.language === 'en' ? 'at' : i18n.language === 'de' ? 'um' : 'в'} ${userProfile.birth_time.substring(0, 5)}`}
                      </p>
                    )}
                    {userProfile.birth_place && (
                      <p className={styles.formInfo}>
                        📍 {userProfile.birth_place}
                      </p>
                    )}
                  </div>

                  {userPartner && (
                    <div className={styles.formGroup}>
                      <p className={styles.formInfo}>
                        💑 <strong>{t('settings:profile.partnerLabel')}</strong> {userPartner.name}
                      </p>
                      {userPartner.birth_date && (
                        <p className={styles.formInfo}>
                          🎂 {new Date(userPartner.birth_date).toLocaleDateString(
                            i18n.language === 'en' ? 'en-US' : i18n.language === 'de' ? 'de-DE' : 'ru-RU'
                          )}
                          {userPartner.birth_time && ` ${i18n.language === 'en' ? 'at' : i18n.language === 'de' ? 'um' : 'в'} ${userPartner.birth_time.substring(0, 5)}`}
                        </p>
                      )}
                      {userPartner.birth_place && (
                        <p className={styles.formInfo}>
                          📍 {userPartner.birth_place}
                        </p>
                      )}
                      <button
                        onClick={async () => {
                          if (window.confirm(t('settings:profile.deletePartnerConfirm'))) {
                            const success = await deletePartner();
                            if (success) {
                              setUserPartner(null);
                            } else {
                              alert(t('settings:profile.deletePartnerError'));
                            }
                          }
                        }}
                        className={`${styles.bigButton} ${styles.dangerButton}`}
                        style={{ marginTop: '0.5rem' }}
                      >
                        {t('settings:profile.deletePartnerButton')}
                      </button>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <button
                      onClick={() => {
                        setProfileSetupMode('edit');
                        setShowProfileSetup(true);
                      }}
                      className={`${styles.bigButton} ${styles.primaryButton}`}
                    >
                      {t('settings:profile.editButton')}
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.formGroup}>
                  <p className={styles.formInfo}>
                    {t('settings:profile.loading')}
                  </p>
                </div>
              )}

              {/* Разделитель */}
              <div className={styles.sectionDivider}></div>

              {/* Секция аккаунта */}
              <h4 className={styles.sectionTitle}>
                {t('settings:account.sectionTitle')}
              </h4>

              {authUser && (
                <div className={styles.formGroup}>
                  <p className={styles.formInfo}>
                    📧 {authUser.email}
                  </p>
                </div>
              )}

              <div className={styles.formGroup}>
                <button
                  onClick={handleLogout}
                  className={`${styles.bigButton} ${styles.dangerButton}`}
                >
                  {t('settings:account.logoutButton')}
                </button>
              </div>

              {/* Cloud settings removed - no save button needed */}
              <div className={styles.settingsActions}>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`${styles.bigButton} ${styles.primaryButton}`}
                >
                  {t('settings:closeButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно дневного гороскопа */}
      {showDailyHoroscopeModal && (
        <div className={styles.modal}>
          <div className={`${styles.modalContent} ${styles.dailyHoroscopeModal}`}>
            {/* Постоянный фон с цветными пятнами - всегда виден */}
            <div className={styles.blobsBackground}>
              {Array.from({ length: 8 }).map((_, index) => {
                const colors = ['#FFB6C1', '#DDA0DD', '#ff6b9d', '#8B008B', '#c084fc', '#f472b6'];
                const colorIndex = index % colors.length;
                const size = 150 + (index * 30);

                return (
                  <div
                    key={`blob-${index}`}
                    className={styles.blob}
                    style={{
                      left: `${(index * 12.5) % 100}%`,
                      top: `${(index * 15) % 100}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      '--duration': `${10 + index * 2}s`,
                      '--delay': `${index * 1.5}s`,
                      '--color-1': colors[colorIndex],
                      '--color-2': colors[(colorIndex + 1) % colors.length],
                      '--color-3': colors[(colorIndex + 2) % colors.length],
                      '--x-offset': `${-50 + (index * 15)}px`,
                      '--y-offset': `${-40 + (index * 12)}px`,
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>

            <div className={styles.dailyHoroscopeHeader}>
              <h3 className={styles.dailyHoroscopeHeading}>{t('horoscopeModal.title')}</h3>
              <button
                onClick={() => setShowDailyHoroscopeModal(false)}
                className={`${styles.closeButton} ${styles.closeButtonLight}`}
                aria-label={t('common:close')}
              >
                ✕
              </button>
            </div>

            <div className={styles.dailyHoroscopeBody} ref={dailyHoroscopeBodyRef}>
              {dailyHoroscopeStatus === 'loading' ? (
                <div className={styles.dailyHoroscopeLoading}>
                  <div
                    key={`daily-loading-${dailyLoadingIndex}-${currentDailyLoadingMessage.text}`}
                    className={styles.dailyHoroscopeLoadingContent}
                  >
                    <div className={styles.dailyHoroscopeLoadingEmoji} aria-hidden="true">
                      {currentDailyLoadingMessage.emoji}
                    </div>
                    <p className={styles.dailyHoroscopeLoadingText}>{currentDailyLoadingMessage.text}</p>
                  </div>
                </div>
              ) : dailyHoroscopeStatus === 'error' ? (
                <div className={styles.dailyHoroscopeError}>{dailyHoroscopeError}</div>
              ) : dailyHoroscope ? (
                <>
                  <div className={styles.dailyHoroscopeText}>
                    {dailyHoroscope.text.split('\n\n').map((paragraph, index) => (
                      <p key={index}>{paragraph.replace(/\*\*/g, '').replace(/\*\*/g, '')}</p>
                    ))}
                  </div>
                  {activeTab === 'calendar' && !sergeyBannerDismissed && userPartner && (
                    <div
                      className={styles.sergeyBanner}
                      aria-live="polite"
                      ref={sergeyBannerRef}
                    >
                      {sergeyBannerCopyStatus === 'loading' ? (
                        <div className={styles.sergeyBannerTitle} aria-hidden="true">
                          <span className={styles.sergeyBannerSkeletonTitle} />
                        </div>
                      ) : (
                        <div className={styles.sergeyBannerTitle}>{effectiveSergeyBannerCopy.title}</div>
                      )}
                      <div
                        className={styles.sergeyBannerLoadingMeasure}
                        ref={sergeyLoadingMeasureRef}
                        aria-hidden="true"
                      >
                        {sergeyLoadingMessages.map((message, index) => (
                          <div
                            key={`sergey-loading-measure-${index}-${message.text}`}
                            className={styles.sergeyBannerLoading}
                          >
                            <div className={styles.sergeyBannerLoadingContent}>
                              <span className={styles.sergeyBannerEmoji}>{message.emoji}</span>
                              <span className={styles.sergeyBannerLoadingText}>{message.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {sergeyHoroscopeStatus === 'loading' ? (
                        <>
                          <div
                            className={styles.sergeyBannerLoading}
                            style={sergeyLoadingMaxHeight ? { minHeight: sergeyLoadingMaxHeight } : undefined}
                          >
                            <div
                              key={`sergey-loading-${sergeyLoadingIndex}-${currentSergeyLoadingMessage.text}`}
                              className={styles.sergeyBannerLoadingContent}
                            >
                              <span className={styles.sergeyBannerEmoji} aria-hidden="true">
                                {currentSergeyLoadingMessage.emoji}
                              </span>
                              <span className={styles.sergeyBannerLoadingText}>{currentSergeyLoadingMessage.text}</span>
                            </div>
                          </div>
                        </>
                      ) : sergeyHoroscopeStatus === 'error' ? (
                        <>
                          <div className={styles.sergeyBannerError}>
                            {sergeyHoroscopeError ?? t('horoscopeModal.errorFallback')}
                          </div>
                          <div className={styles.sergeyBannerActions}>
                            <button
                              type="button"
                              className={`${styles.sergeyBannerButton} ${styles.sergeyBannerPrimary}`}
                              onClick={handleSergeyHoroscopeRequest}
                            >
                              {t('horoscopeModal.retryButton')}
                            </button>
                          </div>
                        </>
                      ) : sergeyHoroscopeStatus === 'success' && sergeyHoroscope ? (
                        sergeyHoroscope.text
                          .split('\n')
                          .map((line, index) => (
                            <p key={index} className={styles.sergeyBannerParagraph}>
                              {line.replace(/\*\*/g, '')}
                            </p>
                          ))
                      ) : sergeyBannerCopyStatus === 'loading' ? (
                        <div className={styles.sergeyBannerSkeletonBody} aria-hidden="true">
                          <span className={styles.sergeyBannerSkeletonLine} />
                          <span className={styles.sergeyBannerSkeletonLineShort} />
                          <div className={styles.sergeyBannerSkeletonButtons}>
                            <span className={styles.sergeyBannerSkeletonButton} />
                            <span className={styles.sergeyBannerSkeletonButtonSecondary} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className={styles.sergeyBannerSubtitle}>
                            {effectiveSergeyBannerCopy.subtitle}
                          </p>
                          <div className={styles.sergeyBannerActions}>
                            <button
                              type="button"
                              className={`${styles.sergeyBannerButton} ${styles.sergeyBannerPrimary}`}
                              onClick={handleSergeyHoroscopeRequest}
                            >
                              <span>{effectiveSergeyBannerCopy.primaryButton}</span>
                            </button>
                            <button
                              type="button"
                              className={`${styles.sergeyBannerButton} ${styles.sergeyBannerSecondary}`}
                              onClick={handleSergeyBannerDismiss}
                            >
                              {effectiveSergeyBannerCopy.secondaryButton}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно авторизации */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            // Закрыть модалку нельзя, если не авторизован
            if (authUser) {
              setShowAuthModal(false);
            }
          }}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Модальное окно настройки профиля */}
      {showProfileSetup && (
        <ProfileSetupModal
          isOpen={showProfileSetup}
          onClose={() => setShowProfileSetup(false)}
          onSuccess={async () => {
            setShowProfileSetup(false);
            // Профиль создан/обновлён - перезагружаем данные
            await loadUserProfileData();
          }}
          mode={profileSetupMode}
          initialName={userProfile?.display_name || ''}
          initialBirthDate={userProfile?.birth_date || ''}
          initialBirthTime={userProfile?.birth_time || ''}
          initialBirthPlace={userProfile?.birth_place || ''}
          initialPartner={userPartner}
        />
      )}

      {/* Стеклянное нижнее меню */}
      <GlassTabBar
        activeTab={activeTab}
        onTabChange={(tabId) => {
          if (tabId === 'settings') {
            setShowSettings(true);
          } else {
            setActiveTab(tabId);
          }
        }}
        cycleCount={cycles.length}
        daysUntilNext={getDaysUntilNext(cycles)}
        hasNewStory={hasNewStoryMessage}
      />
    </div>
  );
};

export default ModernNastiaApp;
