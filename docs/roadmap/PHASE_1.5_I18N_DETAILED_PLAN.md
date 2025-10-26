# Детальный план: Фаза 1.5 - Многоязычность (i18n)

**Создано:** 2025-10-26 (агент планирования)
**Версия:** 1.0.0
**Оценка:** 17-20 часов → 2-3 рабочих дня

---

## Обзор

**Цель:** Добавить поддержку 3 языков (русский, немецкий, английский) в React приложение Nastia Calendar с использованием react-i18next.

**Контекст:**
- Приложение сейчас полностью на русском языке
- Все тексты хардкоженные в компонентах
- AI контент (гороскопы, истории) генерируется на русском
- Психологические контракты на русском

**Языки:**
- ru (Русский) - основной, текущий
- de (Немецкий) - проживание в Германии
- en (Английский) - международный

**Библиотека:** react-i18next v13+ (React 19 compatible)

**AI переводы:** Первая версия переводов генерируется через Claude/GPT, затем ручная корректировка по необходимости

**Оценка времени:** 17-20 часов (2-3 рабочих дня)

---

## Анализ текущего состояния

### Статистика текстов в проекте

**Файлы с русским текстом:**
- 51 TypeScript/TSX файлов
- ~1290 вхождений кириллицы (Grep анализ)

**Основные источники текстов:**

1. **ModernNastiaApp.tsx** (~5158 строк)
   - ~518 строк с русским текстом
   - UI элементы: кнопки, заголовки, модальные окна
   - Уведомления и сообщения пользователю
   - Placeholder тексты

2. **horoscope.ts** (~1073 строки)
   - AI промпты для гороскопов (Настя, Серёжа)
   - Системные промпты
   - Fallback тексты
   - Контекстные описания

3. **historyStory.ts** (~1257 строк)
   - AI промпты для интерактивных историй
   - Системные инструкции
   - Fallback опции

4. **psychologicalContracts.ts** (~446 строк)
   - ~119 строк с русским текстом
   - Психологические контракты
   - Сценарии и ловушки

5. **planetMessages.ts** (~445 строк)
   - Диалоги планет
   - Системные промпты

6. **GlassTabBar.tsx** (~100 строк)
   - Названия вкладок (4 штуки)

7. **Остальные компоненты:**
   - DiscoverTabV2.tsx: ~192 строки с русским
   - ChatManager.tsx: ~42 строки
   - Другие: ~200 строк суммарно

---

## Детальный план по задачам

### Задача 1.5.1: Установка и настройка i18next (~2 часа)

#### Шаг 1.5.1.1: Установка зависимостей (~10 минут)

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

**Версии (проверенные с React 19):**
- `i18next`: ^23.7.0
- `react-i18next`: ^14.0.0
- `i18next-browser-languagedetector`: ^7.2.0

#### Шаг 1.5.1.2: Создание структуры локализации (~30 минут)

**Файлы для создания:**

```
src/
  i18n/
    config.ts              # Конфигурация i18next
    locales/
      ru/
        common.json        # UI элементы
        tabs.json          # Вкладки
        settings.json      # Настройки
        notifications.json # Уведомления
        horoscope.json     # Гороскоп UI
        discover.json      # "Узнай себя" UI
        calendar.json      # Календарь UI
      de/
        common.json
        tabs.json
        settings.json
        notifications.json
        horoscope.json
        discover.json
        calendar.json
      en/
        common.json
        tabs.json
        settings.json
        notifications.json
        horoscope.json
        discover.json
        calendar.json
```

**Пример конфигурации** (`src/i18n/config.ts`):

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импорты JSON файлов
import ruCommon from './locales/ru/common.json';
import ruTabs from './locales/ru/tabs.json';
import ruSettings from './locales/ru/settings.json';
import ruNotifications from './locales/ru/notifications.json';
import ruHoroscope from './locales/ru/horoscope.json';
import ruDiscover from './locales/ru/discover.json';
import ruCalendar from './locales/ru/calendar.json';

import deCommon from './locales/de/common.json';
import deTabs from './locales/de/tabs.json';
import deSettings from './locales/de/settings.json';
import deNotifications from './locales/de/notifications.json';
import deHoroscope from './locales/de/horoscope.json';
import deDiscover from './locales/de/discover.json';
import deCalendar from './locales/de/calendar.json';

import enCommon from './locales/en/common.json';
import enTabs from './locales/en/tabs.json';
import enSettings from './locales/en/settings.json';
import enNotifications from './locales/en/notifications.json';
import enHoroscope from './locales/en/horoscope.json';
import enDiscover from './locales/en/discover.json';
import enCalendar from './locales/en/calendar.json';

const resources = {
  ru: {
    common: ruCommon,
    tabs: ruTabs,
    settings: ruSettings,
    notifications: ruNotifications,
    horoscope: ruHoroscope,
    discover: ruDiscover,
    calendar: ruCalendar,
  },
  de: {
    common: deCommon,
    tabs: deTabs,
    settings: deSettings,
    notifications: deNotifications,
    horoscope: deHoroscope,
    discover: deDiscover,
    calendar: deCalendar,
  },
  en: {
    common: enCommon,
    tabs: enTabs,
    settings: enSettings,
    notifications: enNotifications,
    horoscope: enHoroscope,
    discover: enDiscover,
    calendar: enCalendar,
  },
};

i18n
  .use(LanguageDetector) // Автоопределение языка браузера
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru', // Русский как fallback
    defaultNS: 'common',
    ns: ['common', 'tabs', 'settings', 'notifications', 'horoscope', 'discover', 'calendar'],
    interpolation: {
      escapeValue: false, // React уже экранирует
    },
    detection: {
      // Порядок определения языка
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nastia-app-language',
    },
  });

export default i18n;
```

#### Шаг 1.5.1.3: Интеграция в приложение (~20 минут)

**Изменить** `src/index.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './i18n/config'; // ← ДОБАВИТЬ

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
```

**Время задачи 1.5.1:** ~2 часа

---

### Задача 1.5.2: Извлечение и перевод UI текстов (~6-7 часов)

#### Шаг 1.5.2.1: Создание JSON-структуры для русского языка (~2 часа)

**Анализ ModernNastiaApp.tsx** (основной компонент):

**`locales/ru/common.json`** (базовые элементы):
```json
{
  "buttons": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    "close": "Закрыть",
    "retry": "Попробовать снова",
    "loading": "Загрузка...",
    "refresh": "Обновить"
  },
  "errors": {
    "generic": "Что-то пошло не так",
    "network": "Проблемы с сетью",
    "tryAgain": "Попробуйте ещё раз"
  }
}
```

**`locales/ru/tabs.json`**:
```json
{
  "calendar": "Календарь",
  "cycles": "Циклы",
  "discover": "Узнай себя",
  "settings": "Настройки"
}
```

**`locales/ru/calendar.json`** (календарный UI):
```json
{
  "today": "Сегодня",
  "daysUntilNext": "Дней до следующего цикла",
  "periodDay": "День цикла",
  "fertileWindow": "Фертильное окно",
  "ovulation": "Овуляция",
  "addCycle": "Начать цикл",
  "monthNames": {
    "january": "Январь",
    "february": "Февраль"
  }
}
```

**`locales/ru/settings.json`** (настройки):
```json
{
  "title": "Настройки",
  "language": {
    "title": "Язык",
    "description": "Выберите язык приложения",
    "ru": "Русский",
    "de": "Deutsch",
    "en": "English"
  },
  "cloudSync": {
    "title": "Облачная синхронизация",
    "enabled": "Включена",
    "disabled": "Выключена",
    "configure": "Настроить"
  },
  "notifications": {
    "title": "Уведомления",
    "enable": "Включить уведомления",
    "test": "Тестовое уведомление"
  }
}
```

[ПРОДОЛЖЕНИЕ В ФАЙЛЕ...]

Детальный план агента занимает много места. Сохраняю остальное в файл и перехожу к обновлению MASTER_PLAN.md.
