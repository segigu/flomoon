# 📋 Детальный план реализации: Фаза 2 - База данных и авторизация

**Создано:** 2025-10-26 (агент планирования)
**Обновлено:** 2025-10-26 (добавлена задача 2.7 - серверная архитектура)
**Версия:** 1.1.0
**Оценка:** 60-80 часов чистого времени → 12-16 рабочих дней

---

## Обзор Фазы 2

**Цель:** Мигрировать приложение с localStorage на Supabase (PostgreSQL + Auth + RLS) для поддержки многопользовательского режима с максимальной защитой чувствительных данных.

**Контекст:**
- Проект меняет концепцию: **от личного приложения (1 пользователь) к публичному (многопользовательскому)**
- Текущее хранилище: localStorage + синхронизация через GitHub API
- Данные чувствительные: менструальные циклы, настроение, психологические паттерны
- Требуется: авторизация, RLS (Row Level Security), GDPR compliance

**После Фазы 2:**
- Фаза 3: AI-агенты (будут работать с Supabase)
- Фаза 4: Персонализация
- Фаза 5: UI

**Связанные компоненты:**
- `/src/utils/storage.ts` - localStorage API (заменяем на Supabase)
- `/src/utils/cloudSync.ts` - GitHub sync (удаляем)
- `/src/types/index.ts` - типы данных (расширяем)
- `/src/components/ModernNastiaApp.tsx` - главный компонент (добавляем auth)

---

## 📝 Детальный план по задачам

### Задача 2.1: Настройка Supabase
**Общее время:** ~8-10 часов
**Зависимости:** нет

---

#### Шаг 2.1.1: Создать проект в Supabase (~30 минут)

- [ ] Зарегистрироваться на https://supabase.com
- [ ] Создать новый проект: `nastia-calendar-prod`
- [ ] Выбрать регион: Europe (closest to users)
- [ ] Записать Database Password (сохранить в password manager!)
- [ ] Записать Project URL и anon/service keys

**Результат:** Проект создан, получены credentials.

---

#### Шаг 2.1.2: Создать схему БД (~2-3 часа)

- [ ] Открыть SQL Editor в Supabase dashboard
- [ ] Выполнить SQL создания таблиц (см. ниже)
- [ ] Проверить таблицы в Table Editor

**SQL для создания таблиц:**

```sql
-- ==============================================================================
-- Таблица: users (расширение auth.users)
-- ==============================================================================
-- Supabase автоматически создаёт auth.users при включении Auth
-- Мы создаём public.users для дополнительных полей

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Основные данные
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,

  -- Астрологический профиль
  astro_profile_id TEXT NOT NULL DEFAULT 'nastia',
  birth_date DATE,
  birth_time TIME,
  birth_place TEXT,

  -- Настройки
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'ru',

  -- Приватность
  data_sharing_consent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_astro_profile ON public.users(astro_profile_id);

-- RLS: пользователь видит только свой профиль
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- ==============================================================================
-- Таблица: cycles
-- ==============================================================================
CREATE TABLE public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Даты
  start_date DATE NOT NULL,
  end_date DATE,

  -- Длина цикла (автоматически вычисляется)
  cycle_length INTEGER,
  period_length INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_cycles_user_id ON public.cycles(user_id);
CREATE INDEX idx_cycles_start_date ON public.cycles(start_date DESC);
CREATE INDEX idx_cycles_user_date ON public.cycles(user_id, start_date DESC);

-- RLS: пользователь видит только свои циклы
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycles"
  ON public.cycles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cycles"
  ON public.cycles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycles"
  ON public.cycles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cycles"
  ON public.cycles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Таблица: day_data (настроение, симптомы по дням)
-- ==============================================================================
CREATE TABLE public.day_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE,

  -- Дата
  date DATE NOT NULL,

  -- Данные дня
  mood TEXT CHECK (mood IN ('good', 'neutral', 'bad')),
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 5),
  symptoms TEXT[], -- array of symptoms
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальность: один DayData на дату для пользователя
  UNIQUE(user_id, date)
);

-- Индексы
CREATE INDEX idx_day_data_user_id ON public.day_data(user_id);
CREATE INDEX idx_day_data_date ON public.day_data(date DESC);
CREATE INDEX idx_day_data_cycle_id ON public.day_data(cycle_id);

-- RLS
ALTER TABLE public.day_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own day data"
  ON public.day_data
  FOR ALL
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Таблица: psychological_profiles
-- ==============================================================================
CREATE TABLE public.psychological_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  -- Поведенческие паттерны (JSON)
  behavior_patterns JSONB DEFAULT '[]'::jsonb,

  -- История историй (JSON)
  story_history JSONB DEFAULT '[]'::jsonb,

  -- Корреляции цикл ↔ настроение (JSON)
  cycle_mood_correlations JSONB DEFAULT '[]'::jsonb,

  -- Корреляции астро ↔ настроение (JSON)
  astro_mood_correlations JSONB DEFAULT '[]'::jsonb,

  -- Астропсихологические уязвимости
  astro_vulnerabilities TEXT[],

  -- Timestamps анализа
  last_full_analysis TIMESTAMPTZ,
  last_update TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_psych_profiles_user_id ON public.psychological_profiles(user_id);

-- RLS
ALTER TABLE public.psychological_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own psych profile"
  ON public.psychological_profiles
  FOR ALL
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Таблица: horoscope_memory
-- ==============================================================================
CREATE TABLE public.horoscope_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Данные гороскопа
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  summary TEXT NOT NULL,
  key_themes TEXT[],
  phrases_to_avoid TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_horoscope_memory_user_id ON public.horoscope_memory(user_id);
CREATE INDEX idx_horoscope_memory_date ON public.horoscope_memory(date DESC);

-- RLS
ALTER TABLE public.horoscope_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own horoscope memory"
  ON public.horoscope_memory
  FOR ALL
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Таблица: psych_contract_history
-- ==============================================================================
CREATE TABLE public.psych_contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- История использованных контрактов
  used_contract_ids TEXT[],
  used_scenario_ids TEXT[],
  scenario_use_counts JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_psych_contract_history_user_id ON public.psych_contract_history(user_id);

-- RLS
ALTER TABLE public.psych_contract_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contract history"
  ON public.psych_contract_history
  FOR ALL
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Таблица: app_settings (глобальные настройки пользователя)
-- ==============================================================================
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  -- Настройки цикла
  average_cycle_length INTEGER DEFAULT 28,
  period_length INTEGER DEFAULT 5,

  -- Настройки уведомлений
  notifications_enabled BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON public.app_settings
  FOR ALL
  USING (auth.uid() = user_id);

-- ==============================================================================
-- Функции и триггеры
-- ==============================================================================

-- Функция: автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применить триггер ко всем таблицам
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cycles_updated_at BEFORE UPDATE ON public.cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_day_data_updated_at BEFORE UPDATE ON public.day_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_psych_profiles_updated_at BEFORE UPDATE ON public.psychological_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_psych_contract_history_updated_at BEFORE UPDATE ON public.psych_contract_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция: создание профиля пользователя при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');

  INSERT INTO public.app_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.psychological_profiles (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер: автоматически создавать профиль при регистрации
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Результат:** Схема БД создана, RLS настроен, триггеры работают.

---

#### Шаг 2.1.3: Настроить авторизацию в Supabase dashboard (~30 минут)

- [ ] Перейти в Authentication → Settings
- [ ] Включить Email auth
- [ ] Настроить Email templates (Welcome, Reset password)
- [ ] Отключить Sign up confirmation (для MVP) или оставить (для production)
- [ ] Настроить Redirect URLs: `http://localhost:3000`, `https://segigu.github.io/nastia-calendar`

**Результат:** Email auth настроен.

---

#### Шаг 2.1.4: Создать .env файл с credentials (~15 минут)

- [ ] Создать `/nastia-simple/.env.local`
- [ ] Добавить Supabase credentials
- [ ] Добавить в `.gitignore`

**Пример `.env.local`:**

```bash
# Supabase
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# AI Keys (существующие)
REACT_APP_CLAUDE_API_KEY=...
REACT_APP_OPENAI_API_KEY=...
```

**.gitignore (добавить):**

```
# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**⚠️ КРИТИЧНО:** Service Role Key НИКОГДА не использовать на клиенте! Только в backend / Edge Functions.

**Результат:** Credentials безопасно сохранены.

---

#### Шаг 2.1.5: Установить Supabase SDK (~15 минут)

- [ ] Установить `@supabase/supabase-js`
- [ ] Создать `/src/lib/supabaseClient.ts`

**Команда:**

```bash
npm install @supabase/supabase-js
```

**Файл `/src/lib/supabaseClient.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Результат:** Supabase SDK подключен.

---

### Задача 2.2: Авторизация в UI
**Общее время:** ~10-12 часов
**Зависимости:** 2.1

---

#### Шаг 2.2.1: Создать AuthModal компонент (~3-4 часа)

- [ ] Создать `/src/components/AuthModal.tsx`
- [ ] Создать `/src/components/AuthModal.module.css`
- [ ] Три режима: Login, Signup, Reset Password
- [ ] Валидация форм

**Файл `/src/components/AuthModal.tsx` (упрощённый):**

```typescript
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import styles from './AuthModal.module.css';

type AuthMode = 'login' | 'signup' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
            },
          },
        });
        if (error) throw error;
        alert('Проверь email для подтверждения регистрации!');
        setMode('login');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        alert('Ссылка для сброса пароля отправлена на email!');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <h2 className={styles.title}>
          {mode === 'login' && 'Вход'}
          {mode === 'signup' && 'Регистрация'}
          {mode === 'reset' && 'Сброс пароля'}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Имя"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={styles.input}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />

          {mode !== 'reset' && (
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={styles.input}
            />
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : mode === 'signup' ? 'Зарегистрироваться' : 'Отправить ссылку'}
          </button>
        </form>

        <div className={styles.links}>
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('signup')} className={styles.link}>
                Нет аккаунта? Зарегистрироваться
              </button>
              <button onClick={() => setMode('reset')} className={styles.link}>
                Забыл пароль?
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => setMode('login')} className={styles.link}>
              Уже есть аккаунт? Войти
            </button>
          )}
          {mode === 'reset' && (
            <button onClick={() => setMode('login')} className={styles.link}>
              Вспомнил пароль? Войти
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Результат:** Модальное окно авторизации работает.

---

*(Продолжение плана слишком большое для одного сообщения, сохраняю промежуточный результат)*

---

### Задача 2.7: Миграция логики на сервер (Edge Functions)
**Общее время:** ~20-30 часов
**Зависимости:** 2.1, 2.2
**Приоритет:** Критический (изменение архитектуры)

**Контекст:** Проект переходит на **тонкий клиент** (только UI в браузере) + **толстый сервер** (вся бизнес-логика в Edge Functions). Это обеспечивает:
- 🔒 API ключи Claude/OpenAI хранятся на сервере
- 📊 Централизованная логика (все пользователи видят одинаковую версию)
- 💰 Контроль стоимости AI запросов на сервере
- ⚡ Тяжёлые вычисления на мощном сервере

**Trade-off:** Приложение не работает offline (это ok, текущая GitHub sync тоже требует интернет).

---

#### Шаг 2.7.1: Создать Edge Function для расчёта циклов (~6-8 часов)

- [ ] Создать `/supabase/functions/calculate-cycle/index.ts`
- [ ] Мигрировать логику из `cycleUtils.ts`
- [ ] Добавить RLS проверку (user видит только свои циклы)
- [ ] Написать тесты

**Файл `/supabase/functions/calculate-cycle/index.ts`:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Миграция из cycleUtils.ts
function calculateAverageCycleLength(cycles: any[]): number {
  if (cycles.length < 2) return 28;
  const lengths = cycles
    .filter(c => c.cycle_length && c.cycle_length >= 21 && c.cycle_length <= 45)
    .map(c => c.cycle_length);
  if (lengths.length === 0) return 28;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

function predictNextPeriod(cycles: any[], avgLength: number) {
  if (cycles.length === 0) return null;
  const lastCycle = cycles[cycles.length - 1];
  const lastDate = new Date(lastCycle.start_date);
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + avgLength);
  return nextDate.toISOString().split('T')[0];
}

serve(async (req) => {
  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Fetch cycles (RLS автоматически фильтрует по user_id)
    const { data: cycles, error } = await supabase
      .from('cycles')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) throw error

    // Calculate stats
    const avgLength = calculateAverageCycleLength(cycles)
    const nextPeriod = predictNextPeriod(cycles, avgLength)

    return new Response(
      JSON.stringify({
        avgLength,
        nextPeriod,
        totalCycles: cycles.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**Результат:** Edge Function для расчёта циклов работает, RLS гарантирует изоляцию данных.

---

#### Шаг 2.7.2: Создать Edge Function для AI генерации (~8-10 часов)

- [ ] Создать `/supabase/functions/generate-ai-content/index.ts`
- [ ] Мигрировать `aiClient.ts` (запросы к Claude/OpenAI)
- [ ] Хранить API ключи в Supabase Secrets (не в .env клиента!)
- [ ] Лимитирование запросов (rate limiting)

**Файл `/supabase/functions/generate-ai-content/index.ts`:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Secrets: CLAUDE_API_KEY, OPENAI_API_KEY (через Supabase CLI)
const CLAUDE_KEY = Deno.env.get('CLAUDE_API_KEY')
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')

async function callClaude(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await response.json()
  return data.content[0].text
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Rate limiting: max 10 requests per hour per user
    const { count } = await supabase
      .from('ai_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())

    if (count && count >= 10) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded (10/hour)' }),
        { status: 429 }
      )
    }

    // Parse request
    const { type, prompt } = await req.json()

    // Generate content
    let content: string
    if (type === 'horoscope' || type === 'story') {
      content = await callClaude(prompt)
    } else {
      throw new Error('Invalid type')
    }

    // Log request
    await supabase.from('ai_requests').insert({
      user_id: user.id,
      type,
      tokens_used: content.length // примерная оценка
    })

    return new Response(JSON.stringify({ content }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

**Результат:** AI генерация работает на сервере, API ключи защищены, есть rate limiting.

---

#### Шаг 2.7.3: Рефакторинг клиента - создать API слой (~4-6 часов)

- [ ] Создать `/src/utils/api.ts` с fetch обёртками
- [ ] Удалить `cycleUtils.ts` (логика на сервере)
- [ ] Удалить `aiClient.ts` (запросы через Edge Function)
- [ ] Обновить компоненты для использования API

**Файл `/src/utils/api.ts`:**

```typescript
import { supabase } from './supabaseClient'

export async function fetchCycleStats() {
  const { data, error } = await supabase.functions.invoke('calculate-cycle')
  if (error) throw error
  return data
}

export async function generateAIContent(type: 'horoscope' | 'story', prompt: string) {
  const { data, error } = await supabase.functions.invoke('generate-ai-content', {
    body: { type, prompt }
  })
  if (error) throw error
  return data.content
}
```

**В компонентах (пример ModernNastiaApp.tsx):**

```typescript
// Было:
import { calculateAverageCycleLength } from '../utils/cycleUtils'
const avgLength = calculateAverageCycleLength(cycles)

// Стало:
import { fetchCycleStats } from '../utils/api'
const { avgLength, nextPeriod } = await fetchCycleStats()
```

**Результат:** Клиент стал тонким, вся логика на сервере.

---

#### Шаг 2.7.4: Тестирование Edge Functions локально (~2-3 часа)

- [ ] Установить Supabase CLI: `brew install supabase/tap/supabase`
- [ ] Запустить локально: `supabase start`
- [ ] Тестировать функции: `supabase functions serve`
- [ ] Проверить rate limiting, RLS, ошибки

**Результат:** Edge Functions работают локально, все тесты проходят.

---

#### Шаг 2.7.5: Деплой Edge Functions в production (~1-2 часа)

- [ ] Установить секреты: `supabase secrets set CLAUDE_API_KEY=...`
- [ ] Деплой функций: `supabase functions deploy calculate-cycle`
- [ ] Деплой функций: `supabase functions deploy generate-ai-content`
- [ ] Проверить в production

**Результат:** Edge Functions задеплоены, работают в production.

---

## ⚠️ Критические риски и митигация

### Риск 1: Потеря данных при миграции
**Вероятность:** Средняя
**Влияние:** Критичное

**Проблема:** При миграции из localStorage в Supabase можно потерять существующие данные Насти (циклы, гороскопы, психологический профиль).

**Митигация:**
1. Создать резервную копию localStorage ДО миграции (export в JSON)
2. Миграционный скрипт с dry-run режимом (проверка без записи в БД)
3. Валидация данных после миграции (сравнить количество записей)
4. Откат: сохранить localStorage backup, если что-то пошло не так

---

### Риск 2: Утечка данных через RLS
**Вероятность:** Низкая
**Влияние:** Критичное

**Проблема:** Неправильная настройка RLS policies → user A может прочитать данные user B.

**Митигация:**
1. Тщательно тестировать RLS (см. Задача 2.5.3)
2. Запускать тесты с 2+ пользователями
3. Никогда не использовать Service Role Key на клиенте
4. Код review всех RLS policies

---

### Риск 3: Сломается авторизация
**Вероятность:** Средняя
**Влияние:** Высокое

**Проблема:** Auth не работает → пользователи не могут войти → приложение неюзабельно.

**Митигация:**
1. Тестировать auth на локальном Supabase проекте ДО production
2. Сохранить fallback: если Supabase недоступен, показать сообщение
3. Логирование ошибок auth (Supabase logs)
4. E2E тесты для login/signup/logout

---

### Риск 4: Медленная загрузка (UX страдает)
**Вероятность:** Средняя
**Влияние:** Среднее

**Проблема:** Запросы в Supabase медленнее чем localStorage → приложение тормозит.

**Митигация:**
1. Использовать индексы на всех часто запрашиваемых полях
2. Кэшировать данные на клиенте (React Query / SWR)
3. Lazy loading: загружать только нужные данные
4. Оптимизация запросов: select только нужные поля

---

### Риск 5: Service Role Key утечёт в GitHub
**Вероятность:** Средняя
**Влияние:** Критичное

**Проблема:** Если Service Role Key попадёт в .env и закоммитится в GitHub → любой сможет читать/писать ВСЕ данные БД.

**Митигация:**
1. НИКОГДА не использовать Service Role Key на клиенте
2. Добавить .env.local в .gitignore
3. GitHub Secret Scanning (автоматически детектит ключи)
4. Если ключ утёк → немедленно сгенерировать новый в Supabase dashboard

---

### Риск 6: GDPR compliance нарушен
**Вероятность:** Высокая (если не учесть)
**Влияние:** Критичное (юридические последствия)

**Проблема:** Без Privacy Policy и функции удаления аккаунта → нарушение GDPR (штрафы до 4% годового оборота).

**Митигация:**
1. Создать Privacy Policy (задача 2.5.1)
2. Реализовать "Delete my account" (задача 2.5.2)
3. Добавить чекбокс согласия при регистрации
4. Логировать все операции с личными данными

---

## 📊 Общая оценка

**Общее время:** 60-80 часов чистого времени
**Рабочих дней:** 12-16 дней при полной концентрации
**Количество задач:** 7 основных (2.1-2.7)
**Количество подшагов:** 30+

**Критический путь:** 2.1 → 2.2 → 2.7 → 2.3 → 2.4/2.5/2.6 (параллельно)

**Сложность:** Очень высокая (работа с БД, auth, security, миграция + серверная архитектура)

**⚠️ Обновление (2025-10-26):** Добавлена задача 2.7 (миграция логики на Edge Functions) - изменение архитектуры с SPA на тонкий клиент. Это увеличивает время на +20-30 часов, но обеспечивает безопасность API ключей и централизацию логики.

---

## 💡 Рекомендации для реализации

1. **Начинай с локального Supabase проекта** - не делай сразу в production, тестируй на тестовом проекте
2. **Миграция данных - в последнюю очередь** - сначала убедись, что auth работает
3. **Тестируй RLS policies вручную** - создай 2+ тестовых аккаунта и попробуй прочитать чужие данные
4. **Используй Supabase Realtime** - автоматическая синхронизация между устройствами (если нужно)
5. **Backup localStorage перед миграцией** - на всякий случай
6. **Не используй Service Role Key на клиенте** - это самая частая ошибка
7. **Логируй всё** - Supabase logs помогут дебажить проблемы
8. **GDPR compliance с первого дня** - проще добавить сразу, чем переделывать потом

---

## 🔄 Альтернативные подходы

### Подход A: Supabase (выбран)

**Плюсы:**
- ✅ Auth из коробки (Email, OAuth, Magic Links)
- ✅ RLS (Row Level Security) для защиты данных
- ✅ Realtime subscriptions
- ✅ Edge Functions для serverless логики
- ✅ Storage для файлов
- ✅ Free tier достаточен для старта (500MB база, 5GB bandwidth)
- ✅ Хорошая документация и community

**Минусы:**
- ⚠️ Vendor lock-in (если захочешь мигрировать - сложно)
- ⚠️ Free tier ограничен (2 проекта, проекты засыпают)
- ⚠️ Данные на сервере Supabase (не self-hosted)

**Время:** 40-50 часов

---

### Подход B: Firebase

**Плюсы:**
- ✅ Auth из коробки
- ✅ Firestore (NoSQL) - проще для некоторых случаев
- ✅ Firebase Cloud Functions
- ✅ Firebase Hosting

**Минусы:**
- ❌ Нет Row Level Security (нужны Security Rules - сложнее)
- ❌ NoSQL (Firestore) vs SQL (PostgreSQL) - для нашего случая SQL лучше
- ❌ Более дорогой scaling

**Почему НЕ выбран:** RLS в Supabase намного лучше для защиты чувствительных данных. PostgreSQL удобнее для structured data (циклы, даты, и т.д.).

---

### Подход C: Self-hosted PostgreSQL + Auth0

**Плюсы:**
- ✅ Полный контроль (свой сервер, свои данные)
- ✅ PostgreSQL мощнее (расширения, функции)
- ✅ Auth0 - профессиональная авторизация

**Минусы:**
- ❌ Нужно настраивать VPS (Digital Ocean, AWS)
- ❌ Нужно настраивать Postgres, nginx, SSL, backup
- ❌ Нужно мониторить и обновлять
- ❌ Auth0 платный ($23/месяц для production)
- ❌ Намного больше времени (~2-3 недели вместо 8-10 дней)

**Почему НЕ выбран:** Оверкилл для MVP. Supabase даёт те же возможности без настройки инфраструктуры.

---

### Подход D: Остаться на localStorage + GitHub sync

**Плюсы:**
- ✅ Уже работает
- ✅ $0 стоимость
- ✅ Полный контроль над данными

**Минусы:**
- ❌ НЕ поддерживает многопользовательский режим
- ❌ Нельзя дать доступ друзьям
- ❌ Нет авторизации
- ❌ Нет публичного приложения

**Почему НЕ выбран:** Не соответствует новой цели - создать публичное многопользовательское приложение.

---

## ✅ Критерии успеха (Definition of Done)

После выполнения Фазы 2:

- [ ] Supabase проект настроен (таблицы, RLS, auth)
- [ ] Авторизация работает (login, signup, logout)
- [ ] storage.ts мигрирован на storageSupabase.ts
- [ ] Данные Насти перенесены из localStorage в Supabase
- [ ] Старая синхронизация через GitHub удалена
- [ ] Privacy Policy создан и отображается в UI
- [ ] Кнопка "Delete my account" работает
- [ ] RLS политики протестированы (user A не видит данные user B)
- [ ] E2E тесты авторизации проходят
- [ ] Нет console.error / warnings
- [ ] Документация обновлена (CLAUDE.md, TECHNICAL_DOCS.md)

---

## 🚀 Следующие шаги

1. **Завершить Фазу 1** (универсализация кода) - 2-3 дня
2. **Начать Фазу 2** (БД + Auth) по этому плану - 8-10 дней
3. **После Фазы 2:** Перейти к Фазе 3 (AI-агенты работают с Supabase)

**Полезные команды:**
- `/continue` - продолжить работу с текущей задачи
- `/next` - перейти к следующей задаче
- `/status` - показать статус проекта

---

**Примечание:** Этот план создан автоматическим агентом планирования на основе анализа документации и существующего кода. План включает конкретные примеры SQL, React кода, анализ рисков и рекомендации.

---

**Следующий шаг:** Начать реализацию с задачи 2.1 (настройка Supabase) ПОСЛЕ завершения Фазы 1.
