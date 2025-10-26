# Фаза 1: Универсализация и фундамент

**Статус:** 🟡 В работе
**Дата начала:** 2025-10-26
**ETA:** 3-4 дня
**Прогресс:** 0% (0/8 задач)

---

## 🎯 Цель фазы

Подготовить кодовую базу к внедрению агентной системы:
- Вынести все хардкоженные данные пользователя в универсальную структуру
- Добавить новые типы данных для психологического профиля
- Обеспечить обратную совместимость с существующими данными в localStorage

**Результат фазы:** Кодовая база готова к мультипользовательности и агентской системе.

---

## 📋 Задачи

### 1.1 Создание универсального профиля пользователя

**Файл:** `src/data/userProfile.ts` (создать)
**Зависимости:** нет
**Время:** 2-3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Создать интерфейс `UserProfile` и константу `USER_PROFILES` с данными Насти. Это позволит в будущем легко добавить поддержку множества пользователей.

**Acceptance criteria:**
- [ ] Интерфейс `UserProfile` определён с полями:
  - `id`, `name`, `displayName`
  - `astroProfileId` (ссылка на астро-профиль)
  - `relationshipPartners[]` (для привязки партнёра)
  - `context` (локация, черты личности, стиль общения, уровень мата)
  - `preferences` (стиль гороскопов, сложность историй, нотификации)
- [ ] Константа `USER_PROFILES` содержит профиль 'nastia' с текущими данными
- [ ] Функция `getCurrentUser()` возвращает профиль Насти
- [ ] Функция `CURRENT_USER_ID` экспортирована (пока константа, потом из localStorage)
- [ ] Код типизирован и проходит `tsc` без ошибок

**Связанные ADR:** [ADR-001-universal-user-profile.md](../architecture/ADR-001-universal-user-profile.md)

---

### 1.2 Обновление типов данных

**Файл:** `src/types/index.ts` (изменить)
**Зависимости:** 1.1
**Время:** 2-3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Добавить интерфейсы для психологического профиля: `BehaviorPattern`, `StoryAnalysis`, `CycleMoodCorrelation`, `PsychologicalProfile`, и т.д.

**Acceptance criteria:**
- [ ] `BehaviorPattern` определён (trapCategory, frequency, lastSeen, contexts)
- [ ] `StoryAnalysis` определён (choices, interpretation, userFeedback)
- [ ] `CycleMoodCorrelation` определён (phase, moodDistribution, averagePainLevel)
- [ ] `AstroMoodCorrelation` определён (transitType, moodImpact, occurrences)
- [ ] `PsychologicalProfile` определён (behaviorPatterns, storyHistory, correlations, astroVulnerabilities)
- [ ] `NastiaData` обновлён (добавлено поле `psychologicalProfile?: PsychologicalProfile`)
- [ ] Все интерфейсы экспортированы
- [ ] Код компилируется без ошибок

**Связанные документы:** [PSYCHOLOGICAL_PROFILE_SPEC.md](../specs/PSYCHOLOGICAL_PROFILE_SPEC.md)

---

### 1.3 Рефакторинг хардкода в horoscope.ts

**Файл:** `src/utils/horoscope.ts` (изменить)
**Зависимости:** 1.1, 1.2
**Время:** 1-2 часа
**Статус:** ⏳ Ожидает

**Описание:**
Заменить хардкоженные ссылки на "Настя" и её данные на `getCurrentUser()`.

**Acceptance criteria:**
- [ ] `NASTIA_CONTEXT` заменён на `getCurrentUser().context`
- [ ] Все упоминания "Настя" в промптах заменены на `getCurrentUser().displayName`
- [ ] Партнёр (Серёжа) берётся из `getCurrentUser().relationshipPartners`
- [ ] Все изменения покрыты тестами
- [ ] Гороскопы генерируются корректно

---

### 1.4 Рефакторинг хардкода в historyStory.ts

**Файл:** `src/utils/historyStory.ts` (изменить)
**Зависимости:** 1.1, 1.2
**Время:** 1-2 часа
**Статус:** ⏳ Ожидает

**Описание:**
Заменить хардкоженные данные Насти на `getCurrentUser()` и `getAstroProfile()`.

**Acceptance criteria:**
- [ ] Натальная карта берётся через `getAstroProfile(getCurrentUser().astroProfileId)`
- [ ] Имя в промптах заменено на `getCurrentUser().displayName`
- [ ] Стиль общения (мат) берётся из `getCurrentUser().context.profanityLevel`
- [ ] Все изменения покрыты тестами
- [ ] Истории генерируются корректно

---

### 1.5 Обновление storage.ts

**Файл:** `src/utils/storage.ts` (изменить)
**Зависимости:** 1.2
**Время:** 2 часа
**Статус:** ⏳ Ожидает

**Описание:**
Добавить функции для работы с психологическим профилем.

**Acceptance criteria:**
- [ ] `loadPsychologicalProfile(userId)` - загрузка профиля
- [ ] `savePsychologicalProfile(profile)` - сохранение профиля
- [ ] `initializePsychologicalProfile(userId)` - создание пустого профиля
- [ ] Ключ в localStorage: `nastia-psych-profile-${userId}`
- [ ] Обратная совместимость с существующими данными
- [ ] Все функции покрыты тестами

---

### 1.6 Рефакторинг компонентов

**Файлы:**
- `src/components/ModernNastiaApp.tsx` (изменить)
- `src/components/DiscoverTabV2.tsx` (изменить)
- Другие компоненты с хардкодом

**Зависимости:** 1.1, 1.2, 1.3, 1.4, 1.5
**Время:** 2-3 часа
**Статус:** ⏳ Ожидает

**Описание:**
Заменить все оставшиеся хардкоженные упоминания "Настя" в UI компонентах на `getCurrentUser()`.

**Acceptance criteria:**
- [ ] Все компоненты используют `getCurrentUser().displayName` вместо "Настя"
- [ ] Настройки пользователя берутся из `getCurrentUser().preferences`
- [ ] Приложение работает без регрессий
- [ ] UI тесты обновлены

---

### 1.7 Тестирование

**Время:** 2-3 часа
**Зависимости:** 1.1-1.6
**Статус:** ⏳ Ожидает

**Описание:**
Написать unit тесты для новых утилит и обновить существующие.

**Acceptance criteria:**
- [ ] Тесты для `userProfile.ts` (getCurrentUser, CURRENT_USER_ID)
- [ ] Тесты для `storage.ts` (load/save PsychologicalProfile)
- [ ] Обновлены тесты для `horoscope.ts` и `historyStory.ts`
- [ ] Все существующие тесты проходят (`npm test`)
- [ ] Покрытие новых файлов >80%

---

### 1.8 Финальная проверка и коммит

**Время:** 1 час
**Зависимости:** 1.1-1.7
**Статус:** ⏳ Ожидает

**Описание:**
Проверить всю фазу, обновить документацию, сделать коммит.

**Acceptance criteria:**
- [ ] Все задачи 1.1-1.7 выполнены
- [ ] `npm test` проходит без ошибок
- [ ] `npm start` запускается без ошибок
- [ ] Приложение работает без регрессий
- [ ] `CURRENT_TASK.md` обновлён
- [ ] `CHANGELOG.md` обновлён
- [ ] Коммит создан с понятным сообщением

---

## 🔗 Зависимости между задачами

```
1.1 (userProfile.ts)
  ├─> 1.2 (types.ts)
  │    └─> 1.5 (storage.ts)
  ├─> 1.3 (horoscope.ts refactor)
  └─> 1.4 (historyStory.ts refactor)

1.3, 1.4, 1.5 --> 1.6 (components refactor)
                    └─> 1.7 (tests)
                          └─> 1.8 (commit)
```

---

## ✅ Критерии завершения фазы

- [ ] Все 8 задач выполнены
- [ ] Все тесты проходят (`npm test`)
- [ ] Нет хардкода "Настя" в коде (только в `userProfile.ts`)
- [ ] Приложение работает без регрессий
- [ ] Обратная совместимость с localStorage сохранена
- [ ] `CHANGELOG.md` обновлён с записями о всех изменениях
- [ ] `CURRENT_TASK.md` указывает на Фазу 2

---

## ➡️ Следующая фаза

После завершения этой фазы переходим к:
**[PHASE_2_AI_AGENTS.md](./PHASE_2_AI_AGENTS.md)** - создание 3-уровневой системы AI-агентов.

---

**Создано:** 2025-10-26
**Обновлено:** 2025-10-26
