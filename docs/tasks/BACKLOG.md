# Task Backlog

**Last updated:** 2025-10-31T11:15:00Z
**Total tasks:** 26

**Status:** 24/26 completed (92%)

---

## 📋 Active Tasks

### TASK-026: Исправить локализацию и адаптивность текстов гороскопов

**Priority:** 🟠 high | **Status:** 📝 backlog | **Category:** bug

Гороскопы генерируются всегда на русском языке независимо от выбранного интерфейса языка (русский/английский). Второе: гороскопы всегда содержат информацию о партнере и доме, даже если пользователь не заполнил партнера в профиле и не указал, что у него есть партнер. Нужно: 1) Убедиться что языковой параметр (i18n.language) передаётся во все AI функции генерации гороскопов (fetchDailyHoroscope, fetchWeeklyHoroscope, fetchSergeyDailyHoroscopeForDate и др.), 2) Добавить проверку hasPartner(userPartner) перед включением информации о партнере в промпты - если партнера нет, этот раздел должен быть исключён из текста, 3) Обновить соответствующие функции в horoscope.ts для адаптивной локализации и фильтрации контента в зависимости от наличия партнера.

**Tags:** #horoscope, #i18n, #localization, #partner, #personalization, #adaptive-content

**Complexity:** simple | **Files affected:** 3

---

### TASK-025: Исправить зависание при обновлении данных профиля

**Priority:** 🔴 critical | **Status:** ⚙️ in-progress | **Category:** bug

Критический баг: при редактировании профиля (ProfileSetupModal) приложение зависает с видимым процессом загрузки. В консоли видны логи 'Loading cycles from Supabase...', 'Profile loaded', 'Partner loaded', но данные не обновляются и интерфейс остаётся в состоянии загрузки. Возможно, речь идёт о бесконечном цикле загрузки (infinite loop в useEffect), deadlock при синхронизации данных профиля и партнера, или закрытии модального окна без ожидания завершения асинхронной операции. Требуется провести отладку: проверить цепь async/await в loadUserProfileData(), handleSubmit() в ProfileSetupModal, вызовы updateUserProfile(), updatePartner(), убедиться что все операции корректно завершаются и обновляют UI state.

**Tags:** #profile, #supabase, #data-loading, #modal, #async, #ux-critical

**Complexity:** moderate | **Files affected:** 4

---

## ✅ Completed Tasks

See [COMPLETED.md](COMPLETED.md) for full history of completed tasks.

**Recently completed:** TASK-024, TASK-023, TASK-022, TASK-021, TASK-020
