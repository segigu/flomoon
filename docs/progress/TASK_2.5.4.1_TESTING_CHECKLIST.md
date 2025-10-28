# Task 2.5.4.1: AI Prompts Localization - Testing Checklist

## Дата: 2025-10-28
## Статус: Готово к тестированию

---

## 🎯 Что было сделано

### Stage 1: buildArcPrompt и buildFinalePrompt
✅ Завершена адаптация промптов для интерактивных историй (historyStory.ts)
- buildArcPrompt: все секции адаптированы для ru/en/de
- buildFinalePrompt: все секции адаптированы для ru/en/de

### Stage 6: Локализация вспомогательных элементов (~410 строк)
✅ Адаптированы все helper функции в 3 файлах:

**horoscope.ts:**
- formatMemoryDateLabel() - форматирование дат в memory reminders
- buildDailyMemoryReminders() - напоминания для daily гороскопов
- buildSergeyMemoryReminders() - напоминания для Sergey гороскопов

**cyclePrompt.ts:**
- getOrdinalWords() - порядковые числительные (1st/erster/первый)
- pluralizeDays() - множественное число для дней (day/days, Tag/Tage, день/дня/дней)
- describeSpan() + describeMoment() - временные фразы ("early in the week", etc.)
- buildDailyCycleHint() - 6 фаз цикла × 3 языка
- buildWeeklyCycleHint() - 7 событий цикла × 3 языка
- buildSergeyCycleHint() - 6 фаз цикла (взгляд Серёжи) × 3 языка

**weather.ts:**
- getWeatherCodeDescriptions() - 28 кодов погоды × 3 языка
- mapWeatherCode() - маппинг кодов + 6 fallback диапазонов
- formatDayName() + formatDayList() - форматирование дней недели
- fetchDailyWeatherSummary() - 5 секций × 3 языка
- fetchWeeklyWeatherSummary() - 7 секций × 3 языка

### Stage 7: Интеграция языка в React компоненты
✅ Обновлены 9 вызовов в 2 компонентах:

**ModernNastiaApp.tsx (6 вызовов):**
1. ✅ Line 3189: fetchDailyHoroscope + i18n.language
2. ✅ Line 3301: fetchDailyHoroscopeForDate + i18n.language
3. ✅ Line 3331: fetchSergeyBannerCopy + i18n.language
4. ✅ Line 3517: fetchSergeyDailyHoroscopeForDate + i18n.language
5. ✅ Line 923: generateHistoryStoryChunk + language: i18n.language
6. ✅ Line 1045: generateHistoryStoryChunk (finale) + language: i18n.language

**DiscoverTabV2.tsx (3 вызова):**
1. ✅ Line 63: Добавлен i18n в useTranslation('discover')
2. ✅ Line 677: generateHistoryStoryChunk + language: i18n.language
3. ✅ Line 767: generateHistoryStoryChunk + language: i18n.language

---

## 🧪 Чеклист для тестирования

### Подготовка
- [ ] Запустить dev-сервер: `npm start`
- [ ] Открыть приложение в браузере
- [ ] Убедиться, что в `.env.local` настроены API ключи (Claude/OpenAI)

### Тест 1: Weekly Horoscope (Недельный гороскоп)
**Функция:** fetchDailyHoroscope → buildWeeklyPrompt

**Russian (ru):**
- [ ] Переключить язык на Русский (Settings → Language → Русский)
- [ ] Открыть "Период" модал → "Посмотреть гороскоп"
- [ ] Проверить тон: мат, сарказм, "язвительная Настя"
- [ ] Проверить погоду: описания на русском
- [ ] Проверить цикл: фазы менструации на русском
- [ ] Сохранить скриншот/текст

**English (en):**
- [ ] Переключить язык на English
- [ ] Открыть Period modal → "View Horoscope"
- [ ] Проверить тон: witty best friend, mild profanity
- [ ] Проверить погоду: английские описания
- [ ] Проверить цикл: фазы на английском
- [ ] Сохранить скриншот/текст

**Deutsch (de):**
- [ ] Переключить язык на Deutsch
- [ ] Открыть Periodenmodal → "Horoskop ansehen"
- [ ] Проверить тон: sarkastische Freundin, directness
- [ ] Проверить погоду: немецкие описания
- [ ] Проверить цикл: фазы на немецком
- [ ] Сохранить скриншот/текст

### Тест 2: Daily Horoscope (Дневной гороскоп)
**Функция:** fetchDailyHoroscopeForDate → buildDailyPrompt

**Russian (ru):**
- [ ] Главный экран → дождаться загрузки дневного гороскопа
- [ ] Проверить тон: прямой, с матом
- [ ] Проверить память: "Личные детали не мусоль без повода..."
- [ ] Проверить погоду: "Понедельник пахнет неожиданно ясным небом"
- [ ] Проверить цикл: "сейчас идёт первый день менструации..."

**English (en):**
- [ ] Переключить язык
- [ ] Проверить daily horoscope
- [ ] Проверить память: "Don't rehash personal details unnecessarily..."
- [ ] Проверить погоду: "Monday smells like unexpectedly clear skies"
- [ ] Проверить цикл: "it's the 1st day of menstruation..."

**Deutsch (de):**
- [ ] Переключить язык
- [ ] Проверить daily horoscope
- [ ] Проверить память: "Wiederkaue persönliche Details nicht grundlos..."
- [ ] Проверить погоду: "Montag riecht nach unerwartet klarem Himmel"
- [ ] Проверить цикл: "es ist der erster Tag der Menstruation..."

### Тест 3: Sergey Banner (Баннер про Серёжу)
**Функция:** fetchSergeyBannerCopy → buildSergeyBannerPrompt

**Russian (ru):**
- [ ] Главный экран → дождаться загрузки баннера "Что думает Серёжа"
- [ ] Проверить title: сарказм про Серёжу
- [ ] Проверить subtitle: язвительное описание дня
- [ ] Проверить кнопки: primaryButton, secondaryButton

**English (en):**
- [ ] Переключить язык
- [ ] Проверить "What Sergey Thinks" banner
- [ ] Проверить английские тексты

**Deutsch (de):**
- [ ] Переключить язык
- [ ] Проверить "Was Sergey denkt" banner
- [ ] Проверить немецкие тексты

### Тест 4: Sergey Daily Horoscope (Гороскоп про Серёжу)
**Функция:** fetchSergeyDailyHoroscopeForDate → buildSergeyDailyPrompt

**Russian (ru):**
- [ ] Кликнуть на Sergey banner → открыть полный гороскоп
- [ ] Проверить тон: взгляд Насти на Серёжу, сарказм
- [ ] Проверить память: "Будь более саркастичной..."
- [ ] Проверить погоду: упрощённое описание
- [ ] Проверить цикл: "У Насти сейчас менструация..."

**English (en):**
- [ ] Переключить язык
- [ ] Открыть Sergey horoscope
- [ ] Проверить тон: Nastia's POV on Sergey
- [ ] Проверить память: "Be more sarcastic..."
- [ ] Проверить цикл: "Nastia is currently menstruating..."

**Deutsch (de):**
- [ ] Переключить язык
- [ ] Sergey Horoskop öffnen
- [ ] Проверить немецкие тексты

### Тест 5: Interactive Story - Arc (Интерактивная история - дуга)
**Функция:** generateHistoryStoryChunk (mode: 'arc') → buildArcPrompt

**Russian (ru):**
- [ ] Вкладка "Узнай себя" → начать новую историю
- [ ] Проверить тон: простой, современный язык
- [ ] Выбрать 1-2 опции
- [ ] Проверить, что новый сегмент соответствует выбору
- [ ] Проверить контекст: астрология интегрирована

**English (en):**
- [ ] Переключить язык
- [ ] Tab "Discover Yourself" → start new story
- [ ] Проверить английские промпты
- [ ] Выбрать 1-2 опции
- [ ] Проверить narrative coherence

**Deutsch (de):**
- [ ] Переключить язык
- [ ] Tab "Entdecke dich" → neue Geschichte starten
- [ ] Проверить немецкие промпты
- [ ] Выбрать 1-2 опции

### Тест 6: Interactive Story - Finale (Финал истории)
**Функция:** generateHistoryStoryChunk (mode: 'finale') → buildFinalePrompt

**Russian (ru):**
- [ ] Пройти историю до конца (7 арок)
- [ ] Дождаться генерации финала
- [ ] Проверить тон: двойная интерпретация (human + astro)
- [ ] Проверить, что финал учитывает все 7 выборов

**English (en):**
- [ ] Переключить язык
- [ ] Пройти историю до финала
- [ ] Проверить английский финал
- [ ] Проверить dual interpretation

**Deutsch (de):**
- [ ] Переключить язык
- [ ] Geschichte bis zum Ende durchspielen
- [ ] Немецкий финал проверить

### Тест 7: Custom Voice Option (Голосовая запись)
**Функция:** generateCustomHistoryOption (использует те же промпты)

**Russian (ru):**
- [ ] В истории выбрать "Свой вариант"
- [ ] Записать голосовое сообщение
- [ ] Проверить транскрипцию (Whisper)
- [ ] Проверить, что AI сгенерировал title + description на русском

**English (en):**
- [ ] Switch language
- [ ] Choose "Your own option"
- [ ] Record voice message
- [ ] Verify English title + description

**Deutsch (de):**
- [ ] Sprache wechseln
- [ ] "Deine eigene Option" wählen
- [ ] Sprachnachricht aufnehmen
- [ ] Titel + Beschreibung auf Deutsch prüfen

---

## 🐛 Известные особенности

1. **Memory reminders:** Форматирование дат использует Intl.DateTimeFormat с локалями
2. **Weather codes:** 28 кодов + 6 fallback диапазонов - проверить все покрыты
3. **Cycle hints:** Русская плюрализация сложнее (день/дня/дней) vs английская (day/days)
4. **Ordinal numbers:** Английские (1st, 2nd, 3rd) vs немецкие (erster, zweiter, dritter) vs русские (первый, второй, третий)
5. **Cultural tone:** Не буквальный перевод - каждый язык имеет свой стиль

---

## 📊 Результаты тестирования

### ✅ Успешно протестировано:
- [ ] Weekly Horoscope (ru/en/de)
- [ ] Daily Horoscope (ru/en/de)
- [ ] Sergey Banner (ru/en/de)
- [ ] Sergey Daily Horoscope (ru/en/de)
- [ ] Interactive Story - Arc (ru/en/de)
- [ ] Interactive Story - Finale (ru/en/de)
- [ ] Custom Voice Option (ru/en/de)

### ❌ Найденные баги:
*Заполнить после тестирования*

---

## 📝 Следующие шаги

После успешного тестирования:
1. Stage 9: Обновить документацию (MASTER_PLAN.md, CURRENT_TASK.md)
2. Stage 10: Финальная проверка
3. КПД: Commit + Push + Deploy

---

## 🔧 Технические детали

### Изменённые файлы:
- `src/utils/historyStory.ts` - buildArcPrompt, buildFinalePrompt, HistoryStoryRequestOptions interface, generateHistoryStoryChunk
- `src/utils/horoscope.ts` - buildDailyMemoryReminders, buildSergeyMemoryReminders, formatMemoryDateLabel, все fetch* функции
- `src/utils/cyclePrompt.ts` - getOrdinalWords, pluralizeDays, describeSpan, describeMoment, все build*CycleHint функции
- `src/utils/weather.ts` - getWeatherCodeDescriptions, mapWeatherCode, formatDayName, formatDayList, fetch*WeatherSummary
- `src/components/ModernNastiaApp.tsx` - 6 вызовов AI функций + i18n.language
- `src/components/DiscoverTabV2.tsx` - 2 вызова generateHistoryStoryChunk + i18n extraction

### TypeScript компиляция: ✅ Без ошибок
### Production build: ✅ Успешно (+4.22 kB gzipped)

### Bundle size impact:
```
455.33 kB (+4.22 kB)  build/static/js/main.b83cb100.js
```
Рост бандла минимальный - добавлены только текстовые строки.

---

**Автор:** Claude Code
**Дата создания:** 2025-10-28
**Последнее обновление:** 2025-10-28
