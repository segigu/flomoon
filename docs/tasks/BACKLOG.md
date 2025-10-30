# Task Backlog

**Last updated:** 2025-10-31T19:30:00Z

## Statistics

- **Total tasks:** 31
- **Completed:** 27/31 (87%)
- **In progress:** 0
- **Pending:** 4

## Pending Tasks (High Priority)

### 🔴 TASK-031: Реализовать автоматическое обновление приложения при новой версии

**Category:** feature | **Priority:** 🔴 critical | **Status:** backlog

**Complexity:** moderate

**Description:**
Критичная UX проблема: Service Worker кэширует старую версию и пользователь НЕ ВИДИТ обновления после деплоя. Приходится вручную делать Cmd+Shift+R или лазить в DevTools → Application → Service Workers → Update.

**Requirements:**
1. Обнаружение новой версии SW (события 'controllerchange' или 'updatefound')
2. Показ баннера "Обновление доступно" с кнопкой "Обновить"
3. При клике - skipWaiting() + window.location.reload()
4. Опционально: автоматическое обновление через 5 секунд без кнопки

**Tags:** service-worker, auto-update, progressive-web-app, ux, deployment, caching

**Related files:**
- src/service-worker.ts
- src/utils/serviceWorkerRegistration.ts
- src/components/ModernNastiaApp.tsx

**Notes:** Критическая проблема для продакшена: пользователи видят кэшированную версию и не получают обновления. Решение: добавить UI баннер в ModernNastiaApp.tsx который слушает 'controllerchange' событие от SW и предлагает обновить приложение.

---

## Recently Completed Tasks

### ✅ TASK-030: Исправить ошибку генерации гороскопа партнера при отсутствии данных

**Category:** bug | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

Критическая ошибка в консоли при попытке генерировать гороскоп партнера без данных партнера.

**Related files:**
- src/utils/horoscope.ts
- src/components/ModernNastiaApp.tsx
- src/utils/userContext.ts

**Completed:** 2025-10-31T19:00:00Z

---

### ✅ TASK-029: Исправить название приложения в push-уведомлениях на Flomoon

**Category:** bug | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

Обновлено 2 упоминания 'Nastia Calendar' → 'Flomoon'. Версия 0.3.15 задеплоена.

**Completed:** 2025-10-30T18:05:00Z

---

### ✅ TASK-028: Проверить промпты гороскопов - убрать информацию о партнере если его нет

**Category:** bug | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

Закрыто как дубликат TASK-026. Проблема УЖЕ решена в v0.3.16.

**Completed:** 2025-10-31T18:30:00Z

---

### ✅ TASK-027: Заменить заголовки на Flomoon и обновить название приложения

**Category:** chore | **Priority:** 🟡 medium | **Status:** done

**Complexity:** simple

Обновлены все заголовки и названия приложения. Приложение доступно на https://flomoon.app

**Completed:** 2025-10-31T16:40:00Z

---

### ✅ TASK-026: Исправить локализацию и адаптивность текстов гороскопов

**Category:** bug | **Priority:** 🟠 high | **Status:** done

**Complexity:** simple

2 фикса: адаптивность партнера (v0.3.16) + языковые директивы для AI (v0.3.17).

**Completed:** 2025-10-30T18:10:00Z

---

### ✅ TASK-025: Исправить зависание при обновлении данных профиля

**Category:** bug | **Priority:** 🔴 critical | **Status:** done

**Complexity:** moderate

Критический баг с зависанием при редактировании профиля. Отладка async/await.

**Completed:** 2025-10-31T12:00:00Z

---

### ✅ TASK-024: Исправить отображение ключей локализации вместо переводов в форме редактирования профиля

**Category:** bug | **Priority:** 🔴 critical | **Status:** done

**Complexity:** simple

Созданы 3 новых файла profileSetup.json (ru/en/de) с 75+ ключами переводов. Версия 0.3.11 задеплоена.

**Completed:** 2025-10-31T10:45:00Z

---

## Completed Phase 1 Tasks (TASK-013 → TASK-023)

### ✅ TASK-023: Этап 11 - Финальная проверка и деплой адаптивных промптов гороскопов

Phase 1 завершена успешно. Версия 0.3.9 задеплоена на GitHub Pages.

**Completed:** 2025-10-31T04:50:00Z

---

### ✅ TASK-022: Этап 10 - Документация - обновить CLAUDE.md и CHANGELOG

Обновлены все документы Phase 1.

**Completed:** 2025-10-31T04:00:00Z

---

### ✅ TASK-021: Этап 9 - Тестирование - создать horoscope.test.ts и интеграционные тесты

12 unit-тестов для buildDailyPrompt() + 30 тестов для helpers.

**Completed:** 2025-10-31T09:30:00Z

---

### ✅ TASK-020: Этап 8 - Обновление вызовов гороскопов с координатами в ModernNastiaApp

Верификация: все 3 вызова гороскопов передают userProfile и userPartner.

**Completed:** 2025-10-31T03:20:00Z

---

### ✅ TASK-019: Этап 7 - Скрытие UI циклов - условный рендеринг вкладки и контента

Реализован условный рендеринг вкладки 'Циклы' и контента.

**Completed:** 2025-10-31T03:00:00Z

---

### ✅ TASK-018: Этап 6 - UI функционал циклов - добавить чекбокс в профиль

Добавлен чекбокс 'Использовать функционал отслеживания менструальных циклов'.

**Completed:** 2025-10-31T02:30:00Z

---

### ✅ TASK-017: Этап 5 - UI текущее местоположение (privacy-first)

Добавлено текстовое поле 'Текущее местоположение' в ProfileSetupModal.

**Completed:** 2025-10-31T02:15:00Z

---

### ✅ TASK-016: Этап 4 - Обновить промпты гороскопов с условной логикой

Модифицированы buildDailyPrompt, buildWeeklyPrompt, buildSergeyDailyPrompt для адаптивности.

**Completed:** 2025-10-31T02:45:00Z

---

### ✅ TASK-015: Этап 3 - Хелперы userContext.ts - добавить 4 функции для профиля

Добавлены функции: hasLocationAccess, getUserCoordinates, isCycleTrackingEnabled, hasPartner.

**Completed:** 2025-10-31T01:45:00Z

---

### ✅ TASK-014: Этап 2 - Параметризация функций погоды - добавить поддержку координат

Обновлены fetchDailyWeatherSummary, fetchWeeklyWeatherSummary для приема координат.

**Completed:** 2025-10-31T01:30:00Z

---

### ✅ TASK-013: Этап 1 - Добавить location_access и cycle_tracking_enabled в users таблицу

SQL миграция создана и применена. Добавлены функции updateLocationAccess, updateCycleTracking.

**Completed:** 2025-10-31T01:00:00Z

---

## Earlier Tasks

### ✅ TASK-012: Убрать захардкоженное имя 'Настя' из AI-фраз модального окна периода
**Status:** done | **Completed:** 2025-10-31T08:00:00Z

### ✅ TASK-011: Исправить локализацию дат в недельном гороскопе модального окна периода
**Status:** done | **Completed:** 2025-10-30T17:30:00Z

### ✅ TASK-010: Обновить документацию CLAUDE.md
**Status:** done | **Completed:** 2025-10-29T20:15:00Z

### ✅ TASK-009: UI фидбек при отсутствии партнера
**Status:** done | **Completed:** 2025-10-29T22:00:00Z

### ✅ TASK-008: Добавить тесты для партнерских функций
**Status:** done | **Completed:** 2025-10-31T09:00:00Z

### ✅ TASK-007: Архивация устаревшего userProfile.ts
**Status:** done | **Completed:** 2025-10-29T19:26:00Z

### ✅ TASK-006: Передача userProfile/userPartner во ВСЕ AI-функции
**Status:** done | **Completed:** 2025-10-29T19:02:00Z

### ✅ TASK-005: Проверка загрузки userPartner из Supabase
**Status:** done | **Completed:** 2025-10-29T21:30:00Z

### ✅ TASK-004: Удаление getCurrentUser() из historyStory.ts
**Status:** done | **Completed:** 2025-10-29T18:10:00Z

### ✅ TASK-003: Полное удаление getCurrentUser() из horoscope.ts
**Status:** done | **Completed:** 2025-10-29T18:00:00Z

### ✅ TASK-002: Исправить использование захардкоженных данных партнёра вместо БД
**Status:** done | **Completed:** 2025-10-29T12:00:00Z

### ✅ TASK-001: Локализировать названия месяцев в календаре
**Status:** done | **Completed:** 2025-10-29T13:15:00Z

---

## Legend

**Priority:**
- 🔴 critical - блокер, критичный баг
- 🟠 high - важный баг или основная фича
- 🟡 medium - улучшение, рефакторинг
- 🟢 low - мелкий фикс, документация

**Status:**
- backlog - в очереди
- todo - готово начинать
- in-progress - в работе
- blocked - заблокирована
- done - выполнена

**Complexity:**
- trivial - одна строка кода
- simple - <1 часа
- moderate - 1-4 часа
- complex - >4 часов
