# ADR-003: Стратегия кэширования промптов (Prompt Caching)

**Дата:** 2025-10-26
**Статус:** ✅ Принято
**Автор:** Команда Nastia Calendar

---

## Контекст

При генерации контрактов и гороскопов мы отправляем большие промпты в Claude API:
- Натальная карта пользователя (~500 токенов)
- Библиотека астро-психологических паттернов (~1000 токенов)
- Правила генерации (~300 токенов)
- **Итого:** ~1800 токенов постоянного контекста

**Проблема:** Эти данные не меняются между запросами, но мы платим за них каждый раз.

**Пример:**
```
Генерация 10 контрактов:
10 * 1800 токенов = 18,000 токенов input
Стоимость: ~$0.09 только на повторяющийся контекст!
```

**Claude API поддерживает Prompt Caching** - возможность кэшировать повторяющиеся части промпта и платить только за новую часть.

---

## Решение

Использовать **Prompt Caching** для всех повторяющихся частей промптов.

### Архитектура кэширования

```typescript
const cachedSystemPrompt = [
  {
    type: "text",
    text: NATAL_CHART_DATA,          // Натальная карта
    cache_control: { type: "ephemeral" } // Кэшировать на 5 минут
  },
  {
    type: "text",
    text: ASTRO_PSYCHOLOGY_LIBRARY,  // Библиотека астро-ран
    cache_control: { type: "ephemeral" }
  },
  {
    type: "text",
    text: GENERATION_RULES,          // Правила генерации
    cache_control: { type: "ephemeral" }
  },
  {
    type: "text",
    text: specificInstruction        // НЕ кэшируется (меняется)
  }
];
```

### Что кэшировать?

**✅ Кэшировать (не меняется между запросами):**
- Натальная карта пользователя
- Библиотека астро-психологических паттернов
- Правила генерации контента
- Структуры данных (интерфейсы, категории)
- Примеры (few-shot examples)

**❌ НЕ кэшировать (меняется каждый раз):**
- Персонализированный контекст (инсайты от агентов)
- Текущая дата и транзиты
- Специфические инструкции для запроса
- История использованных контрактов

---

## Обоснование

### Экономия токенов

**Без кэширования:**
```
10 контрактов:
10 * 1800 токенов input = 18,000 токенов (~$0.09)
```

**С кэшированием:**
```
1-й запрос: 1800 токенов input (~$0.009)
2-10 запросы: 9 * 200 токенов новых = 1800 токенов (~$0.009)
---
ИТОГО: 3600 токенов (~$0.018)

ЭКОНОМИЯ: 80% на input токенах! (18,000 → 3600)
```

### TTL (Time To Live)

Claude API кэширует на **5 минут** (ephemeral cache).

**Почему это работает для нас:**
- Пользователь завершает 1 историю → генерируется следующий контракт (~1 мин)
- Еженедельный отчёт генерирует несколько инсайтов подряд (~2-3 мин)
- Гороскопы (дневной + недельный) генерируются вместе (~1 мин)

**Вывод:** 5 минут достаточно для наших use cases.

---

### Зависимость от пользователя

**Проблема:** Натальная карта индивидуальна для каждого пользователя.

**Решение:** Кэш привязан к конкретному пользователю через `userId`.

```typescript
// Разные пользователи → разные кэши
const cacheKey = `natal-chart-${userId}`;
```

**Вывод:** Кэш работает эффективно только если пользователь активен (генерирует несколько запросов подряд в течение 5 минут).

---

## Имплементация

### BaseAgent с поддержкой caching

```typescript
export abstract class BaseAgent<TInput, TOutput> {
  protected config: AgentConfig;

  protected async callWithCaching(
    systemParts: { text: string; cacheable: boolean }[],
    userPrompt: string,
    signal?: AbortSignal
  ) {
    const systemMessages = systemParts.map(part => ({
      type: "text" as const,
      text: part.text,
      ...(part.cacheable ? {
        cache_control: { type: "ephemeral" as const }
      } : {})
    }));

    return callAI({
      system: systemMessages,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      signal,
    });
  }
}
```

### Пример использования (ContractPersonalizerAgent)

```typescript
export class ContractPersonalizerAgent extends BaseAgent {
  async execute(input: ContractPersonalizerInput, signal?: AbortSignal) {
    const user = getCurrentUser();
    const chart = getAstroProfile(user.astroProfileId);

    return this.callWithCaching(
      [
        {
          text: buildNatalChartPrompt(chart),
          cacheable: true  // Не меняется
        },
        {
          text: ASTRO_PSYCHOLOGY_LIBRARY,
          cacheable: true  // Не меняется
        },
        {
          text: buildPersonalizationContext(input.insights),
          cacheable: false // Меняется каждый раз
        }
      ],
      this.buildPrompt(input),
      signal
    );
  }
}
```

---

## Альтернативы

### Альтернатива 1: Не использовать caching
Отправлять полный промпт каждый раз.

**Плюсы:**
- Простота реализации

**Минусы:**
- Дорого (90% токенов повторяются)
- **Не выбрано:** Неоправданная трата денег

---

### Альтернатива 2: Векторная БД (embeddings)
Хранить контекст в векторной БД, искать релевантные части.

**Плюсы:**
- Можно хранить большие объёмы контекста
- Поиск релевантных частей

**Минусы:**
- Overengineering для нашего случая
- Нужна дополнительная инфраструктура (Pinecone, Weaviate)
- Медленнее (дополнительный запрос к БД)
- **Не выбрано:** Слишком сложно для текущих объёмов

---

### Альтернатива 3: Fine-tuning модели
Fine-tune модель на наших данных.

**Плюсы:**
- Модель "знает" контекст без промпта

**Минусы:**
- Дорого ($100+ за fine-tune)
- Долго (обучение модели)
- Сложно обновлять (нужен re-train)
- **Не выбрано:** Overengineering, непрактично

---

## Последствия

### Положительные
- ✅ Экономия 80-90% на input токенах
- ✅ Простая реализация (встроено в Claude API)
- ✅ Автоматическая инвалидация (5 минут TTL)
- ✅ Работает прозрачно (не нужно управлять кэшем)

### Отрицательные
- ⚠️ Зависимость от Claude API (не работает с другими моделями)
- ⚠️ TTL 5 минут (не контролируем)
- ⚠️ Нужно структурировать промпты (cacheable vs non-cacheable части)

### Митигация рисков
- Промпты структурированы в `BaseAgent` (легко менять стратегию)
- Измерять эффективность кэширования через API metrics
- Fallback: если caching не работает, всё равно отправляем полный промпт

---

## Метрики успеха

### Измеряем эффективность:
1. **Cache hit rate** - через Claude API metrics
2. **Экономия токенов** - сравнение с/без caching
3. **Latency** - кэшированные запросы быстрее (~20-30% быстрее)

### Target:
- Cache hit rate: >70% (пользователь активен в течение 5 минут)
- Экономия: >80% на input токенах для Tier 3 агентов
- Latency: -20-30% для кэшированных запросов

---

## Связанные документы

- [ADR-002-ai-agent-tiers.md](./ADR-002-ai-agent-tiers.md) - агентская система
- [PHASE_2_AI_AGENTS.md](../roadmap/PHASE_2_AI_AGENTS.md) - реализация агентов
- [AGENT_PROMPTS.md](./AGENT_PROMPTS.md) - промпты агентов

---

## Пример промпта с caching

```typescript
// Структура промпта для ContractPersonalizerAgent
const systemParts = [
  // 1. КЭШИРУЕМАЯ ЧАСТЬ: Натальная карта (500 токенов)
  {
    text: `
NATAL_CHART:
Sun in Aries (12°34')
Moon in Cancer (15°23')
Ascendant in Libra (8°45')
...
`,
    cacheable: true
  },

  // 2. КЭШИРУЕМАЯ ЧАСТЬ: Библиотека астро-ран (1000 токенов)
  {
    text: `
ASTRO_PSYCHOLOGY_LIBRARY:
Moon-Saturn square:
- Core wound: страх быть отвергнутой за эмоции
- Manifestations: эмоциональная сдержанность...
- Growth path: разрешить себе быть уязвимой
...
`,
    cacheable: true
  },

  // 3. НЕ КЭШИРУЕМАЯ ЧАСТЬ: Персонализация (200 токенов)
  {
    text: `
PERSONALIZATION:
Dominant pattern: avoidance (45%)
Recent triggers: boundaries with mom, work conflicts
Last contracts: contract-001, contract-003
`,
    cacheable: false
  }
];

// Первый запрос: платим за 1700 токенов
// Следующие запросы (в течение 5 мин): платим за 200 токенов
// Экономия: 88%!
```

---

**Создано:** 2025-10-26
**Обновлено:** 2025-10-26
