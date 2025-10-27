# 🔥 Шпаргалка для следующей сессии

**Дата:** 2025-10-27
**Фаза:** 2 - Supabase
**Этап:** 2.2 (Интеграция SDK) - В ПРОЦЕССЕ

---

## ✅ Что УЖЕ СДЕЛАНО:

### Этап 2.0: Подготовка ✅
- storage.ts откачен
- Документация обновлена
- Коммит: `77216ec`

### Этап 2.1: Supabase проект ✅
- Проект: flomoon-prod (Europe)
- 5 таблиц созданы (users, cycles, partners, horoscope_memory, psychological_profiles)
- RLS policies настроены
- Email Auth: включён (confirm email: OFF)
- Redirect URLs: добавлены

### Этап 2.2: SDK (частично) 🔄
- ✅ @supabase/supabase-js установлен
- ✅ .gitignore содержит .env.local
- ✅ MCP Supabase настроен в claude_desktop_config.json
- ✅ Credentials добавлены в MCP конфиг

---

## 🚀 ЧТО ДЕЛАТЬ ДАЛЬШЕ:

### 1. ПЕРЕЗАПУСТИТЬ Claude Code (ОБЯЗАТЕЛЬНО!)

**Файл:** `/Users/sergey/Library/Application Support/Claude/claude_desktop_config.json`

Проверь что там есть:
```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest"],
  "env": {
    "SUPABASE_URL": "https://mbocfgtfkrlclmqjezfv.supabase.co",
    "SUPABASE_SERVICE_KEY": "eyJhbGc..."
  }
}
```

**Действие:**
1. Command + Q (закрыть Claude Code)
2. Открыть Claude Code снова
3. Вернуться в чат (он будет в истории слева)

---

### 2. После перезапуска - продолжить Этап 2.2

**Команда Claude:** "Продолжаем с Этапа 2.2 - создаём .env.local и supabaseClient.ts"

**Что Claude сделает:**

1. **Создаст .env.local** с содержимым:
```bash
# Supabase
REACT_APP_SUPABASE_URL=https://mbocfgtfkrlclmqjezfv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<твой anon key из password manager>

# AI Keys (существующие)
REACT_APP_CLAUDE_API_KEY=...
REACT_APP_OPENAI_API_KEY=...
```

2. **Создаст /src/lib/supabaseClient.ts**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

3. **Проверит подключение** (через MCP Supabase!)

---

## 📊 Credentials (нужны для .env.local):

**В password manager найди:**
- Project URL: https://mbocfgtfkrlclmqjezfv.supabase.co ✅ (уже знаем)
- anon public key: eyJhbGc... (найди в password manager или Supabase Dashboard)

**⚠️ НЕ путать с service_role key!** Для .env.local нужен только **anon key** (безопасный для клиента).

---

## 🎯 После Этапа 2.2:

**Следующие этапы:**
- Этап 2.3: Auth UI (AuthModal.tsx)
- Этап 2.4: Edge Functions
- Этап 2.5: API слой (api.ts)
- Этап 2.6: Удалить cloudSync.ts
- Этап 2.7: Тестирование RLS
- Этап 2.8: Документация
- Этап 2.9: Финальный коммит

---

## 🔗 Полезные ссылки:

- **CURRENT_TASK.md:** `/Users/sergey/flomoon/docs/progress/CURRENT_TASK.md`
- **CHANGELOG.md:** `/Users/sergey/flomoon/docs/progress/CHANGELOG.md`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/mbocfgtfkrlclmqjezfv
- **GitHub repo:** https://github.com/segigu/flomoon

---

## 📝 Последние коммиты:

```
f212251 - docs(phase-2): обновить прогресс - Этап 2.1 завершён, 2.2 в процессе
77216ec - docs(phase-2): обновить документацию - переход к Фазе 2
54d1ab0 - fix(phase-1): заменить хардкод 'Сергей' на динамическое имя партнера
```

---

**Готов продолжать?** Напиши: "Продолжаем с Этапа 2.2" 🚀
