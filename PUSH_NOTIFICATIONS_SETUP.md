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

### OPENAI_API_KEY
API-ключ OpenAI с правом вызывать `/v1/chat/completions`. Используется для генерации жёстко-саркастичных пушей. Если секрет не задан, будет использоваться набор запасных текстов.

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
   - Определяет один тип уведомления на текущий день и формирует текст через OpenAI (или берёт запасной вариант)
   - Отправляет push всем включённым подпискам и сохраняет сообщение в `nastia-data/nastia-notifications.json`
   - Сохраняет актуальный OpenAI API key в `nastia-data/nastia-config.json`, чтобы клиент использовал тот же секрет

3. **Типы уведомлений:**
   - **Фертильное окно** — каждый из пяти дней до овуляции
   - **День овуляции** — отдельный язвительный пуш про контрацепцию
   - **Прогноз менструации** — ежедневные поддерживающие сообщения за 1–5 дней до предполагаемого старта
   - **День предполагаемой менструации** — ещё более едкий текст про режим выживания

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
      "id": "2025-02-12T09:00:00.000Z-period_forecast",
      "type": "period_forecast",
      "title": "ПМС-бронежилет",
      "body": "🙄 До менструации пару дней. Держи шоколад, грелку и боевой настрой.",
      "sentAt": "2025-02-12T06:00:12.123Z"
    }
  ],
  "lastUpdated": "2025-02-12T06:00:12.123Z"
}
```

### nastia-data/nastia-config.json
```json
{
  "openAI": {
    "apiKey": "sk-..."
  },
  "updatedAt": "2025-02-12T06:00:12.123Z"
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

## Отладка

Проверьте логи GitHub Action:
1. Перейдите в **Actions** → **Send Push Notifications**
2. Откройте последний запуск
3. Просмотрите логи шага **Send notifications**

Проверьте Service Worker в Chrome DevTools:
1. Откройте DevTools (F12)
2. Перейдите в **Application** → **Service Workers**
3. Проверьте статус регистрации
4. Просмотрите логи в Console
