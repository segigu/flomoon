export type MoodLevel = 'good' | 'neutral' | 'bad';
export type PainLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface DayData {
  date: string; // ISO date string
  painLevel?: PainLevel;
  mood?: MoodLevel;
  notes?: string;
}

export interface CycleData {
  id: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  days?: DayData[]; // Данные по каждому дню цикла
}

export type HoroscopeMemorySource = 'daily' | 'weekly' | 'sergey';

export interface HoroscopeMemoryEntry {
  id: string;
  source: HoroscopeMemorySource;
  date: string; // ISO date
  summary: string;
  keyThemes: string[];
  avoidPhrases: string[];
  tone: 'positive' | 'neutral' | 'negative' | 'mixed';
  createdAt: string; // ISO timestamp
}

export interface PsychContractUsageEntry {
  id: string;
  usedAt: string;
}

export interface PsychScenarioUsageEntry {
  contractId: string;
  scenarioId: string;
  usedAt: string;
}

export interface PsychContractHistory {
  contracts: PsychContractUsageEntry[];
  scenarios: PsychScenarioUsageEntry[];
}

export interface CycleStats {
  averageLength: number;
  lastCycleLength: number;
  cycleCount: number;
  nextPrediction: Date;
  // Расширенная статистика
  averageLength6Months: number;
  variability: number; // Стандартное отклонение
  trend: number; // Положительный = увеличение, отрицательный = уменьшение
  predictionConfidence: number; // 0-100%
}

export interface FertileWindow {
  ovulationDay: Date;
  fertileStart: Date;
  fertileEnd: Date;
}

// Discover Tab (Узнай себя) state
// Импортируем тип сообщения из chat.ts для совместимости
import type { ChatMessage, ChatPhase } from './chat';

export interface DiscoverTabState {
  isStarted: boolean;
  phase: ChatPhase | null;
  messages: ChatMessage[];
  storyMeta: {
    author: string;
    title: string;
    genre: string;
    moonSummary: string;
    arcLimit: number;
    contract: string;
  } | null;
  currentArc: number;
  storySegments: Array<{
    text: string;
    arc: number;
    optionTitle?: string;
    optionDescription?: string;
  }>;
  choices: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  finaleInterpretations: {
    human: string;
    astrological: string;
  } | null;
  finaleInterpretationMode: 'human' | 'astrological';
  hasUnreadChoices: boolean; // Флаг для badge
  lastUpdated: string; // ISO timestamp
}

export interface NastiaData {
  cycles: CycleData[];
  settings: {
    averageCycleLength: number;
    periodLength: number;
    notifications: boolean;
  };
  horoscopeMemory?: HoroscopeMemoryEntry[];
  psychContractHistory?: PsychContractHistory;
  discoverTabState?: DiscoverTabState;

  /**
   * Психологический профиль пользователя (Фаза 2+).
   * Содержит все данные, собранные AI-агентами.
   */
  psychologicalProfile?: PsychologicalProfile;
}

export type NotificationCategory =
  | 'fertile_window'
  | 'ovulation_day'
  | 'period_forecast'
  | 'period_start'
  | 'period_check'
  | 'period_waiting'
  | 'period_delay_warning'
  | 'period_confirmed_day0'
  | 'period_confirmed_day1'
  | 'period_confirmed_day2'
  | 'birthday'
  | 'morning_brief'
  | 'generic';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  sentAt: string; // ISO timestamp
  type: NotificationCategory;
  url?: string;
}

/**
 * Поведенческий паттерн, выявленный AI-агентами.
 * Представляет повторяющуюся реакцию пользователя на определённые ситуации.
 */
export interface BehaviorPattern {
  /** Категория ловушки (из psychological contracts) */
  trapCategory: string;

  /** Сколько раз этот паттерн наблюдался */
  frequency: number;

  /** ISO timestamp последнего проявления */
  lastSeen: string;

  /** Контексты, в которых проявляется (например, "работа", "отношения") */
  contexts: string[];

  /** Примеры конкретных выборов, демонстрирующих паттерн */
  examples?: string[];
}

/**
 * Анализ одной завершённой интерактивной истории.
 * Содержит выборы пользователя, AI-интерпретацию и обратную связь.
 */
export interface StoryAnalysis {
  /** ID истории (timestamp или уникальный идентификатор) */
  id: string;

  /** ISO timestamp завершения истории */
  completedAt: string;

  /** Психологический контракт, который исследовался */
  contractQuestion: string;

  /** Выборы пользователя на каждой дуге (id варианта + transcript для кастомных) */
  choices: Array<{
    arc: number;
    optionId: string;
    optionTitle: string;
    customTranscript?: string; // Для голосовых вариантов
  }>;

  /** Человеческая интерпретация выборов (из финала) */
  humanInterpretation: string;

  /** Астрологическая интерпретация выборов (из финала) */
  astrologicalInterpretation: string;

  /** Обратная связь пользователя после истории (опционально) */
  userFeedback?: {
    rating?: 1 | 2 | 3 | 4 | 5; // Оценка точности интерпретации
    comment?: string; // Текстовый комментарий
    agreedWithInterpretation: boolean;
  };
}

/**
 * Корреляция между фазой цикла и настроением.
 * Анализируется PatternAnalyzerAgent из данных DayData.
 */
export interface CycleMoodCorrelation {
  /** Фаза цикла (например, "menstrual", "follicular", "ovulation", "luteal") */
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

  /** Распределение настроений в этой фазе */
  moodDistribution: {
    good: number;    // Количество дней с хорошим настроением
    neutral: number; // Количество дней с нейтральным настроением
    bad: number;     // Количество дней с плохим настроением
  };

  /** Средний уровень боли в этой фазе (0-5) */
  averagePainLevel: number;

  /** Количество циклов, включённых в анализ */
  sampleSize: number;
}

/**
 * Корреляция между астрологическими транзитами и настроением.
 * Анализируется AstroMoodAnalyzerAgent.
 */
export interface AstroMoodCorrelation {
  /** Тип транзита (например, "Mars square Moon", "Venus trine Sun") */
  transitType: string;

  /** Влияние на настроение (-1: негативное, 0: нейтральное, +1: позитивное) */
  moodImpact: -1 | 0 | 1;

  /** Количество совпадений транзита с изменением настроения */
  occurrences: number;

  /** Статистическая значимость (0-1, где >0.7 = значимо) */
  significance: number;
}

/**
 * Психологический профиль пользователя.
 * Центральная структура для хранения всех данных агентской системы.
 */
export interface PsychologicalProfile {
  /** ID пользователя, которому принадлежит профиль */
  userId: string;

  /** Поведенческие паттерны, выявленные TrapDetectorAgent */
  behaviorPatterns: BehaviorPattern[];

  /** История завершённых интерактивных историй */
  storyHistory: StoryAnalysis[];

  /** Корреляции цикл ↔ настроение */
  cycleMoodCorrelations: CycleMoodCorrelation[];

  /** Корреляции астро-транзиты ↔ настроение */
  astroMoodCorrelations: AstroMoodCorrelation[];

  /** Астропсихологические уязвимости (из натальной карты) */
  astroVulnerabilities?: string[];

  /** ISO timestamp последнего полного анализа */
  lastFullAnalysis?: string;

  /** ISO timestamp последнего инкрементального обновления */
  lastUpdate: string;
}
