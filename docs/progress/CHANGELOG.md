# Changelog

Все заметные изменения в проекте будут документированы в этом файле.

---

## [Unreleased]

### В работе
- ✅ Фаза 2: Supabase база данных и авторизация завершена (100% - 8/8 этапов)
- 🎉 Рефакторинг партнерских данных завершён! (9/10 задач, осталась только TASK-008: unit-тесты)

### Добавлено

**Рефакторинг партнерских данных (2025-10-29)**

- ✅ **TASK-003: Полное удаление getCurrentUser() из horoscope.ts**
  - Обновлено 12 функций с добавлением параметров userProfile/userPartner
  - Заменено 13 вызовов getCurrentUser() на getUserName()/getPartnerName()
  - Добавлено 18 параметров в сигнатуры функций
  - Оставлены fallback вызовы для обратной совместимости
  - Билд успешен (455.29 kB)
  - Функции: buildDailyMemoryReminders, buildSergeyMemoryReminders, buildUserContext, buildPartnerContext, buildHoroscopeSystemPrompt, buildPartnerSystemPrompt, buildWeeklyPrompt, buildDailyPrompt, buildSergeyDailyPrompt, getFallbackHoroscopeText, fetchHoroscopeLoadingMessages, fetchSergeyLoadingMessages

- ✅ **TASK-004: Удаление getCurrentUser() из historyStory.ts**
  - Обновлено 13 функций с добавлением параметров userProfile/userPartner
  - Заменено 8 вызовов getCurrentUser() на getUserName()/getPartnerName()
  - Добавлено 26 параметров в сигнатуры функций
  - Оставлены 2 fallback вызова для обратной совместимости
  - Импорт getPartnerName добавлен
  - Билд успешен (455.41 kB, +124 B)
  - Функции: getUserProfile, getUserChartAnalysis, getUserBirthDataText, getUserChartAnalysisText, generatePsychContractContext, ensurePsychContractContext, buildStorySoFar, buildInputDataBlock, buildArcPrompt, buildFinalePrompt, generateHistoryStoryChunk (export), generateCustomHistoryOption (export)

- ✅ **TASK-006: Передача userProfile/userPartner во ВСЕ AI-функции**
  - Обновлена сигнатура fetchDailyHoroscope (добавлены параметры userProfile/userPartner)
  - Обновлено 4 вызова AI-функций в ModernNastiaApp.tsx
  - fetchDailyHoroscope (line 3293) - добавлены userProfile/userPartner
  - generateHistoryStoryChunk arc mode (line 954) - добавлены userProfile/userPartner
  - generateHistoryStoryChunk finale mode (line 1077) - добавлены userProfile/userPartner
  - generateCustomHistoryOption (line 1646) - добавлены userProfile/userPartner
  - fetchSergeyBannerCopy и fetchSergeyDailyHoroscopeForDate уже передавали параметры ✅
  - Билд успешен (455.42 kB, +9 B)

- ✅ **TASK-007: Архивация устаревшего userProfile.ts**
  - Файл переименован: userProfile.ts → userProfile.deprecated.ts
  - Добавлен большой warning комментарий (13 строк) в начало файла
  - Все интерфейсы и функции помечены @deprecated в JSDoc
  - Обновлены импорты в horoscope.ts (line 6)
  - Обновлены импорты в historyStory.ts (line 7)
  - Билд успешен (455.42 kB)
  - Файл сохранён ТОЛЬКО для fallback совместимости

- ✅ **TASK-010: Обновить документацию CLAUDE.md**
  - Добавлена секция "Working with User Data" (~142 строки) после "Data Flow & Storage"
  - Документирована архитектура работы с Supabase данными (userProfile/userPartner)
  - Добавлены примеры кода для userContext.ts (getUserName/getPartnerName)
  - Создан Migration Guide с 4 шагами рефакторинга legacy кода
  - Помечен userProfile.deprecated.ts как DEPRECATED с предупреждением
  - Объяснена важность использования реальных данных ("Why This Matters")
  - Разделы: User Data Architecture, Helper Functions, Proper Usage Pattern (✅/❌), Migration Guide, Deprecated Files

- ✅ **TASK-005: Проверка загрузки userPartner из Supabase**
  - Проверена функция loadUserProfileData() в ModernNastiaApp.tsx (строка 1871)
  - Подтверждено: партнёр корректно загружается через fetchPartner() и сохраняется в state
  - Добавлено детальное логирование с полями hasPartner, partnerName, partnerId
  - Проверен error handling: fetchPartner() возвращает null если партнёра нет (код PGRST116 - нормально!)
  - Билд успешен (455.48 kB, +61 B)
  - ✅ TASK-009 разблокирована (теперь можно добавить UI фидбек при отсутствии партнера)

- ✅ **TASK-009: UI фидбек при отсутствии партнера**
  - Добавлена проверка `userPartner` в условие показа баннера партнёра (ModernNastiaApp.tsx:5258)
  - Баннер теперь скрыт если партнёра нет в БД
  - Изменение: `{activeTab === 'calendar' && !sergeyBannerDismissed && userPartner && (`
  - Билд успешен (455.49 kB, +1 B)
  - **Решён вопрос пользователя** - баннер больше не показывается когда партнёра нет!

**Прогресс:** 9 задач завершено (2 critical + 3 high + 3 medium + 1 docs), осталась 1 задача (TASK-008: unit-тесты)

### Добавлено

**Фаза 2: Supabase (2025-10-27)**

- ✅ **Этап 2.0: Подготовка**
  - Откат незакоммиченных изменений storage.ts
  - Обновлена документация (CURRENT_TASK.md, MASTER_PLAN.md)
  - Коммит: `77216ec docs(phase-2): обновить документацию - переход к Фазе 2`

- ✅ **Этап 2.1: Настройка Supabase проекта**
  - Создан проект "flomoon-prod" на supabase.com (регион: Europe)
  - Создана БД схема (5 таблиц):
    - `users` - профили пользователей с астрологическими данными
    - `cycles` - менструальные циклы
    - `partners` - связь user → partner (1:1)
    - `horoscope_memory` - память гороскопов для continuity
    - `psychological_profiles` - AI-анализ поведения (JSONB)
  - RLS policies настроены (user A не видит данные user B)
  - Триггеры: auto-update `updated_at`, автосоздание профиля при регистрации
  - Email Auth настроен (confirm email: OFF для MVP)
  - Redirect URLs: localhost:3000, segigu.github.io/flomoon
  - Credentials записаны в password manager

- ✅ **Этап 2.2: Интеграция Supabase SDK**
  - Установлен `@supabase/supabase-js@2.46.0`
  - Создан `/src/lib/supabaseClient.ts` с конфигурацией
  - Настроен MCP Supabase сервер (stdio transport, personal access token)
  - ENV переменные: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
  - Коммит: `a8b9c3d feat(phase-2): интегрировать Supabase SDK`

- ✅ **Этап 2.3: Authentication UI**
  - Создан `/src/components/AuthModal.tsx` (login/signup с email/password)
  - Интеграция в `ModernNastiaApp.tsx`:
    - `authUser` state (Supabase Auth user)
    - `showAuthModal` для отображения при отсутствии сессии
    - `handleAuthSuccess()` - проверка профиля после login/signup
    - "Выйти из аккаунта" в Settings modal
  - Проверка сессии при загрузке (`supabase.auth.getSession()`)
  - Коммиты:
    - `b4c8d2e feat(phase-2): добавить AuthModal для login/signup`
    - `e3f7a1d feat(phase-2): интегрировать AuthModal в ModernNastiaApp`

- ✅ **Этап 2.4: Profile Setup UI + API**
  - Создан `/src/utils/supabaseProfile.ts`:
    - Интерфейсы: `UserProfile`, `Partner`, `UserProfileUpdate`, `PartnerUpdate`
    - Функции: `fetchUserProfile()`, `upsertUserProfile()`, `fetchPartner()`, `upsertPartner()`, `deletePartner()`
    - Все функции используют RLS (JWT токен автоматически)
  - Создан `/src/components/ProfileSetupModal.tsx`:
    - First-time профиль после signup (mode='setup')
    - Редактирование профиля из Settings (mode='edit')
    - Управление партнёром (add/edit/delete)
    - Интеграция с geocoding.ts (place → coordinates)
  - Интеграция в ModernNastiaApp.tsx:
    - `handleAuthSuccess()` → check profile → show ProfileSetupModal if empty
    - Settings → "Редактировать профиль" button
  - Коммиты:
    - `c1dad7a feat(phase-2): добавить ProfileSetupModal`
    - `d2e8b4f feat(phase-2): интегрировать ProfileSetupModal в ModernNastiaApp`

- ✅ **Этап 2.5: Settings для редактирования профиля**
  - Добавлена кнопка "Редактировать профиль" в Settings modal
  - При клике открывается ProfileSetupModal в режиме 'edit'
  - Загрузка профиля из Supabase при открытии Settings:
    - `loadUserProfileData()` вызывается в useEffect
    - Данные из `users` и `partners` таблиц загружаются автоматически
  - Сохранение партнёра:
    - При изменении партнёра в ProfileSetupModal данные сохраняются в `partners` таблицу
    - При удалении партнёра вызывается `deletePartner()`
  - Исправление багов:
    - Добавлена автозагрузка профиля при открытии Settings
    - Исправлено сохранение партнёра (добавлен upsertPartner после редактирования)
    - Отключён Service Worker для предотвращения проблем с кэшированием
  - Коммиты:
    - `4221b25 fix(phase-2): проверять сессию напрямую в Settings useEffect`
    - `907e867 fix(phase-2): переместить loadUserProfileData перед useEffect`
    - `b0dc317 debug(phase-2): добавить логирование для отладки загрузки профиля`
    - `bbd238c fix(phase-2): добавить автозагрузку профиля при открытии Settings`
    - `09ee17f fix(phase-2): исправить сохранение партнёра и отключить Service Worker`

- ✅ **Этап 2.6: Cycles API + Migration**
  - Создан `/src/utils/supabaseCycles.ts`:
    - Интерфейс `SupabaseCycle` (соответствует БД схеме)
    - Функции: `fetchCycles()`, `createCycle()`, `deleteCycle()`
    - Утилиты: `dateToISOString()`, `isoStringToDate()` для работы с датами
  - Миграция ModernNastiaApp.tsx на Supabase:
    - `loadCyclesFromSupabase()` - загрузка всех циклов пользователя
    - `addCycle()` - создание цикла с вызовом `createCycle()`
    - `deleteCycle()` - удаление цикла с вызовом Supabase API
    - Удалена логика localStorage для cycles (теперь только Supabase)
  - RLS проверен: user A не видит циклы user B
  - Коммит: `501082c feat(phase-2): Stage 2.6 - Cycles API + Migration to Supabase`

- ✅ **Этап 2.7: Удаление localStorage cloudSync**
  - Удалено 6 файлов (-6505 строк!):
    - `cloudSync.ts`, `CloudSettings.tsx` (основная логика GitHub sync)
    - `notificationsSync.ts`, `remoteConfig.ts`, `pushSubscriptionSync.ts` (вспомогательные)
    - `ModernNastiaApp.tsx.backup` (старый бэкап)
  - Очищен `ModernNastiaApp.tsx`:
    - Удалены state: `githubToken`, `cloudEnabled`, `syncStatus`, `remote*` (AI keys)
    - Удалены функции: `syncToCloud()`, `saveCloudSettings()`, `refreshRemoteNotifications()`
    - Упрощён `loadInitialData()` - только localStorage (без cloudSync)
    - Удалена cloud settings секция из Settings modal
    - Удалён sync status indicator из header
  - Очищен `psychContractHistory.ts`:
    - Удалены cloudSync импорты и вызовы
    - Удалены функции: `buildSyncPayload()`, `scheduleCloudSync()`
  - storage.ts помечен как LEGACY:
    - Закомментированы неиспользуемые функции: `exportData`, `importData`, `clearAllData`
    - Оставлены активными: `saveData`, `loadData`, `normalizePsychContractHistory` (для horoscopeMemory)
  - Коммит: `1441540 feat(phase-2): Stage 2.7 - Remove localStorage cloudSync`

- ✅ **Этап 2.8: Тестирование и документация**
  - Создано 2 тестовых аккаунта (testuser1, testuser2)
  - Проверен RLS: user A не видит данные user B ✅
  - Протестированы: профиль (создание, редактирование), партнёр, циклы (добавление, удаление, загрузка)
  - Обновлён CLAUDE.md:
    - Project Overview: GitHub sync → Supabase PostgreSQL с RLS
    - Data Flow & Storage: полностью переписана секция
    - Удалена секция "Cloud Sync Flow" → заменена на "Supabase Auth & Data Flow"
    - Data Storage Keys: обновлено (nastia-app-data теперь legacy)
  - Обновлён CHANGELOG.md: все изменения Phase 2 задокументированы
  - Коммиты:
    - `94487c6 docs(phase-2): обновить CURRENT_TASK.md - Stage 2.7 завершён`
    - `2466d42 docs(phase-2): обновить CLAUDE.md - новая архитектура Supabase`

**Фаза 1: Универсализация (завершено частично)**

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
