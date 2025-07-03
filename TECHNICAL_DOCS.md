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