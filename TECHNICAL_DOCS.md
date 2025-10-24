# 🔧 Техническая документация Nastia

## 📋 Общая информация

**Проект**: Nastia - Персональный календарь менструального цикла  
**Статус**: Готов к использованию  
**Версия**: 1.0.0  
**Дата создания**: 3 июля 2025  

## 🏗 Архитектура

### Технологический стек
- **Frontend**: React 19.1.0 + TypeScript 4.9.5
- **Стили**: CSS Modules + CSS Variables
- **Иконки**: Lucide React 0.525.0
- **Сборка**: Create React App 5.0.1
- **Хранение**: localStorage API
- **PWA**: Service Worker + Web App Manifest

### Структура файлов
```
nastia-simple/
├── public/
│   ├── index.html              # HTML шаблон
│   ├── manifest.json           # PWA манифест
│   ├── sw.js                   # Service Worker
│   └── nastia-icon.svg         # Иконка приложения
├── src/
│   ├── components/
│   │   ├── ModernNastiaApp.tsx # Главный компонент
│   │   └── NastiaApp.module.css# CSS модули
│   ├── types/
│   │   └── index.ts            # TypeScript интерфейсы
│   ├── utils/
│   │   ├── dateUtils.ts        # Работа с датами
│   │   ├── cycleUtils.ts       # Расчеты циклов
│   │   └── storage.ts          # localStorage утилиты
│   ├── App.tsx                 # Корневой компонент
│   ├── index.tsx               # Точка входа
│   └── index.css               # Глобальные стили
├── api/                        # API endpoints (для будущего)
│   ├── backup.ts               # Бэкап данных
│   └── restore.ts              # Восстановление данных
├── PROJECT_HISTORY.md          # История разработки
├── README-NASTIA.md            # Пользовательская документация
└── TECHNICAL_DOCS.md           # Этот файл
```

## 🧩 Компоненты

### ModernNastiaApp.tsx
**Назначение**: Главный компонент приложения  
**Состояние**:
- `currentDate: Date` - текущий месяц в календаре
- `selectedDate: Date | null` - выбранная дата для добавления цикла
- `cycles: CycleData[]` - массив циклов пользователя
- `showStats: boolean` - показать/скрыть детальную статистику

**Основные методы**:
- `getMonthDays()` - генерация дней месяца для календаря
- `changeMonth()` - навигация по месяцам
- `addCycle()` - добавление нового цикла
- `deleteCycle()` - удаление цикла
- `handleExport()` - экспорт данных в JSON
- `handleImport()` - импорт данных из файла

#### Элемент «Свой вариант» (голосовой выбор в истории)
Интерактивная карточка находится в блоке вариантов истории и позволяет пользователю продиктовать собственное продолжение. Компонент живёт внутри `ModernNastiaApp.tsx`, состояние хранится в хуках:
- `historyCustomOption: { status, option, transcript, error }` — основной стейт машины (`idle → recording → transcribing → generating → ready` + `error`).
- `historyCustomRecordingLevel` — мгновенная амплитуда голоса (0–1), вычисляется через `AudioContext` + `AnalyserNode` для живой подсветки.
- `historyCustomOptionAbortRef`, `mediaRecorderRef`, `mediaStreamRef`, `audioContextRef` и пр. — служебные `ref` для отмены запросов и закрытия MediaRecorder/AudioContext.

Основной сценарий:
1. **idle** — показываем белую карточку с градиентной рамкой (`historyCustomButton + historyCustomButtonIdle`), справа значок микрофона. Кнопка доступна только когда `historyStoryOptions` не пуст.
2. **recording** — при первом клике запрашиваем `getUserMedia`, создаём `MediaRecorder`, запускаем мониторинг уровня звука. Карточка меняет рамку и тень на фиолетово‑розовый градиент (`historyCustomButtonRecording`), в заголовке появляется «Идёт запись…», слева пульсирующая красная точка, а иконка превращается в белый квадрат‑стоп. Яркость рамки и фонового свечения управляется `--recording-*` CSS переменными на основе `historyCustomRecordingLevel`.
3. **transcribing** — после остановки записи (повторный клик) создаём Blob и вызываем `transcribeAudioBlob`. Функция сначала бьёт по прокси, при ошибке 400 автоматически уходит на прямой endpoint OpenAI, возвращает текст или описывает ошибку. В карточке показываем спиннер (`Loader2`), серо‑фиолетовый градиент.
4. **generating** — LLM (`generateCustomHistoryOption`) получает стенограмму + срез последних арок истории и формирует JSON с `title/description`. В состоянии отображаем «Придумываем формулировку…», сохраняя стиль обработки.
5. **ready** — карточка окрашена в зелёный градиент (`historyCustomButtonReady`), текст замещается готовым заголовком/описанием. Справа выводим отдельную круглую кнопку‑перезапись (`historyCustomIconButtonReady`) с иконкой повторной записи.

Дополнительные ветвления:
- **error** — если MediaRecorder или Whisper вернули ошибку (например, пустая запись, проблемы с сетью), карточка окрашивается в красный градиент, текст — «Не удалось распознать», справа остаётся кнопка повторной записи с иконкой `RotateCcw`.
- При появлении новых вариантов (`historyStoryOptions`) статус сбрасывается в `idle` (если обработка не идёт).
- Во время записи/обработки кнопка выбора блокируется (`disabled`), чтобы избежать гонок при повторных запросах.
- `cleanupCustomOptionResources()` вызывается при сбросе истории, размонтировании и по завершении записи: закрывает MediaRecorder, AudioContext, отменяет `requestAnimationFrame` и очищает временные буферы.

Дизайн и анимации реализованы в `NastiaApp.module.css` (`historyCustomButton*`, `historyCustomIconCircle*`, `historyCustomLiveDot`). Все состояния выводят текст чёрным цветом (`#111827` / `#1f2937`) и не содержат дополнительного «мелкого» текста — только заголовок и описание.

### MiniCalendar.tsx
**Назначение**: Компактный визуальный календарь месяца для отображения в списке циклов
**Props**:
- `date: Date` - дата, для которой отображается календарь (целевой день будет выделен)

**Архитектура**:
Компонент генерирует полную сетку дней месяца (7 столбцов × до 5 строк) с выделением целевой даты. Показывает дни из предыдущего/следующего месяца для заполнения сетки. Использует SVG-обводку с hand-drawn эффектом для визуального выделения даты начала цикла.

**Визуальные элементы**:
- **Шапка**: Название месяца и год слева (`.monthName` - фиолетовый #8B008B, жирный шрифт 14px)
- **Дни недели**: Короткие названия Пн-Вс (`.weekDay` - серый, 9px)
- **Сетка дней** (`.daysGrid`):
  - Дни текущего месяца: фиолетовый цвет `var(--nastia-dark)`, 11px
  - Дни других месяцев: серые полупрозрачные (`opacity: 0.5`)
  - Целевой день: красный `var(--nastia-red)`, жирный шрифт (700)
- **Hand-drawn обводка**: SVG path с анимацией появления

**Технические детали**:
```tsx
// Коррекция дня недели: воскресенье = 7 (не 0)
firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;

// Максимум 35 дней в сетке (5 недель)
const remainingDays = 35 - days.length;

// Hand-drawn SVG path использует квадратичные кривые Безье (Q, T)
<path d="M 8,25 Q 7,15 15,8 T 25,6 Q 35,5.5 42,13..."
      stroke-width="2.3" />
```

**CSS модули** ([src/components/MiniCalendar.module.css](src/components/MiniCalendar.module.css)):
- `.miniCalendar` - контейнер (max-width: 240px, прозрачный фон)
- `.monthName` - заголовок месяца (left-aligned)
- `.weekDays`, `.weekDay` - ряд с днями недели
- `.daysGrid`, `.day` - grid сетка дней (7 столбцов, gap: 2px)
- `.targetDay` - модификатор для выделенного дня
- `.handDrawnCircle` - SVG обводка (анимация `drawCircle` 0.6s ease-out)

**Интеграция в список циклов**:
```tsx
// В ModernNastiaApp.tsx:4590
<div className={styles.cycleItem}>
  <MiniCalendar date={new Date(cycle.startDate)} />
  <div className={styles.cycleActions}>
    <button onClick={() => deleteCycle(cycle.id)}>...</button>
  </div>
</div>
```

**Layout**: Календарик занимает левую часть `.cycleItem`, кнопка удаления справа с `align-self: flex-start` для выравнивания с названием месяца.

### NastiaApp.module.css
**Назначение**: Изолированные стили компонента  
**Основные классы**:
- `.container` - контейнер приложения
- `.card` - карточки с содержимым
- `.calendarGrid` - сетка календаря
- `.dayCell` - ячейка дня с модификаторами
- `.modal` - модальные окна

## 📊 Типы данных

### CycleData
```typescript
interface CycleData {
  id: string;           // Уникальный идентификатор
  startDate: Date;      // Дата начала цикла
  endDate?: Date;       // Дата окончания (опционально)
  notes?: string;       // Заметки (опционально)
}
```

### CycleStats
```typescript
interface CycleStats {
  averageLength: number;    // Средняя длина цикла
  lastCycleLength: number;  // Длина последнего цикла
  cycleCount: number;       // Количество циклов
  nextPrediction: Date;     // Прогноз следующего цикла
}
```

### NastiaData
```typescript
interface NastiaData {
  cycles: CycleData[];      // Массив циклов
  settings: {
    averageCycleLength: number;  // Средняя длина цикла
    periodLength: number;        // Длительность периода
    notifications: boolean;      // Включены ли уведомления
  };
}
```

## 🔧 Утилиты

### dateUtils.ts
**Функции для работы с датами**:
- `formatDate(date)` - форматирование даты для отображения
- `formatShortDate(date)` - краткое форматирование
- `addDays(date, days)` - добавление дней к дате
- `diffInDays(date1, date2)` - разница в днях
- `isSameDay(date1, date2)` - сравнение дат
- `isToday(date)` - проверка на сегодня
- `getMonthYear(date)` - получение месяца и года

### cycleUtils.ts
**Функции для расчетов циклов**:
- `calculateCycleStats(cycles)` - расчет статистики
- `isPredictedPeriod(date, cycles)` - прогноз периода
- `isPastPeriod(date, cycles)` - проверка прошедшего периода
- `getDaysUntilNext(cycles)` - дни до следующего цикла

### storage.ts
**Функции для работы с localStorage**:
- `saveData(data)` - сохранение данных
- `loadData()` - загрузка данных
- `exportData(data)` - экспорт в JSON строку
- `importData(jsonString)` - импорт из JSON
- `clearAllData()` - очистка всех данных

## 🤖 Генерация историй и промпты

- `src/data/storyGuidelines.ts` — единый справочник правил для LLM-промптов (запрет мистики, европейский контекст, списки имён/примеров, лимит `moon_summary`). Любые новые требования формулируем и переиспользуем здесь.
- `src/utils/promptPostprocessors.ts` — утилиты пост-обработки ответов модели: очистка Markdown/JSON, восстановление при форматных ошибках, приведение строк к одной линии и защита от переполнения по длине.
- `src/utils/historyStory.ts` использует `joinSections(...)` для сборки промптов из общих блоков + локального контекста. Благодаря `enforceSingleLine` и `clampString` сохраняем ограничения по формату (например, `moon_summary ≤ 300 символов`, сцены — единый абзац, опции — усечённые).
- `src/utils/historyStory.smoke.test.ts` — смоук-тест пайплайна: запускается через `npm test -- historyStory.smoke.test.ts`, проверяет, что шумный JSON (code fences, `\n`, длинные строки) корректно нормализуется `parseJsonWithRecovery` и `normalizeResponse`.
- Для ручной проверки промптов используем `npx tsc --noEmit` (типизация) + указанный смоук-тест: этого достаточно, чтобы отследить регрессии без обращения к настоящим LLM.

## 🎨 Стилизация

### CSS Variables
```css
:root {
  --nastia-pink: #FFB6C1;      /* Light Pink */
  --nastia-purple: #DDA0DD;    /* Plum */
  --nastia-light: #FFF0F5;     /* Lavender Blush */
  --nastia-dark: #8B008B;      /* Dark Magenta */
  --nastia-red: #ff6b9d;       /* Для периодов */
  --gray-600: #6b7280;         /* Серый текст */
  --gray-700: #374151;         /* Темный серый */
  --gray-500: #6b7280;         /* Средний серый */
}
```

### Цветовые индикаторы календаря
- **Красный** (`--nastia-red`) - дни периода
- **Розовый** (`--nastia-pink`) - прогнозируемые дни
- **Фиолетовый** (`--nastia-dark`) - сегодняшний день
- **Белый** - обычные дни

### 🪟 Модальные окна
Каждое модальное окно «Насти» — это полноэкранный слайд, который выезжает снизу и уезжает вниз при закрытии. Чтобы добиться одинакового поведения, придерживаемся базового набора классов и правил:

- **Обёртка** — всегда `styles.modal`. Она перекрывает весь экран, затемняет фон и фиксирует модалку у нижней границы на мобильных.
- **Контент** — используем `styles.modalContent` + специализированный модификатор: `styles.periodModal`, `styles.settingsModal`, `styles.notificationsModal`, `styles.dailyHoroscopeModal` и т.п. Все модификаторы обязаны:
  - занимать 100 % ширины, иметь `height: 100vh`/`min-height: 100vh`, `margin: 0`, `border-radius: 0`;
  - задавать `display: flex`, `flex-direction: column`, `gap`; 
  - подключать `animation: slideUpSettings 0.3s ease-out;` для появления снизу;
  - обеспечивать внутренний скроллинг через контейнер с `overflow-y: auto` (см. `settingsModal`, `notificationsModal`, `dailyHoroscopeModal`).
- **Полноэкранный охват** — после добавления модификатора проверяем, что у контейнера стоят `width: 100%`, `max-width: 100vw`, `height: 100vh`, `min-height: 100vh`, `margin: 0`, `border-radius: 0`. Отступы должны задаваться только внутренним блокам, иначе появятся «поля» по бокам.
- **Шапка** — наследуем один из существующих вариантов (`styles.settingsHeader`, `styles.periodHeader`, `styles.notificationsHeader`, `styles.dailyHoroscopeHeader`) и помещаем заголовок + кнопку закрытия.
- **Кнопка закрытия** — всегда `styles.closeButton` с `aria-label="Закрыть"`. Для светлых градиентов добавляем `styles.closeButtonLight`, чтобы иконка стала белой.
- **Контентная область** — оформляем в отдельном блоке (`styles.settingsForm`, `styles.periodModalBody`, `styles.notificationsBody`, `styles.dailyHoroscopeBody`), внутри уже размещаем бизнес-логику.
- **Адаптация под новые сценарии** — при появлении нового окна копируем один из существующих модификаторов, настраиваем цвета/отступы и обязательно оставляем перечисленные выше свойства.

Пример каркаса для нового модального окна:
```tsx
{isOpen && (
  <div className={styles.modal}>
    <div className={`${styles.modalContent} ${styles.settingsModal}`}>
        <div className={styles.settingsHeader}>
          <h3 className={styles.settingsTitle}>Заголовок окна</h3>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <div className={styles.settingsForm}>
          {/* Основное содержимое */}
        </div>
      </div>
    </div>
  )}
```
- **Повторное использование** — добавляем модификатор в `NastiaApp.module.css`, фиксируем отличия (фон, отступы, структура), но не меняем базовый каркас.

## 💾 Хранение данных

### localStorage
**Ключ**: `nastia-app-data`  
**Формат**: JSON строка с объектом NastiaData  
**Автосохранение**: При каждом изменении массива циклов

### Структура данных
```json
{
  "cycles": [
    {
      "id": "1234567890",
      "startDate": "2025-07-01T00:00:00.000Z",
      "notes": ""
    }
  ],
  "settings": {
    "averageCycleLength": 28,
    "periodLength": 5,
    "notifications": true
  }
}
```

## 🔄 Алгоритмы

### Расчет средней длины цикла
```typescript
// Вычисление разности между началами циклов
const cycleLengths = [];
for (let i = 1; i < sortedCycles.length; i++) {
  const length = diffInDays(
    new Date(sortedCycles[i - 1].startDate),
    new Date(sortedCycles[i].startDate)
  );
  cycleLengths.push(length);
}

// Среднее арифметическое
const averageLength = cycleLengths.length > 0 
  ? Math.round(cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length)
  : 28; // По умолчанию 28 дней
```

### Прогнозирование следующего цикла
```typescript
const lastCycleDate = new Date(sortedCycles[sortedCycles.length - 1].startDate);
const nextPrediction = addDays(lastCycleDate, averageLength);
```

## 📱 PWA конфигурация

### manifest.json
```json
{
  "short_name": "Nastia",
  "name": "Nastia - Персональный календарь",
  "icons": [
    {
      "src": "nastia-icon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ],
  "start_url": "/",
  "background_color": "#FFF0F5",
  "theme_color": "#8B008B",
  "display": "standalone"
}
```

### Service Worker
```javascript
const CACHE_NAME = 'nastia-app-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/nastia-icon.svg'
];
```

## 🚀 Производительность

### Оптимизации
- **CSS Modules** - избежание глобальных конфликтов стилей
- **React.memo** - предотвращение лишних рендеров (можно добавить)
- **localStorage** - быстрое локальное хранение
- **Минимальные зависимости** - только lucide-react

### Метрики сборки
```
File sizes after gzip:
  63.09 kB  build/static/js/main.js
  3.11 kB   build/static/css/main.css
  1.77 kB   build/static/js/453.chunk.js
```

## 🔐 Безопасность

### Приватность данных
- ✅ Все данные остаются в браузере пользователя
- ✅ Нет отправки данных на внешние серверы
- ✅ Нет аналитики или трекинга
- ✅ Пользователь полностью контролирует свои данные

### Валидация данных
- ✅ TypeScript типизация на уровне компиляции
- ✅ Проверка формата при импорте JSON
- ✅ Обработка ошибок localStorage

## 🐛 Обработка ошибок

### Сценарии ошибок
1. **localStorage недоступен** - приложение работает без сохранения
2. **Неверный JSON при импорте** - показ сообщения об ошибке
3. **Отсутствие данных** - использование значений по умолчанию

### Отладка
- **React DevTools** - для отладки компонентов
- **Console.log** - в utils функциях при ошибках
- **TypeScript** - проверка типов на этапе компиляции

## 📈 Возможности для расширения

### Краткосрочные улучшения
- [ ] Добавление заметок к циклам
- [ ] Экспорт в PDF формат
- [ ] Темная тема
- [ ] Настройки длительности периода

### Долгосрочные планы
- [ ] Push уведомления
- [ ] Синхронизация через облако
- [ ] Мобильное приложение
- [ ] Интеграция с календарем устройства

---

*Документация создана: 3 июля 2025*  
*Автор: Claude Code Assistant*  
*Версия: 1.0.0*
