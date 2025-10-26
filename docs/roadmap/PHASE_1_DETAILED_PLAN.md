# 📋 Детальный план реализации: Фаза 1 - Универсализация и фундамент

**Создано:** 2025-10-26
**Версия:** 1.0.0
**Оценка:** 12-16 часов чистого времени → 2-3 рабочих дня

---

## Обзор Фазы 1

**Цель:** Подготовить кодовую базу к внедрению агентной системы психологического профайлера - вынести все хардкоженные данные пользователя в универсальную структуру, добавить новые типы для психологического профиля, обеспечить обратную совместимость.

**Контекст:**
- Приложение сейчас жёстко привязано к конкретному пользователю (Настя) на уровне кода
- Данные разбросаны: `astroProfiles.ts` (натальная карта), `horoscope.ts` (контекст общения), `historyStory.ts` (имена, стиль)
- Невозможно добавить других пользователей без массового рефакторинга
- Блокирует Фазу 2 (AI-агенты) и будущую мультипользовательность

**Связанные компоненты:**
- `/src/data/astroProfiles.ts` - астрологические профили
- `/src/utils/horoscope.ts` - генерация гороскопов (~1073 строки)
- `/src/utils/historyStory.ts` - интерактивные истории (~1257 строк)
- `/src/types/index.ts` - типы данных (~138 строк)
- `/src/utils/storage.ts` - localStorage (~243 строки)
- `/src/components/ModernNastiaApp.tsx` - главный компонент (~4900 строк)
- `/src/utils/aiContent.ts` - AI-генерация контента
- `/src/utils/planetMessages.ts` - планетарные диалоги
- `/src/components/DiscoverTabV2.tsx` - интерактивная вкладка
- `/src/components/chat/ChatMessage.tsx` - чат-сообщения

---

## 📝 Детальный план по задачам

### Задача 1.1: Создание универсального профиля пользователя
**Общее время:** ~2-3 часа
**Зависимости:** нет
**Файл:** `/src/data/userProfile.ts` (создать новый)

---

#### Шаг 1.1.1: Создать файл userProfile.ts с базовым интерфейсом (~45 минут)

- [ ] Создать `/src/data/userProfile.ts`
- [ ] Импортировать `AstroProfile` из `./astroProfiles`
- [ ] Определить интерфейс `UserProfile` со всеми полями
- [ ] Добавить JSDoc-комментарии для каждого поля

**Пример кода:**

```typescript
// src/data/userProfile.ts
import type { AstroProfile } from './astroProfiles';

/**
 * Универсальная структура профиля пользователя.
 * Содержит все данные для персонализации AI-контента, гороскопов, историй.
 */
export interface UserProfile {
  /** Уникальный идентификатор пользователя */
  id: string;

  /** Полное имя для внутреннего использования */
  name: string;

  /** Отображаемое имя для UI (например, "Настя", "Твой") */
  displayName: string;

  /** Ссылка на ID астрологического профиля из astroProfiles.ts */
  astroProfileId: AstroProfile['id'];

  /** Партнёры для синастрии (например, романтические отношения) */
  relationshipPartners?: Array<{
    profileId: AstroProfile['id'];
    relationshipType: 'romantic' | 'family' | 'friend';
    name: string; // Имя партнёра для текстов
  }>;

  /** Контекст для персонализации AI-генерации */
  context: {
    /** Географическая локация (например, "Европа") */
    location: string;

    /** Черты личности для AI (например, ["самоирония", "чёрный юмор"]) */
    personalityTraits: string[];

    /** Стиль общения AI с пользователем */
    communicationStyle: 'sarcastic' | 'supportive' | 'direct' | 'gentle';

    /** Уровень ненормативной лексики в AI-ответах */
    profanityLevel: 'none' | 'light' | 'medium' | 'heavy';
  };

  /** Настройки пользователя */
  preferences: {
    /** Стиль гороскопов */
    horoscopeStyle: 'weekly' | 'daily' | 'both';

    /** Сложность интерактивных историй */
    storyComplexity: 'simple' | 'moderate' | 'deep';

    /** Включены ли push-уведомления */
    notificationsEnabled: boolean;
  };
}
```

---

#### Шаг 1.1.2: Создать константу USER_PROFILES с профилем Насти (~30 минут)

- [ ] Определить `USER_PROFILES: Record<string, UserProfile>`
- [ ] Заполнить профиль 'nastia' данными из хардкода (`horoscope.ts` строки 291-296, 309-314)
- [ ] Извлечь партнёра (Серёжа) из `horoscope.ts` строка 294

**Пример кода:**

```typescript
// src/data/userProfile.ts (продолжение)

/**
 * Словарь всех пользователей системы.
 * Ключ - уникальный ID пользователя.
 */
export const USER_PROFILES: Record<string, UserProfile> = {
  nastia: {
    id: 'nastia',
    name: 'Настя',
    displayName: 'Настя',
    astroProfileId: 'nastia',

    relationshipPartners: [
      {
        profileId: 'sergey',
        relationshipType: 'romantic',
        name: 'Сергей', // Из horoscope.ts:294
      },
    ],

    context: {
      location: 'Европа', // Из horoscope.ts:292
      personalityTraits: [
        'самоирония',
        'чёрный юмор',
        'усталость',
        'держится на характере',
      ], // Из horoscope.ts:292-293
      communicationStyle: 'sarcastic', // Из horoscope.ts:293-294
      profanityLevel: 'heavy', // Из horoscope.ts:304, 396
    },

    preferences: {
      horoscopeStyle: 'both',
      storyComplexity: 'deep',
      notificationsEnabled: true,
    },
  },
};
```

---

#### Шаг 1.1.3: Создать хелперы getCurrentUser() и CURRENT_USER_ID (~20 минут)

- [ ] Экспортировать константу `CURRENT_USER_ID = 'nastia'` (пока хардкод)
- [ ] Создать функцию `getCurrentUser(): UserProfile`
- [ ] Добавить проверку на существование пользователя с выбросом ошибки

**Пример кода:**

```typescript
// src/data/userProfile.ts (продолжение)

/**
 * ID текущего активного пользователя.
 * В будущем будет загружаться из localStorage после авторизации.
 * Пока константа для совместимости.
 */
export const CURRENT_USER_ID = 'nastia';

/**
 * Получить профиль текущего активного пользователя.
 * @throws {Error} Если пользователь с CURRENT_USER_ID не найден.
 */
export function getCurrentUser(): UserProfile {
  const user = USER_PROFILES[CURRENT_USER_ID];

  if (!user) {
    throw new Error(
      `User profile not found: ${CURRENT_USER_ID}. ` +
      `Available profiles: ${Object.keys(USER_PROFILES).join(', ')}`
    );
  }

  return user;
}

/**
 * Получить астрологический профиль текущего пользователя.
 * Удобный хелпер для быстрого доступа к натальной карте.
 */
export function getCurrentAstroProfile(): AstroProfile {
  const user = getCurrentUser();
  const { ASTRO_PROFILES } = await import('./astroProfiles');
  const astroProfile = ASTRO_PROFILES[user.astroProfileId];

  if (!astroProfile) {
    throw new Error(
      `Astro profile not found: ${user.astroProfileId} for user ${user.id}`
    );
  }

  return astroProfile;
}
```

---

#### Шаг 1.1.4: Проверить компиляцию TypeScript (~15 минут)

- [ ] Запустить `npx tsc --noEmit` для проверки типов
- [ ] Исправить ошибки импортов (если есть)
- [ ] Убедиться, что файл компилируется без ошибок

---

### Задача 1.2: Обновление типов данных
**Общее время:** ~2-3 часа
**Зависимости:** 1.1
**Файл:** `/src/types/index.ts`

---

#### Шаг 1.2.1: Добавить интерфейсы для психологического профиля (~90 минут)

- [ ] Открыть `/src/types/index.ts`
- [ ] В конец файла добавить новые интерфейсы согласно `PSYCHOLOGICAL_PROFILE_SPEC.md`
- [ ] Добавить JSDoc-комментарии для каждого интерфейса

**Пример кода:**

```typescript
// src/types/index.ts (добавить в конец файла после строки 138)

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
```

---

#### Шаг 1.2.2: Обновить интерфейс NastiaData (~20 минут)

- [ ] Найти интерфейс `NastiaData` (строка 103)
- [ ] Добавить поле `psychologicalProfile?: PsychologicalProfile`

**Пример кода:**

```typescript
// src/types/index.ts (строка 103, обновить)

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
```

---

#### Шаг 1.2.3: Проверить компиляцию и экспорты (~10 минут)

- [ ] Убедиться, что все новые интерфейсы экспортированы (`export interface ...`)
- [ ] Запустить `npx tsc --noEmit`
- [ ] Исправить ошибки типов (если есть)

---

### Задача 1.3: Рефакторинг хардкода в horoscope.ts
**Общее время:** ~1.5-2 часа
**Зависимости:** 1.1, 1.2
**Файл:** `/src/utils/horoscope.ts`

Детальные шаги см. в полной версии документа...

---

### Задача 1.4: Рефакторинг хардкода в historyStory.ts
**Общее время:** ~1.5-2 часа
**Зависимости:** 1.1, 1.2
**Файл:** `/src/utils/historyStory.ts`

Детальные шаги см. в полной версии документа...

---

### Задача 1.5: Обновление storage.ts
**Общее время:** ~2 часа
**Зависимости:** 1.2
**Файл:** `/src/utils/storage.ts`

Детальные шаги см. в полной версии документа...

---

### Задача 1.6: Рефакторинг компонентов
**Общее время:** ~2-3 часа
**Зависимости:** 1.1, 1.2, 1.3, 1.4, 1.5
**Файлы:** ModernNastiaApp.tsx, DiscoverTabV2.tsx, aiContent.ts, и др.

Детальные шаги см. в полной версии документа...

---

### Задача 1.7: Тестирование
**Общее время:** ~2-3 часа
**Зависимости:** 1.1-1.6

Детальные шаги см. в полной версии документа...

---

### Задача 1.8: Финальная проверка и документация
**Общее время:** ~1 час
**Зависимости:** 1.1-1.7

Детальные шаги см. в полной версии документа...

---

### Задача 1.9: Версионирование приложения
**Общее время:** ~1-2 часа
**Зависимости:** 1.8
**Приоритет:** Низкий (косметика, но важно для tracking)

**Контекст:** Добавить семантическое версионирование (Semantic Versioning) в приложение - показывать версию в UI и хранить в package.json.

---

#### Шаг 1.9.1: Обновить package.json (~5 минут)

- [ ] Открыть `/package.json`
- [ ] Установить версию `"version": "2.0.0"`
- [ ] Коммит: "chore: bump version to 2.0.0"

**Обоснование версии 2.0.0:**
- Major (2) - переход на универсальную систему пользователей (breaking change)
- Minor (0) - пока нет новых фич после универсализации
- Patch (0) - чистая версия

---

#### Шаг 1.9.2: Показать версию в UI - футер (~30-45 минут)

- [ ] Создать `/src/components/AppFooter.tsx` (или добавить в ModernNastiaApp.tsx)
- [ ] Импортировать версию из package.json
- [ ] Добавить стили в NastiaApp.module.css
- [ ] Разместить футер внизу экрана

**Файл `/src/components/AppFooter.tsx`:**

```typescript
import React from 'react';
import packageJson from '../../package.json';
import styles from './AppFooter.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <span className={styles.version}>
        Nastia Calendar v{packageJson.version}
      </span>
    </footer>
  );
}
```

**Стили `/src/components/AppFooter.module.css`:**

```css
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 16px;
  text-align: center;
  font-size: 11px;
  color: rgba(139, 0, 139, 0.5);
  background: transparent;
  pointer-events: none;
  z-index: 1;
}

.version {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
}
```

**Интеграция в ModernNastiaApp.tsx:**

```typescript
import { AppFooter } from './AppFooter';

// В конце return():
return (
  <div className={styles.app}>
    {/* ... весь контент ... */}
    <AppFooter />
  </div>
);
```

**Результат:** Версия отображается внизу экрана на всех страницах.

---

#### Шаг 1.9.3: Показать версию в Settings модалке (~30-45 минут)

- [ ] Открыть компонент настроек (ModernNastiaApp.tsx, секция Settings)
- [ ] Добавить секцию "О приложении" (About)
- [ ] Показать версию, copyright, ссылки

**В Settings модалке (ModernNastiaApp.tsx):**

```typescript
import packageJson from '../package.json';

// В модалке Settings:
<div className={styles.aboutSection}>
  <h3>О приложении</h3>
  <p className={styles.appVersion}>Nastia Calendar v{packageJson.version}</p>
  <p className={styles.copyright}>© 2025 Sergey</p>
  <a
    href="https://github.com/segigu/nastia-calendar"
    target="_blank"
    rel="noopener noreferrer"
    className={styles.githubLink}
  >
    GitHub →
  </a>
</div>
```

**Стили (NastiaApp.module.css):**

```css
.aboutSection {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(139, 0, 139, 0.2);
  text-align: center;
}

.appVersion {
  font-size: 16px;
  font-weight: 600;
  color: var(--nastia-dark);
  margin-bottom: 8px;
}

.copyright {
  font-size: 13px;
  color: rgba(139, 0, 139, 0.7);
  margin-bottom: 16px;
}

.githubLink {
  display: inline-block;
  font-size: 14px;
  color: var(--nastia-purple);
  text-decoration: none;
  transition: color 0.2s;
}

.githubLink:hover {
  color: var(--nastia-dark);
}
```

**Результат:** Версия показывается и в футере (всегда видно), и в Settings (детальная информация).

---

#### Шаг 1.9.4: Проверка (~5-10 минут)

- [ ] Запустить `npm start`
- [ ] Проверить футер - видна ли версия внизу экрана
- [ ] Открыть Settings → проверить секцию "О приложении"
- [ ] Проверить что версия соответствует package.json
- [ ] Проверить TypeScript компиляцию

**Результат:** Версионирование работает, версия отображается в двух местах.

---

## ⚠️ Критические риски и митигация

### Риск 1: Нарушение обратной совместимости с localStorage
**Вероятность:** Средняя
**Влияние:** Критичное (потеря пользовательских данных)

**Проблема:**
- Старые данные в localStorage не содержат поля `psychologicalProfile`
- Изменение структуры `NastiaData` может сломать `loadData()` / `saveData()`

**Митигация:**
1. Сделать `psychologicalProfile` опциональным полем
2. Хранить `psychologicalProfile` отдельно в ключе `nastia-psych-profile-${userId}`
3. Написать тесты для проверки загрузки старых данных
4. Добавить миграцию (если понадобится)
5. Протестировать вручную

---

### Риск 2: Runtime-ошибки при вызове getCurrentUser()
**Вероятность:** Низкая
**Влияние:** Высокое (приложение падает)

**Митигация:**
1. Валидация в `getCurrentUser()` с понятной ошибкой
2. Проверить порядок импортов
3. Добавить fallback (опционально)
4. Написать unit-тест
5. Добавить проверку при запуске приложения

---

### Риск 3: Забыть заменить хардкод в каком-то файле
**Вероятность:** Средняя
**Влияние:** Среднее

**Митигация:**
1. Использовать Grep для поиска всех упоминаний "Настя", "NASTIA"
2. Code review всех изменённых файлов
3. Написать ESLint-правило (опционально)

---

### Риск 4: Падение тестов после рефакторинга
**Вероятность:** Высокая
**Влияние:** Среднее (блокирует деплой)

**Митигация:**
1. Найти все тесты с упоминаниями "NASTIA"
2. Обновить импорты и логику тестов
3. Запускать тесты после каждого изменения
4. Исправить падающие тесты до коммита

---

### Риск 5: Конфликты с другими ветками
**Вероятность:** Низкая
**Влияние:** Среднее

**Митигация:**
1. Работать в отдельной ветке `phase-1-foundation`
2. Коммитить атомарно
3. Синхронизировать с main периодически
4. Финальный мёрдж через PR

---

## 📊 Общая оценка

**Общее время:** 12-16 часов чистого времени
**Количество подзадач:** 39 детальных шагов
**Критический путь:** 1.1 → 1.2 → (1.3, 1.4, 1.5 параллельно) → 1.6 → 1.7 → 1.8

**Разбивка по задачам:**
- 1.1: 2-3 часа (создание userProfile.ts)
- 1.2: 2-3 часа (обновление types)
- 1.3: 1.5-2 часа (рефакторинг horoscope.ts)
- 1.4: 1.5-2 часа (рефакторинг historyStory.ts)
- 1.5: 2 часа (обновление storage.ts)
- 1.6: 2-3 часа (рефакторинг компонентов)
- 1.7: 2-3 часа (тестирование)
- 1.8: 1 час (финальная проверка)

**Рекомендуемая последовательность (по дням):**

**День 1 (4-5 часов):**
- Утро: Задачи 1.1 + 1.2 (создание userProfile.ts и types)
- День: Задача 1.3 (рефакторинг horoscope.ts)
- Результат: `getCurrentUser()` работает, типы определены, horoscope.ts обновлён

**День 2 (5-6 часов):**
- Утро: Задачи 1.4 + 1.5 (рефакторинг historyStory.ts и storage.ts)
- День: Задача 1.6 (рефакторинг компонентов)
- Результат: Весь код обновлён, приложение работает

**День 3 (3-4 часа):**
- Утро: Задача 1.7 (тестирование)
- День: Задача 1.8 (финальная проверка, документация, коммит)
- Результат: Фаза 1 завершена, всё работает, тесты проходят

---

## 💡 Рекомендации для реализации

### 1. Порядок выполнения задач

**Оптимальная последовательность:**

```
1. Создать userProfile.ts (1.1) — фундамент для всего остального
2. Обновить types.ts (1.2) — типы нужны для storage.ts
3. Параллельно рефакторить (1.3, 1.4, 1.5):
   - horoscope.ts (1.3)
   - historyStory.ts (1.4)
   - storage.ts (1.5)
4. Рефакторить компоненты (1.6) — только после утилит
5. Тестировать (1.7) — перед финальной проверкой
6. Финальная проверка (1.8) — перед коммитом
```

---

### 2. Работа с большими файлами

**Рекомендации:**
1. Использовать поиск по файлу: Cmd+F / Ctrl+F → "Настя" / "NASTIA"
2. Изменять по одному блоку за раз
3. Запускать TypeScript проверку после каждого блока: `npx tsc --noEmit`
4. Коммитить промежуточные изменения
5. Разбить на подзадачи

---

### 3. Тестирование во время разработки

**Рекомендуется:**
1. После каждой задачи запускать:
   ```bash
   npx tsc --noEmit  # Проверка типов
   npm test         # Запуск тестов
   npm start        # Проверка работы приложения
   ```
2. Писать unit-тесты параллельно с кодом (TDD-подход)
3. Не накапливать технический долг

---

### 4. Git workflow

```bash
# Создать отдельную ветку для Фазы 1
git checkout -b phase-1-foundation

# Коммитить по одной задаче за раз
git add src/data/userProfile.ts
git commit -m "feat: create UserProfile interface (task 1.1)"

# После завершения всех задач - смёрджить в main
git checkout main
git merge phase-1-foundation
```

---

## Граф зависимостей

```
Задача 1.1 (userProfile.ts) ─────────────┐
                                         │
                                         v
Задача 1.2 (types.ts) ──────────────> Задача 1.5 (storage.ts)
                │                          │
                │                          │
                v                          │
            Задача 1.3 (horoscope.ts) ────┤
                                          │
            Задача 1.4 (historyStory.ts) ─┤
                                          │
                                          v
                                    Задача 1.6 (компоненты)
                                          │
                                          v
                                    Задача 1.7 (тестирование)
                                          │
                                          v
                                    Задача 1.8 (финальная проверка)
```

**Критический путь:** 1.1 → 1.2 → 1.5 → 1.6 → 1.7 → 1.8 (минимум 10 часов)

**Параллельные задачи:** 1.3, 1.4 можно делать параллельно с 1.5 (экономия ~1-2 часа)

---

**Финальная оценка:** 2-3 рабочих дня при полной концентрации.

**Следующий шаг:** Начать реализацию с задачи 1.1 (userProfile.ts) или 1.2 (types/index.ts) параллельно.

**Примечание:** Полный план из агента содержит детальные примеры кода для всех 39 шагов. Этот файл является сокращённой версией. Полные детали по каждому шагу доступны в секциях задач выше.
