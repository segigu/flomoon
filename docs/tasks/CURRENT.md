# Текущая задача

**Last updated:** 2025-10-31T11:00:00Z

---

## TASK-025: Исправить зависание при обновлении данных профиля ⚙️

**Категория:** bug | **Приоритет:** 🔴 critical | **Сложность:** moderate

**Статус:** in-progress
**Начата:** 2025-10-31T11:00:00Z

### Описание

Критический баг: при редактировании профиля (ProfileSetupModal) приложение зависает с видимым процессом загрузки. В консоли видны логи 'Loading cycles from Supabase...', 'Profile loaded', 'Partner loaded', но данные не обновляются и интерфейс остаётся в состоянии загрузки.

Возможные причины:
- Бесконечный цикл загрузки (infinite loop в useEffect)
- Deadlock при синхронизации данных профиля и партнера
- Закрытие модального окна без ожидания завершения асинхронной операции

### Связанные файлы

- [src/components/ProfileSetupModal.tsx](../../src/components/ProfileSetupModal.tsx)
- [src/components/ModernNastiaApp.tsx](../../src/components/ModernNastiaApp.tsx)
- [src/utils/supabaseProfile.ts](../../src/utils/supabaseProfile.ts)
- [src/utils/userContext.ts](../../src/utils/userContext.ts)

### Теги

profile, supabase, data-loading, modal, async, ux-critical

---

### План отладки

1. Проверить бесконечные useEffect циклы в ProfileSetupModal
2. Проверить Promise rejection/timeout при loadUserProfileData()
3. Отследить состояние loading при сохранении профиля
4. Исключить race condition при закрытии модального окна раньше завершения запроса

---

**Эта задача КРИТИЧНА:** Пользователь не может редактировать профиль!
