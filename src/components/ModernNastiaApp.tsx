import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Settings,
  Cloud,
  CloudOff
} from 'lucide-react';
import { CycleData, NastiaData, NotificationCategory, NotificationItem } from '../types';
import nastiaLogo from '../assets/nastia-header-logo.png';
import {
  formatDate,
  formatShortDate,
  isToday,
  getMonthYear,
  diffInDays,
} from '../utils/dateUtils';
import {
  calculateCycleStats,
  isPredictedPeriod,
  isPastPeriod,
  getDaysUntilNext,
  calculateFertileWindow,
  isFertileDay,
  isOvulationDay
} from '../utils/cycleUtils';
import { saveData, loadData } from '../utils/storage';
import { cloudSync } from '../utils/cloudSync';
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
import { saveSubscription, removeSubscription } from '../utils/pushSubscriptionSync';
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
import { fetchRemoteNotifications } from '../utils/notificationsSync';
import { fetchRemoteConfig } from '../utils/remoteConfig';
import {
  fetchDailyHoroscope,
  fetchDailyHoroscopeForDate,
  fetchHoroscopeLoadingMessages,
  fetchSergeyDailyHoroscopeForDate,
  type DailyHoroscope,
  type HoroscopeLoadingMessage,
} from '../utils/horoscope';
import {
  generatePeriodModalContent,
  getFallbackPeriodContent,
  type PeriodModalContent,
} from '../utils/aiContent';
import {
  generateInsightDescription,
  getFallbackInsightDescription,
  getRandomLoadingPhrase,
  type InsightDescription,
} from '../utils/insightContent';
import styles from './NastiaApp.module.css';

const PRIMARY_USER_NAME = 'Настя';
const MAX_STORED_NOTIFICATIONS = 200;

const DEFAULT_LOADING_MESSAGES: HoroscopeLoadingMessage[] = [
  { emoji: '☎️', text: 'Звоним Марсу — уточняем, кто сегодня заведует твоим драйвом.' },
  { emoji: '💌', text: 'Через Венеру шлём письмо — ждём, чем она подсластит день.' },
  { emoji: '🛰️', text: 'Ловим сигнал от Юпитера — вдруг прилетит бонус удачи.' },
  { emoji: '☕️', text: 'Сатурн допивает кофе и пишет список обязанностей — терпим.' },
  { emoji: '🧹', text: 'Плутон наводит порядок в подсознании, разгребает завалы тревог.' },
  { emoji: '🌕', text: 'Луна примеряет настроение, подбирает идеальный градус драмы.' },
];

const SERGEY_LOADING_MESSAGES: HoroscopeLoadingMessage[] = [
  { emoji: '🧯', text: 'Марс проверяет, чем тушить очередной пожар, пока Серёжа дышит на пепелище.' },
  { emoji: '🛠️', text: 'Сатурн выдал Серёже новые ключи — чинить то, что рухнуло за ночь.' },
  { emoji: '🧾', text: 'Меркурий переписывает список дел Серёжи, потому что прежний уже сгорел нахуй.' },
  { emoji: '🚬', text: 'Плутон подкуривает Серёже сигарету и шепчет, что отдохнуть всё равно не выйдет.' },
  { emoji: '📦', text: 'Юпитер навалил задач, пока Серёжа таскал коробки и матерился сквозь зубы.' },
];

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
  generic: 'Напоминание',
};

const ModernNastiaApp: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'history'>('calendar');
  const [showSettings, setShowSettings] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [remoteClaudeKey, setRemoteClaudeKey] = useState<string | null>(null);
  const [remoteClaudeProxyUrl, setRemoteClaudeProxyUrl] = useState<string | null>(null);
  const [remoteOpenAIKey, setRemoteOpenAIKey] = useState<string | null>(null);
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
  const [sergeyLoadingIndex, setSergeyLoadingIndex] = useState(0);
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
  const readIdsRef = useRef(readIds);
  const notificationsRequestSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const sergeyRequestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    readIdsRef.current = readIds;
  }, [readIds]);

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

  const fallbackPeriodContent = useMemo(
    () => getFallbackPeriodContent(PRIMARY_USER_NAME),
    [],
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

  const currentDailyLoadingMessage = dailyLoadingMessages[dailyLoadingIndex] ?? DEFAULT_LOADING_MESSAGES[0];
  const currentSergeyLoadingMessage = SERGEY_LOADING_MESSAGES[sergeyLoadingIndex] ?? SERGEY_LOADING_MESSAGES[0];

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

  const refreshRemoteNotifications = useCallback(async (options: { markAsRead?: boolean } = {}) => {
    if (!githubToken) {
      setNotificationsError('Добавьте GitHub токен, чтобы получать уведомления');
      return;
    }

    const requestId = notificationsRequestSeqRef.current + 1;
    notificationsRequestSeqRef.current = requestId;

    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const remoteNotifications = await fetchRemoteNotifications(githubToken);
      if (!isMountedRef.current || notificationsRequestSeqRef.current !== requestId) {
        return;
      }

      const mapped: StoredNotification[] = remoteNotifications
        .map(item => ({
          ...item,
          read: readIdsRef.current.has(item.id),
        }))
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

      let next: StoredNotification[];

      if (options.markAsRead) {
        const { updated } = markAllAsRead(mapped);
        next = updated;
      } else {
        next = mapped;
      }

      const limited = persistNotifications(next);
      const limitedReadSet = options.markAsRead
        ? new Set(limited.map(notification => notification.id))
        : new Set(limited.filter(notification => notification.read).map(notification => notification.id));

      readIdsRef.current = limitedReadSet;
      saveReadSet(limitedReadSet);
      setReadIds(limitedReadSet);
      setNotifications(limited);
    } catch (error) {
      console.error('Failed to refresh notifications from cloud:', error);
      if (!isMountedRef.current || notificationsRequestSeqRef.current !== requestId) {
        return;
      }
      setNotificationsError('Не удалось обновить уведомления');
    } finally {
      if (!isMountedRef.current || notificationsRequestSeqRef.current !== requestId) {
        return;
      }
      setNotificationsLoading(false);
    }
  }, [githubToken, persistNotifications]);

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
    void refreshRemoteNotifications({ markAsRead: true });
  }, [refreshRemoteNotifications]);

  const handleCloseNotifications = () => {
    setShowNotifications(false);
    setNotificationsError(null);
  };

  // Загрузка данных при запуске
  useEffect(() => {
    // Проверяем URL параметры для автоматической настройки
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('nastia-github-token', token);
      cloudSync.saveConfig({ token, enabled: true });
      // Очищаем URL от параметров
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Загружаем настройки облака
    const cloudConfig = cloudSync.getConfig();
    setGithubToken(cloudConfig.token);
    setCloudEnabled(cloudConfig.enabled);

    // Инициализация Service Worker и уведомлений
    initNotifications();

    loadInitialData();
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

    generatePeriodModalContent({
      userName: PRIMARY_USER_NAME,
      cycleStartISODate: selectedDate.toISOString(),
      signal: controller.signal,
      apiKey: remoteClaudeKey ?? undefined,
      claudeProxyUrl: remoteClaudeProxyUrl ?? undefined,
      openAIApiKey: remoteOpenAIKey ?? undefined,
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
  }, [selectedDate, remoteClaudeKey, remoteClaudeProxyUrl, remoteOpenAIKey, fallbackPeriodContent]);

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
      remoteClaudeKey ?? undefined,
      remoteClaudeProxyUrl ?? undefined,
      remoteOpenAIKey ?? undefined,
      cycles,
    )
      .then(result => {
        const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
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
  }, [selectedDate, horoscopeVisible, remoteClaudeKey, remoteClaudeProxyUrl, remoteOpenAIKey, cycles]);

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
       if (sergeyRequestControllerRef.current) {
         sergeyRequestControllerRef.current.abort();
         sergeyRequestControllerRef.current = null;
       }
      return;
    }

    const controller = new AbortController();
    const todayIso = new Date().toISOString().split('T')[0];

    setDailyHoroscopeStatus('loading');
    setDailyHoroscopeError(null);
    setDailyLoadingMessages(DEFAULT_LOADING_MESSAGES);
    setDailyLoadingIndex(0);

    fetchHoroscopeLoadingMessages(
      remoteClaudeKey ?? undefined,
      remoteClaudeProxyUrl ?? undefined,
      remoteOpenAIKey ?? undefined,
      controller.signal,
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
      remoteClaudeKey ?? undefined,
      remoteClaudeProxyUrl ?? undefined,
      remoteOpenAIKey ?? undefined,
    )
      .then(result => {
        if (controller.signal.aborted) {
          return;
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

    return () => {
      controller.abort();
    };
  }, [showDailyHoroscopeModal, remoteClaudeKey, remoteClaudeProxyUrl, remoteOpenAIKey]);

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
    if (!showDailyHoroscopeModal || sergeyHoroscopeStatus !== 'loading') {
      return () => undefined;
    }

    const interval = window.setInterval(() => {
      setSergeyLoadingIndex(prev => (prev + 1) % SERGEY_LOADING_MESSAGES.length);
    }, 2600);

    return () => {
      window.clearInterval(interval);
    };
  }, [showDailyHoroscopeModal, sergeyHoroscopeStatus]);

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
      remoteClaudeKey ?? undefined,
      remoteClaudeProxyUrl ?? undefined,
      remoteOpenAIKey ?? undefined,
    )
      .then(result => {
        if (controller.signal.aborted) {
          return;
        }
        sergeyRequestControllerRef.current = null;
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
  }, [sergeyHoroscopeStatus, remoteClaudeKey, remoteClaudeProxyUrl, remoteOpenAIKey]);

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

    // ВСЕГДА делаем новый запрос при раскрытии
    setInsightLoadingStates(prev => ({ ...prev, [type]: true }));
    setInsightLoadingPhrases(prev => ({ ...prev, [type]: getRandomLoadingPhrase() }));

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
      signal: controller.signal,
      apiKey: remoteClaudeKey ?? undefined,
      claudeProxyUrl: remoteClaudeProxyUrl ?? undefined,
      openAIApiKey: remoteOpenAIKey ?? undefined,
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
        const fallback = getFallbackInsightDescription(type);
        setInsightDescriptions(prev => ({ ...prev, [type]: fallback }));
        setInsightLoadingStates(prev => ({ ...prev, [type]: false }));
        insightControllersRef.current[type] = null;
      });
  }, [
    expandedInsights,
    stats,
    fertileWindow,
    remoteClaudeKey,
    remoteClaudeProxyUrl,
    remoteOpenAIKey,
  ]);

  const handleInsightStyleToggle = useCallback((type: InsightType) => {
    setInsightStyleMode(prev => ({
      ...prev,
      [type]: prev[type] === 'scientific' ? 'human' : 'scientific',
    }));
  }, []);

  useEffect(() => {
    if (!githubToken) {
      return;
    }

    let cancelled = false;

    void refreshRemoteNotifications();

    fetchRemoteConfig(githubToken)
      .then(config => {
        if (cancelled || !config) {
          console.log('[Config] No remote config loaded');
          return;
        }
        console.log('[Config] Remote config loaded:', {
          hasClaudeKey: Boolean(config.claude?.apiKey),
          hasClaudeProxyUrl: Boolean(config.claudeProxy?.url),
          hasOpenAIKey: Boolean(config.openAI?.apiKey),
        });
        if (config.claude?.apiKey) {
          setRemoteClaudeKey(config.claude.apiKey);
          console.log('[Config] ✅ Claude API key loaded from remote config');
        }
        const proxyUrl = config.claudeProxy?.url ?? null;
        setRemoteClaudeProxyUrl(proxyUrl);
        if (proxyUrl) {
          console.log('[Config] ✅ Claude proxy URL loaded from remote config');
        }
        if (config.openAI?.apiKey) {
          setRemoteOpenAIKey(config.openAI.apiKey);
          console.log('[Config] ✅ OpenAI API key loaded from remote config');
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.error('[Config] ❌ Failed to load remote config:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, githubToken, refreshRemoteNotifications]);

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
      // Автоматически настраиваем облачную синхронизацию
      const cloudConfig = cloudSync.getConfig();
      if (!cloudConfig.enabled && cloudConfig.token) {
        cloudSync.saveConfig({ enabled: true, token: cloudConfig.token });
      }

      // Загружаем данные из облака или локально
      if (cloudSync.isConfigured()) {
        try {
          const cloudData = await cloudSync.downloadFromCloud();
          if (cloudData && cloudData.cycles.length > 0) {
            setCycles(cloudData.cycles);
            // Сохраняем локально как резерв
            saveData(cloudData);
            return;
          }
        } catch (error) {
          console.error('Cloud load error:', error);
        }
      }

      // Если облако недоступно или пусто, загружаем локальные данные
      const localData = loadData();
      if (localData) {
        setCycles(localData.cycles);
        // Если есть локальные данные и облако настроено, загружаем в облако
        if (localData.cycles.length > 0 && cloudSync.isConfigured()) {
          try {
            await cloudSync.uploadToCloud(localData);
          } catch (error) {
            console.error('Cloud upload error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Сохранение данных при изменении
  useEffect(() => {
    if (cycles.length === 0) return; // Не сохраняем пустые данные при инициализации

    const nastiaData: NastiaData = {
      cycles,
      settings: {
        averageCycleLength: 28,
        periodLength: 5,
        notifications: true,
      },
    };
    
    // Сохраняем локально
    saveData(nastiaData);
    
    // Автоматически сохраняем в облако
    if (cloudSync.isConfigured()) {
      syncToCloud(nastiaData);
    }
  }, [cycles]);

  // Тихая синхронизация с облаком
  const syncToCloud = async (data: NastiaData) => {
    try {
      setSyncStatus('syncing');
      await cloudSync.uploadToCloud(data);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Сохранение настроек облака
  const saveCloudSettings = async () => {
    try {
      cloudSync.saveConfig({ token: githubToken, enabled: cloudEnabled });

      if (cloudEnabled && githubToken) {
        // Проверяем подключение
        const isConnected = await cloudSync.testConnection();
        if (isConnected) {
          setSyncStatus('success');

          // Сначала пытаемся загрузить данные из облака
          try {
            const cloudData = await cloudSync.downloadFromCloud();
            if (cloudData && cloudData.cycles.length > 0) {
              // Если в облаке есть данные, загружаем их
              // Конвертируем строки дат в Date объекты
              const convertedCycles = cloudData.cycles.map((cycle: any) => ({
                ...cycle,
                startDate: new Date(cycle.startDate),
                endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
              }));
              setCycles(convertedCycles);
              saveData({ ...cloudData, cycles: convertedCycles });
              alert(`Загружено ${cloudData.cycles.length} циклов из облака`);
            } else if (cycles.length > 0) {
              // Если в облаке пусто, но есть локальные данные - загружаем их в облако
              const nastiaData: NastiaData = {
                cycles,
                settings: {
                  averageCycleLength: 28,
                  periodLength: 5,
                  notifications: true,
                },
              };
              await syncToCloud(nastiaData);
              alert('Локальные данные загружены в облако');
            }
          } catch (cloudError) {
            console.error('Error syncing with cloud:', cloudError);
            setSyncStatus('error');
            alert('Ошибка при синхронизации с облаком');
          }
        } else {
          setSyncStatus('error');
          alert('Не удалось подключиться к GitHub. Проверьте токен.');
          return;
        }
      }

      setShowSettings(false);
    } catch (error) {
      console.error('Error saving cloud settings:', error);
      setSyncStatus('error');
      alert('Ошибка при сохранении настроек');
    }
  };

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
          // Сохраняем подписку в облако (если включена синхронизация)
          if (cloudEnabled && githubToken) {
            const saved = await saveSubscription(githubToken, subscription);
            if (saved) {
              console.log('Подписка сохранена в облако');
            } else {
              console.warn('Не удалось сохранить подписку в облако');
            }
          }
          alert('Уведомления успешно включены');
        } else {
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
      const subscription = await registration.pushManager.getSubscription();

      if (subscription && cloudEnabled && githubToken) {
        // Удаляем подписку из облака
        await removeSubscription(githubToken, subscription.endpoint);
      }

      await unsubscribeFromPush();
      alert('Уведомления отключены');
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  };

  const updateNotificationSettings = async (settings: NotificationSettings) => {
    setNotificationSettings(settings);
    saveNotificationSettings(settings);

    if (cloudEnabled && githubToken && notificationPermission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))),
              auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!))))
            },
            settings,
          };

          await saveSubscription(githubToken, subscriptionData);
        }
      } catch (error) {
        console.error('Error updating subscription settings:', error);
      }
    }
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
  const addCycle = (date: Date) => {
    const newCycle: CycleData = {
      id: Date.now().toString(),
      startDate: date,
      notes: '',
    };
    setCycles([...cycles, newCycle]);
    setSelectedDate(null);
  };

  // Удаление цикла
  const deleteCycle = (cycleId: string) => {
    setCycles(cycles.filter(cycle => cycle.id !== cycleId));
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
    } else if (isPastPeriod(date, cycles)) {
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
        <div className={styles.header}>
          {cloudEnabled && (
            <div className={styles.syncIndicatorLeft}>
              {syncStatus === 'syncing' && (
                <Cloud size={20} className={`${styles.syncIconCorner} ${styles.syncing}`} />
              )}
              {syncStatus === 'success' && (
                <Cloud size={20} className={`${styles.syncIconCorner} ${styles.success}`} />
              )}
              {syncStatus === 'error' && (
                <CloudOff size={20} className={`${styles.syncIconCorner} ${styles.error}`} />
              )}
            </div>
          )}

          <div className={styles.titleWrapper}>
            <img
              src={nastiaLogo}
              alt="Nastia"
              className={styles.logo}
            />
          </div>

          <div className={styles.headerCorner}>
            <button
              onClick={handleOpenNotifications}
              className={styles.notificationBellButton}
              type="button"
              aria-label={unreadCount > 0 ? `Есть ${unreadCount} новых уведомлений` : 'Открыть уведомления'}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className={styles.notificationBadge}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Навигация по вкладкам */}
        <div className={styles.tabNavigation}>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`${styles.tabButton} ${activeTab === 'calendar' ? styles.active : ''}`}
          >
            Календарь
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
          >
            История ({cycles.length})
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className={styles.tabButton}
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Календарь */}
        {activeTab === 'calendar' && (
          <div className={styles.calendarPanel}>
            {/* Навигация по месяцам */}
            <div className={styles.calendarHeader}>
              <button
                onClick={() => changeMonth('prev')}
                className={styles.navButton}
              >
                <ChevronLeft size={20} color="var(--nastia-dark)" />
              </button>
              <h2 className={styles.monthTitle}>
                {getMonthYear(currentDate)}
              </h2>
              <button
                onClick={() => changeMonth('next')}
                className={styles.navButton}
              >
                <ChevronRight size={20} color="var(--nastia-dark)" />
              </button>
            </div>

            {/* Дни недели */}
            <div className={styles.weekDays}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className={styles.weekDay}>
                  {day}
                </div>
              ))}
            </div>

            {/* Дни месяца */}
            <div className={styles.calendarGrid}>
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
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.period}`}></div>
                <span>Период</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.predicted}`}></div>
                <span>Прогноз</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.ovulation}`}></div>
                <span>Овуляция</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.fertile}`}></div>
                <span>Фертильное окно</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendDot} ${styles.today}`}></div>
                <span>Сегодня</span>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'calendar' && (
          <div className={styles.dailyHoroscopeCTAWrapper}>
            <button
              type="button"
              className={styles.dailyHoroscopeButton}
              onClick={() => setShowDailyHoroscopeModal(true)}
            >
              <span className={styles.dailyHoroscopeIcon}>🔮</span>
              <div>
                <div className={styles.dailyHoroscopeTitle}>Гороскоп на сегодня</div>
                <div className={styles.dailyHoroscopeSubtitle}>Правда, только правда.</div>
              </div>
            </button>
          </div>
        )}

        {/* Insights панель */}
        {cycles.length >= 2 && activeTab === 'calendar' && (
          <div className={styles.insightsCard}>
            <h3 className={styles.insightsTitle}>⚡️ Твои показатели</h3>

            <div className={styles.insightsGrid}>
              {/* Средняя длина и вариативность */}
              <div className={styles.insightCard}>
                <div className={styles.insightHeader}>
                  <div>
                    <div className={styles.insightLabel}>Средний цикл (6 мес)</div>
                    <div className={styles.insightValue}>
                      {stats.averageLength6Months} дней
                      {stats.variability > 0 && (
                        <span className={styles.insightVariability}>
                          ±{stats.variability.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {stats.variability <= 2 && (
                      <div className={styles.insightBadge + ' ' + styles.good}>Отличная стабильность</div>
                    )}
                    {stats.variability > 2 && stats.variability <= 5 && (
                      <div className={styles.insightBadge + ' ' + styles.normal}>Норма</div>
                    )}
                    {stats.variability > 5 && (
                      <div className={styles.insightBadge + ' ' + styles.warning}>Высокая вариативность</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`${styles.insightExpandButton} ${expandedInsights.has('cycle-length') ? styles.expanded : ''}`}
                    onClick={() => handleInsightToggle('cycle-length')}
                    aria-label="Развернуть описание"
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
                            На научном
                          </button>
                          <button
                            type="button"
                            className={`${styles.insightStyleButton} ${insightStyleMode['cycle-length'] === 'human' ? styles.active : ''}`}
                            onClick={() => handleInsightStyleToggle('cycle-length')}
                          >
                            На человеческом
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
                    <div className={styles.insightLabel}>Следующая менструация</div>
                    <div className={styles.insightValue}>
                      {formatShortDate(stats.nextPrediction)}
                      {stats.variability > 0 && (
                        <span className={styles.insightRange}>
                          ±{Math.ceil(stats.variability)} дня
                        </span>
                      )}
                    </div>
                    {stats.predictionConfidence > 0 && (
                      <div className={styles.insightConfidence}>
                        Уверенность: {stats.predictionConfidence}%
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`${styles.insightExpandButton} ${expandedInsights.has('next-period') ? styles.expanded : ''}`}
                    onClick={() => handleInsightToggle('next-period')}
                    aria-label="Развернуть описание"
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
                            На научном
                          </button>
                          <button
                            type="button"
                            className={`${styles.insightStyleButton} ${insightStyleMode['next-period'] === 'human' ? styles.active : ''}`}
                            onClick={() => handleInsightStyleToggle('next-period')}
                          >
                            На человеческом
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
                      <div className={styles.insightLabel}>Фертильное окно</div>
                      <div className={styles.insightValue}>
                        {formatShortDate(fertileWindow.fertileStart)} - {formatShortDate(fertileWindow.ovulationDay)}
                      </div>
                      <div className={styles.insightSubtext}>
                        Овуляция: {formatShortDate(fertileWindow.ovulationDay)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.insightExpandButton} ${expandedInsights.has('fertile-window') ? styles.expanded : ''}`}
                      onClick={() => handleInsightToggle('fertile-window')}
                      aria-label="Развернуть описание"
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
                              На научном
                            </button>
                            <button
                              type="button"
                              className={`${styles.insightStyleButton} ${insightStyleMode['fertile-window'] === 'human' ? styles.active : ''}`}
                              onClick={() => handleInsightStyleToggle('fertile-window')}
                            >
                              На человеческом
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
                      <div className={styles.insightLabel}>Тренд</div>
                      <div className={styles.insightValue}>
                        {stats.trend > 0 ? '📈 Увеличение' : '📉 Уменьшение'}
                      </div>
                      <div className={styles.insightSubtext}>
                        {Math.abs(stats.trend).toFixed(1)} дня/цикл
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.insightExpandButton} ${expandedInsights.has('trend') ? styles.expanded : ''}`}
                      onClick={() => handleInsightToggle('trend')}
                      aria-label="Развернуть описание"
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
                              На научном
                            </button>
                            <button
                              type="button"
                              className={`${styles.insightStyleButton} ${insightStyleMode['trend'] === 'human' ? styles.active : ''}`}
                              onClick={() => handleInsightStyleToggle('trend')}
                            >
                              На человеческом
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
          <div className={`${styles.card} ${styles.statsCard}`}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{daysUntilNext}</div>
                <div className={styles.statLabel}>дней до следующего</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{stats.cycleCount}</div>
                <div className={styles.statLabel}>циклов отмечено</div>
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

        {/* Вкладка: История всех циклов */}
        {activeTab === 'history' && cycles.length > 0 && (
          <div className={`${styles.card} ${styles.cyclesList}`}>
            <h3 className={styles.statsTitle}>Все циклы ({cycles.length})</h3>
            <div className={styles.cyclesListContainer}>
              {cycles
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .map(cycle => (
                  <div key={cycle.id} className={styles.cycleItem}>
                    <div className={styles.cycleInfo}>
                      <div className={styles.cycleDate}>
                        {formatDate(new Date(cycle.startDate))}
                      </div>
                      {cycle.notes && (
                        <div className={styles.cycleNotes}>{cycle.notes}</div>
                      )}
                    </div>
                    <div className={styles.cycleActions}>
                      <button
                        onClick={() => deleteCycle(cycle.id)}
                        className={styles.cycleActionButton}
                        title="Удалить цикл"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && cycles.length === 0 && (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <p>Нет записанных циклов</p>
              <p className={styles.emptyStateHint}>
                Перейдите на вкладку "Календарь" и нажмите на дату начала цикла
              </p>
            </div>
          </div>
        )}
      </div>

      {showNotifications && (
        <div className={styles.modal}>
          <div className={styles.notificationsModal}>
            <div className={styles.notificationsHeader}>
              <h3 className={styles.settingsTitle}>Уведомления</h3>
              <button
                onClick={handleCloseNotifications}
                className={styles.closeButton}
                aria-label="Закрыть"
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
                      void refreshRemoteNotifications();
                    }}
                  >
                    Обновить
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className={styles.notificationEmptyState}>
                  <img
                    src={process.env.PUBLIC_URL + '/nastia-empty.png'}
                    alt="Нет уведомлений"
                    className={styles.emptyStateImage}
                  />
                  <p className={styles.notificationEmpty}>
                    Пока никакой язвительной драмы — новых уведомлений нет.
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
                Начало менструации
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className={styles.closeButton}
                aria-label="Закрыть"
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
                  {formatDate(selectedDate)}
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
                      <span className={styles.periodWisdomLabel}>Народная мудрость</span>
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
                        <span className={styles.periodHoroscopeTitle}>Гороскоп для Настеньки</span>
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
                      Не удалось загрузить гороскоп. Попробуй ещё раз позже.
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
                      <div className={styles.periodHoroscopeCTATitle}>Показать твой гороскоп на неделю</div>
                      <div className={styles.periodHoroscopeCTASubtitle}>
                        Правду и только правду, ничего кроме правды.
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
                  Да, добавить
                </button>
                <button
                  onClick={() => setSelectedDate(null)}
                  className={`${styles.bigButton} ${styles.secondaryButton}`}
                >
                  Нет, передумала
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
                Настройки
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className={styles.closeButton}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className={styles.settingsForm}>
              {/* Секция облачной синхронизации */}
              <h4 className={styles.sectionTitle}>
                Облачная синхронизация
              </h4>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <input
                    type="checkbox"
                    checked={cloudEnabled}
                    onChange={(e) => setCloudEnabled(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Включить синхронизацию с GitHub</span>
                </label>
              </div>

              {cloudEnabled && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    GitHub Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxx"
                    className={styles.formInput}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <p className={styles.formInfo}>
                  ✓ Данные будут автоматически сохраняться в приватный репозиторий GitHub
                </p>
              </div>

              {cloudEnabled && (
                <div className={styles.formGroup}>
                  <p className={styles.formInfo}>
                    ✓ Claude API ключ подтянут из GitHub Secrets — Настя с лучшим сарказмом генерирует тексты.
                  </p>
                </div>
              )}

              {/* Разделитель */}
              <div className={styles.sectionDivider}></div>

              {/* Секция уведомлений */}
              <h4 className={styles.sectionTitle}>
                Push-уведомления
              </h4>

              {!notificationSupported ? (
                <p className={styles.formInfo}>
                  ⚠️ Push-уведомления не поддерживаются в этом браузере
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
                      <span>Включить уведомления</span>
                    </label>
                  </div>

                  {notificationPermission === 'denied' && (
                    <p className={styles.formInfo} style={{ color: '#ef4444' }}>
                      ⚠️ Уведомления заблокированы. Разрешите их в настройках браузера.
                    </p>
                  )}


                  {notificationPermission === 'granted' && (
                    <div className={styles.formGroup}>
                      <button
                        onClick={handleTestNotification}
                        className={styles.bigButton}
                      >
                        Отправить тестовое уведомление
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Кнопки сохранения внутри формы */}
              <div className={styles.settingsActions}>
                <button
                  onClick={saveCloudSettings}
                  className={`${styles.bigButton} ${styles.primaryButton}`}
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`${styles.bigButton} ${styles.secondaryButton}`}
                >
                  Отмена
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
            <div className={styles.dailyHoroscopeHeader}>
              <h3 className={styles.dailyHoroscopeHeading}>Гороскоп на сегодня</h3>
              <button
                onClick={() => setShowDailyHoroscopeModal(false)}
                className={`${styles.closeButton} ${styles.closeButtonLight}`}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className={styles.dailyHoroscopeBody}>
              {dailyHoroscopeStatus === 'loading' ? (
                <div className={styles.dailyHoroscopeLoading}>
                  <div className={styles.starsBackground}>
                    {Array.from({ length: 50 }).map((_, index) => (
                      <div
                        key={index}
                        className={styles.star}
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          '--duration': `${2 + Math.random() * 3}s`,
                          '--delay': `${Math.random() * 3}s`,
                          '--max-opacity': Math.random() * 0.5 + 0.3,
                        } as React.CSSProperties}
                      />
                    ))}
                  </div>
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
                  {!sergeyBannerDismissed && (
                    <div className={styles.sergeyBanner} aria-live="polite">
                      <div className={styles.sergeyBannerTitle}>А что там у Сережи?</div>
                      {sergeyHoroscopeStatus === 'loading' ? (
                        <>
                          <div className={styles.sergeyBannerLoading}>
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
                            {sergeyHoroscopeError ?? 'Звёзды молчат — Серёжа остаётся в тумане.'}
                          </div>
                          <div className={styles.sergeyBannerActions}>
                            <button
                              type="button"
                              className={`${styles.sergeyBannerButton} ${styles.sergeyBannerPrimary}`}
                              onClick={handleSergeyHoroscopeRequest}
                            >
                              Попробовать ещё раз
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
                      ) : (
                        <>
                          <p className={styles.sergeyBannerSubtitle}>
                            Серёжа опять что-то мудрит. Подглянем, что ему сулят звёзды на сегодня?
                          </p>
                          <div className={styles.sergeyBannerActions}>
                            <button
                              type="button"
                              className={`${styles.sergeyBannerButton} ${styles.sergeyBannerPrimary}`}
                              onClick={handleSergeyHoroscopeRequest}
                            >
                              <span>Посмотреть гороскоп</span>
                            </button>
                            <button
                              type="button"
                              className={`${styles.sergeyBannerButton} ${styles.sergeyBannerSecondary}`}
                              onClick={handleSergeyBannerDismiss}
                            >
                              Мне пофиг
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

      {/* Персональное сообщение */}
      <div className={styles.footer}>
        <p className={styles.footerText}>
          Создано с ❤️ для Nastia
        </p>
      </div>
    </div>
  );
};

export default ModernNastiaApp;
