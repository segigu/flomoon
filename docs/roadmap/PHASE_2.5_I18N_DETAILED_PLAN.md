# 📋 Детальный план реализации: Фаза 2.5 - Интернационализация (i18n)

**Создано:** 2025-10-27
**Версия:** 2.0.0 (обновлено с Phase 1.5 под новую архитектуру)
**Оценка:** 20-24 часа → 3-4 рабочих дня

---

## 🎯 Обзор фазы

**Цель:** Добавить поддержку 3 языков (русский, немецкий, английский) в Nastia Calendar с использованием react-i18next и Supabase для хранения языка пользователя.

**Контекст:**
- Приложение сейчас полностью на русском языке
- Все тексты хардкоженные в компонентах
- AI контент (гороскопы, истории) генерируется на русском
- Психологические контракты на русском
- **НОВОЕ:** Supabase используется для хранения пользовательских данных (включая язык)
- **НОВОЕ:** Edge Functions для AI (нужно передавать язык в промпты)

**Языки:**
- **ru** (Русский) - основной, текущий
- **de** (Deutsch) - проживание в Германии
- **en** (English) - международный

**Библиотека:** react-i18next v14+ (React 19 compatible)

**Стратегическое решение:** Делать i18n ПЕРЕД AI-агентами (Фаза 4), чтобы:
1. Избежать переделывания 14 агентов потом (экономия 6-8 часов)
2. БД сразу с `language_code` (no migration needed)
3. Психологические контракты сразу мультиязычные
4. AI-агенты будут генерировать контент на правильном языке с первого раза

**Зависимости:**
- ✅ Фаза 2: База данных и авторизация (ЗАВЕРШЕНА)
- ✅ Фаза 3: AI Edge Functions (ЗАВЕРШЕНА)

**После Фазы 2.5:**
- Фаза 4: AI-агенты (будут использовать язык пользователя)
- Фаза 5: Персонализация AI
- Фаза 6: UI и аналитика

---

## 📊 Анализ текущего состояния

### Статистика текстов в проекте

**Файлы с русским текстом:**
- 51 TypeScript/TSX файлов
- ~1290 вхождений кириллицы (анализ из Phase 1.5)
- **+150 вхождений** в Auth/Profile UI (Phase 2)

**Основные источники текстов:**

1. **ModernNastiaApp.tsx** (~5300 строк)
   - ~550 строк с русским текстом (включая новый Auth UI)
   - UI элементы: кнопки, заголовки, модальные окна
   - Уведомления и сообщения пользователю
   - Placeholder тексты

2. **AuthModal.tsx** + **ProfileSetupModal.tsx** (~400 строк суммарно)
   - ~80 строк с русским текстом
   - Формы регистрации/логина
   - Настройка профиля (имя, дата рождения, астро профиль)

3. **Settings секция** (ModernNastiaApp.tsx)
   - ~70 строк с русским текстом
   - Редактирование профиля
   - Настройки приложения

4. **horoscope.ts** (~1073 строки)
   - AI промпты для гороскопов (Настя, Серёжа)
   - Системные промпты
   - Fallback тексты
   - Контекстные описания

5. **historyStory.ts** (~1257 строк)
   - AI промпты для интерактивных историй
   - Системные инструкции
   - Fallback опции

6. **psychologicalContracts.ts** (~446 строк)
   - ~119 строк с русским текстом
   - Психологические контракты
   - Сценарии и ловушки

7. **planetMessages.ts** (~445 строк)
   - Диалоги планет
   - Системные промпты

8. **GlassTabBar.tsx** (~100 строк)
   - Названия вкладок (4 штуки)

9. **Остальные компоненты:**
   - DiscoverTabV2.tsx: ~192 строки с русским
   - ChatManager.tsx: ~42 строки
   - Другие: ~200 строк суммарно

**ИТОГО:** ~1440 вхождений кириллицы (с учётом Phase 2)

---

## 📋 Детальный план по задачам

### Задача 2.5.1: Настройка i18next и структуры переводов
**Время:** ~2 часа
**Зависимости:** нет
**Статус:** ⏳ Ожидает

#### Описание:
Установить react-i18next, создать конфигурацию, подготовить структуру JSON файлов для 3 языков (ru, de, en).

#### Шаги:

**2.5.1.1: Установка зависимостей (~10 минут)**

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

**Версии (проверенные с React 19):**
- `i18next`: ^23.7.0+
- `react-i18next`: ^14.0.0+
- `i18next-browser-languagedetector`: ^7.2.0+

**2.5.1.2: Создание структуры локализации (~1 час)**

**Файлы для создания:**

```
src/
  i18n/
    config.ts              # Конфигурация i18next
    locales/
      ru/
        common.json        # UI элементы (кнопки, ошибки)
        tabs.json          # Вкладки (4 штуки)
        auth.json          # Авторизация (login, signup)
        profile.json       # Настройка профиля
        settings.json      # Настройки
        calendar.json      # Календарь UI
        cycles.json        # Циклы (список, статистика)
        discover.json      # "Узнай себя" UI
        horoscope.json     # Гороскоп UI
        notifications.json # Уведомления
      de/
        [те же файлы]
      en/
        [те же файлы]
```

**Пример конфигурации** (`src/i18n/config.ts`):

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импорты JSON файлов
import ruCommon from './locales/ru/common.json';
import ruTabs from './locales/ru/tabs.json';
import ruAuth from './locales/ru/auth.json';
import ruProfile from './locales/ru/profile.json';
import ruSettings from './locales/ru/settings.json';
import ruCalendar from './locales/ru/calendar.json';
import ruCycles from './locales/ru/cycles.json';
import ruDiscover from './locales/ru/discover.json';
import ruHoroscope from './locales/ru/horoscope.json';
import ruNotifications from './locales/ru/notifications.json';

import deCommon from './locales/de/common.json';
import deTabs from './locales/de/tabs.json';
import deAuth from './locales/de/auth.json';
import deProfile from './locales/de/profile.json';
import deSettings from './locales/de/settings.json';
import deCalendar from './locales/de/calendar.json';
import deCycles from './locales/de/cycles.json';
import deDiscover from './locales/de/discover.json';
import deHoroscope from './locales/de/horoscope.json';
import deNotifications from './locales/de/notifications.json';

import enCommon from './locales/en/common.json';
import enTabs from './locales/en/tabs.json';
import enAuth from './locales/en/auth.json';
import enProfile from './locales/en/profile.json';
import enSettings from './locales/en/settings.json';
import enCalendar from './locales/en/calendar.json';
import enCycles from './locales/en/cycles.json';
import enDiscover from './locales/en/discover.json';
import enHoroscope from './locales/en/horoscope.json';
import enNotifications from './locales/en/notifications.json';

const resources = {
  ru: {
    common: ruCommon,
    tabs: ruTabs,
    auth: ruAuth,
    profile: ruProfile,
    settings: ruSettings,
    calendar: ruCalendar,
    cycles: ruCycles,
    discover: ruDiscover,
    horoscope: ruHoroscope,
    notifications: ruNotifications,
  },
  de: {
    common: deCommon,
    tabs: deTabs,
    auth: deAuth,
    profile: deProfile,
    settings: deSettings,
    calendar: deCalendar,
    cycles: deCycles,
    discover: deDiscover,
    horoscope: deHoroscope,
    notifications: deNotifications,
  },
  en: {
    common: enCommon,
    tabs: enTabs,
    auth: enAuth,
    profile: enProfile,
    settings: enSettings,
    calendar: enCalendar,
    cycles: enCycles,
    discover: enDiscover,
    horoscope: enHoroscope,
    notifications: enNotifications,
  },
};

i18n
  .use(LanguageDetector) // Автоопределение языка браузера
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru', // Русский как fallback
    defaultNS: 'common',
    ns: [
      'common',
      'tabs',
      'auth',
      'profile',
      'settings',
      'calendar',
      'cycles',
      'discover',
      'horoscope',
      'notifications',
    ],
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

**2.5.1.3: Интеграция в приложение (~30 минут)**

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

**Создать helper утилиту** `src/utils/i18nHelpers.ts`:

```typescript
import { supabase } from '../lib/supabaseClient';
import i18n from '../i18n/config';

/**
 * Синхронизирует язык пользователя: Supabase DB ↔ i18next ↔ localStorage
 */
export async function syncUserLanguage(userId: string | null): Promise<void> {
  if (!userId) {
    // Неавторизованный пользователь: используем язык из localStorage или браузера
    const localLang = localStorage.getItem('nastia-app-language') || navigator.language.slice(0, 2);
    const supportedLang = ['ru', 'de', 'en'].includes(localLang) ? localLang : 'ru';
    await i18n.changeLanguage(supportedLang);
    return;
  }

  // Авторизованный: загружаем из Supabase
  const { data, error } = await supabase
    .from('users_profiles')
    .select('language_code')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch language from Supabase:', error);
    return;
  }

  const lang = data.language_code || 'ru';
  await i18n.changeLanguage(lang);
  localStorage.setItem('nastia-app-language', lang);
}

/**
 * Сохраняет язык в Supabase (для авторизованных пользователей)
 */
export async function saveUserLanguage(userId: string, language: string): Promise<void> {
  const { error } = await supabase
    .from('users_profiles')
    .update({ language_code: language })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to save language to Supabase:', error);
    throw error;
  }

  await i18n.changeLanguage(language);
  localStorage.setItem('nastia-app-language', language);
}
```

#### Acceptance criteria:
- [ ] i18next установлен и настроен
- [ ] Создана структура локалей (10 JSON файлов × 3 языка = 30 файлов)
- [ ] `src/i18n/config.ts` корректно импортирует и инициализирует i18n
- [ ] i18next интегрирован в `index.tsx`
- [ ] Создан helper `i18nHelpers.ts` для синхронизации языка

**Связанные файлы:**
- `/src/index.tsx`
- `/src/i18n/config.ts` (новый)
- `/src/i18n/locales/**/*.json` (новые, 30 файлов)
- `/src/utils/i18nHelpers.ts` (новый)

---

### Задача 2.5.2: БД миграция и язык в Supabase
**Время:** ~2 часа
**Зависимости:** 2.5.1
**Статус:** ⏳ Ожидает

#### Описание:
Добавить колонку `language_code` в таблицу `users_profiles` через Supabase SQL Editor. Обновить RLS policies (если нужно).

#### Шаги:

**2.5.2.1: Создать SQL миграцию (~1 час)**

Открыть Supabase SQL Editor и выполнить:

```sql
-- ==============================================================================
-- Migration: Add language_code to users_profiles
-- ==============================================================================

-- 1. Добавить колонку language_code
ALTER TABLE public.users_profiles
ADD COLUMN language_code VARCHAR(5) DEFAULT 'ru';

-- 2. Создать индекс для быстрого поиска по языку (опционально)
CREATE INDEX idx_users_profiles_language ON public.users_profiles(language_code);

-- 3. Добавить CHECK constraint (только поддерживаемые языки)
ALTER TABLE public.users_profiles
ADD CONSTRAINT check_language_code CHECK (language_code IN ('ru', 'de', 'en'));

-- 4. Обновить комментарии к таблице
COMMENT ON COLUMN public.users_profiles.language_code IS 'User interface language: ru (русский), de (Deutsch), en (English)';

-- ==============================================================================
-- Опционально: добавить язык в другие таблицы (если нужно)
-- ==============================================================================

-- Для horoscope_memory (если контент генерируется на конкретном языке)
-- ALTER TABLE public.horoscope_memory
-- ADD COLUMN language VARCHAR(5) DEFAULT 'ru';

-- Для psychological_profiles (если анализ на конкретном языке)
-- ALTER TABLE public.psychological_profiles
-- ADD COLUMN language VARCHAR(5) DEFAULT 'ru';
```

**Обоснование:**
- `VARCHAR(5)` - достаточно для "ru", "de", "en" (можем расширить до "en-US", "de-DE" позже)
- `DEFAULT 'ru'` - для существующих пользователей (backwards compatibility)
- CHECK constraint - гарантирует валидность данных
- Индекс - ускоряет фильтрацию по языку (если будем делать статистику)

**2.5.2.2: Обновить TypeScript типы (~30 минут)**

**Обновить** `src/utils/userProfile.ts`:

```typescript
export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  birthDate: Date;
  birthTime: string; // "HH:MM"
  birthPlace: string;
  astroProfileId: string; // 'nastia', 'sergey', etc.
  languageCode: string; // ← ДОБАВИТЬ (ru, de, en)
  timezone: string; // Добавлено в Phase 2
  partner?: Partner | null;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await fetchUserProfile(user.id);
  return profile;
}
```

**Обновить** `src/utils/supabaseProfile.ts`:

```typescript
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users_profiles')
    .select(`
      user_id,
      name,
      email,
      birth_date,
      birth_time,
      birth_place,
      astro_profile_id,
      language_code,
      timezone,
      partners (*)
    `)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Failed to fetch user profile');
  }

  return {
    userId: data.user_id,
    name: data.name,
    email: data.email,
    birthDate: new Date(data.birth_date),
    birthTime: data.birth_time,
    birthPlace: data.birth_place,
    astroProfileId: data.astro_profile_id,
    languageCode: data.language_code || 'ru', // ← ДОБАВИТЬ
    timezone: data.timezone || 'UTC',
    partner: data.partners?.[0] || null,
  };
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const { error } = await supabase
    .from('users_profiles')
    .update({
      name: updates.name,
      birth_date: updates.birthDate?.toISOString().split('T')[0],
      birth_time: updates.birthTime,
      birth_place: updates.birthPlace,
      astro_profile_id: updates.astroProfileId,
      language_code: updates.languageCode, // ← ДОБАВИТЬ
      timezone: updates.timezone,
    })
    .eq('user_id', userId);

  if (error) throw error;
}
```

**2.5.2.3: Тестирование миграции (~30 минут)**

- [ ] Выполнить SQL миграцию через Supabase SQL Editor
- [ ] Проверить, что колонка `language_code` добавлена (Table Editor)
- [ ] Проверить, что существующие пользователи имеют `language_code = 'ru'`
- [ ] Проверить, что RLS policies работают (пользователь A не видит язык пользователя B)
- [ ] Загрузить профиль через `fetchUserProfile()` - проверить наличие `languageCode`

#### Acceptance criteria:
- [ ] SQL миграция выполнена успешно
- [ ] Колонка `language_code` добавлена в `users_profiles`
- [ ] CHECK constraint гарантирует только 'ru', 'de', 'en'
- [ ] TypeScript типы обновлены (`UserProfile.languageCode`)
- [ ] API функции обновлены (`fetchUserProfile`, `updateUserProfile`)
- [ ] Тесты: профиль загружается с языком корректно

**Связанные файлы:**
- Supabase SQL Editor (миграция)
- `/src/utils/userProfile.ts`
- `/src/utils/supabaseProfile.ts`

---

### Задача 2.5.3: Извлечение и перевод UI текстов
**Время:** ~8-10 часов
**Зависимости:** 2.5.1, 2.5.2
**Статус:** ⏳ Ожидает

#### Описание:
Заменить все хардкоженные русские тексты в компонентах на `t('key')` из react-i18next. Создать переводы для 3 языков (ru, de, en).

#### Шаги:

**2.5.3.1: Создание JSON-структуры для русского языка (~3 часа)**

Извлечь все тексты из компонентов и организовать в JSON файлы.

**Пример `locales/ru/common.json`** (базовые элементы):
```json
{
  "buttons": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    "close": "Закрыть",
    "retry": "Попробовать снова",
    "loading": "Загрузка...",
    "refresh": "Обновить",
    "edit": "Редактировать",
    "add": "Добавить",
    "back": "Назад",
    "next": "Далее",
    "done": "Готово"
  },
  "errors": {
    "generic": "Что-то пошло не так",
    "network": "Проблемы с сетью",
    "tryAgain": "Попробуйте ещё раз",
    "loadingFailed": "Не удалось загрузить данные"
  },
  "loading": {
    "default": "Загрузка...",
    "pleaseWait": "Пожалуйста, подождите"
  }
}
```

**Пример `locales/ru/tabs.json`**:
```json
{
  "calendar": "Календарь",
  "cycles": "Циклы",
  "discover": "Узнай себя",
  "settings": "Настройки"
}
```

**Пример `locales/ru/auth.json`** (авторизация):
```json
{
  "login": {
    "title": "Вход",
    "email": "Email",
    "password": "Пароль",
    "button": "Войти",
    "forgotPassword": "Забыли пароль?",
    "noAccount": "Нет аккаунта?",
    "signupLink": "Зарегистрироваться"
  },
  "signup": {
    "title": "Регистрация",
    "email": "Email",
    "password": "Пароль",
    "confirmPassword": "Подтвердите пароль",
    "button": "Создать аккаунт",
    "hasAccount": "Уже есть аккаунт?",
    "loginLink": "Войти"
  },
  "logout": {
    "button": "Выйти",
    "confirm": "Вы уверены, что хотите выйти?"
  },
  "errors": {
    "invalidEmail": "Неверный email",
    "weakPassword": "Слишком слабый пароль (минимум 6 символов)",
    "passwordMismatch": "Пароли не совпадают",
    "emailExists": "Email уже занят",
    "wrongCredentials": "Неверный email или пароль"
  }
}
```

**Пример `locales/ru/profile.json`** (настройка профиля):
```json
{
  "setup": {
    "title": "Настройка профиля",
    "subtitle": "Расскажите о себе для персонализации",
    "name": "Имя",
    "namePlaceholder": "Как вас зовут?",
    "birthDate": "Дата рождения",
    "birthTime": "Время рождения",
    "birthTimePlaceholder": "ЧЧ:ММ",
    "birthPlace": "Место рождения",
    "birthPlacePlaceholder": "Город, страна",
    "astroProfile": "Астрологический профиль",
    "timezone": "Часовой пояс",
    "saveButton": "Сохранить профиль"
  },
  "edit": {
    "title": "Редактировать профиль",
    "saveButton": "Сохранить изменения"
  },
  "partner": {
    "title": "Партнёр",
    "add": "Добавить партнёра",
    "edit": "Редактировать партнёра",
    "delete": "Удалить партнёра",
    "name": "Имя партнёра",
    "birthDate": "Дата рождения",
    "birthTime": "Время рождения",
    "birthPlace": "Место рождения"
  }
}
```

**Пример `locales/ru/calendar.json`** (календарь UI):
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
    "february": "Февраль",
    "march": "Март",
    "april": "Апрель",
    "may": "Май",
    "june": "Июнь",
    "july": "Июль",
    "august": "Август",
    "september": "Сентябрь",
    "october": "Октябрь",
    "november": "Ноябрь",
    "december": "Декабрь"
  },
  "weekDays": {
    "short": {
      "monday": "Пн",
      "tuesday": "Вт",
      "wednesday": "Ср",
      "thursday": "Чт",
      "friday": "Пт",
      "saturday": "Сб",
      "sunday": "Вс"
    }
  }
}
```

**Пример `locales/ru/settings.json`** (настройки):
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
  "profile": {
    "title": "Профиль",
    "edit": "Редактировать профиль"
  },
  "notifications": {
    "title": "Уведомления",
    "enable": "Включить уведомления",
    "test": "Тестовое уведомление"
  },
  "privacy": {
    "title": "Приватность",
    "deleteAccount": "Удалить аккаунт",
    "deleteConfirm": "Вы уверены? Все данные будут удалены безвозвратно."
  }
}
```

**2.5.3.2: Перевод на немецкий и английский (~2 часа)**

Использовать AI для первичного перевода (Claude/GPT):

**Промпт для AI:**
```
Переведи JSON файл с русскими текстами на [немецкий/английский] язык.

Контекст: Это приложение для отслеживания менструального цикла с астрологией.

Требования:
- Сохраняй структуру JSON (ключи не трогай)
- Переводи только значения
- Используй вежливую форму ("Sie" в немецком для форм, "you" в английском)
- Термины: "цикл" = "Zyklus" (de) / "cycle" (en)
- Термины: "фертильное окно" = "fruchtbares Fenster" (de) / "fertile window" (en)

[Вставить JSON файл]
```

**Ручная корректировка:**
- Проверить медицинские термины (цикл, овуляция, фертильность)
- Проверить астрологические термины (натальная карта, транзиты)
- Адаптировать под культурный контекст (немецкий: более формально, английский: нейтрально)

**2.5.3.3: Замена текстов в компонентах (~3-4 часа)**

**Обновить** `src/components/GlassTabBar.tsx`:

```typescript
import { useTranslation } from 'react-i18next';

export const GlassTabBar: React.FC<Props> = ({ activeTab, onTabChange, hasUnreadChoices }) => {
  const { t } = useTranslation('tabs');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'calendar', label: t('calendar'), icon: <CalendarIcon /> },
    { id: 'cycles', label: t('cycles'), icon: <ActivityIcon /> },
    { id: 'discover', label: t('discover'), icon: <SparklesIcon /> },
    { id: 'settings', label: t('settings'), icon: <SettingsIcon /> },
  ];

  // ... rest
};
```

**Обновить** `src/components/ModernNastiaApp.tsx` (основной компонент):

```typescript
import { useTranslation } from 'react-i18next';
import { syncUserLanguage } from '../utils/i18nHelpers';

export const ModernNastiaApp: React.FC = () => {
  const { t } = useTranslation(['common', 'calendar', 'cycles', 'settings']);

  // Синхронизация языка при загрузке пользователя
  useEffect(() => {
    if (user) {
      syncUserLanguage(user.id);
    }
  }, [user]);

  return (
    <div>
      {/* Пример использования */}
      <button>{t('common:buttons.save')}</button>
      <h1>{t('calendar:today')}</h1>
      <p>{t('cycles:daysUntilNext')}</p>
    </div>
  );
};
```

**Обновить** `src/components/AuthModal.tsx`:

```typescript
import { useTranslation } from 'react-i18next';

export const AuthModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('auth');

  return (
    <FullScreenModal isOpen={isOpen} onClose={onClose} title={t('login.title')}>
      <input placeholder={t('login.email')} />
      <input type="password" placeholder={t('login.password')} />
      <button>{t('login.button')}</button>
      <a>{t('login.forgotPassword')}</a>
    </FullScreenModal>
  );
};
```

**Обновить** `src/components/ProfileSetupModal.tsx`:

```typescript
import { useTranslation } from 'react-i18next';

export const ProfileSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('profile');

  return (
    <FullScreenModal isOpen={isOpen} onClose={onClose} title={t('setup.title')}>
      <p>{t('setup.subtitle')}</p>
      <input placeholder={t('setup.namePlaceholder')} />
      <input type="date" placeholder={t('setup.birthDate')} />
      {/* ... rest */}
    </FullScreenModal>
  );
};
```

**Обновить Settings секцию** (ModernNastiaApp.tsx):

```typescript
// Settings tab rendering
{activeTab === 'settings' && (
  <div className={styles.settingsContainer}>
    <h2>{t('settings:title')}</h2>

    {/* Language selector */}
    <div className={styles.settingGroup}>
      <h3>{t('settings:language.title')}</h3>
      <p>{t('settings:language.description')}</p>
      <select value={currentLanguage} onChange={handleLanguageChange}>
        <option value="ru">{t('settings:language.ru')}</option>
        <option value="de">{t('settings:language.de')}</option>
        <option value="en">{t('settings:language.en')}</option>
      </select>
    </div>

    {/* Profile edit button */}
    <button onClick={openProfileEdit}>
      {t('settings:profile.edit')}
    </button>
  </div>
)}
```

**2.5.3.4: Тестирование UI переводов (~1 час)**

- [ ] Переключить язык на "de" → проверить все вкладки
- [ ] Переключить язык на "en" → проверить все вкладки
- [ ] Переключить обратно на "ru" → проверить корректность
- [ ] Проверить формы (login, signup, profile setup)
- [ ] Проверить Settings (переключатель языка работает)
- [ ] Проверить, что язык сохраняется в Supabase
- [ ] Перезагрузить страницу → язык должен сохраниться

#### Acceptance criteria:
- [ ] Все JSON файлы созданы (30 файлов: 10 × 3 языка)
- [ ] Русские тексты извлечены корректно
- [ ] Переводы на немецкий и английский завершены
- [ ] Все компоненты обновлены (используют `t()`)
- [ ] GlassTabBar использует переводы
- [ ] AuthModal использует переводы
- [ ] ProfileSetupModal использует переводы
- [ ] Settings имеет LanguageSelector
- [ ] Переключение языка работает и сохраняется в Supabase
- [ ] Тестирование успешно на всех 3 языках

**Связанные файлы:**
- `/src/i18n/locales/**/*.json` (30 файлов)
- `/src/components/GlassTabBar.tsx`
- `/src/components/ModernNastiaApp.tsx`
- `/src/components/AuthModal.tsx`
- `/src/components/ProfileSetupModal.tsx`
- `/src/components/DiscoverTabV2.tsx`
- Другие компоненты с текстами

---

### Задача 2.5.4: Локализация AI промптов
**Время:** ~4-5 часов
**Зависимости:** 2.5.1, 2.5.2, 2.5.3
**Статус:** ⏳ Ожидает

#### Описание:
Обновить AI промпты (horoscope.ts, historyStory.ts, planetMessages.ts) для генерации контента на языке пользователя. Передавать `languageCode` в Edge Function.

#### Шаги:

**2.5.4.1: Создать локализованные системные промпты (~2 часа)**

**Создать файл** `src/utils/aiPrompts.ts`:

```typescript
/**
 * Локализованные системные промпты для AI контента
 */

export const SYSTEM_PROMPTS = {
  horoscope: {
    ru: `Ты - астролог, который пишет гороскопы для Насти.
Стиль: тепло, легко, с юмором, без пафоса.
Длина: 2-3 абзаца.`,

    de: `Du bist ein Astrologe, der Horoskope für Nastia schreibt.
Stil: warm, leicht, mit Humor, ohne Pathos.
Länge: 2-3 Absätze.`,

    en: `You are an astrologer writing horoscopes for Nastia.
Style: warm, light, with humor, no pathos.
Length: 2-3 paragraphs.`,
  },

  story: {
    ru: `Ты - психолог-рассказчик, который создаёт интерактивные истории.
Стиль: глубоко, мягко, без морализаторства.
Задача: помочь пользователю осознать свои паттерны поведения.`,

    de: `Du bist ein Psychologe-Geschichtenerzähler, der interaktive Geschichten erstellt.
Stil: tiefgründig, sanft, ohne Moralisieren.
Aufgabe: dem Benutzer helfen, seine Verhaltensmuster zu erkennen.`,

    en: `You are a psychologist-storyteller creating interactive stories.
Style: deep, gentle, without moralizing.
Goal: help the user recognize their behavioral patterns.`,
  },

  planet: {
    ru: `Ты - планета из натальной карты, которая разговаривает с пользователем.
Стиль: короткие фразы, характер планеты.`,

    de: `Du bist ein Planet aus dem Geburtshoroskop, der mit dem Benutzer spricht.
Stil: kurze Sätze, Charakter des Planeten.`,

    en: `You are a planet from the natal chart talking to the user.
Style: short phrases, planet's character.`,
  },
};

/**
 * Получить локализованный системный промпт
 */
export function getSystemPrompt(
  type: 'horoscope' | 'story' | 'planet',
  languageCode: string
): string {
  const lang = ['ru', 'de', 'en'].includes(languageCode) ? languageCode : 'ru';
  return SYSTEM_PROMPTS[type][lang as 'ru' | 'de' | 'en'];
}

/**
 * Инструкция для AI: генерировать контент на языке пользователя
 */
export function getLanguageInstruction(languageCode: string): string {
  const instructions = {
    ru: 'Отвечай на русском языке.',
    de: 'Antworte auf Deutsch.',
    en: 'Respond in English.',
  };
  return instructions[languageCode as 'ru' | 'de' | 'en'] || instructions.ru;
}
```

**2.5.4.2: Обновить horoscope.ts (~1 час)**

**Обновить** `src/utils/horoscope.ts`:

```typescript
import { getSystemPrompt, getLanguageInstruction } from './aiPrompts';
import { getCurrentUser } from '../data/userProfile';

export async function fetchDailyHoroscope(): Promise<DailyHoroscope> {
  const user = await getCurrentUser();
  const languageCode = user?.languageCode || 'ru';

  const systemPrompt = getSystemPrompt('horoscope', languageCode);
  const languageInstruction = getLanguageInstruction(languageCode);

  // Строим промпт с учётом языка
  const userPrompt = `${languageInstruction}

Напиши дневной гороскоп для ${user?.name || 'Насти'}.
Дата: ${new Date().toLocaleDateString(languageCode)}.

[Остальной контекст: астро карта, транзиты, фаза цикла...]`;

  const response = await callAI({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.8,
    maxTokens: 800,
  });

  return {
    text: response.text,
    date: new Date().toISOString(),
    provider: response.provider,
  };
}
```

**2.5.4.3: Обновить historyStory.ts (~1 час)**

**Обновить** `src/utils/historyStory.ts`:

```typescript
import { getSystemPrompt, getLanguageInstruction } from './aiPrompts';
import { getCurrentUser } from '../data/userProfile';

export async function generateStorySegment(
  contract: PsychologicalContract,
  scenario: ContractScenario,
  previousChoices: string[]
): Promise<StorySegment> {
  const user = await getCurrentUser();
  const languageCode = user?.languageCode || 'ru';

  const systemPrompt = getSystemPrompt('story', languageCode);
  const languageInstruction = getLanguageInstruction(languageCode);

  const userPrompt = `${languageInstruction}

Создай сегмент интерактивной истории:
- Контракт: ${contract.question}
- Сценарий: ${scenario.situation}
- Предыдущие выборы: ${previousChoices.join(', ')}

[Остальной контекст...]`;

  const response = await callAI({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.9,
    maxTokens: 600,
  });

  return parseStorySegment(response.text);
}
```

**2.5.4.4: Обновить planetMessages.ts (~30 минут)**

**Обновить** `src/utils/planetMessages.ts`:

```typescript
import { getSystemPrompt, getLanguageInstruction } from './aiPrompts';
import { getCurrentUser } from '../data/userProfile';

export async function generatePlanetDialogue(
  planetName: string
): Promise<string[]> {
  const user = await getCurrentUser();
  const languageCode = user?.languageCode || 'ru';

  const systemPrompt = getSystemPrompt('planet', languageCode);
  const languageInstruction = getLanguageInstruction(languageCode);

  const userPrompt = `${languageInstruction}

Ты - планета ${planetName}. Придумай 10 коротких фраз в твоём стиле.

[Остальной контекст: характер планеты, аспекты...]`;

  const response = await callAI({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.9,
    maxTokens: 500,
  });

  return response.text.split('\n').filter(line => line.trim());
}
```

**2.5.4.5: Обновить Edge Function (~30 минут)**

**Обновить** `supabase/functions/generate-ai-content/index.ts`:

```typescript
serve(async (req) => {
  const {
    system,
    messages,
    temperature = 0.8,
    maxTokens = 500,
    preferOpenAI = false,
    languageCode = 'ru', // ← ДОБАВИТЬ
  } = await req.json();

  // languageCode уже передан в промптах, но можем логировать
  console.log(`[Edge Function] Generating content in language: ${languageCode}`);

  // ... остальная логика (вызов Claude/OpenAI)
});
```

**2.5.4.6: Обновить aiClient.ts для передачи языка (~30 минут)**

**Обновить** `src/utils/aiClient.ts`:

```typescript
export interface AIRequestOptions {
  system?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  claudeApiKey?: string;
  claudeProxyUrl?: string;
  openAIApiKey?: string;
  openAIProxyUrl?: string;
  preferOpenAI?: boolean;
  useGPT4oMini?: boolean;
  languageCode?: string; // ← ДОБАВИТЬ
}

async function callSupabaseEdgeFunction(
  options: AIRequestOptions
): Promise<AIResponse> {
  const {
    system,
    messages,
    temperature = 0.8,
    maxTokens = 500,
    preferOpenAI = false,
    languageCode = 'ru', // ← ДОБАВИТЬ
  } = options;

  const { data, error } = await supabase.functions.invoke('generate-ai-content', {
    body: {
      system,
      messages,
      temperature,
      maxTokens,
      preferOpenAI,
      languageCode, // ← ДОБАВИТЬ
    }
  });

  // ... rest
}
```

**2.5.4.7: Тестирование AI промптов (~1 час)**

- [ ] Переключить язык на "de" → запросить дневной гороскоп → проверить, что текст на немецком
- [ ] Переключить язык на "en" → запросить дневной гороскоп → проверить, что текст на английском
- [ ] Переключить обратно на "ru" → проверить гороскоп на русском
- [ ] Запустить интерактивную историю на "de" → проверить, что сегменты на немецком
- [ ] Проверить диалог планет на "en"
- [ ] Проверить fallback контент (если AI недоступен)

#### Acceptance criteria:
- [ ] Создан `aiPrompts.ts` с локализованными системными промптами
- [ ] `horoscope.ts` обновлён (передаёт язык в промпт)
- [ ] `historyStory.ts` обновлён (передаёт язык в промпт)
- [ ] `planetMessages.ts` обновлён (передаёт язык в промпт)
- [ ] Edge Function обновлена (принимает `languageCode`)
- [ ] `aiClient.ts` обновлён (передаёт `languageCode`)
- [ ] Тестирование: AI генерирует контент на правильном языке

**Связанные файлы:**
- `/src/utils/aiPrompts.ts` (новый)
- `/src/utils/horoscope.ts`
- `/src/utils/historyStory.ts`
- `/src/utils/planetMessages.ts`
- `/src/utils/aiClient.ts`
- `/supabase/functions/generate-ai-content/index.ts`

---

### Задача 2.5.5: Локализация психологических контрактов
**Время:** ~3-4 часа
**Зависимости:** 2.5.1, 2.5.2, 2.5.3
**Статус:** ⏳ Ожидает

#### Описание:
Перевести психологические контракты (questions, themes, traps, scenarios) на немецкий и английский. Создать мультиязычную структуру.

#### Шаги:

**2.5.5.1: Рефакторинг структуры контрактов (~1 час)**

**Обновить** `src/data/psychologicalContracts.ts`:

```typescript
/**
 * Мультиязычные психологические контракты
 */

export interface LocalizedText {
  ru: string;
  de: string;
  en: string;
}

export interface PsychologicalTrap {
  name: LocalizedText;
  description: LocalizedText;
}

export interface ContractScenario {
  id: string;
  setting: LocalizedText;
  situation: LocalizedText;
  symbolism: LocalizedText;
}

export interface PsychologicalContract {
  id: string;
  question: LocalizedText;
  theme: LocalizedText;
  astroIndicators: string[]; // Не переводим (технические термины)
  commonTraps: PsychologicalTrap[];
  scenarios: ContractScenario[];
  choicePoints: LocalizedText[];
}

// Пример контракта с переводами
export const FALLBACK_CONTRACTS: PsychologicalContract[] = [
  {
    id: 'work-boundaries',
    question: {
      ru: 'Могу ли я отказаться от сверхурочной работы, если это нужно мне?',
      de: 'Kann ich Überstunden ablehnen, wenn ich sie brauche?',
      en: 'Can I refuse overtime work if I need to?',
    },
    theme: {
      ru: 'Границы на работе',
      de: 'Grenzen bei der Arbeit',
      en: 'Work boundaries',
    },
    astroIndicators: [
      'Saturn-Sun (duty vs own will)',
      'Moon-Saturn (guilt)',
      '10th house overloaded',
    ],
    commonTraps: [
      {
        name: {
          ru: 'Быть незаменимой',
          de: 'Unersetzlich sein',
          en: 'Being irreplaceable',
        },
        description: {
          ru: 'Верить, что без тебя всё развалится, поэтому нельзя отказать',
          de: 'Glauben, dass ohne dich alles zusammenbricht, deshalb kann man nicht ablehnen',
          en: 'Believing that without you everything will fall apart, so you can\'t refuse',
        },
      },
      // ... more traps
    ],
    scenarios: [
      {
        id: 'work-boundaries-office',
        setting: {
          ru: 'Офис перед выходными',
          de: 'Büro vor dem Wochenende',
          en: 'Office before the weekend',
        },
        situation: {
          ru: 'Руководитель просит задержаться на несколько часов',
          de: 'Vorgesetzter bittet, ein paar Stunden zu bleiben',
          en: 'Manager asks to stay a few hours',
        },
        symbolism: {
          ru: 'Выбор между отдыхом и чувством вины',
          de: 'Wahl zwischen Ruhe und Schuldgefühl',
          en: 'Choice between rest and guilt',
        },
      },
      // ... more scenarios
    ],
    choicePoints: [
      {
        ru: 'Что ты скажешь руководителю?',
        de: 'Was sagst du dem Vorgesetzten?',
        en: 'What will you tell the manager?',
      },
      // ... more choice points
    ],
  },
  // ... more contracts
];
```

**Создать helper функцию** `src/utils/contractHelpers.ts`:

```typescript
import { PsychologicalContract, LocalizedText } from '../data/psychologicalContracts';
import { getCurrentUser } from '../data/userProfile';

/**
 * Получить локализованный текст на языке пользователя
 */
export function getLocalizedText(text: LocalizedText, fallbackLang: string = 'ru'): string {
  const user = await getCurrentUser();
  const lang = user?.languageCode || fallbackLang;
  return text[lang as 'ru' | 'de' | 'en'] || text.ru;
}

/**
 * Получить локализованный контракт (все тексты на языке пользователя)
 */
export async function getLocalizedContract(
  contract: PsychologicalContract
): Promise<PsychologicalContract> {
  const user = await getCurrentUser();
  const lang = (user?.languageCode || 'ru') as 'ru' | 'de' | 'en';

  return {
    ...contract,
    question: contract.question[lang] || contract.question.ru,
    theme: contract.theme[lang] || contract.theme.ru,
    commonTraps: contract.commonTraps.map(trap => ({
      name: trap.name[lang] || trap.name.ru,
      description: trap.description[lang] || trap.description.ru,
    })),
    scenarios: contract.scenarios.map(scenario => ({
      ...scenario,
      setting: scenario.setting[lang] || scenario.setting.ru,
      situation: scenario.situation[lang] || scenario.situation.ru,
      symbolism: scenario.symbolism[lang] || scenario.symbolism.ru,
    })),
    choicePoints: contract.choicePoints.map(cp => cp[lang] || cp.ru),
  };
}
```

**2.5.5.2: Перевод контрактов (~2 часа)**

Использовать AI для перевода:

**Промпт для AI:**
```
Переведи психологический контракт на [немецкий/английский] язык.

Контекст: Это психологический тест для самопознания. Контракт описывает психологическую ловушку (например, "быть незаменимой").

Требования:
- Сохраняй эмоциональную глубину
- Используй вежливую форму обращения
- Термины должны звучать естественно

[Вставить контракт в JSON формате]
```

Перевести все контракты из `psychologicalContracts.ts`:
- work-boundaries
- relationship-validation
- emotional-caretaking
- perfectionism-trap
- people-pleasing
- ... (всего ~10-15 контрактов)

**2.5.5.3: Обновить использование контрактов в коде (~1 час)**

**Обновить** `src/utils/historyStory.ts`:

```typescript
import { getLocalizedContract } from './contractHelpers';

export async function generateStorySegment(
  contractId: string,
  scenarioId: string,
  previousChoices: string[]
): Promise<StorySegment> {
  // Загружаем контракт
  const rawContract = FALLBACK_CONTRACTS.find(c => c.id === contractId);
  if (!rawContract) throw new Error('Contract not found');

  // Локализуем контракт на язык пользователя
  const contract = await getLocalizedContract(rawContract);

  // Используем локализованные тексты в промпте
  const userPrompt = `
Создай сегмент истории:
- Вопрос: ${contract.question}
- Тема: ${contract.theme}
- Сценарий: ${contract.scenarios[0].situation}

[Остальной контекст...]`;

  // ... rest
}
```

**Обновить** `src/components/DiscoverTabV2.tsx`:

```typescript
import { getLocalizedContract } from '../utils/contractHelpers';

export const DiscoverTabV2: React.FC = () => {
  const [contract, setContract] = useState<PsychologicalContract | null>(null);

  useEffect(() => {
    async function loadContract() {
      const rawContract = FALLBACK_CONTRACTS[0];
      const localizedContract = await getLocalizedContract(rawContract);
      setContract(localizedContract);
    }
    loadContract();
  }, []);

  return (
    <div>
      {contract && (
        <>
          <h2>{contract.theme}</h2>
          <p>{contract.question}</p>
          {/* ... rest */}
        </>
      )}
    </div>
  );
};
```

**2.5.5.4: Тестирование контрактов (~30 минут)**

- [ ] Переключить язык на "de" → открыть вкладку "Узнай себя" → проверить, что контракт на немецком
- [ ] Переключить язык на "en" → проверить, что контракт на английском
- [ ] Запустить интерактивную историю на "de" → проверить, что все тексты (question, theme, scenarios) на немецком
- [ ] Проверить fallback на русский (если язык не поддерживается)

#### Acceptance criteria:
- [ ] Структура контрактов обновлена (поддержка `LocalizedText`)
- [ ] Все контракты переведены на немецкий и английский
- [ ] Создан `contractHelpers.ts` с утилитами локализации
- [ ] `historyStory.ts` использует локализованные контракты
- [ ] `DiscoverTabV2.tsx` отображает контракты на языке пользователя
- [ ] Тестирование: контракты работают на всех 3 языках

**Связанные файлы:**
- `/src/data/psychologicalContracts.ts`
- `/src/utils/contractHelpers.ts` (новый)
- `/src/utils/historyStory.ts`
- `/src/components/DiscoverTabV2.tsx`

---

### Задача 2.5.6: Тестирование и документация
**Время:** ~2-3 часа
**Зависимости:** 2.5.1, 2.5.2, 2.5.3, 2.5.4, 2.5.5
**Статус:** ⏳ Ожидает

#### Описание:
Комплексное тестирование i18n на всех языках, обновление документации.

#### Шаги:

**2.5.6.1: Комплексное тестирование (~1.5 часа)**

**Тест-сценарий 1: Новый пользователь (русский язык)**
- [ ] Открыть приложение без авторизации
- [ ] Язык должен определиться из браузера (или "ru" по умолчанию)
- [ ] Зарегистрироваться → язык "ru" сохраняется в БД
- [ ] Настроить профиль → все тексты на русском
- [ ] Добавить цикл → проверить календарь
- [ ] Открыть "Узнай себя" → контракты на русском
- [ ] Запросить гороскоп → текст на русском

**Тест-сценарий 2: Переключение языка (авторизованный пользователь)**
- [ ] Войти в аккаунт (язык "ru")
- [ ] Открыть Settings → переключить на "de"
- [ ] Проверить, что язык сохранился в Supabase
- [ ] Перезагрузить страницу → язык должен остаться "de"
- [ ] Проверить все вкладки (календарь, циклы, узнай себя, настройки)
- [ ] Запросить гороскоп → текст на немецком
- [ ] Переключить на "en" → повторить проверки

**Тест-сценарий 3: AI контент на разных языках**
- [ ] Язык "de" → запросить дневной гороскоп → проверить немецкий текст
- [ ] Язык "en" → запросить дневной гороскоп → проверить английский текст
- [ ] Запустить интерактивную историю на "de" → все сегменты на немецком
- [ ] Запустить интерактивную историю на "en" → все сегменты на английском

**Тест-сценарий 4: Fallback и граничные случаи**
- [ ] Удалить `language_code` из БД (set to NULL) → должен fallback на "ru"
- [ ] Передать неподдерживаемый язык ("fr") → должен fallback на "ru"
- [ ] Проверить, что CHECK constraint в БД блокирует неподдерживаемые языки

**Тест-сценарий 5: Мультипользовательский режим (RLS)**
- [ ] Создать 2 тестовых аккаунта: user_ru (язык "ru"), user_de (язык "de")
- [ ] user_ru: проверить, что язык "ru" сохранён и загружается корректно
- [ ] user_de: проверить, что язык "de" сохранён и загружается корректно
- [ ] user_ru НЕ должен видеть язык user_de (RLS)

**2.5.6.2: Обновление документации (~1 час)**

**Обновить** `CLAUDE.md`:

```markdown
## 🌍 Internationalization (i18n)

**Поддерживаемые языки:**
- **ru** (Русский) - основной
- **de** (Deutsch) - немецкий
- **en** (English) - английский

**Библиотека:** react-i18next v14+

**Структура переводов:**
```
src/i18n/
  config.ts              # Конфигурация i18next
  locales/
    ru/                  # Русские переводы (10 файлов)
    de/                  # Немецкие переводы (10 файлов)
    en/                  # Английские переводы (10 файлов)
```

**Использование в компонентах:**
```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation('common');
  return <button>{t('buttons.save')}</button>;
};
```

**Язык пользователя:**
- Хранится в Supabase: `users_profiles.language_code`
- Синхронизируется через `i18nHelpers.ts`
- Передаётся в AI промпты (Edge Function)

**Добавление нового языка:**
1. Добавить язык в CHECK constraint (Supabase SQL)
2. Создать `src/i18n/locales/{lang}/*.json`
3. Обновить `src/i18n/config.ts` (импорты + resources)
4. Обновить `SYSTEM_PROMPTS` в `aiPrompts.ts`
5. Обновить `LocalizedText` тип в `psychologicalContracts.ts`
```

**Обновить** `docs/MASTER_PLAN.md`:

```markdown
### ✅ Фаза 2.5: Интернационализация (i18n)
**Статус:** ✅ ЗАВЕРШЕНА (100% - 6/6 задач)
**Документ:** [PHASE_2.5_I18N_DETAILED_PLAN.md](./roadmap/PHASE_2.5_I18N_DETAILED_PLAN.md)
**Завершено:** [DATE]
**ETA:** 20-24 часа

**Цель:** Добавить поддержку 3 языков (ru, de, en) с использованием react-i18next и Supabase.

**Ключевые задачи (выполнено):**
- [x] Настройка i18next (30 JSON файлов: 10 × 3 языка)
- [x] БД миграция (`language_code` в `users_profiles`)
- [x] Извлечение и перевод UI текстов (~1440 вхождений)
- [x] Локализация AI промптов (horoscope, story, planet)
- [x] Локализация психологических контрактов (~10-15 контрактов)
- [x] Тестирование на всех 3 языках

**Критерии завершения (выполнено):**
- ✅ i18next настроен, работают 3 языка (ru, de, en)
- ✅ Все UI тексты заменены на `t('key')`
- ✅ Переключатель языка в Settings работает
- ✅ Язык сохраняется в Supabase (`users_profiles.language_code`)
- ✅ AI контент генерируется на языке пользователя
- ✅ Психологические контракты мультиязычные
- ✅ Тестирование успешно (2 тестовых аккаунта: ru, de)
```

**Создать** `docs/I18N_GUIDE.md`:

```markdown
# 🌍 I18n Guide - Руководство по интернационализации

## Обзор

Nastia Calendar поддерживает 3 языка: русский (ru), немецкий (de), английский (en).

## Архитектура

### 1. Хранение языка пользователя
- **Supabase:** `users_profiles.language_code` (VARCHAR(5))
- **localStorage:** `nastia-app-language` (fallback для неавторизованных)
- **i18next:** синхронизируется через `i18nHelpers.ts`

### 2. Структура переводов
- 10 JSON файлов на язык: common, tabs, auth, profile, settings, calendar, cycles, discover, horoscope, notifications
- Всего: 30 файлов

### 3. AI промпты
- Локализованные системные промпты: `aiPrompts.ts`
- Передача `languageCode` в Edge Function
- AI генерирует контент на языке пользователя

### 4. Психологические контракты
- Мультиязычная структура: `LocalizedText { ru, de, en }`
- Утилита `getLocalizedContract()` для получения переводов

## Как добавить перевод нового текста

1. Найти правильный JSON файл (common, tabs, auth, etc.)
2. Добавить ключ в русский JSON:
   ```json
   {
     "newKey": "Новый текст"
   }
   ```
3. Перевести на немецкий и английский:
   ```json
   // de/common.json
   { "newKey": "Neuer Text" }

   // en/common.json
   { "newKey": "New text" }
   ```
4. Использовать в компоненте:
   ```tsx
   const { t } = useTranslation('common');
   <p>{t('newKey')}</p>
   ```

## Как добавить новый язык

См. раздел "Добавление нового языка" в CLAUDE.md.

## Тестирование

- Переключить язык в Settings
- Проверить все вкладки
- Запросить AI контент (гороскоп, история)
- Перезагрузить страницу → язык должен сохраниться
```

**2.5.6.3: Коммит и деплой (~30 минут)**

```bash
# Проверить все изменения
git status

# Коммит
git add .
git commit -m "feat(i18n): add multi-language support (ru, de, en)

- Setup i18next with 30 JSON files (10 × 3 languages)
- Add language_code column to users_profiles (Supabase migration)
- Translate UI texts (~1440 occurrences)
- Localize AI prompts (horoscope, story, planet)
- Localize psychological contracts (~10-15 contracts)
- Add LanguageSelector in Settings
- Sync language: Supabase ↔ i18next ↔ localStorage
- Update documentation (CLAUDE.md, MASTER_PLAN.md, I18N_GUIDE.md)

Related: PHASE_2.5 - Internationalization (i18n)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Пуш
git push

# Деплой
npm run deploy
```

#### Acceptance criteria:
- [ ] Все тест-сценарии пройдены успешно
- [ ] Документация обновлена (CLAUDE.md, MASTER_PLAN.md, I18N_GUIDE.md)
- [ ] Коммит создан с детальным описанием
- [ ] Изменения задеплоены на production

**Связанные файлы:**
- `/CLAUDE.md`
- `/docs/MASTER_PLAN.md`
- `/docs/I18N_GUIDE.md` (новый)
- Git commit

---

## 📊 Общая оценка времени

**Итоговая таблица:**

| Задача | Описание | Время |
|--------|----------|-------|
| 2.5.1 | Настройка i18next и структуры | 2 часа |
| 2.5.2 | БД миграция (language_code) | 2 часа |
| 2.5.3 | Извлечение и перевод UI текстов | 8-10 часов |
| 2.5.4 | Локализация AI промптов | 4-5 часов |
| 2.5.5 | Локализация психологических контрактов | 3-4 часа |
| 2.5.6 | Тестирование и документация | 2-3 часа |

**ИТОГО:** 20-24 часа → 3-4 рабочих дня

---

## ✅ Критерии завершения фазы

**Обязательные:**
- [ ] i18next установлен и настроен
- [ ] Созданы 30 JSON файлов с переводами (10 × 3 языка)
- [ ] Колонка `language_code` добавлена в `users_profiles` (Supabase)
- [ ] Все UI тексты заменены на `t('key')` (~1440 вхождений)
- [ ] Переключатель языка в Settings работает
- [ ] Язык сохраняется в Supabase и синхронизируется с i18next
- [ ] AI промпты генерируют контент на языке пользователя
- [ ] Психологические контракты мультиязычные
- [ ] Тестирование успешно на всех 3 языках (ru, de, en)
- [ ] Документация обновлена (CLAUDE.md, MASTER_PLAN.md, I18N_GUIDE.md)

**Опциональные (nice-to-have):**
- [ ] Автоопределение языка по геолокации (IP → страна → язык)
- [ ] Переводы проверены носителями языка (немецкий, английский)
- [ ] A/B тестирование: влияние языка на engagement

---

## 🚨 Риски и митигация

### Риск 1: Качество AI переводов
**Описание:** AI может сгенерировать неточные или неестественные переводы.

**Митигация:**
- Использовать контекстные промпты с примерами
- Проверить медицинские и астрологические термины вручную
- Запросить feedback от носителей языка (немецкий, английский)

### Риск 2: Неполный охват текстов
**Описание:** Можем пропустить хардкоженные тексты в малоиспользуемых компонентах.

**Митигация:**
- Использовать Grep для поиска кириллицы: `grep -r "[а-яА-Я]" src/`
- Тестировать все вкладки на всех языках
- Создать fallback на русский язык (если ключ не найден)

### Риск 3: AI генерирует контент на неправильном языке
**Описание:** Edge Function не передаёт `languageCode` или AI игнорирует инструкцию.

**Митигация:**
- Явная инструкция в промпте: "Antworte auf Deutsch." (немецкий)
- Логирование языка в Edge Function
- Тестирование AI контента на всех языках перед деплоем

### Риск 4: Перевод контрактов теряет психологическую глубину
**Описание:** Психологические нюансы могут потеряться при переводе.

**Митигация:**
- Использовать профессиональные термины (проверить глоссарий психологии)
- Запросить review у психолога (если возможно)
- Тестировать контракты на фокус-группе (немецкие/английские пользователи)

---

## 📋 Чеклист готовности к следующей фазе

Перед переходом к **Фазе 4: AI-агенты** убедиться:

- [ ] i18n работает стабильно на всех 3 языках
- [ ] Язык пользователя корректно сохраняется в Supabase
- [ ] AI контент генерируется на правильном языке
- [ ] Нет критических багов в переключении языка
- [ ] Документация актуальна
- [ ] Коммиты задокументированы и запушены
- [ ] Production деплой успешен

---

**Дата создания:** 2025-10-27
**Версия:** 2.0.0 (обновлено с Phase 1.5 под Supabase архитектуру)
**Автор:** Claude Code Agent
