# Supabase Migrations - Manual Application Guide

## ⚠️ Current Status

The migration `20251027_add_language_support.sql` needs to be applied **manually** via Supabase UI SQL Editor.

Automatic application via CLI failed due to connection issues (tenant/user not found error).

---

## 📝 How to Apply Migration Manually

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard/project/mbocfgtfkrlclmqjezfv
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Copy SQL Content

Copy the entire contents of:
```
/Users/sergey/flomoon/supabase/migrations/20251027_add_language_support.sql
```

Or use this direct command:
```bash
cat /Users/sergey/flomoon/supabase/migrations/20251027_add_language_support.sql | pbcopy
```

### Step 3: Paste and Execute

1. Paste the SQL into the SQL Editor
2. Click **Run** (or press Cmd/Ctrl + Enter)
3. Verify that all statements executed successfully

### Step 4: Verify Migration

Run these verification queries in SQL Editor:

```sql
-- Check users table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'language_code';

-- Check horoscope_memory table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'horoscope_memory' AND column_name = 'language';

-- Check psychological_profiles table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'psychological_profiles' AND column_name = 'language';
```

Expected results:
- `users.language_code` exists (renamed from `locale`)
- `horoscope_memory.language` exists (new column, default 'ru')
- `psychological_profiles.language` exists (new column, default 'ru')

---

## 🔄 What This Migration Does

1. **Renames** `users.locale` → `users.language_code` for better i18n semantics
2. **Adds** `horoscope_memory.language` to track language of AI-generated content
3. **Adds** `psychological_profiles.language` to track language of psychological analysis
4. **Creates indexes** for efficient language filtering
5. **Adds CHECK constraints** to ensure only supported languages (ru, en, de)

---

## ⏭️ Next Steps After Migration

Once migration is applied:

1. ✅ TypeScript types are already updated (`UserProfile.languageCode`)
2. ✅ Code is already updated to use `languageCode` instead of `locale`
3. Test the changes:
   ```bash
   npm start
   ```
4. Mark Task 2.5.2 as completed

---

## 🔙 Rollback (If Needed)

If something goes wrong, run the rollback SQL (located at the bottom of the migration file):

```sql
ALTER TABLE public.users RENAME COLUMN language_code TO locale;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_language_code_check;
ALTER TABLE public.horoscope_memory DROP COLUMN IF EXISTS language;
ALTER TABLE public.horoscope_memory DROP CONSTRAINT IF EXISTS horoscope_memory_language_check;
DROP INDEX IF EXISTS idx_horoscope_memory_language;
ALTER TABLE public.psychological_profiles DROP COLUMN IF EXISTS language;
ALTER TABLE public.psychological_profiles DROP CONSTRAINT IF EXISTS psychological_profiles_language_check;
DROP INDEX IF EXISTS idx_psychological_profiles_language;
```
