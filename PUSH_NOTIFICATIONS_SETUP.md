# Настройка Push-уведомлений (Supabase Architecture)

## Архитектура

Push-уведомления теперь полностью интегрированы с Supabase:

- **Подписки**: Хранятся в таблице `push_subscriptions` с Row Level Security
- **Отправка**: Supabase Edge Function `send-push-notifications`
- **Библиотека**: [@negrel/webpush](https://github.com/negrel/webpush) для Web Push protocol (RFC 8291 и RFC 8292)
- **Расписание**: Вызов Edge Function по расписанию (pg_cron или внешний cron)

## Компоненты системы

### 1. База данных

#### Таблица `push_subscriptions`
```sql
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```

**RLS Policies:**
- Пользователи могут управлять только своими подписками
- Полная изоляция данных между пользователями

### 2. Edge Function

**Путь**: `supabase/functions/send-push-notifications/index.ts`

**Что делает:**
1. Получает все активные подписки из `push_subscriptions`
2. Для каждого пользователя определяет тип уведомления на основе циклов
3. Отправляет push-уведомление через Web Push protocol
4. Автоматически удаляет истекшие подписки (HTTP 410)

**Используемая библиотека**: `@negrel/webpush@0` (JSR package)

### 3. Клиентский код

**Основной файл**: `src/utils/pushNotifications.ts`
- Регистрация Service Worker
- Подписка на push-уведомления (VAPID keys)
- Локальное хранение настроек

**Интеграция с Supabase**: `src/utils/supabasePushNotifications.ts`
- Сохранение подписок в базу данных
- Обновление настроек (enabled/disabled)
- Удаление подписок

## Настройка

### Шаг 1: Создать таблицу в Supabase

SQL миграция: `supabase/migrations/20251028_create_push_subscriptions.sql`

Применить через SQL Editor:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql/new
```

### Шаг 2: Настроить секреты в Supabase

Откройте настройки Edge Functions:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/functions
```

Добавьте секреты:

| Secret Name          | Value                                                      | Description                    |
|----------------------|------------------------------------------------------------|--------------------------------|
| `VAPID_PUBLIC_KEY`   | `BJR_WdYWX24ndvmUcLJ1qiR7q_6mDdaZi4MY2EmKJFsuWBzbHSnaSz-2D_IpDySxIgYhVwr7JqQ3D5r02wdPxyY` | Public VAPID key для Web Push  |
| `VAPID_PRIVATE_KEY`  | `WBzbHSnaSz-2D_IpDySxIgYhVwr7JqQ3D5r02wdPxyY`             | Private VAPID key (секретный)  |
| `CLAUDE_API_KEY`     | `sk-ant-api03-...`                                         | Claude API key (необязательно) |
| `OPENAI_API_KEY`     | `sk-proj-...`                                              | OpenAI API key (fallback)      |

**Как сгенерировать новые VAPID ключи:**
```bash
node scripts/generateVapidKeys.js
```

### Шаг 3: Задеплоить Edge Function

```bash
SUPABASE_ACCESS_TOKEN="YOUR_ACCESS_TOKEN" \
supabase functions deploy send-push-notifications \
  --project-ref YOUR_PROJECT_REF
```

**Проверить деплой:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions
```

### Шаг 4: Обновить публичный ключ в клиенте

Файл: `src/utils/pushNotifications.ts`

```typescript
const VAPID_PUBLIC_KEY = 'BJR_WdYWX24ndvmUcLJ1qiR7q_6mDdaZi4MY2EmKJFsuWBzbHSnaSz-2D_IpDySxIgYhVwr7JqQ3D5r02wdPxyY';
```

### Шаг 5: Настроить расписание отправки

#### Вариант A: pg_cron (Supabase Pro/Team)

Выполните SQL в Supabase SQL Editor:

```sql
-- Включить pg_cron расширение
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Создать функцию для вызова Edge Function
CREATE OR REPLACE FUNCTION trigger_push_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Вызвать Edge Function через HTTP
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_ANON_KEY'
    )
  );
END;
$$;

-- Настроить расписание (каждый день в 7:00 UTC)
SELECT cron.schedule(
  'send-push-notifications-daily',
  '0 7 * * *',
  $$SELECT trigger_push_notifications()$$
);
```

**Проверить расписание:**
```sql
SELECT * FROM cron.job;
```

#### Вариант B: Внешний cron (Free tier)

Используйте внешний сервис (GitHub Actions, cron-job.org, EasyCron, etc.)

**Пример: GitHub Actions**

Файл: `.github/workflows/send-push-notifications.yml` (отключен)

```yaml
name: Send Push Notifications

on:
  schedule:
    - cron: '0 7 * * *'  # 7:00 UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

#### Вариант C: Вызов вручную

Можно вызвать Edge Function вручную для тестирования:

```bash
curl -X POST \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Типы уведомлений

Edge Function автоматически определяет тип уведомления на основе циклов пользователя:

| Тип                      | Когда отправляется                             | Пример текста                                   |
|--------------------------|-----------------------------------------------|-------------------------------------------------|
| `fertile_window`         | 15-19 дней до ожидаемой менструации           | "Настюш, зона риска, без защиты ни шагу! 💋🛡️" |
| `ovulation_day`          | 14 дней до ожидаемой менструации              | "Настёна, сегодня овуляция — прикрывайся! 🔥"   |
| `period_forecast`        | 1-5 дней до ожидаемой менструации             | "Настюх, пара дней до шторма! 🙄🍫"             |
| `period_check`           | День ожидаемой менструации                    | "Настюх, день Х по прогнозу! 👀"                |
| `period_waiting`         | 1-2 дня задержки                              | "Настёна, задержка — прислушайся к организму! 🤔" |
| `period_delay_warning`   | 3+ дня задержки                               | "Настюш, задержка затянулась! 😬🧪"             |
| `period_confirmed_day0`  | День начала менструации                       | "Настёна, старт! Плед, грелка, сериал! 🛋️💜"   |
| `period_confirmed_day1`  | Второй день менструации                       | "Настюш, второй день — грелку к пузику! 🔥🍫"   |
| `period_confirmed_day2`  | Третий день менструации                       | "Настёна, третий день, пей воду! 💪✨"           |
| `birthday`               | День рождения (12 апреля)                     | "Настюш, с днюхой! 🎉💜🎂"                       |

## Тестирование

### 1. Проверить подписку (клиент)

1. Откройте приложение в Chrome (Android/Desktop)
2. Перейдите в **Настройки** → **Push-уведомления**
3. Включите уведомления → браузер запросит разрешение
4. Нажмите "Отправить тестовое уведомление"
5. Проверьте, что уведомление пришло

### 2. Проверить Edge Function

**Вызов через curl:**
```bash
curl -X POST \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notifications" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Проверить логи:**
```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions/send-push-notifications/logs
```

### 3. Проверить подписки в БД

```sql
-- Все активные подписки
SELECT * FROM push_subscriptions WHERE enabled = true;

-- Подписки конкретного пользователя
SELECT * FROM push_subscriptions WHERE user_id = 'USER_UUID';
```

## Отладка

### Проблема: Уведомления не приходят

**Чеклист:**
1. ✅ Таблица `push_subscriptions` создана?
2. ✅ Секреты добавлены в Supabase?
3. ✅ Edge Function задеплоена?
4. ✅ Подписка сохранена в БД? (SELECT * FROM push_subscriptions)
5. ✅ У пользователя есть циклы? (SELECT * FROM cycles WHERE user_id = ...)
6. ✅ Сегодня подходящий день для уведомления?
7. ✅ Логи Edge Function показывают успешную отправку?

### Проблема: Edge Function возвращает ошибку

Проверьте логи:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions/send-push-notifications/logs
```

**Типичные ошибки:**
- `VAPID keys not configured`: Добавьте секреты в Supabase Dashboard
- `Failed to fetch subscriptions`: Проверьте таблицу `push_subscriptions`
- `Subscription expired (410 Gone)`: Подписка автоматически удалена из БД

### Проблема: VAPID ключи неправильно импортируются

Убедитесь, что ключи в формате URL-safe base64 без padding:
- `BJR_WdYWX24ndvmUcLJ1qiR7q_6mDdaZi4MY2EmKJFsuWBzbHSnaSz-2D_IpDySxIgYhVwr7JqQ3D5r02wdPxyY`
- НЕ содержат символов `+`, `/`, `=`
- Содержат `-` и `_` вместо них

## Безопасность

- ✅ VAPID private key хранится в Supabase Secrets (зашифрованно)
- ✅ Публичный ключ безопасен для хранения в клиентском коде
- ✅ Подписки изолированы через Row Level Security (RLS)
- ✅ Edge Function использует service_role key для доступа к БД
- ✅ Автоматическое удаление истекших подписок (HTTP 410)

## Поддерживаемые браузеры

- ✅ Chrome for Android
- ✅ Chrome for Desktop
- ✅ Edge for Desktop
- ✅ Firefox for Desktop
- ❌ Safari (не поддерживает Web Push API)

## История изменений

### 28 октября 2025 - Миграция на Supabase

**Изменения:**
1. Подписки мигрированы с GitHub репозитория на Supabase таблицу
2. GitHub Actions workflow отключен (`.github/workflows/send-push-notifications.yml.disabled`)
3. Добавлена библиотека `@negrel/webpush` для Web Push protocol
4. Создан Edge Function `send-push-notifications`
5. Клиентский код обновлен для синхронизации с Supabase

**Преимущества новой архитектуры:**
- ✅ Нет зависимости от внешнего репозитория `nastia-data`
- ✅ Автоматическая изоляция данных пользователей через RLS
- ✅ Проще настройка расписания (pg_cron или внешний cron)
- ✅ Более безопасное хранение VAPID ключей

## Ссылки

- [@negrel/webpush на GitHub](https://github.com/negrel/webpush)
- [Web Push Protocol (RFC 8291)](https://datatracker.ietf.org/doc/html/rfc8291)
- [VAPID (RFC 8292)](https://datatracker.ietf.org/doc/html/rfc8292)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase pg_cron](https://supabase.com/docs/guides/database/extensions/pgcron)
