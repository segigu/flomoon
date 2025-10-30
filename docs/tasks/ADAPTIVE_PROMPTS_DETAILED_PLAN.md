# Детальный план: Адаптивные промпты гороскопов

**Мета-задача:** TASK-013 до TASK-023 (11 этапов)

**Цель:** Переработать промпты гороскопов для учета партнера, локации/погоды и менструальных циклов (privacy-first подход)

**Общее время:** ~14-16 часов

**Сложность:** Средняя-Высокая

---

## 📊 Обзор этапов

| Этап | TASK ID | Название | Время | Сложность |
|------|---------|----------|-------|-----------|
| 1 | TASK-013 | Миграция БД | 1.5ч | moderate |
| 2 | TASK-014 | Параметризация погоды | 1.5ч | simple |
| 3 | TASK-015 | Хелперы userContext.ts | 1ч | simple |
| 4 | TASK-016 | Обновление промптов | 3ч | complex |
| 5 | TASK-017 | UI текущее местоположение | 1.5ч | moderate |
| 6 | TASK-018 | UI функционал циклов | 1ч | simple |
| 7 | TASK-019 | Скрытие UI циклов | 1.5ч | moderate |
| 8 | TASK-020 | Обновление вызовов | 0.5ч | moderate |
| 9 | TASK-021 | Тестирование | 3ч | complex |
| 10 | TASK-022 | Документация | 0.75ч | simple |
| 11 | TASK-023 | Финальная проверка | 0.75ч | moderate |

---

## 📝 Детальные подзадачи (58 шагов)

### Этап 1: Миграция БД (5 подзадач)

1. Создать SQL миграцию `add_privacy_settings.sql`:
   ```sql
   ALTER TABLE users
   ADD COLUMN location_access_enabled BOOLEAN DEFAULT FALSE,
   ADD COLUMN cycle_tracking_enabled BOOLEAN DEFAULT TRUE;
   ```

2. Применить миграцию через Supabase Dashboard или CLI

3. Обновить интерфейс `UserProfileData` в `src/types/index.ts`:
   ```typescript
   export interface UserProfileData {
     // ... существующие поля
     location_access_enabled?: boolean;
     cycle_tracking_enabled?: boolean;
   }
   ```

4. Обновить `UserProfileRow` в `src/utils/supabaseProfile.ts`

5. Добавить функции в `src/utils/supabaseProfile.ts`:
   - `updateLocationAccess(enabled: boolean)`
   - `updateCycleTracking(enabled: boolean)`

---

### Этап 2: Параметризация погоды (4 подзадачи)

6. Обновить сигнатуру `fetchDailyWeatherSummary()` в `src/utils/weather.ts`:
   ```typescript
   export async function fetchDailyWeatherSummary(
     date: string,
     signal?: AbortSignal,
     latitude?: number,  // НОВОЕ
     longitude?: number  // НОВОЕ
   ): Promise<string | null>
   ```

7. Обновить сигнатуру `fetchWeeklyWeatherSummary()` аналогично

8. Модифицировать `buildQueryUrl()` - использовать переданные координаты или возвращать `null`

9. Удалить захардкоженный `COBURG_COORDS` из `src/utils/weather.ts`

---

### Этап 3: Хелперы userContext.ts (4 подзадачи)

10. Добавить `hasLocationAccess()` в `src/utils/userContext.ts`:
    ```typescript
    export function hasLocationAccess(userProfile: UserProfileData | null | undefined): boolean {
      return userProfile?.location_access_enabled === true;
    }
    ```

11. Добавить `getUserCoordinates()`:
    ```typescript
    export function getUserCoordinates(userProfile: UserProfileData | null | undefined): { latitude: number; longitude: number } | null {
      if (!hasLocationAccess(userProfile)) return null;
      const lat = userProfile?.current_latitude;
      const lon = userProfile?.current_longitude;
      if (typeof lat === 'number' && typeof lon === 'number') {
        return { latitude: lat, longitude: lon };
      }
      return null;
    }
    ```

12. Добавить `isCycleTrackingEnabled()`:
    ```typescript
    export function isCycleTrackingEnabled(userProfile: UserProfileData | null | undefined): boolean {
      // Дефолт TRUE для обратной совместимости
      return userProfile?.cycle_tracking_enabled !== false;
    }
    ```

13. Добавить `hasPartner()`:
    ```typescript
    export function hasPartner(userPartner: PartnerData | null | undefined): boolean {
      if (!userPartner) return false;
      const hasName = Boolean(userPartner.name || userPartner.partner_name);
      const hasBirthDate = Boolean(userPartner.birth_date);
      return hasName && hasBirthDate;
    }
    ```

---

### Этап 4: Обновление промптов (9 подзадач)

14. Обновить `buildWeeklyPrompt()` - добавить условную логику для партнера

15. Обновить `buildWeeklyPrompt()` - добавить условную логику для погоды

16. Обновить `buildWeeklyPrompt()` - добавить условную логику для циклов

17. Обновить `buildDailyPrompt()` - добавить условную логику (партнер + погода + циклы)

18. Обновить `buildSergeyDailyPrompt()` - добавить условную логику (партнер + погода + циклы)

19. Обновить `fetchDailyHoroscope()` - передавать координаты из `getUserCoordinates()`:
    ```typescript
    const coords = getUserCoordinates(userProfile);
    const weatherSummary = coords
      ? await fetchDailyWeatherSummary(isoDate, signal, coords.latitude, coords.longitude)
      : null;

    const cycleHint = isCycleTrackingEnabled(userProfile)
      ? getCurrentCycleHint(cycles, isoDate)
      : '';

    const prompt = buildDailyPrompt({
      userName: getUserName(userProfile),
      partnerName: hasPartner(userPartner) ? getPartnerName(userPartner) : null,
      weatherSummary,
      cycleHint,
      // ... остальные параметры
    });
    ```

20. Обновить `fetchDailyHoroscopeForDate()` аналогично

21. Обновить `fetchSergeyDailyHoroscopeForDate()` аналогично

22. Обновить сигнатуры всех 3 функций - добавить опциональные параметры `userProfile`, `userPartner`

---

### Этап 5: UI текущее местоположение (4 подзадачи)

23. Добавить текстовое поле "Текущее местоположение" в `ProfileSetupModal.tsx`:
    ```tsx
    <input
      type="text"
      placeholder="Москва, Россия"
      value={currentLocation}
      onChange={handleLocationChange}
      onBlur={validateLocation}  // AI-geocoding как birth_place
    />
    ```

24. Добавить AI-geocoding для текущего местоположения (как для `birth_place`)

25. Добавить стейт `currentLocation` и `isValidatingLocation` в `ProfileSetupModal`

26. Сохранять `current_latitude`/`current_longitude` при валидации местоположения

27. Добавить автоматическую установку `location_access_enabled=true` при указании местоположения

---

### Этап 6: UI функционал циклов (5 подзадач)

28. Добавить чекбокс "Использовать функционал отслеживания менструальных циклов" в `ProfileSetupModal.tsx`

29. Добавить стейт `cycleTrackingEnabled` (дефолт `true`) в `ProfileSetupModal`

30. Добавить обработчик `handleCycleTrackingToggle`

31. Обновить `saveProfile()` - сохранять `cycle_tracking_enabled`

32. Добавить секцию "Настройки приватности" в `ProfileSetupModal` (группировка чекбоксов)

---

### Этап 7: Скрытие UI циклов (4 подзадачи)

33. Условно рендерить вкладку "Циклы" в `GlassTabBar` (`ModernNastiaApp`):
    ```tsx
    <GlassTabBar
      tabs={[
        { id: 'home', icon: '🏠', label: t('tabs.home') },
        ...(isCycleTrackingEnabled(userProfile)
          ? [{ id: 'cycles', icon: '🌸', label: t('tabs.cycles') }]
          : []),
        { id: 'discover', icon: '✨', label: t('tabs.discover') },
        { id: 'astro', icon: '⭐', label: t('tabs.astro') },
      ]}
    />
    ```

34. Условно рендерить контент вкладки "Циклы" (`ModernNastiaApp`)

35. Добавить редирект с вкладки "Циклы" на "Home" при выключении функционала

36. Условно скрыть упоминания циклов на вкладке "Home" (если функционал выключен)

---

### Этап 8: Обновление вызовов (3 подзадачи)

37. Найти все вызовы `fetchDailyHoroscope()` через Grep в `ModernNastiaApp.tsx`

38. Проверить что везде передаются `userProfile` и `userPartner`

39. Обновить вызовы если параметры не переданы

---

### Этап 9: Тестирование (10 подзадач)

40. Создать `horoscope.test.ts` для unit-тестов промптов

41. Написать 8 тестов для `buildDailyPrompt()` (все комбинации партнер × погода × циклы):
    - партнер ✅ + погода ✅ + циклы ✅
    - партнер ✅ + погода ✅ + циклы ❌
    - партнер ✅ + погода ❌ + циклы ✅
    - партнер ✅ + погода ❌ + циклы ❌
    - партнер ❌ + погода ✅ + циклы ✅
    - партнер ❌ + погода ✅ + циклы ❌
    - партнер ❌ + погода ❌ + циклы ✅
    - партнер ❌ + погода ❌ + циклы ❌

42. Написать тесты для `hasLocationAccess()`, `getUserCoordinates()`, `isCycleTrackingEnabled()`, `hasPartner()`

43. Написать интеграционный тест для `fetchDailyHoroscope()` (погода не запрашивается без координат)

44. Написать тест для UI - вкладка "Циклы" скрывается когда `cycle_tracking_enabled=false`

45. Запустить `npm test` - убедиться что все тесты проходят

46. Запустить `npm run build` - убедиться что билд проходит без ошибок

47. Ручной тест: пользователь БЕЗ партнера, БЕЗ локации, С циклами

48. Ручной тест: пользователь С партнером, С локацией, БЕЗ циклов (вкладка скрыта)

49. Ручной тест: всё включено (партнер + локация + циклы)

50. Ручной тест: всё выключено (базовый гороскоп)

---

### Этап 10: Документация (4 подзадачи)

51. Обновить `CLAUDE.md` - секция "Working with User Data" (описать privacy settings)

52. Обновить `CLAUDE.md` - секция "Horoscopes" (описать адаптивные промпты)

53. Обновить `docs/progress/CHANGELOG.md` - добавить запись о privacy settings

54. Добавить комментарии в `src/utils/horoscope.ts` (объяснить условную логику)

---

### Этап 11: Финальная проверка (4 подзадачи)

55. Запустить `/code-review` для комплексной проверки

56. Проверить соответствие `DESIGN_RULES.md` (модальные окна, чекбоксы)

57. Проверить performance (нет лишних запросов к API погоды)

58. Проверить accessibility (чекбоксы имеют label и aria-атрибуты)

59. Создать коммит: `feat: adaptive horoscope prompts (partner/location/cycles)`

60. Деплой: `npm run release`

---

## ✅ Критерии успеха

После выполнения всех этапов:

- [ ] Партнер упоминается в гороскопе только если `hasPartner(userPartner) === true`
- [ ] Погода упоминается в гороскопе только если `hasLocationAccess(userProfile) === true`
- [ ] Фаза цикла упоминается в гороскопе только если `isCycleTrackingEnabled(userProfile) === true`
- [ ] Координаты погоды берутся из `current_latitude`/`current_longitude` (НЕ Кобург)
- [ ] Вкладка "Циклы" скрыта когда `cycle_tracking_enabled = false`
- [ ] Все тесты проходят (`npm test`)
- [ ] Билд проходит без ошибок (`npm run build`)
- [ ] Документация обновлена (CLAUDE.md, CHANGELOG.md)
- [ ] Код соответствует DESIGN_RULES.md
- [ ] Performance приемлемый (нет лишних запросов)
- [ ] Accessibility корректен (label, aria-атрибуты)

---

## 🎯 Как использовать этот план

1. **Начать с TASK-013** через `/next`
2. **Использовать TodoList** для отслеживания подзадач текущего этапа
3. **После завершения этапа** → `/done` → `/next` для следующего
4. **Коммитить после каждого этапа** - маленькие атомарные коммиты
5. **Тестировать инкрементально** - не ждать Этапа 9

---

## 💡 Советы

- **Начни с Этапа 1** (миграция БД) - самый простой и фундаментальный
- **Обрати внимание на Этап 4** (промпты) - самая сложная логика, пиши unit-тесты сразу!
- **Тестируй инкрементально** после каждого этапа
- **Используй `console.log`** для отладки промптов (Этап 4)
- **Если застрянешь** - вернись к этому плану и проверь детали

---

**Создано:** 2025-10-30
**Автор:** Claude Code (Agent-Planner)
**Статус:** Ready to Execute
