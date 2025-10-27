# 🚀 Быстрый старт: Фаза 2.5 - Интернационализация (i18n)

**Дата:** 2025-10-27
**Версия:** 1.0.0
**ETA:** 3-4 дня (20-24 часа)

---

## 🎯 Что делаем?

Добавляем поддержку 3 языков: **русский (ru)**, **немецкий (de)**, **английский (en)**

**Библиотека:** react-i18next v14+

---

## ⚡ Быстрый старт (5 минут)

### 1. Прочитай детальный план
```bash
cat docs/roadmap/PHASE_2.5_I18N_DETAILED_PLAN.md
```

### 2. Проверь текущий статус
```bash
cat docs/progress/CURRENT_TASK.md
```

### 3. Начни задачу 2.5.1
```bash
# Установить зависимости
npm install i18next react-i18next i18next-browser-languagedetector

# Создать структуру
mkdir -p src/i18n/locales/{ru,de,en}
```

---

## 📋 Все задачи (6 шт, 20-24 часа)

### 2.5.1: Настройка i18next (~2 часа)
- Установить библиотеки
- Создать 30 JSON файлов (10 × 3 языка)
- Настроить `i18n/config.ts`
- Создать `i18nHelpers.ts`

### 2.5.2: БД миграция (~2 часа)
- Добавить `language_code VARCHAR(5)` в `users_profiles`
- Обновить TypeScript типы (`UserProfile`)
- Обновить API (`fetchUserProfile`, `updateUserProfile`)

### 2.5.3: Извлечение и перевод UI (~8-10 часов)
- Создать JSON с русскими текстами
- Перевести на немецкий и английский (AI)
- Заменить тексты на `t('key')` в компонентах
- Добавить LanguageSelector в Settings

### 2.5.4: Локализация AI промптов (~4-5 часов)
- Создать `aiPrompts.ts` (системные промпты на 3 языках)
- Обновить `horoscope.ts` → передавать язык
- Обновить `historyStory.ts` → передавать язык
- Обновить `planetMessages.ts` → передавать язык
- Обновить Edge Function → принимать `languageCode`

### 2.5.5: Локализация контрактов (~3-4 часа)
- Рефакторинг структуры: `LocalizedText { ru, de, en }`
- Перевести все контракты (~10-15 шт)
- Создать `contractHelpers.ts`
- Обновить `DiscoverTabV2.tsx` → использовать переводы

### 2.5.6: Тестирование и документация (~2-3 часа)
- Комплексное тестирование на всех языках
- Обновить CLAUDE.md, MASTER_PLAN.md
- Создать I18N_GUIDE.md
- Коммит и деплой

---

## 🔑 Ключевые файлы

### Будут созданы:
```
src/i18n/
  config.ts
  locales/
    ru/*.json (10 файлов)
    de/*.json (10 файлов)
    en/*.json (10 файлов)
src/utils/i18nHelpers.ts
src/utils/aiPrompts.ts
src/utils/contractHelpers.ts
docs/I18N_GUIDE.md
```

### Будут изменены:
```
src/index.tsx
src/components/ModernNastiaApp.tsx
src/components/GlassTabBar.tsx
src/components/AuthModal.tsx
src/components/ProfileSetupModal.tsx
src/utils/horoscope.ts
src/utils/historyStory.ts
src/utils/planetMessages.ts
src/data/psychologicalContracts.ts
supabase: users_profiles table (SQL migration)
```

---

## 💡 Почему делаем СЕЙЧАС?

**Критическое стратегическое решение:** i18n ПЕРЕД AI-агентами (Фаза 4)

**Причины:**
1. Избегаем переделывания 14 AI-агентов потом (экономия 6-8 часов)
2. БД сразу с `language_code` (no migration hell)
3. Психологические контракты сразу мультиязычные
4. AI-агенты генерируют контент на правильном языке с первого раза

**Экономика:**
```
План A: i18n (20-24ч) → AI-агенты (60-80ч) = 80-104 часа
План B: AI-агенты (60-80ч) → переделка (6-8ч) → i18n (20-24ч) = 86-112 часов

Экономия: 6-8 часов + нет головной боли!
```

---

## ✅ Критерии завершения фазы

- [ ] i18next настроен, работают 3 языка (ru, de, en)
- [ ] Все UI тексты заменены на `t('key')` (~1440 вхождений)
- [ ] Переключатель языка в Settings работает
- [ ] Язык сохраняется в Supabase (`users_profiles.language_code`)
- [ ] AI контент генерируется на языке пользователя
- [ ] Психологические контракты мультиязычные
- [ ] Тестирование успешно на всех 3 языках
- [ ] Документация обновлена

---

## 🚨 Критические правила

1. **НЕ использовать хардкоженные тексты** - только `t('key')`
2. **Переводы через AI** (Claude/GPT) → проверить термины
3. **Fallback на русский** - если перевод не найден
4. **Язык в Supabase** - синхронизировать через `i18nHelpers.ts`
5. **AI промпты** - передавать `languageCode` в Edge Function

---

## 📊 Прогресс фазы

**Текущий статус:** 0% (0/6 задач)

**Следующий шаг:** Задача 2.5.1 (Настройка i18next) - ETA ~2 часа

**Команда для старта:**
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

---

## 🔗 Полезные ссылки

- [PHASE_2.5_I18N_DETAILED_PLAN.md](roadmap/PHASE_2.5_I18N_DETAILED_PLAN.md) - полный план
- [CURRENT_TASK.md](progress/CURRENT_TASK.md) - текущая задача
- [MASTER_PLAN.md](MASTER_PLAN.md) - общий прогресс

---

**Готов начать? Открой [PHASE_2.5_I18N_DETAILED_PLAN.md](roadmap/PHASE_2.5_I18N_DETAILED_PLAN.md) и следуй задачам по порядку!**
