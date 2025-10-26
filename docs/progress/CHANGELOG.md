# Changelog

Все заметные изменения в проекте будут документированы в этом файле.

---

## [Unreleased]

### В работе
- Фаза 1: Универсализация и фундамент (50% - 4/8 задач)

### Добавлено
- ✅ **Задача 1.1:** Создан `/src/data/userProfile.ts`
  - Интерфейс `UserProfile` с типизацией для имени, астро-профиля, контекста AI
  - Константа `USER_PROFILES` с профилем Насти (извлечено из horoscope.ts)
  - Функция `getCurrentUser()` для получения текущего пользователя
  - Константа `CURRENT_USER_ID` для обратной совместимости
  - TypeScript компиляция без ошибок

- ✅ **Задача 1.2:** Обновлён `/src/types/index.ts`
  - Добавлены 5 интерфейсов психологического профиля:
    - `BehaviorPattern` - поведенческие паттерны из AI-анализа
    - `StoryAnalysis` - анализ завершённых интерактивных историй
    - `CycleMoodCorrelation` - корреляции цикл ↔ настроение
    - `AstroMoodCorrelation` - корреляции астро-транзиты ↔ настроение
    - `PsychologicalProfile` - центральная структура для агентской системы
  - Обновлён интерфейс `NastiaData` с полем `psychologicalProfile`
  - TypeScript компиляция без ошибок

- ✅ **Задача 1.3:** Рефакторинг `/src/utils/horoscope.ts`
  - Заменены статические константы на динамические функции:
    - `NASTIA_CONTEXT` → `buildUserContext()`
    - `SERGEY_CONTEXT` → `buildPartnerContext()`
    - `HOROSCOPE_SYSTEM_PROMPT` → `buildHoroscopeSystemPrompt()`
    - `SERGEY_SYSTEM_PROMPT` → `buildPartnerSystemPrompt()`
    - `SERGEY_BANNER_SYSTEM_PROMPT` → `buildSergeyBannerSystemPrompt()`
  - Заменены все hardcoded упоминания "Настя" на `getCurrentUser().name`:
    - Fallback-тексты (2 места)
    - Промпты для загрузочных сообщений
    - buildDailyPrompt(), buildWeeklyPrompt(), buildSergeyDailyPrompt()
    - buildSergeyMemoryReminders(), buildSergeyBannerPrompt()
  - TypeScript компиляция без ошибок

- ✅ **Задача 1.4:** Рефакторинг `/src/utils/historyStory.ts`
  - Добавлен импорт `getCurrentUser()` из userProfile.ts
  - Заменены статические константы на динамические функции:
    - `NASTIA_PROFILE`, `NASTIA_CHART_ANALYSIS`, `BIRTH_DATA_TEXT`, `CHART_ANALYSIS_TEXT` →
      `getUserProfile()`, `getUserChartAnalysis()`, `getUserBirthDataText()`, `getUserChartAnalysisText()`
  - Заменены все hardcoded упоминания "Настя"/"Насти" на `getCurrentUser().name` (8 мест):
    - generatePsychContractContext(): "контракт для Насти" (строка 339)
    - buildStorySoFar(): "Дословно Настя сказала" (строка 522)
    - buildInputDataBlock(): `user_name: ${NASTIA_PROFILE.name}` (строка 538)
    - buildArcPrompt(): "Предыдущий выбор Насти" (строка 609)
    - buildArcPrompt(): "натальной карты пользователя Насти" (строка 691)
    - buildFinalePrompt(): "Настя СКАЗАЛА СВОИМИ СЛОВАМИ" (строка 746)
    - buildFinalePrompt(): "Настя сказала буквально", "итоговый выбор Насти" (строки 762, 766)
    - buildFinalePrompt(): "для Насти" (строка 803)
    - generateHistoryStoryChunk(): "для Насти" (строка 1093)
  - TypeScript компиляция без ошибок

---

## [2025-10-26] - Планирование и документация

### Добавлено
- ✅ Создана структура документации (`docs/`)
- ✅ MASTER_PLAN.md - объединённый план с 4 фазами (15-19 дней работы)
- ✅ PHASE_1_FOUNDATION.md - универсализация кода (8 задач)
- ✅ PHASE_2_AI_AGENTS.md - агентская система (14 задач)
- ✅ PHASE_3_PERSONALIZATION.md - персонализация промптов (6 задач)
- ✅ PHASE_4_UI.md - пользовательский интерфейс (10 задач)
- ✅ ADR-001: Universal User Profile
- ✅ ADR-002: AI Agent Tiers (3-уровневая система, экономия 24x)
- ✅ ADR-003: Prompt Caching (экономия 80-90% на input токенах)
- ✅ AGENT_PROMPTS.md - централизованное хранилище промптов
- ✅ CURRENT_TASK.md, CHANGELOG.md, BLOCKERS.md - трекинг прогресса
- ✅ Slash commands для Claude Code (`/status`, `/next`, `/plan`)

### Изменено
- 🔄 CLAUDE.md - добавлены ссылки на новую документацию

### Архитектурные решения
- Трёхуровневая система AI-агентов (Tier 1: Haiku, Tier 2: Haiku, Tier 3: Sonnet)
- Prompt caching для экономии токенов
- Универсальная структура UserProfile для мультипользовательности
- Инкрементальные обновления (не анализируем всю историю каждый раз)

---

## [2025-10-15] - Voice Recording

### Добавлено
- Голосовая запись "Свой вариант" в DiscoverTabV2
- Props-based архитектура для customOption
- Документация: VOICE_RECORDING.md

### Исправлено
- Infinite loop при использовании setChoices в useEffect
- Корректная передача состояния через props

---

## Предыдущие версии

_(История проекта до начала систематической документации)_

---

**Формат:** [Дата] - Название релиза
**Категории:** Добавлено, Изменено, Исправлено, Удалено, Безопасность
