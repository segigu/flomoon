# Task Backlog

**Последнее обновление:** 2025-10-28T12:30:00Z
**Всего задач:** 2
**Следующий ID:** TASK-003

---

## 🔴 Critical Priority

### TASK-002: Исправить использование захардкоженных данных партнёра вместо БД
**Категория:** bug
**Сложность:** complex
**Статус:** backlog
**Теги:** #ai #database #personalization #partner #hardcoded-data

**Описание:**
Критический баг: имя партнёра 'Сергей' захардкожено в 19 файлах. AI-промпты используют статический профиль getCurrentUser() вместо реальных данных из Supabase (таблица partners). Даже после удаления партнёра в БД имя продолжает использоваться из src/data/userProfile.ts. Критичные файлы: cyclePrompt.ts (6 вхождений 'Sergey'), horoscope.ts (6 функций), ModernNastiaApp.tsx (не передаёт userPartner). Требуется: создать утилиту userContext.ts для получения партнёра из БД, рефакторинг AI-промптов (horoscope.ts, historyStory.ts, cyclePrompt.ts), обновление ModernNastiaApp.tsx для передачи userPartner в AI-функции.

**Связанные файлы:**
- src/utils/prompts/cyclePrompt.ts
- src/utils/horoscope.ts
- src/utils/historyStory.ts
- src/components/ModernNastiaApp.tsx
- src/data/userProfile.ts

**Заметки:**
План из 7 подзадач: 1) ✅ Аудит (выполнен), 2) 🔴 Исправить cyclePrompt.ts, 3) Создать userContext.ts, 4) Рефакторинг horoscope.ts, 5) Рефакторинг historyStory.ts, 6) Обновить ModernNastiaApp.tsx, 7) Тестирование (с партнёром/без/разные языки)

**Создано:** 2025-10-28T12:30:00Z
**Обновлено:** 2025-10-28T12:30:00Z

---

## 🟡 Medium Priority

### TASK-001: Локализировать названия месяцев в календаре
**Категория:** bug
**Сложность:** simple
**Статус:** backlog
**Теги:** #i18n #localization #calendar #ui

**Описание:**
В календаре название месяца и года (например, 'октябрь 2025 г.') отображается только на русском языке независимо от выбранного языка приложения. Нужно добавить локализацию через i18n для форматирования дат в соответствии с текущим языком (русский/английский). Проверить все места где отображаются названия месяцев и обеспечить консистентную локализацию.

**Связанные файлы:**
- src/components/ModernNastiaApp.tsx

**Заметки:**
Скриншот показывает 'октябрь 2025 г.' - нужно использовать toLocaleString или i18n.language для форматирования

**Создано:** 2025-01-28T15:05:00Z
**Обновлено:** 2025-01-28T15:05:00Z

---

## Статистика

**По категориям:**
- bug: 2
- feature: 0
- refactor: 0
- test: 0
- docs: 0
- chore: 0
- ui: 0
- performance: 0
- security: 0

**По приоритетам:**
- critical: 1
- high: 0
- medium: 1
- low: 0

**По статусам:**
- backlog: 2
- todo: 0
- in-progress: 0
- blocked: 0
- done: 0

**По сложности:**
- trivial: 0
- simple: 1
- moderate: 0
- complex: 1
