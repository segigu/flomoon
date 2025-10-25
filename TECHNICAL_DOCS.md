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
**Назначение**: Компактный визуальный календарь месяца с картинкой для отображения в списке циклов

**Props**:
```typescript
interface MiniCalendarProps {
  date: Date;           // Дата цикла (целевой день будет выделен)
  imageUrl?: string;    // URL картинки для правой зоны
  onDelete?: () => void; // Коллбэк для кнопки удаления
}
```

**Архитектура: Двухзонный layout**

Компонент разделён на две зоны в соотношении 2:1:
1. **Левая зона (66.67% ширины)** - календарная сетка
2. **Правая зона (33.33% ширины)** - картинка месяца + кнопка удаления

**Структура компонента**:
```tsx
<div className={styles.miniCalendar}>
  {/* Левая зона: календарная сетка */}
  <div className={styles.calendarContent}>
    <div className={styles.monthName}>Январь 2025</div>
    <div className={styles.weekDays}>Пн Вт Ср Чт Пт Сб Вс</div>
    <div className={styles.daysGrid}>
      {days.map((dayInfo, index) => (
        <div className={styles.day}>
          {dayInfo.day}
          {/* Hand-drawn кружок для целевой даты */}
          {dayInfo.isTarget && (
            <svg className={styles.handDrawnCircle}>...</svg>
          )}
        </div>
      ))}
    </div>
  </div>

  {/* Правая зона: картинка + кнопка */}
  {imageUrl && (
    <div className={styles.imageContainer}>
      <img src={imageUrl} className={styles.image} />
      {onDelete && (
        <button className={styles.deleteButton}>
          <TrashIcon />
        </button>
      )}
    </div>
  )}
</div>
```

**Визуальные элементы**:

- **Название месяца** (`.monthName`):
  - Шрифт: 13px, жирный (700)
  - Цвет: #000000 (чёрный) - обеспечивает максимальную читаемость
  - Выравнивание: слева

- **Дни недели** (`.weekDays`, `.weekDay`):
  - Шрифт: 8px, средний (500)
  - Цвет: #999 (серый)
  - Grid layout: 7 столбцов

- **Сетка дней** (`.daysGrid`, `.day`):
  - Grid layout: 7 столбцов, gap 2px
  - Дни текущего месяца: `var(--nastia-dark)`, 10px
  - Дни других месяцев: серые полупрозрачные (`opacity: 0.5`)
  - **Целевой день** (`.targetDay`): красный `var(--nastia-red)`, жирный шрифт (700)
  - Максимум 35 дней в сетке (5 недель)

- **Hand-drawn обводка** (`.handDrawnCircle`):
  - SVG path с квадратичными кривыми Безье (Q, T)
  - Размер: 140% от ячейки дня (выходит за границы!)
  - Анимация: `drawCircle` 0.6s ease-out (stroke-dasharray)
  - Цвет: `var(--nastia-red)`, opacity: 0.8

- **Картинка** (`.image`):
  - `width: 100%; height: 100%` - заполняет весь контейнер
  - `object-fit: cover` - обрезает лишнее, сохраняя пропорции
  - `object-position: center center` - центрирование
  - Fallback: при ошибке загрузки подставляется `default.png`

- **Кнопка удаления** (`.deleteButton`):
  - Position: absolute, top: 8px, right: 8px
  - Размер: 32×32px, круглая
  - Фон: `rgba(255, 255, 255, 0.95)` + `backdrop-filter: blur(8px)`
  - Цвет иконки: #666 (серый)
  - Наложена поверх картинки (z-index: 10)

**Технические детали**:

```typescript
// Коррекция дня недели: воскресенье = 7 (не 0)
let firstDayOfWeek = firstDay.getDay();
firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;

// Генерация массива дней (включая соседние месяцы)
const days: Array<{ day: number; isCurrentMonth: boolean; isTarget: boolean }> = [];

// Дни из предыдущего месяца (заполнение начала сетки)
for (let i = firstDayOfWeek - 1; i > 0; i--) {
  days.push({ day: daysInPrevMonth - i + 1, isCurrentMonth: false, isTarget: false });
}

// Дни текущего месяца
for (let i = 1; i <= daysInMonth; i++) {
  days.push({ day: i, isCurrentMonth: true, isTarget: i === targetDay });
}

// Дни следующего месяца (заполнение конца сетки до 35 дней)
const remainingDays = 35 - days.length;
for (let i = 1; i <= remainingDays; i++) {
  days.push({ day: i, isCurrentMonth: false, isTarget: false });
}
```

**Hand-drawn SVG path**:
```tsx
<svg className={styles.handDrawnCircle} viewBox="0 0 50 50">
  <path
    d="M 8,25 Q 7,15 15,8 T 25,6 Q 35,5.5 42,13 T 45,25 Q 45.5,35 38,42 T 28,45 Q 18,45.5 11,38 T 8,28"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
```

**CSS модули** ([src/components/MiniCalendar.module.css](src/components/MiniCalendar.module.css)):

```css
.miniCalendar {
  display: flex;
  align-items: stretch;  /* Обе зоны одинаковой высоты */
  width: 100%;
  max-width: 100%;
  /* overflow: hidden убран - обрезает кружок */
}

.calendarContent {
  flex: 0 0 66.67%;  /* Ровно 2/3 ширины */
  padding: 0.75rem 1rem;
  border-top-left-radius: 1rem;
  border-bottom-left-radius: 1rem;
  box-sizing: border-box;
}

.imageContainer {
  position: relative;
  flex: 0 0 33.33%;  /* Ровно 1/3 ширины */
  padding: 0;
  border-top-right-radius: 1rem;
  border-bottom-right-radius: 1rem;
  overflow: hidden;  /* Только здесь - для скругления углов картинки */
  box-sizing: border-box;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  display: block;
}

.handDrawnCircle {
  position: absolute;
  width: 140%;  /* Выходит за границы ячейки! */
  height: 140%;
  transform: translate(-50%, -50%);
  color: var(--nastia-red);
  opacity: 0.8;
  animation: drawCircle 0.6s ease-out;
}

@keyframes drawCircle {
  from {
    stroke-dasharray: 200;
    stroke-dashoffset: 200;
    opacity: 0;
  }
  to {
    stroke-dasharray: 200;
    stroke-dashoffset: 0;
    opacity: 0.8;
  }
}
```

**Интеграция в список циклов** ([src/components/ModernNastiaApp.tsx](src/components/ModernNastiaApp.tsx)):

```tsx
// Генерация URL картинки по месяцу цикла
const cycleDate = new Date(cycle.startDate);
const monthNumber = (cycleDate.getMonth() + 1).toString().padStart(2, '0');
const monthImageUrl = `${process.env.PUBLIC_URL}/images/calendar-months/${monthNumber}.png`;

// Использование компонента
<div className={styles.cycleItem}>
  <MiniCalendar
    date={cycleDate}
    imageUrl={monthImageUrl}
    onDelete={() => deleteCycle(cycle.id)}
  />
</div>
```

**Автоматическая подстановка картинок**:

Структура папки [public/images/calendar-months/](public/images/calendar-months/):
```
01.png - Январь
02.png - Февраль
03.png - Март
...
12.png - Декабрь
default.png - Заглушка (если картинка не загрузилась)
```

**Требования к картинкам**:
- Формат: только PNG (не JPG!)
- Рекомендуемый размер: ~500×1000px (вертикальная ориентация)
- Максимальный вес: 500KB на картинку
- Поддержка прозрачности: да

**Fallback при ошибке загрузки**:
```tsx
<img
  src={imageUrl}
  onError={(e) => {
    const target = e.target as HTMLImageElement;
    target.src = `${process.env.PUBLIC_URL}/images/calendar-months/default.png`;
  }}
/>
```

**Критические правила дизайна**:
- ⚠️ НЕ добавлять `overflow: hidden` на `.miniCalendar` или `.cycleItem` - обрежет кружок!
- ⚠️ НЕ менять пропорции 66.67% / 33.33% - оптимизированы для мобильных
- ⚠️ НЕ менять цвет месяца на фиолетовый - чёрный обеспечивает лучшую читаемость
- ⚠️ НЕ использовать JPG формат - только PNG

**Подробнее**: См. [DESIGN_RULES.md](DESIGN_RULES.md) - раздел "Двухзонный дизайн мини-календаря"

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

## 📬 Push-уведомления

### Архитектура системы

**Backend генерация** ([scripts/sendNotifications.js](scripts/sendNotifications.js)):
- GitHub Action запускается ежедневно в 12:00 по Москве (9:00 UTC)
- Читает данные циклов из `nastia-data/nastia-data.json`
- Вычисляет фазу цикла и выбирает тип уведомления
- Генерирует тексты через AI (Claude Haiku 4.5 → OpenAI GPT-4o-mini fallback)
- Отправляет push через Web Push API (VAPID)
- Сохраняет в `nastia-data/nastia-notifications.json`

**Frontend** ([src/utils/pushNotifications.ts](src/utils/pushNotifications.ts)):
- Регистрация Service Worker
- Подписка на push-уведомления (VAPID public key)
- Синхронизация подписок с GitHub
- Локальное хранилище прочитанных уведомлений

### Генерация текстов AI

**Модели:**
- **Основная**: Claude Haiku 4.5 (`claude-haiku-4-5`)
- **Fallback**: OpenAI GPT-4o-mini (`gpt-4o-mini`)
- **Температура**: 0.95 (высокая вариативность)
- **Max tokens**: 300

**Лимиты символов:**
- **Title**: максимум 40 символов (имя персонажа)
- **Body**: **максимум 120 символов** (обновлено 25.10.2025)
- **Fallback**: статичные сообщения при недоступности AI

**Стилистика:**
- Житейский язык (не астрология!)
- Саркастичный тон с юмором
- Законченные грамматические фразы
- Допустим умеренный мат ("задолбал", "орёт", "бесит")
- 1-2 эмодзи обязательно

**Типы уведомлений (11 типов):**

1. **morning_brief** - утренний гороскоп (06:45 Berlin time)
   ```
   Title: "Утренний пинок"
   Body: "Настя, сегодня выживание на грани — терпи, вечером полегчает, обещаем! 💥"
   ```

2. **fertile_window** - фертильное окно (за 5 дней до овуляции)
   ```
   Title: "Людмила Фертильная"
   Body: "Настюш, зона риска, без защиты ни шагу! Презервативы в боевой готовности! 💋🛡️"
   ```

3. **ovulation_day** - день овуляции
   ```
   Title: "Фёдор Плодовитый"
   Body: "Настёна, сегодня овуляция — прикрывайся как на войне, это не шутки! 🔥"
   ```

4. **period_forecast** - за 1-5 дней до менструации
   ```
   Title: "Зоя ПМСова"
   Body: "Настюх, пара дней до шторма — запасайся шоколадом, грелкой и терпением! 🙄🍫"
   ```

5. **period_check** - прогноз на сегодня
   ```
   Title: "Вероника Контрольная"
   Body: "Настюх, день Х по прогнозу — проверься и отметь, если началось! 👀"
   ```

6. **period_waiting** - задержка 1-2 дня
   ```
   Title: "Глаша Терпеливая"
   Body: "Настёна, задержка — прислушайся к организму, он знает что творит! 🤔"
   ```

7. **period_delay_warning** - задержка 3+ дней
   ```
   Title: "Римма Тревожная"
   Body: "Настюш, задержка затянулась — может, пора тест сделать? Береги нервы! 😬🧪"
   ```

8. **period_confirmed_day0** - первый день (отмечен пользователем)
   ```
   Title: "Тамара Пледовая"
   Body: "Настёна, старт! Плед, грелка, любимый сериал — минимум героических подвигов! 🛋️💜"
   ```

9. **period_confirmed_day1** - второй день
   ```
   Title: "Соня Грелочникова"
   Body: "Настюш, второй день — грелку к пузику, шоколадку в рот, всех нафиг! 🔥🍫"
   ```

10. **period_confirmed_day2** - третий день
    ```
    Title: "Инга Железистая"
    Body: "Настёна, третий день, пей воду, береги нервы — скоро станет легче, держись! 💪✨"
    ```

11. **birthday** - день рождения
    ```
    Title: "Галя Именинница"
    Body: "Настюш, с днюхой! Праздник без драмы, торт и подарки обязательны! 🎉💜🎂"
    ```

### История изменений генерации

**25 октября 2025 - Улучшение стилистики:**
- Увеличен лимит body: 50-60 → **120 символов**
- Morning brief: убрана астрология ("Марс рычит") → житейский язык ("сегодня конфликты весь день")
- Исправлена грамматика: "скоро легче" → "скоро станет легче"
- Переписаны все промпты для AI (2 типа гороскопа + 9 типов cycle notifications)
- Добавлена валидация длины с автоматическим truncation
- Обновлены fallback-сообщения (полные законченные фразы)

**Технические детали:**
- `responseSchema`: maxLength 120
- `truncateWithEllipsis`: дефолтный лимит 120
- `ensureEmojiPresent`: явная передача лимита 120
- `generateMessage`: валидация с предупреждением в лог

**Примеры промптов:**

Morning brief ([sendNotifications.js:200-253](scripts/sendNotifications.js)):
```javascript
// Анализирует полный гороскоп (2 абзаца) и извлекает главную мысль
// Требования: житейский язык, максимум 120 символов, законченная фраза
// Примеры: "Настя, сегодня конфликты весь день — держись крепче, вечером полегчает!"
```

Cycle notifications ([sendNotifications.js:782-852](scripts/sendNotifications.js)):
```javascript
// Базовый промпт: персонаж (1-3 слова) + body (max 120 символов)
// Каждый тип имеет специфичный контекст и развёрнутые примеры (60-87 символов)
// Варьируются советы: грелка, шоколад, терпение, плед, сериал
```

### Совместимость устройств

**Поддержка длины body:**
- iOS: до ~170 символов (зависит от длины title)
- Android: до ~240 символов
- Безопасный универсальный лимит: **120 символов**

**Поддерживаемые браузеры:**
- ✅ Chrome for Android
- ✅ Chrome for Desktop
- ❌ Safari (не поддерживает Web Push API)
- ⚠️ Firefox (не тестировалось)

### VAPID ключи

**Публичный ключ** (безопасно хранить в коде):
```
BHny9gVuz3Muw9SYx2IiPyN6dapIeqdWUtPK24USYjrXwXz-IjyPVk6dN9RqzTsYP61zr7kaEilNk0bBFC0HXkc
```

**Приватный ключ**: хранится в GitHub Secrets (зашифрованно)

### Структура данных

**subscriptions.json** (nastia-data repo):
```json
{
  "subscriptions": [{
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": { "p256dh": "...", "auth": "..." },
    "settings": { "enabled": true }
  }],
  "lastUpdated": "2025-10-25T12:00:00.000Z"
}
```

**nastia-notifications.json** (nastia-data repo):
```json
{
  "notifications": [{
    "id": "2025-10-25T09:00:00.000Z-morning_brief",
    "type": "morning_brief",
    "title": "Утренний пинок",
    "body": "Настя, сегодня выживание на грани — терпи, вечером полегчает! 💥",
    "sentAt": "2025-10-25T04:45:12.123Z",
    "url": "https://segigu.github.io/nastia-calendar/?open=daily-horoscope"
  }],
  "lastUpdated": "2025-10-25T04:45:12.123Z"
}
```

**nastia-config.json** (nastia-data repo):
```json
{
  "claude": { "apiKey": "sk-ant-..." },
  "notificationSchedule": {
    "dayKey": "2025-10-25T00:00:00.000Z",
    "targetMinutes": 435,
    "targetTime": "07:15",
    "timezone": "Europe/Berlin",
    "slotMinutes": 5,
    "generatedAt": "2025-10-25T00:00:00.000Z"
  },
  "updatedAt": "2025-10-25T04:45:12.123Z"
}
```

### Расписание отправки

**Morning brief:**
- Время: 06:45 Berlin time (ежедневно)
- Тип: `morning_brief`
- Содержание: главная мысль дня (житейский язык, без астрологии)

**Cycle notifications:**
- Время: рандомное 07:00-21:00 Berlin time (слоты по 5 минут)
- Тип: зависит от фазы цикла (fertile_window, period_forecast, и т.д.)
- Расписание генерируется один раз в день и хранится в `nastia-config.json`

### Отладка

**Preview mode** (локальное тестирование):
```bash
node scripts/sendNotifications.js --preview-morning-brief
```

**GitHub Action логи:**
1. Actions → Send Push Notifications
2. Открыть последний запуск
3. Просмотреть логи шага "Send notifications"

**Service Worker** (Chrome DevTools):
1. F12 → Application → Service Workers
2. Проверить статус регистрации
3. Console для логов push событий

## 📈 Возможности для расширения

### Краткосрочные улучшения
- [ ] Добавление заметок к циклам
- [ ] Экспорт в PDF формат
- [ ] Темная тема
- [ ] Настройки длительности периода

### Долгосрочные планы
- [x] Push уведомления (✅ реализовано)
- [x] Синхронизация через облако (✅ реализовано через GitHub)
- [ ] Мобильное приложение
- [ ] Интеграция с календарем устройства

---

*Документация создана: 3 июля 2025*
*Автор: Claude Code Assistant*
*Последнее обновление: 25 октября 2025*
*Версия: 1.1.0*
