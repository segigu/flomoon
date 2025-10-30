# Текущая задача

**Last updated:** 2025-10-31T18:35:00Z

---

## TASK-030: Исправить ошибку генерации гороскопа партнера при отсутствии данных

**Категория:** bug (horoscope, partner, error-handling)
**Приоритет:** 🟠 high
**Сложность:** simple
**Статус:** in-progress

### Описание

Критическая ошибка в консоли:
```
Failed to generate Sergey daily horoscope: Error: Partner not defined or missing birth date - cannot generate partner horoscope
```

**Локация:** [horoscope.ts:1811](../../src/utils/horoscope.ts#L1811)

Ошибка возникает при попытке сгенерировать партнерский гороскоп, когда партнер не определен или отсутствует дата рождения.

### Требования

1. ✅ Проверить функцию `fetchSergeyDailyHoroscopeForDate()` - добавить проверку `hasPartner(userPartner)` ДО вызова API
2. ✅ Добавить graceful fallback - если партнера нет, НЕ показывать баннер партнерского гороскопа
3. ✅ Улучшить error handling - вместо `throw Error` использовать `console.error()` и возвращать `null`
4. ✅ Проверить `ModernNastiaApp.tsx` - убедиться что баннер "Что там у партнера?" условно рендерится только если `hasPartner(userPartner)=true`

### Связанные файлы

- [src/utils/horoscope.ts](../../src/utils/horoscope.ts) - функция fetchSergeyDailyHoroscopeForDate()
- [src/components/ModernNastiaApp.tsx](../../src/components/ModernNastiaApp.tsx) - баннер партнерского гороскопа
- [src/utils/userContext.ts](../../src/utils/userContext.ts) - helper hasPartner()

### Примечания

hasPartner(userPartner) проверка уже реализована в TASK-015/TASK-016 для условного включения партнера в промпты, но может быть недостаточно защищена от случаев когда userPartner === null в момент вызова fetchSergeyDailyHoroscopeForDate().

### Связанные задачи

- **TASK-009** (✅ done) - UI фидбек при отсутствии партнера (баннер скрыт если userPartner === null)
- **TASK-026** (✅ done) - Адаптивность промптов гороскопов (hasPartner проверка)

### Теги

`horoscope`, `partner`, `error-handling`, `sergey-horoscope`, `console-error`
