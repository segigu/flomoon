# Task Backlog

**Last updated:** 2025-10-29T18:10:00Z
**Total tasks:** 10
**Active tasks:** 6
**Completed tasks:** 4

---

## ✅ Completed (4)

### TASK-001: Локализировать названия месяцев в календаре
- **Category:** bug
- **Priority:** medium
- **Complexity:** simple
- **Completed:** 2025-10-29T13:15:00Z
- **Related files:**
  - src/components/ModernNastiaApp.tsx
  - src/components/CycleLengthChart.tsx
  - src/utils/dateUtils.ts
- **Tags:** #i18n #localization #calendar #ui
- **Description:** В календаре название месяца и года (например, 'октябрь 2025 г.') отображается только на русском языке независимо от выбранного языка приложения. Нужно добавить локализацию через i18n для форматирования дат в соответствии с текущим языком (русский/английский). Проверить все места где отображаются названия месяцев и обеспечить консистентную локализацию.
- **Notes:** Скриншот показывает 'октябрь 2025 г.' - нужно использовать toLocaleString или i18n.language для форматирования

---

### TASK-002: Исправить использование захардкоженных данных партнёра вместо БД
- **Category:** bug
- **Priority:** critical
- **Complexity:** complex
- **Completed:** 2025-10-29T12:00:00Z
- **Related files:**
  - src/utils/prompts/cyclePrompt.ts
  - src/utils/horoscope.ts
  - src/utils/historyStory.ts
  - src/components/ModernNastiaApp.tsx
  - src/data/userProfile.ts
- **Tags:** #ai #database #personalization #partner #hardcoded-data
- **Description:** Критический баг: имя партнёра 'Сергей' захардкожено в 19 файлах. AI-промпты используют статический профиль getCurrentUser() вместо реальных данных из Supabase (таблица partners). Даже после удаления партнёра в БД имя продолжает использоваться из src/data/userProfile.ts. Критичные файлы: cyclePrompt.ts (6 вхождений 'Sergey'), horoscope.ts (6 функций), ModernNastiaApp.tsx (не передаёт userPartner). Требуется: создать утилиту userContext.ts для получения партнёра из БД, рефакторинг AI-промптов (horoscope.ts, historyStory.ts, cyclePrompt.ts), обновление ModernNastiaApp.tsx для передачи userPartner в AI-функции.
- **Notes:** План из 7 подзадач: 1) ✅ Аудит (выполнен), 2) ✅ Исправить cyclePrompt.ts, 3) ✅ Создать userContext.ts, 4) ✅ Рефакторинг horoscope.ts, 5) ✅ Рефакторинг historyStory.ts, 6) ✅ Обновить ModernNastiaApp.tsx, 7) ✅ Проект успешно собран

---

### TASK-003: Полное удаление getCurrentUser() из horoscope.ts
- **Category:** refactor
- **Priority:** critical
- **Complexity:** moderate
- **Completed:** 2025-10-29T18:00:00Z
- **Related files:**
  - src/utils/horoscope.ts
- **Tags:** #refactor #horoscope #ai #hardcoded-data #partner
- **Description:** Критический рефакторинг: в horoscope.ts остались 16 вызовов getCurrentUser(), который возвращает захардкоженные данные с именем 'Сергей' вместо реальных данных из Supabase. Необходимо заменить все вызовы на getUserName(userProfile) / getPartnerName(userPartner), добавить параметры userProfile/userPartner во все функции (buildSergeyDailyPrompt, buildDailyPrompt, buildWeeklyPrompt и др.), обновить вызовы этих функций для передачи реальных данных.
- **Notes:** ✅ Выполнено: Обновлено 12 функций, удалено 13 вызовов getCurrentUser() (остались только fallback), добавлено 18 параметров userProfile/userPartner. Билд успешен. Функции: buildDailyMemoryReminders, buildSergeyMemoryReminders, buildUserContext, buildPartnerContext, buildHoroscopeSystemPrompt, buildPartnerSystemPrompt, buildWeeklyPrompt, buildDailyPrompt, buildSergeyDailyPrompt, getFallbackHoroscopeText, fetchHoroscopeLoadingMessages, fetchSergeyLoadingMessages.

---

### TASK-004: Удаление getCurrentUser() из historyStory.ts
- **Category:** refactor
- **Priority:** critical
- **Complexity:** simple
- **Completed:** 2025-10-29T18:10:00Z
- **Related files:**
  - src/utils/historyStory.ts
  - src/components/ModernNastiaApp.tsx
- **Tags:** #refactor #interactive-story #ai #hardcoded-data
- **Description:** В historyStory.ts остались 5 вызовов getCurrentUser(), которые возвращают захардкоженные данные вместо реальных из Supabase. Необходимо добавить параметры userProfile/userPartner во все функции генерации интерактивных историй, обновить вызовы в ModernNastiaApp.tsx (DiscoverTab), заменить getCurrentUser().name на getUserName(userProfile).
- **Notes:** ✅ Выполнено: Обновлено 13 функций, удалено 8 вызовов getCurrentUser() (остались 2 fallback), добавлено 26 параметров userProfile/userPartner. Билд успешен. Функции: getUserProfile, getUserChartAnalysis, getUserBirthDataText, getUserChartAnalysisText, generatePsychContractContext, ensurePsychContractContext, buildStorySoFar, buildInputDataBlock, buildArcPrompt, buildFinalePrompt, generateHistoryStoryChunk (export), CustomHistoryOptionRequest (interface), generateCustomHistoryOption (export). Импорт getPartnerName добавлен (строка 9).

---

## 🔥 Critical Priority (0)

_(No critical tasks remaining)_

---

## ⚠️ High Priority (2)

### TASK-005: Проверка загрузки userPartner из Supabase
- **Category:** bug
- **Priority:** high
- **Complexity:** simple
- **Status:** backlog
- **Created:** 2025-10-29T17:00:00Z
- **Related files:**
  - src/components/ModernNastiaApp.tsx
  - src/utils/supabaseProfile.ts
- **Tags:** #bug #partner #database #supabase
- **Description:** Необходимо убедиться, что userPartner корректно загружается из Supabase при старте приложения и сохраняется в state компонента ModernNastiaApp. Добавить логирование загрузки партнера, проверить вызов getPartner() из supabaseProfile.ts, добавить error handling для случаев когда партнер не загружается. Если партнер существует в БД но не отображается в Settings - проблема именно здесь.
- **Notes:** Добавить console.log('📊 Partner loaded:', { hasPartner: !!userPartner, partnerName: userPartner?.name }); в loadUserProfileData(). Проверить что state обновляется корректно.

---

### TASK-006: Передача userProfile/userPartner во ВСЕ AI-функции
- **Category:** refactor
- **Priority:** high
- **Complexity:** moderate
- **Status:** backlog
- **Created:** 2025-10-29T17:00:00Z
- **Blocked by:** ~~TASK-003~~, ~~TASK-004~~ ✅ **UNBLOCKED**
- **Related files:**
  - src/components/ModernNastiaApp.tsx
- **Tags:** #refactor #ai #partner #horoscope
- **Description:** Гарантировать передачу реальных данных пользователя (userProfile/userPartner) во все AI-функции приложения. Найти все вызовы fetchSergeyDailyHoroscopeForDate(), fetchSergeyBannerCopy(), fetchDailyHoroscope(), fetchWeeklyHoroscope(), generateInteractiveStory() в ModernNastiaApp.tsx и убедиться что везде передаются userProfile и userPartner. Добавить fallback на пустые строки если данных нет.
- **Notes:** Завершает рефакторинг TASK-002. Зависит от TASK-003 и TASK-004 (сначала нужно обновить сигнатуры функций).

---

## 📋 Medium Priority (4)

### TASK-007: Архивация устаревшего userProfile.ts
- **Category:** chore
- **Priority:** medium
- **Complexity:** trivial
- **Status:** backlog
- **Created:** 2025-10-29T17:00:00Z
- **Blocked by:** ~~TASK-003~~, ~~TASK-004~~ ✅ **UNBLOCKED**
- **Related files:**
  - src/data/userProfile.ts
- **Tags:** #chore #refactor #cleanup #deprecated
- **Description:** Переименовать src/data/userProfile.ts в userProfile.deprecated.ts и добавить предупреждающий комментарий о том, что файл устарел и содержит только hardcoded данные для legacy совместимости. Удалить все импорты из других файлов после завершения TASK-003 и TASK-004. Это предотвратит случайное использование захардкоженных данных в будущем.
- **Notes:** Выполнять после полного удаления getCurrentUser() из всех файлов. Добавить комментарий: ⚠️ DEPRECATED - DO NOT USE! Use src/utils/userContext.ts for real user data from Supabase.

---

### TASK-008: Добавить тесты для партнерских функций
- **Category:** test
- **Priority:** medium
- **Complexity:** moderate
- **Status:** backlog
- **Created:** 2025-10-29T17:00:00Z
- **Blocked by:** ~~TASK-003~~, ~~TASK-004~~, TASK-006
- **Related files:**
  - src/utils/horoscope.test.ts
  - src/utils/userContext.test.ts
- **Tags:** #test #partner #unit-tests #quality
- **Description:** Написать unit-тесты для функций работы с данными пользователя и партнера. Создать horoscope.test.ts и userContext.test.ts, протестировать getUserName() и getPartnerName() с различными сценариями (партнер существует, партнер null, fallback на дефолтные значения). Протестировать промпты с userProfile/userPartner, убедиться что hardcoded 'Сергей' не появляется нигде.
- **Notes:** Защита от регрессии. Выполнять после завершения основного рефакторинга.

---

### TASK-009: UI фидбек при отсутствии партнера
- **Category:** ui
- **Priority:** medium
- **Complexity:** simple
- **Status:** backlog
- **Created:** 2025-10-29T17:00:00Z
- **Blocked by:** TASK-005
- **Related files:**
  - src/components/ModernNastiaApp.tsx
- **Tags:** #ui #ux #partner #feedback
- **Description:** Улучшить UX когда у пользователя нет партнера в профиле. В баннере 'Что там у партнера?' проверять userPartner === null и показывать текст 'Добавьте партнера в настройках, чтобы увидеть совместимость' с кнопкой 'Добавить партнера' которая открывает Settings → ProfileSetupModal. Опционально: скрыть баннер полностью если партнер не нужен.
- **Notes:** Зависит от TASK-005 (нужно сначала убедиться что партнер корректно загружается). Помогает пользователю понять почему не работает партнерский гороскоп.

---

### TASK-010: Обновить документацию CLAUDE.md
- **Category:** docs
- **Priority:** medium
- **Complexity:** trivial
- **Status:** backlog
- **Created:** 2025-10-29T17:00:00Z
- **Blocked by:** ~~TASK-003~~, ~~TASK-004~~, TASK-006, TASK-007
- **Related files:**
  - CLAUDE.md
- **Tags:** #docs #documentation #refactor
- **Description:** Актуализировать CLAUDE.md после завершения рефакторинга партнерских функций. Удалить упоминания userProfile.ts как источника данных, добавить секцию 'Работа с данными пользователя' с инструкциями использовать userContext.ts для получения данных из Supabase, всегда передавать userProfile/userPartner в AI-функции, не использовать getCurrentUser() (deprecated). Обновить примеры кода.
- **Notes:** Выполнять самым последним после завершения всего рефакторинга. Актуальная документация важна для будущих доработок.

---

## Statistics

- **By Priority:**
  - Critical: 0 (0% of active)
  - High: 2 (33% of active)
  - Medium: 4 (67% of active)
  - Low: 0 (0% of active)

- **By Category:**
  - bug: 1 task
  - refactor: 1 task
  - chore: 1 task
  - test: 1 task
  - ui: 1 task
  - docs: 1 task

- **By Complexity:**
  - Trivial: 2 tasks
  - Simple: 2 tasks
  - Moderate: 2 tasks
  - Complex: 0 tasks

- **Blocked Tasks:** 3
  - TASK-008 (blocked by TASK-006)
  - TASK-009 (blocked by TASK-005)
  - TASK-010 (blocked by TASK-006, TASK-007)

---

**Legend:**
- 🔥 Critical - Requires immediate attention
- ⚠️ High - Important, should be addressed soon
- 📋 Medium - Standard priority
- 💡 Low - Nice to have

**Tags:** Use `/tasks <tag>` to filter by tag (e.g., `/tasks #bug`, `/tasks #refactor`)
