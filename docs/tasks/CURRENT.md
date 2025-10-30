# Текущая задача

**Last updated:** 2025-10-31T01:30:00Z

---

## TASK-014: Параметризация функций погоды - добавить поддержку координат ✅

**Категория:** refactor | **Приоритет:** 🔥 high | **Сложность:** simple

**Статус:** done
**Начата:** 2025-10-31T01:15:00Z
**Завершена:** 2025-10-31T01:30:00Z

### Описание

Этап 2 универсализации: обновить `fetchDailyWeatherSummary()` и `fetchWeeklyWeatherSummary()` для приема координат (latitude, longitude) как параметров вместо использования захардкоженного `COBURG_COORDS`.

Модифицировать `buildQueryUrl()` для использования переданных координат или возврата `null` если координаты не предоставлены. Удалить захардкоженный `COBURG_COORDS` из weather.ts.

**Privacy-first подход:** Погода запрашивается только если координаты явно переданы. Если координаты `null`/`undefined` - функции возвращают `null` без запроса к API.

### Связанные файлы

- [src/utils/weather.ts](../../src/utils/weather.ts) - основной файл для рефакторинга

### Теги

weather, refactor, coordinates, parameterization

---

### Результаты

✅ **Все подзадачи выполнены за ~15 минут!** (оценка была 30 минут)

1. **buildQueryUrl()** - принимает `latitude?`, `longitude?` параметры
   - Возвращает `null` если координаты не переданы
   - Privacy-first: проверка `if (latitude === undefined || latitude === null || ...)`

2. **fetchWeatherRange()** - передаёт координаты в `buildQueryUrl()`
   - Early return `null` если `url === null` (нет координат)

3. **fetchDailyWeatherSummary()** - принимает `latitude?`, `longitude?`
   - Early return `null` если координаты не переданы
   - Передаёт координаты в `fetchWeatherRange()`

4. **fetchWeeklyWeatherSummary()** - принимает `latitude?`, `longitude?`
   - Early return `null` если координаты не переданы
   - Передаёт координаты в `fetchWeatherRange()`

5. **COBURG_COORDS удалён** - захардкоженная константа (50.2584, 10.9629) больше не используется

6. **TypeScript компиляция** - без ошибок (`npx tsc --noEmit`)

**Разблокированные задачи:** TASK-016 (обновление промптов), TASK-020 (обновление вызовов)

---

**Эта задача часть мета-задачи:** Adaptive Horoscope Prompts (TASK-013 → TASK-023)
**Этап:** Phase 1 - Universalization (удаление захардкоженных данных)
**Предыдущая:** TASK-013 (завершена ✅)
**Следующая:** TASK-015 (хелперы userContext.ts)
