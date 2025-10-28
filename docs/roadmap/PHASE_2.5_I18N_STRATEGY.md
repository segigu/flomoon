# Phase 2.5: Стратегия интернационализации (i18n)

**Создано:** 2025-10-28
**Статус:** В работе
**Решение принято:** Адаптация AI контента, не перевод

---

## 🎯 Ключевое решение: Адаптация vs Перевод

### Проблема

AI-generated контент с сильным культурным контекстом **не переводится дословно**:

```typescript
// ❌ Дословный перевод НЕ работает
ru: "Серёжа опять листает чаты"
en: "Sergey is scrolling chats again"  // теряется сарказм
de: "Sergey scrollt wieder durch Chats" // теряется tone

// ❌ Маты не переводятся
ru: "всё сгорело нахуй"
en: "everything burned to fuck"  // звучит странно
de: "alles ist verbrannt zum Teufel"  // не то

// ❌ Офисный юмор специфичен
ru: "Кофемашина катит глаза"
en: "Coffee machine rolls its eyes"  // буквально работает, но не смешно
```

### Решение: Адаптация под культуру

**НЕ переводим, а ПЕРЕПИСЫВАЕМ** под каждый язык:

```typescript
// ✅ Русский (оригинал)
const RU_PROMPT = {
  character: "Серёжа - менеджер среднего звена",
  tone: "саркастический, бытовой, с матами",
  context: "офисный цинизм российского офиса",
  examples: [
    "Серёжа опять листает чаты",
    "Кофемашина катит глаза",
    "всё сгорело нахуй"
  ]
};

// ✅ Английский (адаптация)
const EN_PROMPT = {
  character: "Mike - middle manager",
  tone: "sarcastic, casual, slightly profane",
  context: "cynical corporate humor",
  examples: [
    "Mike's scrolling Slack again",
    "Coffee machine rolls its eyes",
    "everything went to shit"
  ]
};

// ✅ Немецкий (адаптация)
const DE_PROMPT = {
  character: "Stefan - mittlerer Manager",
  tone: "sarkastisch, umgangssprachlich, leicht vulgär",
  context: "zynischer Büro-Humor",
  examples: [
    "Stefan scrollt wieder durch Chats",
    "Kaffeemaschine verdreht die Augen",
    "alles ist verbrannt"
  ]
};
```

---

## 📋 Обновлённый план Phase 2.5

### Общая оценка: ~20-26 часов

| Task | Описание | Время | Подход |
|------|----------|-------|--------|
| **2.5.1** | Настройка i18next | ~2 ч | ✅ DONE |
| **2.5.2** | БД миграция language_code | ~2 ч | ✅ DONE |
| **2.5.3** | Извлечение UI текстов | ~8-10 ч | Перевод |
| **2.5.4** | Адаптация AI промптов | ~6-8 ч | **Адаптация** |
| **2.5.5** | Адаптация психологических контрактов | ~4-5 ч | **Адаптация** |
| **2.5.6** | Тестирование и интеграция | ~2-3 ч | Тесты |

---

## 🔧 Техническая реализация

### 1. Структура промптов

```
src/prompts/
├── horoscope/
│   ├── ru.ts  # Оригинал (Серёжа, маты, офисный цинизм)
│   ├── en.ts  # Адаптация (Mike, profanity, corporate humor)
│   └── de.ts  # Адаптация (Stefan, vulgär, Büro-Humor)
├── story/
│   ├── ru.ts  # Психологические контракты (русская терминология)
│   ├── en.ts  # Adapted contracts (English psychological terms)
│   └── de.ts  # Angepasste Verträge (deutsche Fachbegriffe)
├── planet-messages/
│   ├── ru.ts  # Планеты (русский контекст)
│   ├── en.ts  # Planets (English context)
│   └── de.ts  # Planeten (deutscher Kontext)
└── index.ts   # Экспорт и выбор по языку
```

### 2. Интерфейс промпта

```typescript
// src/prompts/types.ts
export interface LocalizedPrompt {
  /** Язык промпта */
  language: 'ru' | 'en' | 'de';

  /** Основной system prompt для AI */
  systemPrompt: string;

  /** Tone of voice (описание стиля) */
  tone: string;

  /** Имя главного персонажа (если применимо) */
  characterName?: string;

  /** Примеры фраз для референса */
  examplePhrases: string[];

  /** Fallback фразы (если AI не сгенерирует) */
  fallbackPhrases: string[];

  /** Пример правильного output */
  exampleOutput: string;
}
```

### 3. Использование в коде

```typescript
// src/utils/horoscope.ts
import { getCurrentLanguage } from '../i18n/i18nHelpers';
import { getHoroscopePrompt } from '../prompts';

export async function generateHoroscope(userContext: any) {
  // Получить язык пользователя
  const language = getCurrentLanguage(); // 'ru' | 'en' | 'de'

  // Загрузить адаптированный промпт
  const prompt = getHoroscopePrompt(language);

  // Генерация с правильным промптом
  const response = await aiClient.sendMessage(
    prompt.systemPrompt,
    {
      ...userContext,
      tone: prompt.tone,
      examples: prompt.examplePhrases,
    }
  );

  return response || prompt.fallbackPhrases[0];
}
```

### 4. Экспорт промптов

```typescript
// src/prompts/index.ts
import { SERGEY_HOROSCOPE_RU } from './horoscope/ru';
import { MANAGER_HOROSCOPE_EN } from './horoscope/en';
import { MANAGER_HOROSCOPE_DE } from './horoscope/de';

const HOROSCOPE_PROMPTS = {
  ru: SERGEY_HOROSCOPE_RU,
  en: MANAGER_HOROSCOPE_EN,
  de: MANAGER_HOROSCOPE_DE,
};

export function getHoroscopePrompt(language: 'ru' | 'en' | 'de') {
  return HOROSCOPE_PROMPTS[language];
}

// То же для story, planet-messages...
```

---

## 📝 Task 2.5.3: Извлечение UI текстов (NEXT)

**Время:** ~8-10 часов
**Подход:** Перевод (не адаптация)

### Этапы

1. **Простые компоненты** (2 ч)
   - GlassTabBar: названия табов
   - MiniCalendar: месяцы, дни недели
   - CycleLengthChart: labels

2. **Утилиты** (1.5 ч)
   - storage.ts: alert/confirm сообщения
   - cloudSync.ts: статусы синхронизации
   - pushNotifications.ts: тексты уведомлений

3. **Settings modal** (1.5 ч)
   - Форма профиля
   - Секции настроек
   - Кнопки, placeholder'ы

4. **ModernNastiaApp** (3 ч)
   - Календарь: добавление периодов
   - История: циклы, статистика
   - Модальные окна

5. **LanguageSelector** (1 ч)
   - Новый компонент
   - Dropdown с флагами
   - Интеграция в Settings

6. **Интеграция** (1.5 ч)
   - Загрузка языка при старте
   - Сохранение в Supabase
   - Тестирование

**Результат:** UI полностью переведён, LanguageSelector работает

---

## 🧠 Task 2.5.4: Адаптация AI промптов

**Время:** ~6-8 часов
**Подход:** Адаптация под культуру (не перевод)

### Этапы

1. **Создать структуру** (30 мин)
   - `src/prompts/` директория
   - Интерфейсы TypeScript
   - Экспорт функции

2. **Адаптировать Sergey horoscopes** (2-3 ч)
   - `horoscope/ru.ts` - оригинал (Серёжа)
   - `horoscope/en.ts` - Mike (AI-адаптация)
   - `horoscope/de.ts` - Stefan (AI-адаптация)
   - Сохранить tone, но сменить контекст

3. **Адаптировать planet messages** (1.5-2 ч)
   - `planet-messages/ru.ts` - оригинал
   - `planet-messages/en.ts` - адаптация
   - `planet-messages/de.ts` - адаптация
   - Астрологические термины локализованы

4. **Адаптировать story generation** (1.5-2 ч)
   - `story/ru.ts` - оригинал
   - `story/en.ts` - адаптация
   - `story/de.ts` - адаптация
   - Психологический контекст сохранён

5. **Интеграция и тестирование** (1 ч)
   - Обновить `horoscope.ts`, `historyStory.ts`
   - Тестирование с разными языками
   - Проверка quality/tone

**Результат:** AI генерирует контент правильного качества на всех языках

---

## 🎭 Task 2.5.5: Адаптация психологических контрактов

**Время:** ~4-5 часов
**Подход:** Адаптация терминологии

### Этапы

1. **Аудит терминологии** (1 ч)
   - Список всех терминов: "ловушка жертвы", "синдром самозванца"
   - Найти эквиваленты: en "victim mentality", de "Opferrolle"
   - Проверить, что термины существуют

2. **Адаптировать контракты** (2-3 ч)
   - `psychologicalContracts.ts` → структура с LocalizedText
   - Заполнить ru/en/de
   - Сохранить психологический смысл

3. **Интеграция** (1 ч)
   - Обновить `historyStory.ts`
   - Тестирование выбора контрактов
   - Проверка интерпретаций

**Результат:** Психологические контракты работают на всех языках

---

## ✅ Task 2.5.6: Тестирование

**Время:** ~2-3 часа

### Чек-лист

**UI тексты:**
- [ ] Все табы переведены
- [ ] Settings полностью на выбранном языке
- [ ] Модальные окна переведены
- [ ] Уведомления переведены
- [ ] Ошибки переведены

**LanguageSelector:**
- [ ] Dropdown работает
- [ ] Флаги отображаются
- [ ] Язык сохраняется в Supabase
- [ ] При перезагрузке язык восстанавливается

**AI контент:**
- [ ] Гороскопы генерируются на правильном языке
- [ ] Tone of voice правильный (ru: маты, en: profanity, de: vulgär)
- [ ] Планеты говорят на правильном языке
- [ ] Истории генерируются правильно

**Психологические контракты:**
- [ ] Термины правильные на всех языках
- [ ] Интерпретации понятны
- [ ] Сценарии локализованы

**Fallback:**
- [ ] Неизвестный язык → ru
- [ ] Отсутствующий ключ → показывает ключ
- [ ] AI ошибка → fallback фразы

---

## 🔑 Ключевые принципы

1. **UI = Перевод, AI = Адаптация**
   - Кнопки, labels → translate
   - Гороскопы, истории → adapt

2. **Tone of voice сохраняется**
   - ru: бытовой, с матами, саркастический
   - en: casual, profane, sarcastic
   - de: umgangssprachlich, vulgär, sarkastisch

3. **Культурный контекст адаптируется**
   - ru: Серёжа, российский офис, чаты
   - en: Mike, corporate America, Slack
   - de: Stefan, deutsches Büro, Chats

4. **Психологическая терминология локализуется**
   - ru: "ловушка жертвы"
   - en: "victim mentality"
   - de: "Opferrolle"

5. **Fallback всегда на русском**
   - Если AI не сгенерирует → ru fallback
   - Если язык неизвестен → ru

---

## 📊 Прогресс

| Task | Статус | Коммит |
|------|--------|--------|
| 2.5.1 | ✅ DONE | 9d11407 |
| 2.5.2 | ✅ DONE | 988f086 |
| 2.5.3 | ⏳ IN PROGRESS | - |
| 2.5.4 | 📋 PLANNED | - |
| 2.5.5 | 📋 PLANNED | - |
| 2.5.6 | 📋 PLANNED | - |

**Общий прогресс:** 4 часа / ~20-26 часов (~15-20%)

---

## 🎯 Критерии успеха

Phase 2.5 считается завершённой, когда:

1. ✅ Пользователь может выбрать язык (ru, en, de)
2. ✅ Весь UI переведён (no hardcoded strings)
3. ✅ AI генерирует контент на правильном языке
4. ✅ Tone of voice сохранён для всех языков
5. ✅ Психологические термины правильные
6. ✅ Язык сохраняется в Supabase
7. ✅ Fallback работает корректно
8. ✅ Все тесты проходят
9. ✅ `npm run build` успешен
10. ✅ Документация обновлена

---

## 📚 Дополнительные материалы

- **План агента:** [PHASE_2.5_TASK_3_DETAILED.md](PHASE_2.5_TASK_3_DETAILED.md)
- **Supabase guide:** [SUPABASE_CLI_GUIDE.md](../SUPABASE_CLI_GUIDE.md)
- **MCP setup:** [MCP_SETUP.md](../MCP_SETUP.md)
- **Глобальный workflow:** [~/.claude/docs/CLAUDE_WORKFLOW.md](~/.claude/docs/CLAUDE_WORKFLOW.md)

---

**Обновлено:** 2025-10-28
**Следующий шаг:** Начать Task 2.5.3 (Извлечение UI текстов)
