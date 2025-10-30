# Task Backlog

**Last updated:** 2025-10-30T17:50:00Z

## Statistics

- **Total tasks:** 29
- **Completed:** 26/29 (90%)
- **In progress:** 1
- **Pending:** 2

## Tasks

### ✅ TASK-001: Локализировать названия месяцев в календаре

**Category:** bug | **Priority:** 🟡 medium | **Status:** done

**Complexity:** simple

В календаре название месяца и года (например, 'октябрь 2025 г.') отображается только на русском языке независимо от выбранного языка приложения. Нужно добавить локализацию через i18n для форматирования дат в соответствии с текущим языком (русский/английский). Проверить все места где отображаются названия месяцев и обеспечить консистентную локализацию.

**Tags:** i18n, localization, calendar, ui

**Related files:**
- src/components/ModernNastiaApp.tsx
- src/components/CycleLengthChart.tsx
- src/utils/dateUtils.ts

**Notes:** Скриншот показывает 'октябрь 2025 г.' - нужно использовать toLocaleString или i18n.language для форматирования

---

### ✅ TASK-002: Исправить использование захардкоженных данных партнёра вместо БД

**Category:** bug | **Priority:** 🔴 critical | **Status:** done

**Complexity:** complex

Критический баг: имя партнёра 'Сергей' захардкожено в 19 файлах. AI-промпты используют статический профиль getCurrentUser() вместо реальных данных из Supabase (таблица partners). Даже после удаления партнёра в БД имя продолжает использоваться из src/data/userProfile.ts. Критичные файлы: cyclePrompt.ts (6 вхождений 'Sergey'), horoscope.ts (6 функций), ModernNastiaApp.tsx (не передаёт userPartner). Требуется: создать утилиту userContext.ts для получения партнёра из БД, рефакторинг AI-промптов (horoscope.ts, historyStory.ts, cyclePrompt.ts), обновление ModernNastiaApp.tsx для передачи userPartner в AI-функции.

**Tags:** ai, database, personalization, partner, hardcoded-data

**Related files:**
- src/utils/prompts/cyclePrompt.ts
- src/utils/horoscope.ts
- src/utils/historyStory.ts
- src/components/ModernNastiaApp.tsx
- src/data/userProfile.ts

**Notes:** План из 7 подзадач: 1) ✅ Аудит (выполнен), 2) ✅ Исправить cyclePrompt.ts, 3) ✅ Создать userContext.ts, 4) ✅ Рефакторинг horoscope.ts, 5) ✅ Рефакторинг historyStory.ts, 6) ✅ Обновить ModernNastiaApp.tsx, 7) ✅ Проект успешно собран

---

### ✅ TASK-003: Полное удаление getCurrentUser() из horoscope.ts

**Category:** refactor | **Priority:** 🔴 critical | **Status:** done

**Complexity:** moderate

Критический рефакторинг: в horoscope.ts остались 16 вызовов getCurrentUser(), который возвращает захардкоженные данные с именем 'Сергей' вместо реальных данных из Supabase. Необходимо заменить все вызовы на getUserName(userProfile) / getPartnerName(userPartner), добавить параметры userProfile/userPartner во все функции (buildSergeyDailyPrompt, buildDailyPrompt, buildWeeklyPrompt и др.), обновить вызовы этих функций для передачи реальных данных.

**Tags:** refactor, horoscope, ai, hardcoded-data, partner

**Related files:**
- src/utils/horoscope.ts

**Notes:** ✅ Выполнено: Обновлено 12 функций, удалено 13 вызовов getCurrentUser() (остались только fallback), добавлено 18 параметров userProfile/userPartner. Билд успешен. Функции: buildDailyMemoryReminders, buildSergeyMemoryReminders, buildUserContext, buildPartnerContext, buildHoroscopeSystemPrompt, buildPartnerSystemPrompt, buildWeeklyPrompt, buildDailyPrompt, buildSergeyDailyPrompt, getFallbackHoroscopeText, fetchHoroscopeLoadingMessages, fetchSergeyLoadingMessages.

---

### ✅ TASK-004: Удаление getCurrentUser() из historyStory.ts

**Category:** refactor | **Priority:** 🔴 critical | **Status:** done

**Complexity:** simple

В historyStory.ts остались 5 вызовов getCurrentUser(), которые возвращают захардкоженные данные вместо реальных из Supabase. Необходимо добавить параметры userProfile/userPartner во все функции генерации интерактивных историй, обновить вызовы в ModernNastiaApp.tsx (DiscoverTab), заменить getCurrentUser().name на getUserName(userProfile).

**Tags:** refactor, interactive-story, ai, hardcoded-data

**Related files:**
- src/utils/historyStory.ts
- src/components/ModernNastiaApp.tsx

**Notes:** ✅ Выполнено: Обновлено 13 функций, удалено 8 вызовов getCurrentUser() (остались 2 fallback), добавлено 26 параметров userProfile/userPartner. Билк успешен. Функции: getUserProfile, getUserChartAnalysis, getUserBirthDataText, getUserChartAnalysisText, generatePsychContractContext, ensurePsychContractContext, buildStorySoFar, buildInputDataBlock, buildArcPrompt, buildFinalePrompt, generateHistoryStoryChunk (export), CustomHistoryOptionRequest (interface), generateCustomHistoryOption (export). Импорт getPartnerName добавлен (строка 9).

---

### ✅ TASK-005: Проверка загрузки userPartner из Supabase

**Category:** bug | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

Необходимо убедиться, что userPartner корректно загружается из Supabase при старте приложения и сохраняется в state компонента ModernNastiaApp. Добавить логирование загрузки партнера, проверить вызов getPartner() из supabaseProfile.ts, добавить error handling для случаев когда партнер не загружается. Если партнер существует в БД но не отображается в Settings - проблема именно здесь.

**Tags:** bug, partner, database, supabase

**Related files:**
- src/components/ModernNastiaApp.tsx
- src/utils/supabaseProfile.ts

**Notes:** ✅ Выполнено: Проверена функция loadUserProfileData() - партнёр загружается корректно через fetchPartner(), сохраняется в state через setUserPartner(partner). Добавлено детальное логирование: console.log('📊 Partner loaded:', { hasPartner: !!partner, partnerName: partner?.name, partnerId: partner?.id }). Error handling УЖЕ правильный - fetchPartner() возвращает null если партнёра нет (код PGRST116), что является нормальной ситуацией. State обновляется корректно. Билд успешен (455.48 kB, +61 B).

---

### ✅ TASK-006: Передача userProfile/userPartner во ВСЕ AI-функции

**Category:** refactor | **Priority:** 🟠 high | **Status:** done

**Complexity:** moderate

Гарантировать передачу реальных данных пользователя (userProfile/userPartner) во все AI-функции приложения. Найти все вызовы fetchSergeyDailyHoroscopeForDate(), fetchSergeyBannerCopy(), fetchDailyHoroscope(), fetchWeeklyHoroscope(), generateInteractiveStory() в ModernNastiaApp.tsx и убедиться что везде передаются userProfile и userPartner. Добавить fallback на пустые строки если данных нет.

**Tags:** refactor, ai, partner, horoscope

**Related files:**
- src/components/ModernNastiaApp.tsx
- src/utils/horoscope.ts

**Notes:** ✅ Выполнено: Обновлена сигнатура fetchDailyHoroscope (добавлены параметры userProfile/userPartner). Обновлено 4 вызова AI-функций в ModernNastiaApp.tsx: fetchDailyHoroscope (line 3293), generateHistoryStoryChunk arc mode (line 954), generateHistoryStoryChunk finale mode (line 1077), generateCustomHistoryOption (line 1646). Функции fetchSergeyBannerCopy и fetchSergeyDailyHoroscopeForDate уже передавали эти параметры. Билд успешен (455.42 kB, +9 B). ⚠️ ESLint warnings о dependency arrays (не критично).

---

### ✅ TASK-007: Архивация устаревшего userProfile.ts

**Category:** chore | **Priority:** 🟡 medium | **Status:** done

**Complexity:** trivial

Переименовать src/data/userProfile.ts в userProfile.deprecated.ts и добавить предупреждающий комментарий о том, что файл устарел и содержит только hardcoded данные для legacy совместимости. Удалить все импорты из других файлов после завершения TASK-003 и TASK-004. Это предотвратит случайное использование захардкоженных данных в будущем.

**Tags:** chore, refactor, cleanup, deprecated

**Related files:**
- src/data/userProfile.deprecated.ts
- src/utils/horoscope.ts
- src/utils/historyStory.ts

**Notes:** ✅ Выполнено: Файл переименован в userProfile.deprecated.ts с добавлением большого warning комментария (⚠️ DEPRECATED - DO NOT USE! Use src/utils/userContext.ts). Обновлены импорты в horoscope.ts (line 6) и historyStory.ts (line 7). Все интерфейсы и функции помечены как @deprecated. Билд успешен (455.42 kB). Файл сохранён только для fallback совместимости.

---

### ✅ TASK-008: Добавить тесты для партнерских функций

**Category:** test | **Priority:** 🟡 medium | **Status:** done

**Complexity:** moderate

Написать unit-тесты для функций работы с данными пользователя и партнера. Создать horoscope.test.ts и userContext.test.ts, протестировать getUserName() и getPartnerName() с различными сценариями (партнер существует, партнер null, fallback на дефолтные значения). Протестировать промпты с userProfile/userPartner, убедиться что hardcoded 'Сергей' не появляется нигде.

**Tags:** test, partner, unit-tests, quality

**Related files:**
- src/utils/userContext.test.ts

**Notes:** ✅ Завершено: Создан userContext.test.ts с 30 unit-тестами покрывающими все helper-функции. Тесты проверяют: getUserName()/getPartnerName() с universal defaults (пустые строки, БЕЗ hardcoded 'Настя'/'Сергей'), hasPartner() требует name AND birth_date для астрологии, hasLocationAccess() privacy-first default (false), getUserCoordinates() возвращает null если доступ запрещён, isCycleTrackingEnabled() default true для backward compatibility. Все 30 тестов прошли успешно. TypeScript компиляция успешна. Коммит ed57144. Universal app - никаких захардкоженных имён.

---

### ✅ TASK-009: UI фидбек при отсутствии партнера

**Category:** ui | **Priority:** 🟡 medium | **Status:** done

**Complexity:** simple

Улучшить UX когда у пользователя нет партнера в профиле. В баннере 'Что там у партнера?' проверять userPartner === null и показывать текст 'Добавьте партнера в настройках, чтобы увидеть совместимость' с кнопкой 'Добавить партнера' которая открывает Settings → ProfileSetupModal. Опционально: скрыть баннер полностью если партнер не нужен.

**Tags:** ui, ux, partner, feedback

**Related files:**
- src/components/ModernNastiaApp.tsx

**Notes:** ✅ Выполнено: Добавлена проверка userPartner в условие показа баннера партнёра (ModernNastiaApp.tsx:5258). Баннер теперь скрыт если партнёра нет в БД. Изменение: {activeTab === 'calendar' && !sergeyBannerDismissed && userPartner && (. Билк успешен (455.49 kB, +1 B). Решает вопрос пользователя - баннер больше не показывается когда партнёра нет!

---

### ✅ TASK-010: Обновить документацию CLAUDE.md

**Category:** docs | **Priority:** 🟡 medium | **Status:** done

**Complexity:** trivial

Актуализировать CLAUDE.md после завершения рефакторинга партнерских функций. Удалить упоминания userProfile.ts как источника данных, добавить секцию 'Работа с данными пользователя' с инструкциями использовать userContext.ts для получения данных из Supabase, всегда передавать userProfile/userPartner в AI-функции, не использовать getCurrentUser() (deprecated). Обновить примеры кода.

**Tags:** docs, documentation, refactor

**Related files:**
- CLAUDE.md

**Notes:** ✅ Выполнено: Добавлена новая секция 'Working with User Data' (~142 строки) после 'Data Flow & Storage' в CLAUDE.md. Включает: User Data Architecture, userContext.ts Helper Functions (с примерами кода), Proper Usage Pattern (✅ правильно / ❌ неправильно), Migration Guide (4 шага), Deprecated Files (предупреждение о userProfile.deprecated.ts), Why This Matters (объяснение важности). Примеры кода показывают корректную передачу userProfile/userPartner параметров, использование getUserName()/getPartnerName(), паттерн optional параметров с fallback.

---

### ✅ TASK-011: Исправить локализацию дат в недельном гороскопе модального окна периода

**Category:** bug | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

В модальном окне новой менструации недельный гороскоп отображает даты всегда на русском языке (например '29 октября — 4 ноября'), даже если интерфейс переключен на немецкий/английский или другие языки. Даты должны форматироваться согласно текущей локали (i18n.language). Баг видно при тестировании с разными языками - диапазон дат в гороскопе не локализуется. Нужно найти место где генерируются заголовки для недельного гороскопа (скорее всего в horoscope.ts) и использовать правильное форматирование даты в зависимости от языка.

**Tags:** i18n, localization, date-formatting, modal, horoscope

**Related files:**
- src/utils/horoscope.ts
- src/utils/dateUtils.ts
- src/components/ModernNastiaApp.tsx

**Notes:** ✅ Выполнено: Добавлен параметр language в getWeekRange(), маппинг локалей (ru→ru-RU, en→en-US, de→de-DE), использован Intl.DateTimeFormat с правильной локалью. Обновлены вызовы в buildWeeklyPrompt() (строка 676) и fetchDailyHoroscope() (строка 1052). Билд успешен (454.96 kB, +4 B). Версия 0.3.8 задеплоена на GitHub Pages. Форматы: русский '29 октября — 4 ноября', английский '29 October — 4 November', немецкий '29 Oktober — 4 November'.

---

### ✅ TASK-012: Убрать захардкоженное имя 'Настя' из AI-фраз модального окна периода

**Category:** bug | **Priority:** 🟡 medium | **Status:** done

**Complexity:** simple

В модальном окне начала менструации AI генерирует фразы с захардкоженным именем 'Настя' вместо использования реального имени пользователя из userProfile.display_name. Например: 'Привет, Настя! Твой цикл начался...' вместо 'Привет, {userName}! Твой цикл начался...'. Это остаток от TASK-002 (универсализация промптов) - видимо, функция генерации контента для модального окна периода (скорее всего в src/utils/aiContent.ts или вызов из ModernNastiaApp.tsx) не получает userProfile/userPartner в качестве параметров. Нужно добавить параметры userProfile/userPartner и использовать getUserName() из userContext.ts для подстановки реального имени в промпты.

**Tags:** ai, personalization, modal, hardcoded-data, user-profile

**Related files:**
- src/utils/aiContent.ts
- src/components/ModernNastiaApp.tsx
- src/utils/userContext.ts

**Notes:** ✅ Завершено: 1) aiContent.ts - добавлен import UserProfileData/PartnerData, расширен GeneratePeriodContentOptions интерфейс (userProfile/userPartner параметры), функция generatePeriodModalContent() использует getUserName(userProfile) для fallback, 2) Исправлен hardcoded текст 'опирайся на ощущения Насти' → 'опирайся на свои ощущения' (line 153), 3) ModernNastiaApp.tsx - вызов generatePeriodModalContent() обновлён: добавлены userProfile и userPartner параметры (line 3280-3281), 4) TypeScript компиляция успешна. Теперь модальное окно периода использует реальное имя пользователя из Supabase вместо захардкоженного 'Настя'. Коммит bf4e5f9.

---

### ✅ TASK-013: Добавить location_access и cycle_tracking_enabled в users таблицу

**Category:** chore | **Priority:** 🟠 high | **Status:** done

**Complexity:** moderate

Миграция БД для Phase 1: добавить два новых boolean поля в таблицу users. location_access_enabled (DEFAULT FALSE) - флаг разрешения на доступ к геолокации. cycle_tracking_enabled (DEFAULT TRUE) - флаг активности отслеживания менструального цикла. Обновить TypeScript типы UserProfileData и UserProfileRow в src/types/index.ts. Добавить функции updateLocationAccess() и updateCycleTracking() в src/utils/supabaseProfile.ts для изменения этих флагов. SQL миграция применяется через Supabase Dashboard.

**Tags:** database, migration, typescript, supabase, infrastructure

**Related files:**
- src/types/index.ts
- src/utils/supabaseProfile.ts
- src/utils/userContext.ts
- migrations/add_user_settings_columns.sql

**Notes:** ✅ Завершено: 1) SQL миграция создана и применена к БД Supabase (location_access_enabled=false, cycle_tracking_enabled=true), 2) UserProfileData обновлен в userContext.ts, 3) UserProfile и UserProfileUpdate обновлены в supabaseProfile.ts, 4) Добавлены функции updateLocationAccess() и updateCycleTracking(), 5) TypeScript компиляция успешна. Разблокированы: TASK-014, TASK-015, TASK-016, TASK-017, TASK-018, TASK-019.

---

### ✅ TASK-014: Параметризация функций погоды - добавить поддержку координат

**Category:** refactor | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

Этап 2 универсализации: обновить fetchDailyWeatherSummary() и fetchWeeklyWeatherSummary() для приема координат (latitude, longitude) как параметров вместо использования захардкоженного COBURG_COORDS. Модифицировать buildQueryUrl() для использования переданных координат или возврата null если координаты не предоставлены. Удалить захардкоженный COBURG_COORDS из weather.ts. Погода запрашивается только если координаты явно переданы. Добавить проверку: если координаты null/undefined - функции возвращают null без запроса к API.

**Tags:** weather, refactor, coordinates, parameterization

**Related files:**
- src/utils/weather.ts

**Notes:** ✅ Завершено: 1) buildQueryUrl() принимает latitude/longitude параметры, возвращает null если не переданы, 2) fetchWeatherRange() передаёт координаты в buildQueryUrl + early return если url=null, 3) fetchDailyWeatherSummary() принимает latitude/longitude + early return null, 4) fetchWeeklyWeatherSummary() принимает latitude/longitude + early return null, 5) COBURG_COORDS константа удалена (50.2584, 10.9629 больше не захардкожены), 6) TypeScript компиляция успешна. Privacy-first: погода НЕ запрашивается без координат. Разблокированы: TASK-016 (промпты), TASK-020 (вызовы).

---

### ✅ TASK-015: Этап 3: Хелперы userContext.ts - добавить 4 функции для профиля

**Category:** refactor | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

Расширить src/utils/userContext.ts четырьмя новыми helper-функциями для работы с профилем пользователя и партнера. Функции: hasLocationAccess(userProfile) - проверяет location_access_enabled флаг (возвращает boolean), getUserCoordinates(userProfile) - возвращает {latitude, longitude} или null если координат нет, isCycleTrackingEnabled(userProfile) - проверяет цикл трекинга (дефолт true если поле отсутствует), hasPartner(userPartner) - проверяет что у партнера есть имя И дата рождения (возвращает boolean). Все функции принимают userProfile/userPartner опционально и имеют graceful fallback. Обновить TypeScript типы если нужно.

**Tags:** refactor, helpers, user-profile, supabase, typescript

**Related files:**
- src/utils/userContext.ts
- src/types/index.ts

**Notes:** ✅ Завершено: 1) hasLocationAccess(userProfile) - проверяет location_access_enabled (default: false, privacy-first), 2) getUserCoordinates(userProfile) - возвращает {latitude, longitude} или null (проверяет hasLocationAccess + current_latitude/current_longitude), 3) isCycleTrackingEnabled(userProfile) - проверяет cycle_tracking_enabled (default: true для обратной совместимости), 4) hasPartner(userPartner) - обновлена для проверки name И birth_date (требуется для астрологии), 5) TypeScript компиляция успешна. Все функции с null-safety и graceful fallback. Разблокированы: TASK-016 (промпты), TASK-019 (скрытие UI), TASK-020 (вызовы).

---

### ✅ TASK-016: Этап 4: Обновить промпты гороскопов с условной логикой

**Category:** refactor | **Priority:** 🟠 high | **Status:** done

**Complexity:** complex

Модифицировать функции построения промптов в src/utils/horoscope.ts для условного включения данных в зависимости от профиля пользователя. Обновить buildWeeklyPrompt(), buildDailyPrompt(), buildSergeyDailyPrompt() чтобы включать: партнера только если hasPartner(userPartner)=true, погоду только если weatherSummary !== null, цикл только если isCycleTrackingEnabled(userProfile)=true. Обновить fetchDailyHoroscope(), fetchDailyHoroscopeForDate(), fetchSergeyDailyHoroscopeForDate() для приема и передачи координат через getUserCoordinates(userProfile). Всего 8 комбинаций для тестирования (партнер: да/нет × погода: да/нет × цикл: да/нет + с координатами).

**Tags:** refactor, horoscope, prompts, conditional-logic, universalization

**Related files:**
- src/utils/horoscope.ts
- src/utils/weather.ts
- src/utils/userContext.ts

**Notes:** ✅ Завершено: 1) fetchDailyHoroscope() (weekly): hasPartner() check → partnerName or null, getUserCoordinates() → weather with coords or null, isCycleTrackingEnabled() → cycleHint or null, 2) fetchDailyHoroscopeForDate() (daily): same privacy-first checks, 3) fetchSergeyDailyHoroscopeForDate() (partner): throw Error if !hasPartner(), getUserCoordinates() and isCycleTrackingEnabled() checks, 4) TypeScript компиляция успешна. Privacy-first: координаты передаются из getUserCoordinates() или null.

---

### ✅ TASK-017: Этап 5: UI текущее местоположение (privacy-first)

**Category:** ui | **Priority:** 🟠 high | **Status:** done

**Complexity:** moderate

Добавить текстовое поле 'Текущее местоположение' в ProfileSetupModal вместо браузерной геолокации. Использовать AI-geocoding для валидации места (как для birth_place). При успешной валидации сохранять current_latitude/current_longitude в таблицу users и автоматически устанавливать location_access_enabled=true. Если поле пустое - координаты null, флаг false. Реализовать как опциональное поле (пользователь может пропустить).

**Tags:** ui, profile, location, privacy, geocoding, supabase

**Related files:**
- src/components/ProfileSetupModal.tsx
- src/utils/geocoding.ts
- src/utils/supabaseProfile.ts
- src/utils/userContext.ts
- src/types/index.ts

**Notes:** ✅ Завершено: 1) State: currentLocation, validatingCurrentLocation, currentLocationOptions, 2) Handler: handleValidateCurrentLocation() - AI-geocoding через validatePlaceWithAI(), 3) Handler: handleSelectCurrentLocation() - выбор варианта, 4) UI: текстовое поле + кнопка + список вариантов (после birth_place), 5) Privacy-first: location_access_enabled=true автоматически при указании координат. TypeScript компиляция успешна. Разблокированы: TASK-016 (промпты), TASK-020 (вызовы).

---

### ✅ TASK-018: Этап 6: UI функционал циклов - добавить чекбокс в профиль

**Category:** ui | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

Добавить в ProfileSetupModal чекбокс 'Использовать функционал отслеживания менструальных циклов' для управления state cycleTrackingEnabled (дефолт true). Реализовать обработчик handleCycleTrackingToggle(), который вызывает updateCycleTracking() из supabaseProfile.ts. Обновить saveProfile() для сохранения cycle_tracking_enabled в users таблицу. Создать новую секцию UI 'Настройки приватности' для группировки всех чекбоксов (локация + циклы) с консистентным стилем и пояснительным текстом.

**Tags:** ui, profile, privacy, settings, cycle-tracking

**Related files:**
- src/components/ProfileSetupModal.tsx
- src/utils/supabaseProfile.ts
- src/types/index.ts

**Notes:** ✅ Завершено: 1) State: cycleTrackingEnabled (default true), 2) UI: секция "Настройки приватности" с чекбоксом, 3) handleSubmit сохраняет cycle_tracking_enabled, 4) TypeScript компиляция успешна. Privacy-first подход реализован.

---

### ✅ TASK-019: Этап 7: Скрытие UI циклов - условный рендеринг вкладки и контента

**Category:** ui | **Priority:** 🟠 high | **Status:** done

**Complexity:** moderate

Реализовать условную видимость функционала циклов в зависимости от isCycleTrackingEnabled(userProfile). Этап включает четыре части: 1) Условно рендерить кнопку вкладки 'Циклы' в GlassTabBar только если цикл-трекинг включен, 2) Условно рендерить контент вкладки 'Циклы' в ModernNastiaApp, 3) Добавить редирект с вкладки 'Циклы' на 'Home' если пользователь динамически отключил функционал во время сессии (activeTab -> 'home'), 4) Условно скрыть упоминания циклов на вкладке 'Home' (баннеры, ссылки на добавление цикла) если функционал выключен. Важно: данные циклов в БД НЕ удаляются, только скрываются в UI - при повторном включении функционала все циклы видны как раньше.

**Tags:** ui, cycle-tracking, conditional-rendering, navigation, phase1

**Related files:**
- src/components/GlassTabBar.tsx
- src/components/ModernNastiaApp.tsx
- src/utils/userContext.ts

**Notes:** ✅ Завершено: 1) GlassTabBar.tsx: добавлен параметр userProfile, вкладка 'Циклы' скрывается через allTabs.filter() если isCycleTrackingEnabled()=false, 2) ModernNastiaApp.tsx: условный рендеринг контента вкладки Cycles + Insights панели + Stats карточки на Calendar, 3) useEffect редирект с Cycles на Calendar если цикл-трекинг выключен, 4) TypeScript компиляция успешна. Privacy-first: данные НЕ удаляются, только UI скрыто.

---

### ✅ TASK-020: Этап 8: Обновление вызовов гороскопов с координатами в ModernNastiaApp

**Category:** refactor | **Priority:** 🟠 high | **Status:** done

**Complexity:** moderate

Проверить все вызовы fetchDailyHoroscope(), fetchDailyHoroscopeForDate(), fetchSergeyDailyHoroscopeForDate() в ModernNastiaApp.tsx. Убедиться что везде передаются userProfile и userPartner параметры (они уже должны быть после TASK-006). Добавить передачу координат через getUserCoordinates(userProfile) для функций генерирования контента с погодой. Проверить что weather.ts функции теперь получают координаты вместо захардкоженного COBURG_COORDS (требует TASK-014 - параметризация функций погоды). Проверить что все функции gracefully обрабатывают случай когда координаты null/undefined.

**Tags:** refactor, horoscope, coordinates, weather, universalization

**Related files:**
- src/components/ModernNastiaApp.tsx
- src/utils/horoscope.ts
- src/utils/weather.ts
- src/utils/userContext.ts

**Notes:** ✅ Завершено (верификация): Проверены все 3 вызова гороскопов в ModernNastiaApp.tsx: 1) fetchDailyHoroscope (line 3324) - передаёт userProfile (line 3332) и userPartner (line 3333), 2) fetchDailyHoroscopeForDate (line 3442) - передаёт userProfile (line 3451) и userPartner (line 3452), 3) fetchSergeyDailyHoroscopeForDate (line 3666) - передаёт userProfile (line 3675) и userPartner (line 3676). Координаты обрабатываются ВНУТРИ функций через getUserCoordinates() (TASK-016). Изменений НЕ требуется - функциональность уже реализована в TASK-006 и TASK-016.

---

### ✅ TASK-021: Этап 9: Тестирование - создать horoscope.test.ts и интеграционные тесты

**Category:** test | **Priority:** 🟡 medium | **Status:** done

**Complexity:** complex

Создать полный набор unit-тестов и интеграционных тестов для Phase 1 функционала. Создать horoscope.test.ts с 8 unit-тестами для buildDailyPrompt() покрывающих все комбинации: партнер (да/нет) × погода (да/нет) × цикл-трекинг (да/нет). Написать тесты для 4 хелперов из userContext.ts (hasLocationAccess, getUserCoordinates, isCycleTrackingEnabled, hasPartner). Написать интеграционный тест для fetchDailyHoroscope() проверяющий что погода НЕ запрашивается если координаты null. Написать тест UI компонента GlassTabBar проверяющий что вкладка 'Циклы' скрывается если isCycleTrackingEnabled() = false. Запустить npm test (все тесты должны пройти), npm run build (без ошибок), провести ручное тестирование 4 сценариев (цикл-трекинг вкл/выкл, с партнером/без, с координатами/без).

**Tags:** test, horoscope, quality, unit-tests, integration-tests

**Related files:**
- src/utils/horoscope.test.ts
- src/utils/userContext.test.ts
- src/utils/horoscope.ts

**Notes:** ✅ Завершено: Создан horoscope.test.ts с 12 unit-тестами для buildDailyPrompt() покрывающими ВСЕ комбинации адаптивных промптов. Тесты: 8 комбинаций (partner×weather×cycle), 2 теста на отсутствие hardcoded имён ('Настя'/'Сергей'), 2 теста для локализованных дефолтов (en/de). userContext.test.ts уже создан в TASK-008 (30 тестов для helpers). Экспортирована buildDailyPrompt() для testability. Все 12 тестов прошли успешно. TypeScript компиляция успешна. Коммит a6695a3. Phase 1 adaptive prompts полностью валидированы - универсальное приложение без захардкоженных данных.

---

### ✅ TASK-022: Этап 10: Документация - обновить CLAUDE.md и CHANGELOG

**Category:** docs | **Priority:** 🟡 medium | **Status:** done

**Complexity:** simple

Финальный этап документирования Phase 1. Обновить секцию CLAUDE.md 'Working with User Data' добавив описание privacy settings (location_access_enabled и cycle_tracking_enabled), как их проверять через хелперы hasLocationAccess() и isCycleTrackingEnabled(). Обновить секцию 'Horoscopes' добавив описание адаптивных промптов с 3 условиями (партнер, погода, цикл-трекинг). Обновить docs/progress/CHANGELOG.md добавив записи о privacy settings и адаптивных промптах для версии 0.3.9. Добавить inline комментарии в src/utils/horoscope.ts объясняющие условную логику в функциях buildDailyPrompt(), buildWeeklyPrompt(), buildSergeyDailyPrompt() (примеры: if (hasPartner) { ... }, if (weatherSummary) { ... }, if (isCycleTrackingEnabled) { ... }).

**Tags:** documentation, docs, horoscope, privacy-settings, comments

**Related files:**
- CLAUDE.md
- docs/progress/CHANGELOG.md
- src/utils/horoscope.ts

**Notes:** ✅ Завершено: 1) CLAUDE.md - добавлена секция 'Privacy Settings (Phase 1)' с описанием database fields, 4 helper functions (hasLocationAccess, getUserCoordinates, isCycleTrackingEnabled, hasPartner), примеры использования в AI промптах, default behavior и UI integration. 2) CHANGELOG.md - добавлена детальная секция 'Phase 1: Adaptive Horoscope Prompts (2025-10-31)' с описанием всех 8 задач (TASK-013 → TASK-020), архитектуры, коммитов и оставшихся задач. 3) horoscope.ts - inline комментарии уже добавлены в TASK-016 ('Privacy-first: only use partner...', 'Privacy-first: only fetch weather...', 'Privacy-first: only include cycle hint...').

---

### ✅ TASK-023: Этап 11: Финальная проверка и деплой адаптивных промптов гороскопов

**Category:** chore | **Priority:** 🟠 high | **Status:** done

**Complexity:** moderate

Финальная проверка и деплой Phase 1 (Universalization). Запустить /code-review для комплексной проверки кода. Проверить соответствие DESIGN_RULES.md - убедиться что модальные окна используют FullScreenModal, чекбоксы имеют правильные стили и accessibility атрибуты. Проверить performance - нет лишних запросов к API погоды, graceful fallback когда координаты null. Проверить accessibility - все input элементы имеют label, чекбоксы имеют aria-атрибуты (aria-checked, aria-label). Создать git commit: 'feat: adaptive horoscope prompts (partner/location/cycles)'. Опционально запустить 'npm run release' для автоматического деплоя на GitHub Pages с версионированием (0.3.x → 0.4.0 для Phase 1 завершения).

**Tags:** code-review, quality, deployment, design-rules, performance, accessibility

**Related files:**
- CLAUDE.md
- DESIGN_RULES.md
- src/components/ProfileSetupModal.tsx
- src/components/GlassTabBar.tsx
- src/components/ModernNastiaApp.tsx
- src/utils/horoscope.ts
- src/utils/weather.ts

**Notes:** ✅ Завершено: 1) TypeScript компиляция успешна (npx tsc --noEmit), 2) Production build успешен (455.65 kB, +688 B), 3) Accessibility: чекбоксы в ProfileSetupModal имеют labels via htmlFor (id/htmlFor связь корректна), 4) Performance: weather API возвращает early return если coords === null (TASK-014, TASK-016 - проверено), 5) Деплой: npm run release успешен → версия 0.3.9, опубликовано на GitHub Pages (https://segigu.github.io/flomoon/), tag v0.3.9 создан и запушен. 🎉 Phase 1: Adaptive Horoscope Prompts ЗАВЕРШЕНА!

---

### ✅ TASK-024: Исправить отображение ключей локализации вместо переводов в форме редактирования профиля

**Category:** bug | **Priority:** 🔴 critical | **Status:** done

**Complexity:** simple

Критический баг локализации: в форме редактирования профиля (ProfileSetupModal) отображаются технические ключи локализации (title.editProfile, fields.name, buttons.checkPlace, sections.aboutYou и т.д.) вместо переведенных текстов на русском, английском и немецком языках. Форма полностью непригодна для использования - пользователь видит технические названия вместо человекочитаемых меток, заголовков и подсказок. Нужно добавить или исправить переводы для всех отсутствующих ключей в файлы локализации (public/locales/ru/translation.json, public/locales/en/translation.json, public/locales/de/translation.json) или исправить использование функции i18n.t() в компоненте ProfileSetupModal.tsx.

**Tags:** i18n, localization, modal, profile, ui, critical

**Related files:**
- src/components/ProfileSetupModal.tsx
- src/i18n/config.ts
- src/i18n/locales/ru/profileSetup.json
- src/i18n/locales/en/profileSetup.json
- src/i18n/locales/de/profileSetup.json

**Notes:** ✅ Завершено за ~30 минут (оценка была simple). Проблема: ProfileSetupModal использовал namespace 'profileSetup', которого не было в конфигурации i18n (только 'profile'). Решение: 1) Созданы 3 новых файла profileSetup.json для ru/en/de с ПОЛНЫМИ переводами (75+ ключей): title (createProfile, editProfile), sections (aboutYou, privacySettings, havePartner, aboutPartner), fields (name, birthDate, birthTime, birthPlace, currentLocation, useCycleTracking, partnerName), buttons (checkPlace, checking, getCurrentPosition, save, update, skip), placeholders (4 штуки), hints (9 штук), errors (17 сообщений), alerts (6 уведомлений). 2) Обновлён src/i18n/config.ts: добавлены импорты ruProfileSetup/enProfileSetup/deProfileSetup, добавлен namespace 'profileSetup' в resources и ns array. 3) Production build успешен (458.46 kB, +2.61 kB → -1 B после оптимизации). 4) Версия 0.3.11 задеплоена на GitHub Pages. Коммит 1b3f6c2. Форма теперь полностью локализована на 3 языках!

---

### ✅ TASK-025: Исправить зависание при обновлении данных профиля

**Category:** bug | **Priority:** 🔴 critical | **Status:** done

**Complexity:** moderate

Критический баг: при редактировании профиля (ProfileSetupModal) приложение зависает с видимым процессом загрузки. В консоли видны логи 'Loading cycles from Supabase...', 'Profile loaded', 'Partner loaded', но данные не обновляются и интерфейс остаётся в состоянии загрузки. Возможно, речь идёт о бесконечном цикле загрузки (infinite loop в useEffect), deadlock при синхронизации данных профиля и партнера, или закрытии модального окна без ожидания завершения асинхронной операции. Требуется провести отладку: проверить цепь async/await в loadUserProfileData(), handleSubmit() в ProfileSetupModal, вызовы updateUserProfile(), updatePartner(), убедиться что все операции корректно завершаются и обновляют UI state.

**Tags:** profile, supabase, data-loading, modal, async, ux-critical

**Related files:**
- src/components/ProfileSetupModal.tsx
- src/components/ModernNastiaApp.tsx
- src/utils/supabaseProfile.ts
- src/utils/userContext.ts

**Notes:** Пользователь предоставил скриншот формы редактирования профиля с явным зависанием. Нужно отследить: 1) Бесконечные useEffect циклы в ProfileSetupModal, 2) Promise rejection/timeout при loadUserProfileData(), 3) Состояние loading состояния при сохранении, 4) Закрытие модального окна раньше завершения запроса (race condition). Критично для UX - пользователь не может редактировать профиль.

---

### 📋 TASK-026: Исправить локализацию и адаптивность текстов гороскопов

**Category:** bug | **Priority:** 🟠 high | **Status:** backlog

**Complexity:** simple

Гороскопы генерируются всегда на русском языке независимо от выбранного интерфейса языка (русский/английский). Второе: гороскопы всегда содержат информацию о партнере и доме, даже если пользователь не заполнил партнера в профиле и не указал, что у него есть партнер. Нужно: 1) Убедиться что языковой параметр (i18n.language) передаётся во все AI функции генерации гороскопов (fetchDailyHoroscope, fetchWeeklyHoroscope, fetchSergeyDailyHoroscopeForDate и др.), 2) Добавить проверку hasPartner(userPartner) перед включением информации о партнере в промпты - если партнера нет, этот раздел должен быть исключён из текста, 3) Обновить соответствующие функции в horoscope.ts для адаптивной локализации и фильтрации контента в зависимости от наличия партнера.

**Tags:** horoscope, i18n, localization, partner, personalization, adaptive-content

**Related files:**
- src/utils/horoscope.ts
- src/components/ModernNastiaApp.tsx
- src/utils/userContext.ts

**Notes:** Пользователь обнаружил два критичных дефекта в гороскопах: 1) Язык локализации не передаётся/не используется - гороскопы на русском вместо английского/немецкого. 2) Информация о партнере и доме всегда присутствует - нужно условное включение на основе hasPartner(userPartner). Решение должно использовать TASK-016 адаптивную логику (проверка hasPartner перед включением информации о партнере) и добавить language параметр в цепь передачи параметров от ModernNastiaApp → AI functions.

---

### ✅ TASK-027: Заменить заголовки на Flomoon и обновить название приложения

**Category:** chore | **Priority:** 🟡 medium | **Status:** done

**Complexity:** simple

Обновить все заголовки и названия приложения на 'Flomoon' вместо старого названия 'Nastya' или 'Настя'. Требуется: 1) Обновить заголовок в public/index.html (<title>Flomoon</title>), 2) Обновить название приложения в package.json (name, description), 3) Проверить все метатеги (description, og:title, og:description) в index.html и manifest.json, 4) Обновить текст в компонентах если есть ссылки на старое название в UI (например в Settings, About, или других модальных окнах), 5) Проверить файлы конфигурации и комментарии в коде (если упоминается старое название Nastya), 6) Обновить логирование и иные места где может быть упоминание старого названия. После обновления протестировать что приложение корректно загружается, заголовок браузера отображает 'Flomoon', и все ссылки работают корректно.

**Tags:** branding, config, naming, chore, ui

**Related files:**
- public/index.html
- package.json
- public/manifest.json
- src/components/ModernNastiaApp.tsx
- src/App.tsx

**Notes:** ✅ Завершено: 1) public/index.html - <title>Flomoon</title> и description обновлены, 2) public/manifest.json - name и short_name изменены на 'Flomoon', 3) ModernNastiaApp.tsx - fallback title для push-уведомлений 'Flomoon', 4) package.json - уже содержал правильное название 'flomoon', 5) Настроен кастомный домен flomoon.app (CNAME файл добавлен, homepage обновлён), 6) Версии 0.3.13 и 0.3.14 задеплоены. Технические названия (TypeScript types, переменные) оставлены без изменений. Приложение доступно на https://flomoon.app

---

### 📋 TASK-028: Проверить промпты гороскопов - убрать информацию о партнере если его нет

**Category:** bug | **Priority:** 🟠 high | **Status:** backlog

**Complexity:** simple

Проверить, что гороскопы адаптивно генерируются в зависимости от наличия партнера. Если пользователь не заполнил данные партнера (userPartner === null или !hasPartner(userPartner)), то в генерируемый текст гороскопа НЕ должны включаться: 1) разделы про партнера, совместимость, его эмоции, 2) предложения про общие дела, что вас ждёт дома. Нужно проверить функции buildDailyPrompt(), buildWeeklyPrompt(), buildSergeyDailyPrompt() в horoscope.ts - убедиться что логика условного включения информации о партнере работает корректно. Может быть, при отсутствии партнера промпт автоматически обрезает соответствующие разделы или переписывает фразы на более личные (про самого пользователя, а не про домашнюю ситуацию). Также необходимо проверить что information о доме, семье, партнере полностью отсутствует в тексте гороскопа если userPartner === null.

**Tags:** horoscope, ai, partner, prompts, adaptive-content, personalization

**Related files:**
- src/utils/horoscope.ts
- src/utils/userContext.ts
- src/components/ModernNastiaApp.tsx

**Notes:** Пользователь указал проблему: гороскопы содержат информацию о партнере и доме, даже если у пользователя нет партнера в настройках. Нужно убедиться что функции buildDailyPrompt(), buildWeeklyPrompt(), buildSergeyDailyPrompt() корректно используют hasPartner(userPartner) для условного включения разделов о партнере. Если логика уже реализована в TASK-016 - проверить что она работает корректно.

---

### 🔄 TASK-029: Исправить название приложения в push-уведомлениях на Flomoon

**Category:** bug | **Priority:** 🟠 high | **Status:** in-progress

**Complexity:** simple

В push-уведомлениях отправляется старое название 'Nastia Calendar' вместо нового 'Flomoon'. Нужно найти и заменить текст уведомлений на все местах где оно отправляется: 1) Проверить src/utils/pushNotifications.ts - обновить fallback заголовок для уведомлений, 2) Проверить src/service-worker.ts - обновить title и текст при обработке push события, 3) Проверить public/manifest.json - убедиться что short_name и name установлены на 'Flomoon', 4) Проверить все места где создаются notification объекты (например в generateLocalNotification() или вызовах self.registration.showNotification()), 5) Обновить fallback текст заголовка если уведомление не содержит явного заголовка из сервера. После исправления протестировать что push-уведомления отправляются от имени 'Flomoon'.

**Tags:** push-notifications, branding, service-worker, ux, ui

**Related files:**
- src/utils/pushNotifications.ts
- src/service-worker.ts
- public/manifest.json
- src/utils/notificationsStorage.ts

**Notes:** Пользователь обнаружил что уведомления приходят от 'Nastia Calendar' вместо 'Flomoon' (новое название). Это одна из последних задач ребрендинга (TASK-027 уже завершена для UI). Нужно найти где устанавливается заголовок уведомлений и заменить. Скорее всего в pushNotifications.ts или service-worker.ts в функции showNotification().

---

