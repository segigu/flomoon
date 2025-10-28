# Supabase CLI - Правильный Workflow

**Создано:** 2025-10-27
**Проблема:** Supabase CLI глючит с миграциями, connection refused, конфликты истории
**Решение:** Вчера работало через SQL Editor - используй его!

---

## ❌ Проблемы с Supabase CLI

### 1. `supabase db push` - НЕ РАБОТАЕТ надёжно

**Проблемы:**
- Connection refused (`aws-1-eu-west-1.pooler.supabase.com`)
- Timeout соединения
- Конфликты истории миграций (`20251027122553` reverted/applied)
- Частично применённые миграции (rename прошёл, constraint упал)

**Почему:**
- Free tier projects засыпают после 7 дней неактивности
- CLI требует сложную настройку connection pooler
- Migration history синхронизация глючная

### 2. `psql` - НЕ РАБОТАЕТ (неправильные credentials)

**Пробовали:**
```bash
# ❌ Pooler - Tenant or user not found
PGPASSWORD="JOB-bus0-bub" psql "postgresql://postgres.mbocfgtfkrlclmqjezfv@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# ❌ Direct - Password authentication failed
PGPASSWORD="JOB-bus0-bub" psql "postgresql://postgres.mbocfgtfkrlclmqjezfv@db.mbocfgtfkrlclmqjezfv.supabase.co:5432/postgres"
```

**Вывод:** DB password `JOB-bus0-bub` неправильный или устарел.

---

## ✅ Правильный Workflow: SQL Editor

### Шаг 1: Создать миграцию локально

```bash
# Создать файл миграции
/Users/sergey/flomoon/supabase/migrations/YYYYMMDD_description.sql
```

**Пример структуры:**
```sql
-- ============================================================================
-- Migration: Description
-- Date: YYYY-MM-DD
-- ============================================================================

ALTER TABLE public.users ADD COLUMN new_field VARCHAR(50);
CREATE INDEX idx_users_new_field ON public.users(new_field);
COMMENT ON COLUMN public.users.new_field IS 'Description';

-- Verification query:
-- SELECT column_name FROM information_schema.columns WHERE table_name='users';
```

### Шаг 2: Применить через Supabase UI

1. **Открой SQL Editor:**
   https://supabase.com/dashboard/project/mbocfgtfkrlclmqjezfv

2. **Скопируй SQL:**
   ```bash
   cat /path/to/migration.sql | pbcopy
   ```

3. **Вставь и выполни:**
   - SQL Editor → New query
   - Cmd+V (paste)
   - Run (или Cmd+Enter)

4. **Проверь результат:**
   - Смотри output в SQL Editor
   - Если успешно → ✅
   - Если ошибка → читай сообщение, фикси SQL, повтори

### Шаг 3: Закоммитить миграцию

```bash
git add supabase/migrations/
git commit -m "feat(db): add new_field to users table"
git push
```

---

## 📚 Где Хранить Credentials

### `.env.local` (клиент, можно закоммитить)

```bash
REACT_APP_SUPABASE_URL=https://mbocfgtfkrlclmqjezfv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbG...  # ✅ безопасно для клиента
```

### **НЕ ХРАНИТЬ** в репозитории:
- ❌ `SERVICE_ROLE_KEY` - только для сервера/Edge Functions
- ❌ `DB_PASSWORD` - только для прямого подключения к PostgreSQL
- ❌ `MANAGEMENT_API_KEY` - только для Supabase Management API

### Где найти credentials:

1. **Anon Key (безопасно):**
   Dashboard → Settings → API → `anon` / `public`

2. **Service Role Key (секретно!):**
   Dashboard → Settings → API → `service_role`
   ⚠️ Никогда не использовать на клиенте!

3. **DB Password (если нужен):**
   Dashboard → Settings → Database → Connection String
   Обычно НЕ нужен - используй SQL Editor

---

## 🔧 Полезные Команды

### Supabase CLI (если всё-таки работает)

```bash
# Проверить статус
supabase status

# Связать проект
SUPABASE_ACCESS_TOKEN="sbp_..." supabase link --project-ref mbocfgtfkrlclmqjezfv

# Список миграций
SUPABASE_ACCESS_TOKEN="sbp_..." supabase migration list

# Применить миграции (если нет конфликтов)
SUPABASE_ACCESS_TOKEN="sbp_..." supabase db push

# Repair конфликтов
SUPABASE_ACCESS_TOKEN="sbp_..." supabase migration repair --status reverted 20251027122553
```

### Копирование SQL

```bash
# Скопировать всю миграцию
cat /path/to/migration.sql | pbcopy

# Скопировать без комментариев
cat /path/to/migration.sql | grep -v "^--" | grep -v "^$" | pbcopy
```

---

## 🚨 Troubleshooting

### Проблема: Migration history conflict

```
Remote migration versions not found in local migrations directory.
supabase migration repair --status reverted 20251027122553
```

**Решение:**
1. `supabase migration list` - смотри конфликтующие миграции
2. `supabase migration repair --status reverted <timestamp>` - откатить удалённую
3. `supabase db push` - применить локальную

### Проблема: Connection refused

```
failed to connect to postgres: connection refused
```

**Решение:**
1. Project на free tier заснул → открой Dashboard, он проснётся
2. Подожди 30-60 секунд
3. Используй SQL Editor вместо CLI

### Проблема: Частично применённая миграция

```
ERROR: column "locale" does not exist (SQLSTATE 42703)
```

**Причина:** Миграция упала на середине (RENAME прошёл, constraint нет)

**Решение:**
1. Создай новую миграцию БЕЗ команд, которые уже применились
2. Примени через SQL Editor
3. Пометь старую миграцию как applied вручную

---

## 📌 Best Practices

1. **✅ ВСЕГДА используй SQL Editor** для production миграций
2. **✅ Храни миграции в git** (`supabase/migrations/`)
3. **✅ Пиши идемпотентные миграции** (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`)
4. **✅ Добавляй verification queries** в комментариях
5. **❌ НЕ используй `supabase db push`** на production без тестирования
6. **❌ НЕ храни secrets** в git (`.env.local` in `.gitignore`)

---

## 🎯 TL;DR

**Простая инструкция:**
1. Создай `.sql` файл в `supabase/migrations/`
2. Скопируй содержимое: `cat file.sql | pbcopy`
3. Открой Supabase SQL Editor
4. Вставь и выполни
5. Закоммить `.sql` файл в git

**Это работает ВСЕГДА. CLI - нет.**

---

## 📎 Ссылки

- **Supabase Dashboard:** https://supabase.com/dashboard/project/mbocfgtfkrlclmqjezfv
- **SQL Editor:** https://supabase.com/dashboard/project/mbocfgtfkrlclmqjezfv/sql
- **Database Settings:** https://supabase.com/dashboard/project/mbocfgtfkrlclmqjezfv/settings/database
- **API Settings:** https://supabase.com/dashboard/project/mbocfgtfkrlclmqjezfv/settings/api

---

Обновлено: 2025-10-27 после борьбы с `supabase db push` 🤦
