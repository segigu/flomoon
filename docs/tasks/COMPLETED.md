# Выполненные задачи

История завершенных задач (последние 50).

---

## TASK-001: Локализировать названия месяцев в календаре

**Категория:** bug
**Приоритет:** 🟡 medium
**Сложность:** simple
**Завершена:** 2025-10-29

**Описание:**
В календаре название месяца и года (например, 'октябрь 2025 г.') отображалось только на русском языке независимо от выбранного языка приложения.

**Что было сделано:**
1. ✅ Обновлен [src/utils/dateUtils.ts](../../src/utils/dateUtils.ts) - добавлены параметры locale к функциям getMonthName() и getMonthYear()
2. ✅ Исправлен [src/components/CycleLengthChart.tsx](../../src/components/CycleLengthChart.tsx) - убран захардкоженный 'ru-RU', используется i18n.language
3. ✅ Обновлен [src/components/ModernNastiaApp.tsx](../../src/components/ModernNastiaApp.tsx) - заголовок календаря теперь использует правильную локаль
4. ✅ Проект успешно собран без ошибок

**Теги:** i18n, localization, calendar, ui

---

## TASK-002: Исправить использование захардкоженных данных партнёра вместо БД

**Категория:** bug
**Приоритет:** 🔴 critical
**Сложность:** complex
**Завершена:** 2025-10-29

**Описание:**
Критический баг: имя партнёра 'Сергей' захардкожено в 19 файлах. AI-промпты используют статический профиль getCurrentUser() вместо реальных данных из Supabase.

**Что было сделано:**
1. ✅ Исправлен [src/utils/cyclePrompt.ts](../../src/utils/cyclePrompt.ts) - убраны захардкоженные имена, добавлены параметры userName/partnerName
2. ✅ Создан [src/utils/userContext.ts](../../src/utils/userContext.ts) - утилита для работы с данными пользователя из БД
3. ✅ Обновлен [src/utils/horoscope.ts](../../src/utils/horoscope.ts) - функции принимают userProfile/userPartner
4. ✅ Добавлены параметры в [src/utils/historyStory.ts](../../src/utils/historyStory.ts)
5. ✅ Обновлен [src/components/ModernNastiaApp.tsx](../../src/components/ModernNastiaApp.tsx) - передача userProfile/userPartner в AI-функции
6. ✅ Проект успешно собран без ошибок

**Теги:** ai, database, personalization, partner, hardcoded-data

---
