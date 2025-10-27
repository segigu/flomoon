# Phase 3: AI Edge Functions (Supabase)

## 🎯 Цель

Перенести AI API вызовы (Claude и OpenAI) из клиентского кода в Supabase Edge Functions для production использования.

## 📋 Зачем это нужно?

### Проблемы текущего подхода (direct API):
1. **Безопасность**: API ключи видны в client bundle (любой может украсть через DevTools)
2. **Отсутствие rate limiting**: нет контроля над количеством запросов
3. **Отсутствие логирования**: не отслеживается использование токенов и ошибки
4. **Невозможность централизованного управления**: ключи хранятся в ENV каждого разработчика

### Преимущества Edge Functions:
1. **Безопасность**: API ключи хранятся в Supabase Secrets (server-side, не доступны клиенту)
2. **Rate limiting**: можно ограничить количество запросов на пользователя (через RLS)
3. **Логирование**: все вызовы логируются в Supabase Dashboard
4. **Централизованное управление**: ключи обновляются в одном месте (Supabase Dashboard)
5. **Интеграция с RLS**: автоматическая аутентификация через JWT токен пользователя

## 🏗️ Архитектура

### Текущая (Part 1 - local dev):
```
[Client] → process.env.REACT_APP_CLAUDE_API_KEY → [Claude API]
              ↓ fallback
            process.env.REACT_APP_OPENAI_API_KEY → [OpenAI API]
```

**Проблема**: API ключи видны в client bundle (insecure)

### Целевая (Part 2 - production):
```
[Client] → supabase.functions.invoke('ai-chat', { messages, ... })
              ↓
           [Supabase Edge Function]
              ├─ Supabase Secrets: CLAUDE_API_KEY
              ├─ Supabase Secrets: OPENAI_API_KEY
              ├─ RLS: проверка JWT токена пользователя
              ├─ Rate limiting: max 100 запросов/день/пользователь
              ├─ Logging: все запросы в Supabase Dashboard
              ↓
           [Claude API] (primary)
              ↓ fallback
           [OpenAI API] (secondary)
```

**Преимущества**: API ключи на сервере, контроль доступа, rate limiting

### Гибридный режим (local dev + production):
```typescript
// .env.local
REACT_APP_USE_EDGE_FUNCTIONS=false   // local dev - direct API
// or
REACT_APP_USE_EDGE_FUNCTIONS=true    // production - Edge Functions

// aiClient.ts
if (USE_EDGE_FUNCTIONS) {
  // Call Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages, model, temperature }
  });
} else {
  // Direct API call (local dev only)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    headers: { 'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY }
  });
}
```

## 📝 План реализации

### Этап 3.1: Создание Edge Function
**Время**: 30 минут

1. Инициализация Supabase CLI:
   ```bash
   # Проверить установку
   supabase --version

   # Если не установлен:
   brew install supabase/tap/supabase

   # Логин (использовать personal access token из Supabase Dashboard)
   supabase login

   # Инициализация проекта (если не было)
   supabase init
   ```

2. Создать Edge Function:
   ```bash
   supabase functions new ai-chat
   ```

3. Написать код функции (`supabase/functions/ai-chat/index.ts`):
   ```typescript
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

   serve(async (req) => {
     try {
       // 1. Проверка JWT токена (автоматически через Supabase)
       const authHeader = req.headers.get('Authorization');
       if (!authHeader) {
         return new Response(JSON.stringify({ error: 'Unauthorized' }), {
           status: 401,
           headers: { 'Content-Type': 'application/json' }
         });
       }

       // 2. Получение параметров запроса
       const { messages, model = 'claude-haiku-4-5', temperature = 0.7, maxTokens = 1024 } = await req.json();

       // 3. Получение API ключей из Secrets
       const claudeKey = Deno.env.get('CLAUDE_API_KEY');
       const openaiKey = Deno.env.get('OPENAI_API_KEY');

       // 4. Попытка вызова Claude API (primary)
       try {
         const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'x-api-key': claudeKey!,
             'anthropic-version': '2023-06-01'
           },
           body: JSON.stringify({
             model,
             messages,
             temperature,
             max_tokens: maxTokens
           })
         });

         if (!claudeResponse.ok) {
           throw new Error(`Claude API failed: ${claudeResponse.status}`);
         }

         const data = await claudeResponse.json();
         return new Response(JSON.stringify(data), {
           headers: { 'Content-Type': 'application/json' }
         });
       } catch (claudeError) {
         // 5. Fallback на OpenAI API
         console.error('Claude API failed, falling back to OpenAI:', claudeError);

         const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${openaiKey}`
           },
           body: JSON.stringify({
             model: 'gpt-4o-mini',
             messages,
             temperature,
             max_tokens: maxTokens
           })
         });

         if (!openaiResponse.ok) {
           throw new Error(`OpenAI API also failed: ${openaiResponse.status}`);
         }

         const data = await openaiResponse.json();
         return new Response(JSON.stringify(data), {
           headers: { 'Content-Type': 'application/json' }
         });
       }
     } catch (error) {
       return new Response(JSON.stringify({ error: error.message }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' }
       });
     }
   });
   ```

### Этап 3.2: Настройка Secrets
**Время**: 10 минут

1. Добавить API ключи в Supabase Secrets:
   ```bash
   # Установить ключи (используем существующие из .env.local)
   supabase secrets set CLAUDE_API_KEY="sk-ant-api03-XwZo..."
   supabase secrets set OPENAI_API_KEY="sk-proj-ZyhJ..."
   ```

2. Проверить, что ключи добавлены:
   ```bash
   supabase secrets list
   ```

### Этап 3.3: Deploy Edge Function
**Время**: 10 минут

1. Залинковать проект (если не было):
   ```bash
   supabase link --project-ref mbocfgtfkrlclmqjezfv
   ```

2. Deploy функции:
   ```bash
   supabase functions deploy ai-chat
   ```

3. Проверить статус:
   ```bash
   supabase functions list
   ```

### Этап 3.4: Обновление клиентского кода
**Время**: 1 час

1. Обновить `src/utils/aiClient.ts`:
   ```typescript
   import { supabase } from '../lib/supabaseClient';

   const USE_EDGE_FUNCTIONS = process.env.REACT_APP_USE_EDGE_FUNCTIONS === 'true';

   export async function callClaude(messages: Message[], options?: Options): Promise<Response> {
     if (USE_EDGE_FUNCTIONS) {
       // Production: call Edge Function
       const { data, error } = await supabase.functions.invoke('ai-chat', {
         body: {
           messages,
           model: options?.model || 'claude-haiku-4-5',
           temperature: options?.temperature || 0.7,
           maxTokens: options?.maxTokens || 1024
         }
       });

       if (error) {
         throw new Error(`Edge Function error: ${error.message}`);
       }

       return data;
     } else {
       // Local dev: direct API call
       const key = process.env.REACT_APP_CLAUDE_API_KEY;
       if (!key) {
         throw new Error('Claude API key not available');
       }

       // ... existing direct API logic
     }
   }
   ```

2. Добавить ENV переменную в `.env.local`:
   ```bash
   # Local development: use direct API
   REACT_APP_USE_EDGE_FUNCTIONS=false
   ```

3. Добавить ENV переменную для production (GitHub Pages):
   - В `package.json` добавить script:
     ```json
     "build:prod": "REACT_APP_USE_EDGE_FUNCTIONS=true npm run build"
     ```
   - Обновить deploy script:
     ```json
     "deploy": "npm run build:prod && gh-pages -d build"
     ```

### Этап 3.5: Rate Limiting (опционально)
**Время**: 30 минут

1. Создать таблицу для отслеживания запросов:
   ```sql
   CREATE TABLE ai_requests (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     function_name TEXT NOT NULL,
     model TEXT NOT NULL,
     tokens_used INTEGER,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- RLS: user может видеть только свои запросы
   ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view own requests"
     ON ai_requests FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "System can insert requests"
     ON ai_requests FOR INSERT
     WITH CHECK (true);

   -- Index для быстрого подсчёта
   CREATE INDEX idx_ai_requests_user_created
     ON ai_requests(user_id, created_at);
   ```

2. Обновить Edge Function для логирования:
   ```typescript
   // После успешного вызова API
   const supabase = createClient(
     Deno.env.get('SUPABASE_URL')!,
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
   );

   await supabase.from('ai_requests').insert({
     user_id: userId,
     function_name: 'ai-chat',
     model: model,
     tokens_used: response.usage?.total_tokens || 0
   });
   ```

3. Добавить проверку лимита в начале функции:
   ```typescript
   // Проверка: не более 100 запросов в день
   const today = new Date();
   today.setHours(0, 0, 0, 0);

   const { count, error } = await supabase
     .from('ai_requests')
     .select('*', { count: 'exact', head: true })
     .eq('user_id', userId)
     .gte('created_at', today.toISOString());

   if (count && count >= 100) {
     return new Response(JSON.stringify({
       error: 'Daily rate limit exceeded (100 requests/day)'
     }), {
       status: 429,
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```

### Этап 3.6: Тестирование
**Время**: 30 минут

1. **Local dev (direct API)**:
   ```bash
   # .env.local
   REACT_APP_USE_EDGE_FUNCTIONS=false
   npm start
   ```
   - Тест: создать гороскоп → должен работать через direct API
   - Проверить console: логи прямых вызовов API

2. **Production simulation (Edge Functions)**:
   ```bash
   # .env.local
   REACT_APP_USE_EDGE_FUNCTIONS=true
   npm start
   ```
   - Тест: создать гороскоп → должен работать через Edge Function
   - Проверить Supabase Dashboard → Logs → функция `ai-chat` должна быть вызвана

3. **Edge Function напрямую (curl)**:
   ```bash
   curl -X POST \
     'https://mbocfgtfkrlclmqjezfv.supabase.co/functions/v1/ai-chat' \
     -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [{"role": "user", "content": "Привет!"}],
       "model": "claude-haiku-4-5"
     }'
   ```
   - Должен вернуть ответ Claude API

4. **Fallback на OpenAI**:
   - Временно сломать Claude ключ в Supabase Secrets
   - Проверить, что fallback на OpenAI работает

### Этап 3.7: Документация и финализация
**Время**: 20 минут

1. Обновить `CLAUDE.md`:
   - Секция "AI Integration" → добавить информацию об Edge Functions
   - Добавить примеры использования гибридного режима

2. Обновить `.env.example`:
   ```bash
   # AI Edge Functions (production)
   # Set to 'true' for production builds (uses Supabase Edge Functions)
   # Set to 'false' for local development (uses direct API calls)
   REACT_APP_USE_EDGE_FUNCTIONS=false
   ```

3. Создать инструкцию для deployment:
   ```markdown
   ## Deployment Process

   1. Убедитесь, что Edge Function задеплоена:
      ```bash
      supabase functions list
      ```

   2. Проверьте Secrets:
      ```bash
      supabase secrets list
      ```

   3. Build и deploy:
      ```bash
      npm run deploy  # автоматически устанавливает REACT_APP_USE_EDGE_FUNCTIONS=true
      ```
   ```

## 🧪 Тестирование

### Тест 1: Local dev (direct API)
- ✅ `REACT_APP_USE_EDGE_FUNCTIONS=false`
- ✅ Создание гороскопа работает
- ✅ Интерактивная история работает
- ✅ Claude API используется (primary)
- ✅ OpenAI API используется при fallback

### Тест 2: Production (Edge Functions)
- ✅ `REACT_APP_USE_EDGE_FUNCTIONS=true`
- ✅ Создание гороскопа работает через Edge Function
- ✅ Интерактивная история работает через Edge Function
- ✅ API ключи не видны в client bundle (проверить DevTools)
- ✅ JWT токен передаётся автоматически

### Тест 3: Rate limiting
- ✅ После 100 запросов в день возвращается 429 ошибка
- ✅ На следующий день лимит сбрасывается

### Тест 4: Логирование
- ✅ Все запросы видны в Supabase Dashboard → Functions → Logs
- ✅ Таблица `ai_requests` заполняется корректно

## 📊 Метрики успеха

- **Безопасность**: API ключи не видны в client bundle (проверить DevTools → Network)
- **Производительность**: latency Edge Function ≤ direct API + 100ms
- **Надёжность**: fallback на OpenAI работает автоматически
- **Стоимость**: логирование токенов позволяет отслеживать расходы

## 🚀 Деплой

### Production (GitHub Pages):
```bash
# Deploy with Edge Functions enabled
npm run deploy
```

### Проверка после deploy:
1. Открыть https://segigu.github.io/flomoon
2. Создать гороскоп
3. Проверить Supabase Dashboard → Functions → Logs
4. Проверить DevTools → Network → AI API ключи НЕ должны быть видны

## 📚 Дополнительные ресурсы

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
- [Claude API Docs](https://docs.anthropic.com/claude/reference/messages_post)
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference/chat)

## ⚠️ Важные заметки

1. **Secrets management**: API ключи хранятся в Supabase Secrets, обновляются через CLI:
   ```bash
   supabase secrets set CLAUDE_API_KEY="new-key"
   ```

2. **JWT токен**: автоматически передаётся Supabase Client, не нужно добавлять вручную

3. **CORS**: Edge Functions автоматически обрабатывают CORS для домена GitHub Pages

4. **Cold start**: первый запрос к Edge Function может быть медленнее (~500ms), последующие быстрые (~100ms)

5. **Costs**: Edge Functions бесплатны до 2M запросов/месяц (Supabase Free tier)

## 🔄 Rollback план

Если Edge Functions не работают:

1. Откатить `.env.local`:
   ```bash
   REACT_APP_USE_EDGE_FUNCTIONS=false
   ```

2. Rebuild и redeploy:
   ```bash
   npm run build
   npm run deploy
   ```

3. Приложение вернётся к direct API calls (небезопасно, но работает)

---

**Статус**: 📝 Планируется (Part 2)
**Предыдущий этап**: ✅ Part 1 - Direct API keys (completed)
**Следующий этап**: 🏗️ Реализация Phase 3.1-3.7
