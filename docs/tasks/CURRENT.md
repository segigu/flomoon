# Текущая задача

**Last updated:** 2025-10-31T00:30:00Z

---

## TASK-013: Миграция БД - добавить location_access и cycle_tracking_enabled

**Категория:** chore
**Приоритет:** high
**Сложность:** moderate
**Статус:** in-progress
**Начата:** 2025-10-31T00:30:00Z

### Описание

Добавить поля `location_access_enabled` и `cycle_tracking_enabled` в таблицу `users` для управления настройками приватности пользователя.

**Privacy-first подход:**
- `location_access_enabled` (DEFAULT FALSE) - пользователь явно разрешает доступ к местоположению
- `cycle_tracking_enabled` (DEFAULT TRUE) - пользователь может отключить функционал циклов

### Подзадачи

- [x] 1. Создать SQL миграцию `add_user_settings_columns.sql`
- [x] 2. Обновить интерфейс `UserProfileData` в `src/types/index.ts`
- [x] 3. Обновить `UserProfileRow` в `src/utils/supabaseProfile.ts`
- [x] 4. Добавить функцию `updateLocationAccess(enabled: boolean)`
- [x] 5. Добавить функцию `updateCycleTracking(enabled: boolean)`

### Результаты

✅ **Все подзадачи выполнены!**

1. SQL миграция создана и применена к БД Supabase
2. Поля добавлены в таблицу `users`:
   - `location_access_enabled` (boolean, DEFAULT false)
   - `cycle_tracking_enabled` (boolean, DEFAULT true)
3. TypeScript интерфейсы обновлены:
   - `UserProfileData` в [src/utils/userContext.ts](../../src/utils/userContext.ts:10-23)
   - `UserProfile` в [src/utils/supabaseProfile.ts](../../src/utils/supabaseProfile.ts:16-33)
   - `UserProfileUpdate` в [src/utils/supabaseProfile.ts](../../src/utils/supabaseProfile.ts:54-67)
4. Функции управления настройками добавлены:
   - `updateLocationAccess()` - [src/utils/supabaseProfile.ts](../../src/utils/supabaseProfile.ts:190-217)
   - `updateCycleTracking()` - [src/utils/supabaseProfile.ts](../../src/utils/supabaseProfile.ts:224-251)
5. TypeScript компиляция успешна (без ошибок)

**Разблокированные задачи:** TASK-014, TASK-015, TASK-016, TASK-017, TASK-018, TASK-019

### Файлы для изменения

- `migrations/add_user_settings_columns.sql` (новый файл)
- [src/types/index.ts](../../src/types/index.ts)
- [src/utils/supabaseProfile.ts](../../src/utils/supabaseProfile.ts)

### SQL Миграция

```sql
ALTER TABLE users
ADD COLUMN location_access_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN cycle_tracking_enabled BOOLEAN DEFAULT TRUE;
```

### TypeScript Изменения

```typescript
// UserProfileData interface
export interface UserProfileData {
  // ... существующие поля
  location_access_enabled?: boolean;
  cycle_tracking_enabled?: boolean;
}
```

### Оценка времени

~1.5 часа

### Связанные задачи

- **Блокирует:** TASK-014, TASK-015, TASK-016, TASK-017, TASK-018, TASK-019
- **Часть мета-задачи:** Adaptive Horoscope Prompts (TASK-013 → TASK-023)

### Детальный план

См. [ADAPTIVE_PROMPTS_DETAILED_PLAN.md](ADAPTIVE_PROMPTS_DETAILED_PLAN.md) - Этап 1 (подзадачи 1-5)
