# Настройка Push-уведомлений

## Требования

1. GitHub Personal Access Token с правами `repo` для доступа к репозиторию `nastia-data`
2. VAPID ключи для Web Push
3. OpenAI API key (используется в GitHub Action для генерации саркастичных текстов)
4. Android Chrome или Desktop Chrome для тестирования

## Шаг 1: Настройка GitHub Secrets

Добавьте следующие secrets в настройках репозитория `nastia-simple`:

1. Перейдите в **Settings** → **Secrets and variables** → **Actions**
2. Нажмите **New repository secret**
3. Добавьте три секрета:

### NASTIA_DATA_TOKEN
GitHub Personal Access Token с правами `repo` для доступа к приватному репозиторию `nastia-data`.

### VAPID_PUBLIC_KEY
```
BHL7bn7IEcJOy7unRivuOE-6e-svZMQQ_WMt5rTm7Ae86p4RN9BlTOqgeEWrvpiBJqwqcAGKUGNs2DXqybIhIv0
```

### VAPID_PRIVATE_KEY
```
mGifydhhVxO8wXtS4LGIjuc8j9pMjACf2M4K68F45L0
```

### CLAUDE_API_KEY
API-ключ Claude (Anthropic) с правом вызывать `/v1/messages`. **Основной** провайдер для генерации саркастичных уведомлений. Использует модель `claude-haiku-4-5`.

### OPENAI_API_KEY
API-ключ OpenAI с правом вызывать `/v1/chat/completions`. **Fallback** провайдер (если Claude недоступен). Использует модель `gpt-4o-mini`. Если оба секрета не заданы, будет использоваться набор запасных текстов.

## Шаг 2: Как работает система

1. **Регистрация подписки:**
   - Пользователь открывает приложение в Chrome (Android/Desktop)
   - Переходит в **Настройки** → **Push-уведомления**
   - Включает уведомления и настраивает параметры
   - Подписка сохраняется в `nastia-data/subscriptions.json`

2. **Отправка уведомлений:**
   - GitHub Action запускается каждый день в 12:00 по Москве (9:00 UTC)
   - Скрипт `scripts/sendNotifications.js` читает циклы из `nastia-data/nastia-data.json`
   - Берёт подписки из `nastia-data/subscriptions.json`
   - Вычисляет фертильное окно, день овуляции и прогноз даты следующей менструации
   - Определяет тип уведомления на текущий день:
     * **Morning brief** (06:45 Berlin time) - ежедневный гороскоп
     * **Cycle notification** (07:00-21:00 рандомное время) - уведомление о фазе цикла
   - Формирует текст через AI (Claude Haiku 4.5 → OpenAI GPT-4o-mini fallback)
   - Отправляет push всем включённым подпискам
   - Сохраняет в `nastia-data/nastia-notifications.json`
   - Сохраняет Claude API key в `nastia-data/nastia-config.json`

3. **Генерация текстов (обновлено 25.10.2025):**
   - **Модель**: Claude Haiku 4.5 (основная), GPT-4o-mini (fallback)
   - **Лимиты**: Title max 40 символов, Body **max 120 символов**
   - **Стилистика**: житейский язык (не астрология!), саркастичный тон, законченные фразы
   - **Примеры**:
     * Morning brief: "Настя, сегодня выживание на грани — терпи, вечером полегчает, обещаем! 💥"
     * День 2: "Настюш, второй день — грелку к пузику, шоколадку в рот, всех нафиг! 🔥🍫"
     * День 3: "Настёна, третий день, пей воду, береги нервы — скоро станет легче, держись! 💪✨"

4. **Типы уведомлений (11 типов):**
   - **morning_brief** — ежедневный гороскоп в 06:45 (житейский язык)
   - **fertile_window** — каждый из пяти дней до овуляции
   - **ovulation_day** — день овуляции (язвительный пуш про контрацепцию)
   - **period_forecast** — за 1-5 дней до менструации
   - **period_check** — прогноз на сегодня
   - **period_waiting** — задержка 1-2 дня
   - **period_delay_warning** — задержка 3+ дней
   - **period_confirmed_day0** — первый день (отмечен пользователем)
   - **period_confirmed_day1** — второй день
   - **period_confirmed_day2** — третий день
   - **birthday** — день рождения

## Шаг 3: Тестирование

1. Откройте приложение в Chrome (Android или Desktop)
2. Перейдите в Настройки
3. Включите облачную синхронизацию и добавьте GitHub токен
4. Включите Push-уведомления
5. Настройте параметры уведомлений
6. Нажмите "Отправить тестовое уведомление"

## Шаг 4: Ручной запуск GitHub Action

Для тестирования можно запустить Action вручную:

1. Перейдите в **Actions** → **Send Push Notifications**
2. Нажмите **Run workflow**
3. Выберите ветку `main`
4. Нажмите **Run workflow**

## Структура данных

### nastia-data/subscriptions.json
```json
{
  "subscriptions": [
    {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "...",
        "auth": "..."
      },
      "settings": {
        "enabled": true
      }
    }
  ],
  "lastUpdated": "2025-10-06T12:00:00.000Z"
}
```

### nastia-data/nastia-notifications.json
```json
{
  "notifications": [
    {
      "id": "2025-10-25T09:00:00.000Z-morning_brief",
      "type": "morning_brief",
      "title": "Утренний пинок",
      "body": "Настя, сегодня выживание на грани — терпи, вечером полегчает, обещаем! 💥",
      "sentAt": "2025-10-25T04:45:12.123Z",
      "url": "https://segigu.github.io/nastia-calendar/?open=daily-horoscope"
    },
    {
      "id": "2025-10-25T09:00:00.000Z-period_confirmed_day2",
      "type": "period_confirmed_day2",
      "title": "Инга Железистая",
      "body": "Настёна, третий день, пей воду, береги нервы — скоро станет легче, держись! 💪✨",
      "sentAt": "2025-10-25T07:15:22.456Z",
      "url": "https://segigu.github.io/nastia-calendar/?open=notifications"
    }
  ],
  "lastUpdated": "2025-10-25T07:15:22.456Z"
}
```

### nastia-data/nastia-config.json
```json
{
  "claude": {
    "apiKey": "sk-ant-..."
  },
  "notificationSchedule": {
    "dayKey": "2025-10-25T00:00:00.000Z",
    "targetMinutes": 435,
    "targetTime": "07:15",
    "timezone": "Europe/Berlin",
    "slotMinutes": 5,
    "generatedAt": "2025-10-25T00:00:00.000Z"
  },
  "updatedAt": "2025-10-25T07:15:22.456Z"
}
```

## Безопасность

- VAPID приватный ключ хранится в GitHub Secrets (зашифрованно)
- Публичный ключ безопасен для хранения в коде
- Подписки хранятся в приватном репозитории `nastia-data`
- Токен GitHub должен иметь минимальные права (`repo`)

## Поддерживаемые браузеры

- ✅ Chrome for Android
- ✅ Chrome for Desktop
- ❌ Safari (не поддерживает Web Push API)
- ❌ Firefox (не тестировалось)

## История изменений

### 25 октября 2025 - Улучшение стилистики уведомлений

**Проблема:**
- Тексты слишком короткие (50 символов) - нет места для юмора
- Morning brief использовал астрологию ("Марс рычит") вместо житейского языка
- Грамматические ошибки: "скоро легче" → "скоро станет легче"

**Изменения:**
1. **Увеличен лимит body: 60 → 120 символов**
   - iOS поддерживает до ~170 символов
   - Android до ~240 символов
   - Безопасный универсальный лимит: 120

2. **Переписаны промпты для AI:**
   - Morning brief: убрана астрология → житейский язык
   - Cycle notifications: все 9 типов обновлены с развёрнутыми примерами
   - Добавлено требование законченных грамматических фраз

3. **Обновлены fallback-сообщения:**
   - Исправлена грамматика во всех 11 типах
   - Увеличена длина фраз (60-87 символов)
   - Добавлен контекст и юмор

**Примеры до/после:**

| Было (50-60 символов) | Стало (60-87 символов) |
|----------------------|------------------------|
| "Марс рычит — вставай и держи оборону! 💥" | "Настя, сегодня выживание на грани — терпи, вечером полегчает, обещаем! 💥" |
| "Настёна, третий день, пей воду, береги нервы! 💪" | "Настёна, третий день, пей воду, береги нервы — скоро станет легче, держись! 💪✨" |
| "Настюш, второй день — грелку к пузику! 🔥" | "Настюш, второй день — грелку к пузику, шоколадку в рот, всех нафиг! 🔥🍫" |

## Отладка

**Preview mode** (локальное тестирование без API ключей):
```bash
node scripts/sendNotifications.js --preview-morning-brief
```

Проверьте логи GitHub Action:
1. Перейдите в **Actions** → **Send Push Notifications**
2. Откройте последний запуск
3. Просмотрите логи шага **Send notifications**

Проверьте Service Worker в Chrome DevTools:
1. Откройте DevTools (F12)
2. Перейдите в **Application** → **Service Workers**
3. Проверьте статус регистрации
4. Просмотрите логи в Console
