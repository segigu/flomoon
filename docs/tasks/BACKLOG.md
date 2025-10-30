# Backlog задач

**Последнее обновление:** 2025-10-31T10:15:00Z
**Всего задач:** 24
**Выполнено:** 10
**Активных:** 14

---

## 🔥 Критичные задачи

### TASK-024: Исправить отображение ключей локализации вместо переводов в форме редактирования профиля
**Категория:** bug
**Приоритет:** 🔴 critical
**Сложность:** simple
**Статус:** backlog
**Заблокирована:** нет

**Описание:**
Критический баг локализации: в форме редактирования профиля (ProfileSetupModal) отображаются технические ключи локализации вместо переведенных текстов на русском, английском и немецком языках. Форма полностью непригодна для использования - пользователь видит технические названия вместо человекочитаемых меток, заголовков и подсказок.

**Затронутые ключи:**
- title.editProfile
- sections.aboutYou
- fields.name, fields.birthDate, fields.birthTime, fields.birthPlace
- buttons.checkPlace, buttons.checking, buttons.getCurrentPosition
- hints.forAstrologicalAnalysis, hints.forWeatherAndHoroscopes, hints.forHereAndNow
- sections.privacySettings
- fields.useCycleTracking, sections.havePartner

**План исправления:**
1. Проверить использование i18n.t() в ProfileSetupModal.tsx
2. Убедиться что все ключи добавлены в файлы локализации
3. Проверить структуру i18n конфигурации
4. Добавить отсутствующие ключи в public/locales/{ru,en,de}/translation.json
5. Протестировать отображение текстов на всех трех языках
6. Убедиться что форма показывает корректные переводы

**Файлы:**
- src/components/ProfileSetupModal.tsx
- public/locales/ru/translation.json
- public/locales/en/translation.json
- public/locales/de/translation.json

**Теги:** #i18n #localization #modal #profile #ui #critical #bug

**Заметки:**
Критический баг найден при тестировании. Форма редактирования профиля показывает технические ключи i18n вместо переводов. Блокирует использование приложения пользователями, которые не говорят по-русски или хотят переключить язык интерфейса.

---

## ⚡ Высокоприоритетные задачи

### TASK-023: Этап 11: Финальная проверка и деплой адаптивных промптов гороскопов
**Категория:** chore
**Приоритет:** 🟠 high
**Сложность:** moderate
**Статус:** backlog
**Заблокирована:** TASK-021, TASK-022

**Описание:**
Финальная проверка и деплой Phase 1 (Universalization). Запустить /code-review для комплексной проверки кода. Проверить соответствие DESIGN_RULES.md - убедиться что модальные окна используют FullScreenModal, чекбоксы имеют правильные стили и accessibility атрибуты. Проверить performance - нет лишних запросов к API погоды, graceful fallback когда координаты null. Проверить accessibility - все input элементы имеют label, чекбоксы имеют aria-атрибуты (aria-checked, aria-label). Создать git commit: 'feat: adaptive horoscope prompts (partner/location/cycles)'. Опционально запустить 'npm run release' для автоматического деплоя на GitHub Pages с версионированием.

**Чек-лист:**
1. Запустить /code-review и исправить все критичные проблемы
2. Проверить что FullScreenModal используется везде (модальные окна Profile, Settings)
3. Проверить что чекбоксы в ProfileSetupModal имеют правильные стили и aria-атрибуты (aria-checked, aria-label)
4. Grep поиск API погоды запросов - убедиться что нет дублирования
5. Проверить null-safety для координат (no API calls if coordinates === null)
6. Запустить npm test && npm run build
7. Создать коммит с описанием адаптивных промптов
8. Опционально npm run release для автодеплоя

**Файлы:**
- CLAUDE.md
- DESIGN_RULES.md
- src/components/ProfileSetupModal.tsx
- src/components/GlassTabBar.tsx
- src/components/ModernNastiaApp.tsx
- src/utils/horoscope.ts
- src/utils/weather.ts

**Теги:** #code-review #quality #deployment #design-rules #performance #accessibility

**Заметки:**
Phase 1: Этап 11 Final Review & Deployment. Завершающий этап Phase 1 - комплексная проверка кода перед деплоем. Зависит от TASK-021 (тестирование) и TASK-022 (документация). После этого Phase 1 завершена и можно переходить на Phase 2 (AI Agent System).

---

### TASK-020: Этап 8: Обновление вызовов гороскопов с координатами в ModernNastiaApp
**Категория:** refactor
**Приоритет:** 🟠 high
**Сложность:** moderate
**Статус:** backlog
**Заблокирована:** TASK-006 ✅, TASK-014, TASK-015

**Описание:**
Проверить все вызовы fetchDailyHoroscope(), fetchDailyHoroscopeForDate(), fetchSergeyDailyHoroscopeForDate() в ModernNastiaApp.tsx. Убедиться что везде передаются userProfile и userPartner параметры (они уже должны быть после TASK-006). Добавить передачу координат через getUserCoordinates(userProfile) для функций генерирования контента с погодой. Проверить что weather.ts функции теперь получают координаты вместо захардкоженного COBURG_COORDS (требует TASK-014). Проверить что все функции gracefully обрабатывают случай когда координаты null/undefined.

**План реализации:**
1. Использовать Grep для поиска всех вызовов fetchDailyHoroscope/fetchDailyHoroscopeForDate/fetchSergeyDailyHoroscopeForDate в ModernNastiaApp.tsx
2. Проверить что userProfile/userPartner передаются в каждом вызове
3. Добавить getUserCoordinates(userProfile) для получения координат
4. Убедиться что координаты передаются функциям погоды (fetchDailyWeatherSummary/fetchWeeklyWeatherSummary)
5. Проверить null-safety для координат (graceful fallback если координат нет)
6. Протестировать с координатами и без них (пользователи которые не указали текущее местоположение)

**Файлы:**
- src/components/ModernNastiaApp.tsx
- src/utils/horoscope.ts
- src/utils/weather.ts
- src/utils/userContext.ts
- src/utils/geolocation.ts

**Теги:** #refactor #horoscope #coordinates #weather #universalization

**Заметки:**
Phase 1: Этап 8 Universalization. Завершающий этап проверки передачи параметров пользователя во все AI-функции. Зависит от TASK-006 (userProfile/userPartner - ✅ выполнена), TASK-014 (параметризация weather функций), TASK-015 (хелпер getUserCoordinates). Требует Grep поиска и проверки всех вызовов гороскопов.

---

### TASK-019: Этап 7: Скрытие UI циклов - условный рендеринг вкладки и контента
**Категория:** ui
**Приоритет:** 🟠 high
**Сложность:** moderate
**Статус:** backlog
**Заблокирована:** TASK-015, TASK-018

**Описание:**
Реализовать условную видимость функционала циклов в зависимости от isCycleTrackingEnabled(userProfile). Этап включает четыре части:
1. Условно рендерить кнопку вкладки 'Циклы' в GlassTabBar только если цикл-трекинг включен
2. Условно рендерить контент вкладки 'Циклы' в ModernNastiaApp
3. Добавить редирект с вкладки 'Циклы' на 'Home' если пользователь динамически отключил функционал во время сессии
4. Условно скрыть упоминания циклов на вкладке 'Home' (баннеры, ссылки на добавление цикла) если функционал выключен

**Важно:** Данные циклов в БД НЕ удаляются, только скрываются в UI - при повторном включении функционала все циклы видны как раньше.

**План реализации:**
1. В GlassTabBar.tsx добавить условное отображение кнопки вкладки 'Циклы' через isCycleTrackingEnabled()
2. В ModernNastiaApp.tsx добавить условное отображение TabContent для вкладки 'cycles'
3. Добавить useEffect в ModernNastiaApp для редиректа с 'cycles' на 'home' если isCycleTrackingEnabled()=false
4. В HomeTab добавить условное скрытие баннеров и ссылок, связанных с циклами
5. Протестировать переключение функционала в Settings в реальном времени
6. Проверить что редирект работает правильно при отключении во время просмотра вкладки
7. Убедиться что данные не удаляются при отключении (только скрываются в UI)

**Файлы:**
- src/components/GlassTabBar.tsx
- src/components/ModernNastiaApp.tsx
- src/utils/userContext.ts

**Теги:** #ui #cycle-tracking #conditional-rendering #navigation #phase1

**Заметки:**
Phase 1: Этап 7 UI. Прямое продолжение TASK-018 (добавление чекбокса цикл-трекинга). Зависит от TASK-015 (хелпер isCycleTrackingEnabled). Четыре точки изменений: 1) GlassTabBar.tsx - условный рендеринг кнопки 'Циклы', 2) ModernNastiaApp.tsx - условный рендеринг TabContent для вкладки 'cycles', 3) ModernNastiaApp.tsx - редирект activeTab на 'home' если isCycleTrackingEnabled()=false и activeTab='cycles', 4) HomeTab.tsx - условное скрытие баннеров/ссылок связанных с циклами. Тестирование: переключать цикл-трекинг в Settings и проверять видимость вкладки и UI элементов в реальном времени.

---

### TASK-018: Этап 6: UI функционал циклов - добавить чекбокс в профиль
**Категория:** ui
**Приоритет:** 🟠 high
**Сложность:** simple
**Статус:** backlog
**Заблокирована:** TASK-013

**Описание:**
Добавить в ProfileSetupModal чекбокс 'Использовать функционал отслеживания менструальных циклов' для управления state cycleTrackingEnabled (дефолт true). Реализовать обработчик handleCycleTrackingToggle(), который вызывает updateCycleTracking() из supabaseProfile.ts. Обновить saveProfile() для сохранения cycle_tracking_enabled в users таблицу. Создать новую секцию UI 'Настройки приватности' для группировки всех чекбоксов (локация + циклы) с консистентным стилем и пояснительным текстом.

**План реализации:**
1. Добавить state cycleTrackingEnabled в ProfileSetupModal (дефолт true)
2. Создать UI чекбокс 'Использовать отслеживание циклов'
3. Реализовать handleCycleTrackingToggle() обработчик
4. Интегрировать updateCycleTracking() из supabaseProfile.ts
5. Обновить saveProfile() для сохранения cycle_tracking_enabled
6. Создать секцию UI 'Настройки приватности' для двух чекбоксов (локация + циклы)
7. Добавить пояснительный текст под каждым чекбоксом
8. Протестировать с включением/отключением функционала

**Файлы:**
- src/components/ProfileSetupModal.tsx
- src/utils/supabaseProfile.ts
- src/types/index.ts

**Теги:** #ui #profile #privacy #settings #cycle-tracking

**Заметки:**
Phase 1: Этап 6 UI. Прямое продолжение TASK-017. Группирует оба приватности чекбокса (location_access_enabled и cycle_tracking_enabled) в единую секцию 'Настройки приватности'. Требует интеграции с updateCycleTracking() и обновления saveProfile(). Зависит от TASK-013 (добавление cycle_tracking_enabled в users таблицу).

---

### TASK-017: Этап 5: UI текущее местоположение (privacy-first)
**Категория:** ui
**Приоритет:** 🟠 high
**Сложность:** moderate
**Статус:** backlog
**Заблокирована:** TASK-013

**Описание:**
Добавить текстовое поле 'Текущее местоположение' в ProfileSetupModal вместо браузерной геолокации. Использовать AI-geocoding для валидации места (как для birth_place). При успешной валидации сохранять current_latitude/current_longitude в таблицу users и автоматически устанавливать location_access_enabled=true. Если поле пустое - координаты null, флаг false. Реализовать как опциональное поле (пользователь может пропустить).

**План реализации:**
1. Добавить UI элемент текстового поля в ProfileSetupModal
2. Интегрировать валидацию через geocoding.ts (как для birth_place)
3. При успешной валидации сохранить current_latitude/current_longitude
4. Установить location_access_enabled=true при валидации (false если пусто)
5. Обновить getUserCoordinates() в userContext.ts для использования current координат
6. Протестировать с разными местами (города, координаты)
7. Проверить fallback когда поле пустое (координаты=null, флаг=false)

**Файлы:**
- src/components/ProfileSetupModal.tsx
- src/utils/geocoding.ts
- src/utils/supabaseProfile.ts
- src/utils/userContext.ts
- src/types/index.ts

**Теги:** #ui #profile #location #privacy #geocoding #supabase

**Заметки:**
Phase 1: Этап 5 UI. Privacy-first подход - место вводится пользователем (не браузерная геолокация). Валидация через AI-geocoding как в birth_place. Зависит от TASK-013 (добавление location_access_enabled). Требует интеграции с existing geocoding.ts и сохранения в current_latitude/current_longitude.

---

### TASK-016: Этап 4: Обновить промпты гороскопов с условной логикой
**Категория:** refactor
**Приоритет:** 🟠 high
**Сложность:** complex
**Статус:** backlog
**Заблокирована:** TASK-013, TASK-014, TASK-015

**Описание:**
Модифицировать функции построения промптов в src/utils/horoscope.ts для условного включения данных в зависимости от профиля пользователя.

**План реализации:**
1. Обновить buildWeeklyPrompt(), buildDailyPrompt(), buildSergeyDailyPrompt()
2. Включать партнера только если hasPartner(userPartner)=true
3. Включать погоду только если weatherSummary !== null
4. Включать цикл только если isCycleTrackingEnabled(userProfile)=true
5. Обновить fetchDailyHoroscope(), fetchDailyHoroscopeForDate(), fetchSergeyDailyHoroscopeForDate()
6. Принимать и передавать координаты через getUserCoordinates(userProfile)
7. Протестировать все 8 комбинаций: партнер (да/нет) × погода (да/нет) × цикл (да/нет)
8. Провести интеграционное тестирование с координатами

**Файлы:**
- src/utils/horoscope.ts
- src/utils/weather.ts
- src/utils/userContext.ts

**Теги:** #refactor #horoscope #prompts #conditional-logic #universalization

**Заметки:**
Phase 1: Этап 4 Universalization. Требует модификации 3 функций промптов и 3 функций fetch. Матрица тестирования 2^3=8 комбинаций.

---

### TASK-015: Этап 3: Хелперы userContext.ts - добавить 4 функции для профиля
**Категория:** refactor
**Приоритет:** 🟠 high
**Сложность:** simple
**Статус:** backlog

**Описание:**
Расширить src/utils/userContext.ts четырьмя новыми helper-функциями для работы с профилем пользователя и партнера.

**Функции:**
- `hasLocationAccess(userProfile)` - проверяет location_access_enabled флаг (возвращает boolean)
- `getUserCoordinates(userProfile)` - возвращает {latitude, longitude} или null если координат нет
- `isCycleTrackingEnabled(userProfile)` - проверяет цикл трекинга (дефолт true если поле отсутствует)
- `hasPartner(userPartner)` - проверяет что у партнера есть имя И дата рождения (возвращает boolean)

Все функции принимают userProfile/userPartner опционально и имеют graceful fallback. Обновить TypeScript типы если нужно.

**Файлы:**
- src/utils/userContext.ts
- src/types/index.ts

**Теги:** #refactor #helpers #user-profile #supabase #typescript

**Заметки:**
Phase 1: Foundation stage. Хелперы используются для валидации профиля перед использованием функций. Функции должны иметь простую сигнатуру с null-safety и graceful fallback. Зависит от: TASK-013 (добавление полей в users таблицу). Блокирует: TASK-016+.

---

### TASK-014: Параметризация функций погоды - добавить поддержку координат
**Категория:** refactor
**Приоритет:** 🟠 high
**Сложность:** simple
**Статус:** backlog

**Описание:**
Этап 2 универсализации: обновить fetchDailyWeatherSummary() и fetchWeeklyWeatherSummary() для приема координат (latitude, longitude) как параметров вместо использования захардкоженного COBURG_COORDS.

**План реализации:**
1. Модифицировать buildQueryUrl() для использования переданных координат или возврата null если они не предоставлены
2. Удалить захардкоженный COBURG_COORDS из weather.ts
3. Обновить сигнатуры функций: fetchDailyWeatherSummary(isoDate, signal, language, latitude?, longitude?)
4. Обновить fetchWeeklyWeatherSummary(isoDate, signal, language, latitude?, longitude?)
5. Погода запрашивается только если координаты явно переданы
6. Если координаты null/undefined - функции возвращают null без запроса к API

**Файлы:**
- src/utils/weather.ts

**Теги:** #weather #refactor #coordinates #parameterization

**Заметки:**
Часть Phase 1 (Universalization). Следует стратегии TASK-002 (удаление захардкоженных данных). buildQueryUrl должна принимать latitude/longitude и возвращать null если их нет.

---

### TASK-013: Добавить location_access и cycle_tracking_enabled в users таблицу
**Категория:** chore
**Приоритет:** 🟠 high
**Сложность:** moderate
**Статус:** backlog

**Описание:**
Миграция БД для Phase 1: добавить два новых boolean поля в таблицу users.
- `location_access_enabled` (DEFAULT FALSE) - флаг разрешения на доступ к геолокации
- `cycle_tracking_enabled` (DEFAULT TRUE) - флаг активности отслеживания менструального цикла

Обновить TypeScript типы UserProfileData и UserProfileRow в src/types/index.ts. Добавить функции updateLocationAccess() и updateCycleTracking() в src/utils/supabaseProfile.ts для изменения этих флагов. SQL миграция применяется через Supabase Dashboard.

**Файлы:**
- src/types/index.ts
- src/utils/supabaseProfile.ts
- migrations/add_user_settings_columns.sql

**Теги:** #database #migration #typescript #supabase #infrastructure

**Заметки:**
Этап 1: Базовая инфраструктура для поддержки пользовательских настроек (Phase 1 Foundation). Требует: 1) SQL миграция (ALTER TABLE users ADD COLUMN), 2) Обновление типов в index.ts, 3) Добавление функций в supabaseProfile.ts, 4) Обновление ProfileSetupModal если нужны UI элементы для этих настроек.

---

---

## 🟡 Среднеприоритетные задачи

### TASK-021: Этап 9: Тестирование - создать horoscope.test.ts и интеграционные тесты
**Категория:** test
**Приоритет:** 🟡 medium
**Сложность:** complex
**Статус:** backlog
**Заблокирована:** TASK-015, TASK-016, TASK-018, TASK-019

**Описание:**
Создать полный набор unit-тестов и интеграционных тестов для Phase 1 функционала.

**Тесты включают:**
1. **horoscope.test.ts** - 8 unit-тестов для buildDailyPrompt() покрывающих все комбинации:
   - партнер (да/нет) × погода (да/нет) × цикл-трекинг (да/нет) = 2^3 = 8 комбинаций
   - Проверка что эти параметры корректно влияют на генерируемый промпт

2. **userContext.test.ts** - 4 unit-теста для хелперов:
   - hasLocationAccess(userProfile) - проверка location_access_enabled флага
   - getUserCoordinates(userProfile) - возврат координат или null
   - isCycleTrackingEnabled(userProfile) - проверка цикл-трекинга
   - hasPartner(userPartner) - проверка наличия партнера с полными данными

3. **Интеграционный тест** для fetchDailyHoroscope():
   - Проверка что погода НЕ запрашивается если координаты null
   - Проверка что fetchDailyWeatherSummary() не вызывается без координат

4. **GlassTabBar.test.tsx** - UI компонента тест:
   - Проверка условного рендеринга кнопки 'Циклы'
   - Вкладка 'Циклы' скрывается если isCycleTrackingEnabled() = false
   - Вкладка 'Циклы' показывается если isCycleTrackingEnabled() = true

**Ручное тестирование - 4 сценария:**
1. **Полный функционал:** цикл-трекинг ВКЛ, партнер есть, координаты есть
2. **Минимальный функционал:** цикл-трекинг ВЫКЛ, партнер null, координаты null
3. **Без погоды:** цикл-трекинг ВКЛ, партнер есть, координаты null
4. **Без циклов:** цикл-трекинг ВЫКЛ, партнер есть, координаты есть

**Финальные проверки:**
- npm test - все тесты проходят
- npm run build - без ошибок (451+ kB)
- Проверка что hardcoded 'Настя'/'Сергей' не появляются в генерируемых промптах

**Файлы:**
- src/utils/horoscope.test.ts
- src/utils/userContext.test.ts
- src/components/GlassTabBar.test.tsx
- src/utils/horoscope.ts
- src/utils/userContext.ts
- src/components/GlassTabBar.tsx

**Теги:** #test #horoscope #quality #unit-tests #integration-tests

**Заметки:**
Phase 1: Этап 9 Testing & QA. Финальная проверка функционала всей Phase 1. Зависит от TASK-015 (хелперы), TASK-016 (условная логика промптов), TASK-018 (UI чекбокс), TASK-019 (скрытие UI). Матрица тестирования 2^3=8 комбинаций для buildDailyPrompt. Интеграционное тестирование погоды с координатами. UI тестирование скрытия вкладки 'Циклы'. 4 сценария ручного тестирования для проверки всех состояний. Это завершающий этап Phase 1, после чего можно переходить на Phase 2 (AI Agent System).

---

### TASK-008: Добавить тесты для партнерских функций
**Категория:** test
**Приоритет:** 🟡 medium
**Сложность:** moderate
**Статус:** backlog
**Заблокирована:** TASK-003 ✅, TASK-004 ✅, TASK-006 ✅ **[ВСЕ РАЗБЛОКИРОВАНЫ!]**

**Описание:**
Написать unit-тесты для функций работы с данными пользователя и партнера. Создать horoscope.test.ts и userContext.test.ts, протестировать getUserName() и getPartnerName() с различными сценариями (партнер существует, партнер null, fallback на дефолтные значения). Протестировать промпты с userProfile/userPartner, убедиться что hardcoded 'Сергей' не появляется нигде.

**Файлы:**
- src/utils/horoscope.test.ts
- src/utils/userContext.test.ts

**Теги:** #test #partner #unit-tests #quality

**Заметки:**
Защита от регрессии. Выполнять после завершения основного рефакторинга.

---

### TASK-012: Убрать захардкоженное имя 'Настя' из AI-фраз модального окна периода
**Категория:** bug
**Приоритет:** 🟡 medium
**Сложность:** simple
**Статус:** backlog
**Связана с:** TASK-002 ✅

**Описание:**
В модальном окне начала менструации AI генерирует фразы с захардкоженным именем 'Настя' вместо использования реального имени пользователя из userProfile.display_name. Например: 'Привет, Настя! Твой цикл начался...' вместо 'Привет, {userName}! Твой цикл начался...'.

Это остаток от TASK-002 (универсализация промптов) - видимо, функция генерации контента для модального окна периода (скорее всего в src/utils/aiContent.ts или вызов из ModernNastiaApp.tsx) не получает userProfile/userPartner в качестве параметров.

**План исправления:**
1. Найти функцию генерации контента для модального окна периода (вероятно fetchPeriodContent или аналогичная)
2. Добавить параметры userProfile/userPartner в сигнатуру функции
3. Использовать getUserName(userProfile) из userContext.ts для подстановки реального имени в AI-промпты
4. Протестировать с разными пользователями

**Файлы:**
- src/utils/aiContent.ts
- src/components/ModernNastiaApp.tsx
- src/utils/userContext.ts

**Теги:** #ai #personalization #modal #hardcoded-data #user-profile

**Заметки:**
Остаток от TASK-002. Найти место где генерируется контент для модального окна периода и передать туда userProfile/userPartner параметры, затем использовать getUserName(userProfile) для подстановки имени в AI-промпты вместо 'Настя'.

---

### TASK-022: Этап 10: Документация - обновить CLAUDE.md и CHANGELOG
**Категория:** docs
**Приоритет:** 🟡 medium
**Сложность:** simple
**Статус:** backlog

**Описание:**
Финальный этап документирования Phase 1. Обновить секцию CLAUDE.md 'Working with User Data' добавив описание privacy settings (location_access_enabled и cycle_tracking_enabled), как их проверять через хелперы hasLocationAccess() и isCycleTrackingEnabled(). Обновить секцию 'Horoscopes' добавив описание адаптивных промптов с 3 условиями (партнер, погода, цикл-трекинг). Обновить docs/progress/CHANGELOG.md добавив записи о privacy settings и адаптивных промптах для версии 0.3.9. Добавить inline комментарии в src/utils/horoscope.ts объясняющие условную логику в функциях buildDailyPrompt(), buildWeeklyPrompt(), buildSergeyDailyPrompt().

**План реализации:**
1. Обновить CLAUDE.md секцию 'Working with User Data':
   - Добавить описание privacy settings (location_access_enabled и cycle_tracking_enabled)
   - Добавить примеры использования hasLocationAccess() и isCycleTrackingEnabled()
   - Объяснить как хелперы используются для валидации профиля

2. Обновить CLAUDE.md секцию 'Horoscopes':
   - Добавить описание адаптивных промптов с 3 условиями
   - Примеры: if (hasPartner) { ... }, if (weatherSummary) { ... }, if (isCycleTrackingEnabled) { ... }
   - Объяснить матрицу тестирования 2^3=8 комбинаций

3. Обновить docs/progress/CHANGELOG.md:
   - Добавить запись о privacy settings (location_access_enabled и cycle_tracking_enabled)
   - Добавить запись об адаптивных промптах гороскопов
   - Версия 0.3.9 или 0.4.0

4. Добавить inline комментарии в src/utils/horoscope.ts:
   - Комментарии в buildDailyPrompt() объясняющие conditional включение партнера, погоды, цикла
   - Комментарии в buildWeeklyPrompt()
   - Комментарии в buildSergeyDailyPrompt()

**Файлы:**
- CLAUDE.md
- docs/progress/CHANGELOG.md
- src/utils/horoscope.ts

**Теги:** #documentation #docs #horoscope #privacy-settings #comments

**Заметки:**
Phase 1: Этап 10 Documentation. Завершающий этап Phase 1 - документирование функционала. Можно выполнить параллельно с TASK-021 (тестирование) или после. Требует обновления трёх файлов с описанием privacy settings и адаптивных промптов.

---

## ✅ Выполненные задачи

### TASK-011: Исправить локализацию дат в недельном гороскопе модального окна периода
**Категория:** bug (i18n)
**Приоритет:** 🟠 high
**Сложность:** simple
**Завершена:** 2025-10-30
**Версия:** v0.3.8

**Заметки:**
✅ Выполнено: Добавлен параметр language в getWeekRange(), маппинг локалей (ru→ru-RU, en→en-US, de→de-DE), использован Intl.DateTimeFormat. Билд успешен (454.96 kB). КПД выполнен, версия 0.3.8 на GitHub Pages. Форматы: русский '29 октября — 4 ноября', английский '29 October — 4 November', немецкий '29 Oktober — 4 November'.

**Теги:** #i18n #localization #date-formatting #modal #horoscope

---

### TASK-001: Локализировать названия месяцев в календаре
**Категория:** bug
**Приоритет:** 🟡 medium
**Сложность:** simple
**Завершена:** 2025-10-29

**Теги:** #i18n #localization #calendar #ui

---

### TASK-002: Исправить использование захардкоженных данных партнёра вместо БД
**Категория:** bug
**Приоритет:** 🔴 critical
**Сложность:** complex
**Завершена:** 2025-10-29

**Теги:** #ai #database #personalization #partner #hardcoded-data

---

### TASK-003: Полное удаление getCurrentUser() из horoscope.ts
**Категория:** refactor
**Приоритет:** 🔴 critical
**Сложность:** moderate
**Завершена:** 2025-10-29

**Заметки:**
✅ Выполнено: Обновлено 12 функций, удалено 13 вызовов getCurrentUser(), добавлено 18 параметров userProfile/userPartner. Билд успешен.

**Теги:** #refactor #horoscope #ai #hardcoded-data #partner

---

### TASK-004: Удаление getCurrentUser() из historyStory.ts
**Категория:** refactor
**Приоритет:** 🔴 critical
**Сложность:** simple
**Завершена:** 2025-10-29

**Заметки:**
✅ Выполнено: Обновлено 13 функций, удалено 8 вызовов getCurrentUser(), добавлено 26 параметров userProfile/userPartner. Билд успешен.

**Теги:** #refactor #interactive-story #ai #hardcoded-data

---

### TASK-005: Проверка загрузки userPartner из Supabase
**Категория:** bug
**Приоритет:** 🔴 high
**Сложность:** simple
**Завершена:** 2025-10-29

**Заметки:**
✅ Выполнено: Проверена функция loadUserProfileData() - партнёр загружается корректно, добавлено детальное логирование. Error handling правильный. Билд успешен (455.48 kB). TASK-009 разблокирована!

**Теги:** #bug #partner #database #supabase

---

### TASK-006: Передача userProfile/userPartner во ВСЕ AI-функции
**Категория:** refactor
**Приоритет:** 🔴 high
**Сложность:** moderate
**Завершена:** 2025-10-29

**Заметки:**
✅ Выполнено: Обновлена сигнатура fetchDailyHoroscope. Обновлено 4 вызова AI-функций в ModernNastiaApp.tsx. Билд успешен (455.42 kB).

**Теги:** #refactor #ai #partner #horoscope

---

### TASK-007: Архивация устаревшего userProfile.ts
**Категория:** chore
**Приоритет:** 🟡 medium
**Сложность:** trivial
**Завершена:** 2025-10-29

**Заметки:**
✅ Выполнено: Файл переименован в userProfile.deprecated.ts с большим warning комментарием. Обновлены импорты. Билд успешен.

**Теги:** #chore #refactor #cleanup #deprecated

---

### TASK-009: UI фидбек при отсутствии партнера
**Категория:** ui
**Приоритет:** 🟡 medium
**Сложность:** simple
**Завершена:** 2025-10-29

**Заметки:**
✅ Выполнено: Добавлена проверка userPartner в условие показа баннера партнёра (ModernNastiaApp.tsx:5258). Баннер теперь скрыт если партнёра нет. Решён вопрос пользователя!

**Теги:** #ui #ux #partner #feedback

---

### TASK-010: Обновить документацию CLAUDE.md
**Категория:** docs
**Приоритет:** 🟡 medium
**Сложность:** trivial
**Завершена:** 2025-10-29

**Заметки:**
✅ Выполнено: Добавлена секция "Working with User Data" (~142 строки) с примерами, Migration Guide, предупреждениями о deprecated файлах.

**Теги:** #docs #documentation #refactor

---

## Статистика

- **Критичные задачи:** 0 активных, 4 выполнено
- **Высокоприоритетные:** 11 активных, 3 выполнено
- **Среднеприоритетные:** 2 активных, 3 выполнено
- **Всего выполнено:** 10/23 (43%) ⚙️

**Категории:**
- bug: 6 задач (4 выполнены, 2 активных) ⬅️ TASK-012 остаётся
- refactor: 8 задач (4 выполнены, 4 активных)
- test: 2 задачи (0 выполнены, 2 активных) ⬅️ TASK-008, TASK-021
- chore: 3 задачи (1 выполнена, 2 активных) ⬅️ TASK-013, TASK-023 добавлена
- ui: 4 задачи (1 выполнена, 3 активных)
- docs: 2 задачи (1 выполнена, 1 активная) ⬅️ TASK-022

**Цепочки задач:**
- **TASK-002 Chain (Универсализация захардкоженных данных):** TASK-002 ✅ → TASK-003 ✅ → TASK-004 ✅ → TASK-005 ✅ → TASK-006 ✅ → TASK-007 ✅ → TASK-010 ✅ → TASK-011 ✅ → TASK-020 → TASK-012 (backlog)
- **Phase 1 Foundation:** TASK-013 (БД настройки) → TASK-015 (хелперы) → TASK-016 (использование хелперов в промптах)
- **Phase 1 Universalization:** TASK-014 (параметризация погоды) → TASK-020 (передача координат в вызовы гороскопов) → TASK-016 (условная логика в промптах)
- **Phase 1 UI:** TASK-017 (текущее местоположение) → TASK-018 (чекбокс циклов) → TASK-019 (скрытие UI циклов)
- **Phase 1 Testing:** TASK-021 (зависит от TASK-015, TASK-016, TASK-018, TASK-019)
- **Phase 1 Documentation:** TASK-022 (Документация)
- **Phase 1 Final Review:** TASK-023 ⬅️ NEW (Финальная проверка и деплой Phase 1) → Phase 2 (AI Agent System)
- **Локализация:** TASK-001 ✅ → TASK-011 ✅ (завершена!)
- **QA & Deployment:** TASK-008 (unit-тесты для партнера), TASK-021 (комплексное тестирование Phase 1), TASK-023 (финальная проверка перед Phase 2)
