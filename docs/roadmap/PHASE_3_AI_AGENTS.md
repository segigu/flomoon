# Фаза 2: AI-агенты и сбор данных

**Статус:** ⏳ Ожидает
**Зависит от:** Фаза 1
**ETA:** 5-6 дней
**Прогресс:** 0% (0/14 задач)

---

## 🎯 Цель фазы

Создать 3-уровневую систему AI-агентов для сбора, анализа и интерпретации данных пользователя с минимальными затратами на токены (экономия 24x).

**Результат фазы:** Работающая агентская система, которая:
- Классифицирует выборы пользователя (Tier 1)
- Анализирует паттерны поведения (Tier 2)
- Генерирует персонализированный контент (Tier 3)
- Стоимость: ~$0.011 за историю (vs $0.27 без оптимизации)

---

## 📋 Задачи

### 2.1 Базовая инфраструктура агентов

**Файл:** `src/ai-agents/BaseAgent.ts` (создать)
**Зависимости:** нет
**Время:** 3-4 часа
**Статус:** ⏳ Ожидает

**Описание:**
Создать базовый класс для всех AI-агентов с поддержкой prompt caching и автоматическим выбором модели.

**Acceptance criteria:**
- [ ] `AgentConfig` интерфейс (model, systemPrompt, temperature, maxTokens, cacheable)
- [ ] `BaseAgent<TInput, TOutput>` абстрактный класс
- [ ] Методы: `buildPrompt()`, `parseResponse()`, `execute()`
- [ ] Поддержка prompt caching для Claude API
- [ ] Автоматический выбор модели (Haiku/Sonnet) по config
- [ ] Обработка ошибок и retry логика
- [ ] Тесты для BaseAgent

**Связанные ADR:** [ADR-002-ai-agent-tiers.md](../architecture/ADR-002-ai-agent-tiers.md), [ADR-003-prompt-caching.md](../architecture/ADR-003-prompt-caching.md)

---

### 2.2 Tier 1: TrapDetectorAgent

**Файл:** `src/ai-agents/TrapDetectorAgent.ts` (создать)
**Зависимости:** 2.1
**Время:** 2 часа
**Статус:** ⏳ Ожидает

**Описание:**
Агент для классификации выборов пользователя по категориям психологических ловушек.

**Acceptance criteria:**
- [ ] Наследуется от `BaseAgent<TrapDetectorInput, TrapDetectorOutput>`
- [ ] Модель: Haiku 4.5
- [ ] Промпт определяет категорию (avoidance, people-pleasing, perfectionism, guilt, и т.д.)
- [ ] Output: `{ category: string | null, confidence: number }`
- [ ] Температура: 0.2 (детерминированность)
- [ ] Max tokens: 100
- [ ] Тесты с примерами выборов

---

### 2.3 Tier 1: BatchTrapDetectorAgent

**Файл:** `src/ai-agents/BatchTrapDetectorAgent.ts` (создать)
**Зависимости:** 2.2
**Время:** 1-2 часа
**Статус:** ⏳ Ожидает

**Описание:**
Batch-версия TrapDetectorAgent для обработки нескольких выборов за один запрос (экономия overhead).

**Acceptance criteria:**
- [ ] Обрабатывает массив выборов (до 10 за раз)
- [ ] Output: массив `{ category, confidence }[]`
- [ ] Экономия: ~2.6x токенов vs отдельные запросы
- [ ] Тесты с 7 выборами (стандартная история)

---

### 2.4 Tier 1: ThemeExtractorAgent

**Файл:** `src/ai-agents/ThemeExtractorAgent.ts` (создать)
**Зависимости:** 2.1
**Время:** 1-2 часа
**Статус:** ⏳ Ожидает

**Описание:**
Агент для извлечения ключевых тем из заметок пользователя о днях цикла.

**Acceptance criteria:**
- [ ] Модель: Haiku 4.5
- [ ] Input: текст заметки
- [ ] Output: `{ themes: string[], mood: 'good'|'neutral'|'bad' }`
- [ ] Температура: 0.3
- [ ] Max tokens: 150
- [ ] Тесты с примерами заметок

---

### 2.5 Tier 2: PatternAnalyzerAgent

**Файл:** `src/ai-agents/PatternAnalyzerAgent.ts` (создать)
**Зависимости:** 2.1
**Время:** 2-3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Агент для анализа паттернов поведения из агрегированной статистики выборов.

**Acceptance criteria:**
- [ ] Модель: Haiku 4.5
- [ ] Input: агрегированная статистика (не сырые данные!)
- [ ] Output: `{ dominantPattern, insight (1 sentence), triggers[] }`
- [ ] Температура: 0.5
- [ ] Max tokens: 300
- [ ] Запускается раз в неделю или каждые 5 историй
- [ ] Тесты с моковой статистикой

---

### 2.6 Tier 2: CorrelationAnalyzerAgent

**Файл:** `src/ai-agents/CorrelationAnalyzerAgent.ts` (создать)
**Зависимости:** 2.1
**Время:** 2-3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Агент для поиска корреляций между циклом/астрологией и настроением.

**Acceptance criteria:**
- [ ] Модель: Haiku 4.5
- [ ] Input: `{ cycleMoodStats, astroMoodStats }`
- [ ] Output: `{ cycleMoodInsight, astroMoodInsight, recommendations[] }`
- [ ] Температура: 0.5
- [ ] Max tokens: 400
- [ ] Запускается раз в неделю для отчёта
- [ ] Тесты с моковыми корреляциями

---

### 2.7 Tier 3: ContractPersonalizerAgent

**Файл:** `src/ai-agents/ContractPersonalizerAgent.ts` (создать)
**Зависимости:** 2.1, 2.5
**Время:** 3-4 часа
**Статус:** ⏳ Ожидает

**Описание:**
Агент для генерации персонализированных психологических контрактов с учётом инсайтов от Tier 2.

**Acceptance criteria:**
- [ ] Модель: Sonnet 4.5
- [ ] Input: выжимка от PatternAnalyzerAgent + astro vulnerabilities
- [ ] Output: новый психологический контракт
- [ ] Использует prompt caching (натальная карта, библиотека астро-ран)
- [ ] Температура: 0.7 (креативность)
- [ ] Max tokens: 2000
- [ ] Тесты с разными паттернами поведения

**Связанные документы:** [AGENT_PROMPTS.md](../architecture/AGENT_PROMPTS.md)

---

### 2.8 Tier 3: InsightGeneratorAgent

**Файл:** `src/ai-agents/InsightGeneratorAgent.ts` (создать)
**Зависимости:** 2.1, 2.5, 2.6
**Время:** 2-3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Агент для генерации человекочитаемых инсайтов для UI (еженедельный отчёт).

**Acceptance criteria:**
- [ ] Модель: Sonnet 4.5
- [ ] Input: выжимки от PatternAnalyzer + CorrelationAnalyzer
- [ ] Output: `{ summary, recommendations[], astroInsights[] }`
- [ ] Температура: 0.6
- [ ] Max tokens: 1500
- [ ] Запускается раз в неделю
- [ ] Тесты с моковыми инсайтами

---

### 2.9 Библиотека астро-психологии

**Файл:** `src/data/astroPsychology.ts` (создать)
**Зависимости:** нет
**Время:** 4-5 часов
**Статус:** ⏳ Ожидает

**Описание:**
Создать библиотеку конкретных психологических проявлений астрологических аспектов.

**Acceptance criteria:**
- [ ] Интерфейс `AstroWoundProfile` (coreWound, manifestations, defenses, triggers, growthPath, therapyGoals, contractThemes)
- [ ] Описано 7-10 основных аспектов:
  - Moon-Saturn (квадрат/оппозиция)
  - Venus-Pluto
  - Sun-Saturn
  - Mars-Saturn
  - Mercury-Neptune
  - и другие
- [ ] Функция `findAstroVulnerabilities(chartAnalysis)` - поиск подходящих ран
- [ ] Тесты с натальной картой Насти

---

### 2.10 Утилиты для анализа циклов

**Файл:** `src/utils/cycleAnalyzer.ts` (создать)
**Зависимости:** нет
**Время:** 3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Утилиты для анализа корреляций между фазами цикла и настроением.

**Acceptance criteria:**
- [ ] `analyzeCycleMoodCorrelations(cycles)` - возвращает `CycleMoodCorrelation[]`
- [ ] Для каждой фазы: moodDistribution (%), averagePainLevel, commonNotes
- [ ] Функция `determineCyclePhase(cycle, date)` - определение фазы по дате
- [ ] Функция `extractCommonThemes(notes)` - частые темы из заметок
- [ ] Минимум 3 цикла для статистики
- [ ] Тесты с моковыми данными

---

### 2.11 Утилиты для анализа астро-настроения

**Файл:** `src/utils/astroMoodAnalyzer.ts` (создать)
**Зависимости:** нет
**Время:** 3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Утилиты для анализа корреляций между астрологическими транзитами и настроением.

**Acceptance criteria:**
- [ ] `analyzeAstroMoodCorrelations(cycles, userProfile)` - возвращает `AstroMoodCorrelation[]`
- [ ] Для каждого транзита: moodImpact, occurrences, averageMood, examples
- [ ] Парсинг типа транзита из описания ("транзитный Сатурн квадрат к Луне" → "Saturn-Moon square")
- [ ] Минимум 3 случая для включения в результаты
- [ ] Тесты с моковыми транзитами

---

### 2.12 Психологический профайлер

**Файл:** `src/utils/psychologicalProfiler.ts` (создать)
**Зависимости:** 2.2, 2.3, 2.5
**Время:** 3-4 часа
**Статус:** ⏳ Ожидает

**Описание:**
Основная логика обновления психологического профиля после завершения истории.

**Acceptance criteria:**
- [ ] `detectTrapCategory(title, description)` - fallback без AI (регулярки)
- [ ] `detectDominantPattern(choices)` - локальная логика
- [ ] `updatePsychologicalProfile(storyAnalysis)` - инкрементальное обновление
- [ ] `shouldRunFullAnalysis(profile)` - логика запуска Tier 2 (раз в неделю / каждые 5 историй)
- [ ] Обновление только новых данных (не вся история)
- [ ] Тесты для всех функций

---

### 2.13 Интеграция в DiscoverTabV2

**Файл:** `src/components/DiscoverTabV2.tsx` (изменить)
**Зависимости:** 2.3, 2.12
**Время:** 3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Интегрировать сохранение выборов и обновление психологического профиля в компонент истории.

**Acceptance criteria:**
- [ ] При каждом выборе: сохранять в `currentStoryAnalysis.choices`
- [ ] При завершении истории: запустить `BatchTrapDetectorAgent`
- [ ] Обновить профиль через `updatePsychologicalProfile()`
- [ ] Индикатор "анализ выполняется" во время работы агента
- [ ] Обработка ошибок агентов (fallback на локальную логику)
- [ ] Тесты интеграции

---

### 2.14 Тестирование и оптимизация

**Время:** 4-5 часов
**Зависимости:** 2.1-2.13
**Статус:** ⏳ Ожидает

**Описание:**
Протестировать всю агентскую систему, измерить стоимость, оптимизировать.

**Acceptance criteria:**
- [ ] Все unit тесты проходят
- [ ] Интеграционные тесты (полный цикл: история → анализ → профиль)
- [ ] Измерена стоимость: ~$0.011 за историю (target)
- [ ] Измерено время: <5 секунд для Tier 1, <10 секунд для Tier 2
- [ ] Prompt caching работает (проверить через API metrics)
- [ ] Нет утечек памяти
- [ ] Документация обновлена

---

## 🔗 Зависимости между задачами

```
2.1 (BaseAgent)
  ├─> 2.2 (TrapDetectorAgent)
  │    └─> 2.3 (BatchTrapDetectorAgent)
  │         └─> 2.12 (psychologicalProfiler)
  │              └─> 2.13 (DiscoverTabV2 integration)
  ├─> 2.4 (ThemeExtractorAgent)
  ├─> 2.5 (PatternAnalyzerAgent)
  │    ├─> 2.7 (ContractPersonalizerAgent)
  │    └─> 2.8 (InsightGeneratorAgent)
  └─> 2.6 (CorrelationAnalyzerAgent)
       └─> 2.8 (InsightGeneratorAgent)

2.9 (astroPsychology)
2.10 (cycleAnalyzer)
2.11 (astroMoodAnalyzer)

All --> 2.14 (testing)
```

---

## ✅ Критерии завершения фазы

- [ ] Все 14 задач выполнены
- [ ] Все тесты проходят (`npm test`)
- [ ] Стоимость обработки 1 истории: ~$0.011 (±20%)
- [ ] Агенты работают стабильно (error rate <1%)
- [ ] Психологический профиль обновляется после каждой истории
- [ ] `CHANGELOG.md` обновлён
- [ ] `CURRENT_TASK.md` указывает на Фазу 3

---

## 💰 Экономика токенов (target)

- Tier 1 (batch): ~1,050 токенов ($0.0001)
- Tier 2 (раз в неделю): ~600 токенов ($0.0006)
- Tier 3 (с caching): ~2,000 токенов ($0.01)
- **Итого за историю:** ~$0.011
- **Экономия:** 24x vs наивный подход ($0.27)

---

## ➡️ Следующая фаза

После завершения переходим к:
**[PHASE_3_PERSONALIZATION.md](./PHASE_3_PERSONALIZATION.md)** - персонализация промптов для AI.

---

**Создано:** 2025-10-26
**Обновлено:** 2025-10-26
