# Current Task

**Last updated:** 2025-10-29T19:05:00Z

---

## TASK-007: Архивация устаревшего userProfile.ts

**Category:** chore
**Priority:** medium
**Complexity:** trivial
**Status:** in-progress
**Started:** 2025-10-29T19:05:00Z

**Blocked by:** ~~TASK-003~~, ~~TASK-004~~ ✅ **UNBLOCKED**

**Related files:**
- [src/data/userProfile.ts](../../src/data/userProfile.ts)

**Tags:** #chore #refactor #cleanup #deprecated

---

## Description

Переименовать src/data/userProfile.ts в userProfile.deprecated.ts и добавить предупреждающий комментарий о том, что файл устарел и содержит только hardcoded данные для legacy совместимости. Удалить все импорты из других файлов после завершения TASK-003 и TASK-004. Это предотвратит случайное использование захардкоженных данных в будущем.

---

## Context

**Previous tasks completed:**
- ✅ TASK-003: horoscope.ts рефакторинг (getCurrentUser() заменён на userProfile/userPartner)
- ✅ TASK-004: historyStory.ts рефакторинг (getCurrentUser() заменён на userProfile/userPartner)
- ✅ TASK-006: Все AI-функции теперь получают реальные данные из Supabase

**Current state:**
- getCurrentUser() больше не используется в основном коде (только fallback)
- userProfile.ts содержит только hardcoded данные "Настя" и "Сергей"
- Файл должен быть помечен как deprecated для предотвращения случайного использования

---

## Implementation Plan

### 1. Check remaining imports
- [ ] Find all files that still import getCurrentUser from userProfile.ts
- [ ] Verify these are only fallback usages

### 2. Rename and deprecate
- [ ] Rename src/data/userProfile.ts → src/data/userProfile.deprecated.ts
- [ ] Add deprecation warning comment at the top of the file
- [ ] Update imports in files that still use it (horoscope.ts, historyStory.ts fallbacks)

### 3. Verify build
- [ ] Build project (npm run build)
- [ ] Ensure no import errors

---

## Success Criteria

- ✅ File renamed to userProfile.deprecated.ts
- ✅ Warning comment added to file
- ✅ All imports updated to point to new filename
- ✅ Build succeeds without errors
- ✅ No accidental usage of deprecated file in new code

---

## Notes

Выполнять после полного удаления getCurrentUser() из всех файлов. Добавить комментарий: ⚠️ DEPRECATED - DO NOT USE! Use src/utils/userContext.ts for real user data from Supabase.

После завершения TASK-007:
- TASK-010 (документация) частично разблокирована (осталась только зависимость от TASK-006 ✅)
