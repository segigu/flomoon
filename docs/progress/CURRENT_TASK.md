# Текущая задача

**Дата обновления:** 2025-10-27
**Фаза:** 2 - База данных и авторизация (Supabase)
**Прогресс Фазы 2:** 33% (3/9 этапов)

---

## 🎯 Текущая работа

**Статус:** ✅ Этапы 2.0-2.3 ЗАВЕРШЕНЫ (33%), Этап 2.4 ГОТОВ К СТАРТУ

**Последний коммит:** `f1c4b00 feat(phase-2): завершить Stage 2.3 - Auth UI с FullScreenModal`
**Деплой:** ✅ Опубликовано на https://segigu.github.io/flomoon/

**Прогресс Фазы 2:**
- ✅ Этап 2.0: Подготовка (откат storage.ts, коммит документации)
- ✅ Этап 2.1: Supabase проект создан и настроен
- ✅ Этап 2.2: Интеграция SDK завершена
- ✅ Этап 2.3: Auth UI завершён (AuthModal.tsx, интеграция, logout)

**Стратегическое решение:**
- Задачи 1.5-1.8 Фазы 1 (storage.ts, компоненты, тесты) **ПРОПУЩЕНЫ**
- Фаза 1.5 (i18n) **ОТЛОЖЕНА** до завершения Фазы 2
- Переход сразу к Фазе 2 (Supabase) для реализации критичной архитектуры

**Почему:**
- Supabase меняет архитектуру хранилища → storage.ts будет заменён на storageSupabase.ts
- Нет смысла дважды делать одну работу (localStorage → Supabase)
- Многоязычность (i18n) можно добавить ПОСЛЕ Supabase без конфликтов

**Что готово в Фазе 1:**
- ✅ Структура документации (Фаза 0)
- ✅ **Задача 1.1: userProfile.ts создан и проверен**
  - Создан интерфейс `UserProfile` с полной типизацией
  - Добавлена константа `USER_PROFILES` с профилем Насти
  - Создана функция `getCurrentUser()` с проверкой ошибок
  - TypeScript компиляция прошла успешно
- ✅ **Задача 1.2: types/index.ts обновлён**
  - Добавлены 5 новых интерфейсов для психологического профиля
  - Обновлён интерфейс `NastiaData` с полем `psychologicalProfile`
  - TypeScript компиляция без ошибок
- ✅ **Задача 1.3: horoscope.ts рефакторинг завершён**
  - Заменены статические константы на динамические функции
  - Созданы buildUserContext(), buildPartnerContext()
  - Заменены все hardcoded упоминания "Настя" на getCurrentUser().name
  - TypeScript компиляция без ошибок
- ✅ **Задача 1.4: historyStory.ts рефакторинг завершён**
  - Созданы динамические функции getUserProfile(), getUserChartAnalysis()
  - Заменены все упоминания "Настя"/"Насти" на getCurrentUser().name (8 мест)
  - TypeScript компиляция без ошибок

**Следующий этап:** Этап 2.1 - Создание Supabase проекта и настройка БД схемы

---

## 📝 План Фазы 2: Supabase (9 этапов, 25-35 часов)

### Этап 2.0: Подготовка ✅ ЗАВЕРШЁН (2025-10-27)
- [x] Откатить незакоммиченные изменения storage.ts
- [x] Проверить git статус (задачи 1.1-1.4 уже закоммичены)
- [x] Обновить CURRENT_TASK.md и MASTER_PLAN.md
- [x] Коммит: `77216ec docs(phase-2): обновить документацию - переход к Фазе 2`

### Этап 2.1: Настройка Supabase проекта ✅ ЗАВЕРШЁН (2025-10-27)
- [x] Создать аккаунт на supabase.com
- [x] Создать проект "flomoon-prod" (регион: Europe)
- [x] Создать БД схему через SQL Editor (5 таблиц: users, cycles, partners, horoscope_memory, psychological_profiles)
- [x] Настроить Email Auth в Authentication (confirm email: OFF для MVP)
- [x] Записать credentials (Project URL, anon key, service_role key)
- [x] Добавить Redirect URLs: localhost:3000, segigu.github.io/flomoon

**Credentials (в password manager):**
- Project URL: https://mbocfgtfkrlclmqjezfv.supabase.co
- anon key: записан
- service_role key: записан

### Этап 2.2: Интеграция Supabase SDK ✅ ЗАВЕРШЁН (2025-10-27)
- [x] Установить @supabase/supabase-js
- [x] Проверить .gitignore (.env.local уже там)
- [x] Настроить MCP Supabase с Personal Access Token
- [x] Удалить старую конфигурацию с SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
- [x] Добавить новую конфигурацию с --access-token
- [x] Проверить подключение MCP Supabase (✓ Connected)
- [x] Создать .env.local с credentials (anon key)
- [x] Создать /src/lib/supabaseClient.ts
- [x] Проверить подключение (все 5 таблиц доступны)

**Важно:** Использован Personal Access Token вместо project credentials для MCP.

### Этап 2.3: Auth UI ✅ ЗАВЕРШЁН (2025-10-27)
- [x] Создать AuthModal.tsx (Login/Signup/Reset)
- [x] Создать AuthModal.module.css (glass morphism стиль)
- [x] Интегрировать в ModernNastiaApp.tsx
- [x] Добавить session management (useEffect, onAuthStateChange)
- [x] Добавить кнопку Logout в Settings
- [x] TypeScript компиляция прошла успешно

**Что сделано:**
- Создан AuthModal компонент с 3 режимами (Login/Signup/Reset Password)
- Glass morphism стиль (консистентно с GlassTabBar)
- Валидация полей (email формат, минимум 6 символов для пароля)
- Loading индикаторы, обработка ошибок
- Session management через Supabase Auth API
- Автоматическая проверка сессии при загрузке
- Подписка на изменения auth состояния
- Секция "Аккаунт" в Settings с email и кнопкой Logout

**Тестирование (требуется вручную):**
1. Запустить `npm start`
2. Открыть http://localhost:3000
3. Протестировать регистрацию нового пользователя
4. Протестировать вход существующего пользователя
5. Протестировать восстановление пароля
6. Проверить Settings → Аккаунт → Выйти

**Следующий шаг:** Этап 2.4 - Edge Functions (~8-10 часов)

### Этап 2.4: Edge Functions (~8-10 часов)
- [ ] Установить Supabase CLI
- [ ] Создать calculate-cycle Edge Function
- [ ] Создать generate-ai-content Edge Function
- [ ] Добавить rate limiting (10 запросов/час)
- [ ] Установить secrets (CLAUDE_API_KEY, OPENAI_API_KEY)
- [ ] Деплой functions

### Этап 2.5: API слой (~3-4 часа)
- [ ] Создать /src/utils/api.ts
- [ ] Реализовать fetchCycleStats()
- [ ] Реализовать generateAIContent()
- [ ] Обновить компоненты для использования API

### Этап 2.6: Удаление старого кода (~1-2 часа)
- [ ] Удалить cloudSync.ts (GitHub sync)
- [ ] Удалить вызовы cloudSync из ModernNastiaApp.tsx
- [ ] Закомментировать cycleUtils.ts и aiClient.ts (для reference)

### Этап 2.7: Тестирование (~2-3 часа)
- [ ] Создать 2+ тестовых аккаунта
- [ ] Проверить RLS (user A не видит данные user B)
- [ ] Проверить AI генерацию через Edge Functions
- [ ] Проверить rate limiting
- [ ] Запустить npm test

### Этап 2.8: Документация (~1-2 часа)
- [ ] Обновить CLAUDE.md (новая архитектура Supabase)
- [ ] Создать SUPABASE_SETUP.md
- [ ] Обновить CHANGELOG.md

### Этап 2.9: Финальный коммит (~30 мин)
- [ ] Запустить /code-review
- [ ] Создать коммит
- [ ] Деплой на GitHub Pages

**Детальный план:** См. выше в разделе "План реализации"

---

## 📊 Оценка времени

**Общее время:** 25-35 часов чистого времени → 4-6 рабочих дней

**Архитектура:** Тонкий клиент (UI) + толстый сервер (Edge Functions)

**Критические моменты:**
- API ключи Claude/OpenAI хранятся в Supabase Secrets (не в .env клиента)
- RLS policies для изоляции данных между пользователями
- Нет миграции данных (чистая база с нуля)

---

## ⚠️ Критические риски Фазы 2

### Высокий риск
1. **Service Role Key утечёт в GitHub**
   - Вероятность: 25%
   - Влияние: Критичное (полный доступ к БД)
   - Митигация: НИКОГДА не использовать на клиенте, добавить .env.local в .gitignore ДО создания
   - Plan B: Немедленно сгенерировать новый ключ

2. **RLS policies неправильные (утечка данных)**
   - Вероятность: 30%
   - Влияние: Критичное (user A видит данные user B)
   - Митигация: Тестировать с 2+ аккаунтами на этапе 2.7
   - Plan B: Немедленно исправить policies

### Средний риск
3. **Edge Functions холодный старт (~1-2 сек)**
   - Вероятность: 100% (Free tier)
   - Влияние: Среднее (UX страдает)
   - Митигация: Кэширование на клиенте, loading индикаторы

4. **Rate limiting слишком строгий (10 запросов/час)**
   - Вероятность: 40%
   - Влияние: Среднее (жалобы пользователей)
   - Митигация: Мониторинг логов, увеличить до 20/час если нужно

---

## 🔗 Связанные файлы

- [MASTER_PLAN.md](../MASTER_PLAN.md) - общий план проекта (обновлён: Фаза 1.5 после Фазы 2)
- [PHASE_2_DATABASE_DETAILED_PLAN.md](../roadmap/PHASE_2_DATABASE_DETAILED_PLAN.md) - детальный план Supabase
- [ADR-001: Universal User Profile](../architecture/ADR-001-universal-user-profile.md)
- [ADR-004: Database Choice](../architecture/ADR-004-database-choice.md) - почему Supabase

---

## 🚧 Блокеры

Нет активных блокеров.

**Готовность к старту:**
- ✅ Задачи 1.1-1.4 завершены
- ✅ storage.ts откатился
- ✅ Git чистый
- ✅ План согласован (Фаза 2 → Фаза 1.5)

---

## 💡 Рекомендации для Фазы 2

1. **Начинать с Supabase dashboard** - создать проект и БД до кода
2. **Тестировать RLS вручную** - создать 2+ тестовых аккаунта
3. **НЕ использовать Service Role Key на клиенте** - критическая ошибка безопасности
4. **Коммитить после каждого этапа** - атомарные коммиты
5. **Тестировать Edge Functions локально** - `supabase functions serve` ДО деплоя
6. **Backup .env.local** - сохранить credentials в password manager
7. **Мониторить стоимость** - Supabase Dashboard → Usage
8. **Документировать всё** - через месяц забудешь как это работает

---

**Обновлено:** 2025-10-27
