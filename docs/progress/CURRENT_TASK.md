# Текущая задача

**Дата обновления:** 2025-10-27
**Фаза:** 3 - AI Edge Functions (Production Security) 🔄 **В РАБОТЕ**
**Прогресс Фазы 3:** 50% (Part 1/2 завершена)

---

## 🎯 Текущая работа

**Статус:** 🔄 **Part 1 ЗАВЕРШЕНА** - Direct API keys настроены для local dev

**Последние коммиты:**
- `ab70d3d fix(env): настроить прямые API ключи для локальной разработки`

**Текущая задача:** Документирование Part 1, подготовка к Part 2

**Прогресс Phase 3:**
- ✅ Part 1: Direct API keys для local dev (completed)
- ⏳ Part 2: Supabase Edge Functions для production (pending)

---

## 📋 Контекст: Проблема и решение

### Проблема (обнаружена после Stage 2.7)
После удаления `remoteConfig.ts` в Stage 2.7 (который загружал AI ключи из GitHub), Claude API перестал работать:
```
❌ Claude API failed, falling back to OpenAI: Error: Claude API key not available
```

**Почему это произошло:**
- В Stage 2.7 удалили GitHub sync (включая `remoteConfig.ts`)
- `remoteConfig.ts` загружал ключи Claude и OpenAI из GitHub repo `nastia-data`
- После удаления ключи перестали загружаться
- OpenAI продолжал работать через Cloudflare Workers proxy (у которого ключ embedded)

### Решение: Гибридный подход (2 части)

#### ✅ Part 1: Direct API keys (LOCAL DEV) - ЗАВЕРШЕНА
**Цель:** Быстрый fix для локальной разработки

**Что сделано:**
1. Добавлены реальные API ключи в `.env.local`:
   ```bash
   REACT_APP_CLAUDE_API_KEY=sk-ant-api03-XwZo...
   REACT_APP_OPENAI_API_KEY=sk-proj-ZyhJ...
   ```
2. Обновлён `.env` (удалены Cloudflare Workers proxy URLs)
3. Обновлён `.env.example` (документация + Phase 3 reference)
4. Перезапущен dev server - компиляция успешна
5. Коммит: `ab70d3d`

**Проблемы этого подхода:**
- ❌ Ключи видны в client bundle (небезопасно для production)
- ❌ Нет rate limiting
- ❌ Нет логирования
- ❌ Нет централизованного управления

#### ⏳ Part 2: Supabase Edge Functions (PRODUCTION) - ОЖИДАЕТ
**Цель:** Production-ready решение с безопасностью

**Что будет сделано:**
1. Создать Edge Function `ai-chat` (Deno TypeScript)
2. Настроить Supabase Secrets (CLAUDE_API_KEY, OPENAI_API_KEY)
3. Deploy Edge Function на Supabase
4. Обновить `aiClient.ts` для поддержки гибридного режима:
   ```typescript
   if (USE_EDGE_FUNCTIONS) {
     // Production: call Supabase Edge Function
     await supabase.functions.invoke('ai-chat', { body: { messages } });
   } else {
     // Local dev: direct API
     await fetch('https://api.anthropic.com/v1/messages', ...);
   }
   ```
5. Добавить ENV переменную `REACT_APP_USE_EDGE_FUNCTIONS`
6. Тестирование и документация

**Преимущества Edge Functions:**
- ✅ Ключи на сервере (не видны клиенту)
- ✅ RLS integration (JWT токен автоматически)
- ✅ Rate limiting возможен
- ✅ Логирование всех вызовов
- ✅ Централизованное управление ключами

---

## 📝 План Phase 3: AI Edge Functions (2 части, 3-4 часа)

### ✅ Part 1: Direct API keys (LOCAL DEV) - ЗАВЕРШЕНА (1 час)
**ETA:** 30 минут → **Фактически:** 1 час

**Задачи:**
- [x] Обновить `.env.local` с Claude и OpenAI ключами
- [x] Очистить `.env` от Cloudflare Workers mentions
- [x] Обновить `.env.example` (remove Cloudflare Workers)
- [x] Перезапустить dev server и проверить компиляцию
- [x] Коммит изменений (`ab70d3d`)
- [x] Создать `PHASE_3_AI_EDGE_FUNCTIONS.md` (полная документация)
- [x] Обновить `MASTER_PLAN.md` (добавить Phase 3, renumber old phases)
- [x] Обновить `CURRENT_TASK.md` (этот файл)
- [ ] Финальный коммит документации

**Критерии завершения Part 1:**
- ✅ `.env.local` содержит оба ключа (Claude, OpenAI)
- ✅ `.env` безопасен для коммита (no secrets)
- ✅ `.env.example` документирует Phase 3 approach
- ✅ Dev server компилируется без ошибок
- ✅ Документация создана (PHASE_3_AI_EDGE_FUNCTIONS.md)
- ⏳ Финальный коммит

### ⏳ Part 2: Supabase Edge Functions (PRODUCTION) - ОЖИДАЕТ (2-3 часа)
**ETA:** 2-3 часа

**Задачи:**
- [ ] **Этап 3.1:** Создание Edge Function (~30 мин)
  - [ ] `supabase functions new ai-chat`
  - [ ] Написать код функции (Claude + OpenAI fallback)
  - [ ] Обработка JWT токена для RLS
- [ ] **Этап 3.2:** Настройка Secrets (~10 мин)
  - [ ] `supabase secrets set CLAUDE_API_KEY="..."`
  - [ ] `supabase secrets set OPENAI_API_KEY="..."`
- [ ] **Этап 3.3:** Deploy (~10 мин)
  - [ ] `supabase link --project-ref mbocfgtfkrlclmqjezfv`
  - [ ] `supabase functions deploy ai-chat`
- [ ] **Этап 3.4:** Обновление клиента (~1 час)
  - [ ] Обновить `aiClient.ts` (гибридный режим)
  - [ ] Добавить `REACT_APP_USE_EDGE_FUNCTIONS` в .env
  - [ ] Обновить package.json scripts (build:prod)
- [ ] **Этап 3.5:** Rate Limiting (optional, ~30 мин)
  - [ ] Создать таблицу `ai_requests`
  - [ ] Добавить логирование в Edge Function
  - [ ] Добавить проверку лимита (100 req/day)
- [ ] **Этап 3.6:** Тестирование (~30 мин)
  - [ ] Local dev (USE_EDGE_FUNCTIONS=false)
  - [ ] Production simulation (USE_EDGE_FUNCTIONS=true)
  - [ ] curl test Edge Function напрямую
  - [ ] Fallback на OpenAI
- [ ] **Этап 3.7:** Документация (~20 мин)
  - [ ] Обновить CLAUDE.md (AI Integration section)
  - [ ] Обновить .env.example
  - [ ] Создать deployment инструкцию

**Критерии завершения Part 2:**
- Edge Function `ai-chat` задеплоена и работает
- Secrets настроены в Supabase
- `aiClient.ts` поддерживает оба режима (local/production)
- Тестирование успешно (оба режима работают)
- API ключи НЕ видны в client bundle (production build)

---

## 🎉 Завершённые фазы

### ✅ Фаза 2: База данных и авторизация (100% - 8/8 этапов)
**Завершено:** 2025-10-27
**Последний коммит:** `98c5822 fix(phase-2): заменить exportData/importData на JSON.stringify/parse`

**Что сделано:**
- ✅ Supabase проект создан (flomoon-prod, Europe)
- ✅ БД схема: 5 таблиц (users, cycles, partners, horoscope_memory, psychological_profiles)
- ✅ RLS policies (user A не видит данные user B)
- ✅ Auth UI (AuthModal.tsx - login/signup/logout)
- ✅ Profile Setup UI (ProfileSetupModal.tsx)
- ✅ Settings для редактирования профиля
- ✅ Cycles API + миграция на Supabase
- ✅ Удаление localStorage cloudSync (-6505 строк!)
- ✅ Тестирование на 2 тестовых аккаунтах
- ✅ Документация обновлена (CLAUDE.md, CHANGELOG.md)
- ✅ Deploy: https://segigu.github.io/flomoon/

### ✅ Фаза 1: Универсализация (44% - 4/9 задач)
**Статус:** ЧАСТИЧНО ЗАВЕРШЕНА (задачи 1.5-1.8 ПРОПУЩЕНЫ)

**Что сделано:**
- ✅ userProfile.ts создан (универсальная структура)
- ✅ types/index.ts обновлён (психологический профиль интерфейсы)
- ✅ horoscope.ts рефакторинг (hardcoded "Настя" → `getCurrentUser()`)
- ✅ historyStory.ts рефакторинг (hardcoded "Настя" → `getCurrentUser()`)

**Пропущено (стратегическое решение):**
- ❌ storage.ts обновление (Supabase заменяет localStorage)
- ❌ Компоненты обновление
- ❌ Тесты
- ❌ Версионирование (перенесено в Phase 6)

### ✅ Фаза 0: Подготовка (100% - 3/3 задач)
**Завершено:** 2025-10-26

---

## 📊 Оценка времени Phase 3

**Part 1:** 30 мин → **Фактически:** 1 час ✅
**Part 2:** 2-3 часа → **ETA:** ~2-3 часа ⏳

**Общее время Phase 3:** 3-4 часа
**Прогресс:** 50% (Part 1/2 завершена)

---

## 🔗 Связанные файлы

- [MASTER_PLAN.md](../MASTER_PLAN.md) - общий план проекта (обновлён: Phase 3 добавлена)
- [PHASE_3_AI_EDGE_FUNCTIONS.md](../roadmap/PHASE_3_AI_EDGE_FUNCTIONS.md) - детальный план Phase 3
- [CHANGELOG.md](./CHANGELOG.md) - история изменений
- `.env.local` - содержит реальные API ключи (NOT committed)
- `.env` - safe config (committed)
- `.env.example` - template для новых разработчиков

---

## 🚧 Блокеры

Нет активных блокеров.

**Готовность к Part 2:**
- ✅ Part 1 завершена
- ✅ Документация создана
- ✅ Supabase проект уже настроен (Phase 2)
- ✅ Supabase CLI установлен и настроен (Phase 2)
- ✅ Personal Access Token для MCP есть

---

## 💡 Следующие шаги

1. **Закоммитить документацию:**
   ```bash
   git add docs/roadmap/PHASE_3_AI_EDGE_FUNCTIONS.md docs/MASTER_PLAN.md docs/progress/CURRENT_TASK.md
   git commit -m "docs(phase-3): Part 1 завершена - direct API keys для local dev"
   ```

2. **Тестирование Part 1 (пользователь):**
   - Открыть http://localhost:3000
   - Создать гороскоп
   - Проверить console: НЕ должно быть "Claude API failed, falling back to OpenAI"

3. **Начать Part 2 (когда готов):**
   - Следовать этапам 3.1-3.7 из PHASE_3_AI_EDGE_FUNCTIONS.md
   - Создать Edge Function
   - Deploy и тестирование

---

## ⚠️ Важные заметки

1. **`.env.local` НЕ коммитится** - содержит реальные ключи, в .gitignore
2. **Cloudflare Workers proxy удалён** - больше не нужен, используем direct API
3. **Part 2 критична для production** - direct API keys небезопасны для deployment
4. **Гибридный режим** - переключатель `REACT_APP_USE_EDGE_FUNCTIONS` (false = local, true = production)

---

**Обновлено:** 2025-10-27
