# Правила дизайна проекта Nastia

## ⛔️ КРИТИЧЕСКИ ВАЖНО: Запрет на изменения

Этот документ содержит **строгие правила**, которые **ЗАПРЕЩЕНО** нарушать без явного согласования с владельцем проекта.

---

## 🎨 Стеклянное нижнее меню (GlassTabBar)

### ❌ ЗАПРЕЩЕНО изменять следующие параметры

Файл: `src/components/GlassTabBar.module.css`

#### Класс `.glassTabBar` - основная панель:

```css
margin: 12px 32px;              /* Отступы от краев: 32px слева и справа */
padding: 6px;                    /* Компактная высота панели */
border-radius: 40px;             /* Сильное закругление углов в стиле iOS */
background: rgba(253, 242, 248, 0.12);  /* Оптимальная прозрачность - видно объекты сзади */
backdrop-filter: blur(16px) saturate(180%) brightness(105%);  /* Сбалансированное размытие */
border: 1px solid rgba(255, 255, 255, 0.8);  /* Четкая граница */
```

#### Класс `.tabButton` - кнопки вкладок:

```css
gap: 3px;           /* Расстояние между иконкой и текстом */
padding: 6px 4px;   /* Внутренние отступы кнопок */
min-height: 52px;   /* Минимальная высота кнопок */
```

### ⚠️ Почему эти параметры важны

1. **Прозрачность 0.12** - идеальный баланс: панель видна, но через неё четко просматривается контент позади
2. **Размытие 16px** - достаточно для эффекта матового стекла, но не блокирует видимость
3. **Закругление 40px** - современный iOS-стиль с сильно скругленными углами
4. **Отступы 32px** - панель не прилегает к краям экрана, создавая "плавающий" эффект
5. **Компактная высота** - минималистичный дизайн без лишнего пространства

### 📝 История изменений

Эти параметры были подобраны после **множества итераций** для достижения:
- Максимальной прозрачности с сохранением читаемости иконок
- Видимости контента позади панели
- Стеклянного эффекта как в iOS 15+
- Компактности и элегантности

### 🔒 Как избежать случайных изменений

1. **НЕ** используйте автоматические инструменты форматирования на этом файле
2. **НЕ** копируйте стили из других проектов
3. **НЕ** экспериментируйте с этими значениями без создания отдельной ветки
4. При использовании AI-ассистентов (Claude, ChatGPT и др.) **ВСЕГДА** указывайте этот документ как обязательный к соблюдению

---

## 🔄 Автоскролл в интерактивной истории

### ❌ ЗАПРЕЩЕНО менять логику скролла

Файл: `src/components/ModernNastiaApp.tsx` (строки 1350-1392)

#### ⚠️ КРИТИЧЕСКОЕ ПРАВИЛО: Скроллим window, НЕ контейнер!

```typescript
// ✅ ПРАВИЛЬНО - скроллим весь window:
window.scrollTo({
  top: document.documentElement.scrollHeight,
  behavior: 'smooth'
});

// ❌ НЕПРАВИЛЬНО - НЕ скроллить контейнер:
container.scrollTo({ ... });  // Это НЕ РАБОТАЕТ!
```

### 📝 Почему именно window?

1. **Контейнер `.historyChatMessages` не имеет `overflow: auto/scroll`**
   - Он не является скроллируемым элементом
   - Реальный скролл происходит на уровне window

2. **Два отдельных useEffect для разных фаз:**
   - Фаза `generating`: скроллим при появлении планетарных сообщений
   - Фаза `ready`: скроллим при появлении сегментов истории

3. **Тройной requestAnimationFrame обязателен:**
   - Ждем 3 кадра для гарантированного рендера элементов
   - Иначе скролл сработает до того, как элементы получат размеры

### 🔒 Зависимости useEffect

**Для фазы generating:**
```typescript
[planetChatMessages, currentTypingPlanet, historyStoryPhase]
```

**Для фазы ready:**
```typescript
[historyStorySegments, historyStoryLoading, historyStoryTyping, historyStoryPhase]
```

**НЕ объединять их в один useEffect!** Это приведет к избыточным вызовам скролла.

### 📄 Подробная документация

См. файл [AUTOSCROLL_FIX.md](./AUTOSCROLL_FIX.md) для детального объяснения проблемы и решения.

---

## 📅 Двухзонный дизайн мини-календаря в списке циклов

### ❌ ЗАПРЕЩЕНО изменять следующие параметры

Файлы:
- `src/components/MiniCalendar.tsx`
- `src/components/MiniCalendar.module.css`
- `src/components/NastiaApp.module.css` (`.cycleItem`)

#### Правило 1: Точные пропорции двухзонного layout

```css
/* MiniCalendar.module.css - класс .miniCalendar */
display: flex;
align-items: stretch;  /* Элементы растягиваются на всю высоту */
width: 100%;
max-width: 100%;

/* Календарь слева - 2/3 ширины */
.calendarContent {
  flex: 0 0 66.67%;  /* НЕ менять! Ровно 2/3 */
  padding: 0.75rem 1rem;
  border-top-left-radius: 1rem;
  border-bottom-left-radius: 1rem;
  box-sizing: border-box;
}

/* Картинка справа - 1/3 ширины */
.imageContainer {
  flex: 0 0 33.33%;  /* НЕ менять! Ровно 1/3 */
  padding: 0;
  border-top-right-radius: 1rem;
  border-bottom-right-radius: 1rem;
  overflow: hidden;
  box-sizing: border-box;
}
```

**Обоснование**: Пропорции 2:1 тщательно подобраны для мобильных экранов (iPhone 375px). Любое отклонение приводит к переполнению или нарушению баланса композиции.

#### Правило 2: Название месяца чёрным шрифтом

```css
.monthName {
  font-size: 13px;
  font-weight: 700;
  color: #000000;  /* НЕ фиолетовый, НЕ градиент */
  text-align: left;
}
```

**Обоснование**: Чёрный цвет обеспечивает максимальную читаемость на светлых фонах и не конфликтует с красным выделением целевой даты.

#### Правило 3: Картинка растягивается на 100% контейнера

```css
.image {
  width: 100%;
  height: 100%;
  object-fit: cover;  /* Заполняет весь блок, обрезая лишнее */
  object-position: center center;  /* Центрирование */
  display: block;
}
```

**Обоснование**: Картинка должна полностью заполнять правую зону без отступов по краям. `object-fit: cover` гарантирует, что изображение заполнит весь контейнер, сохраняя пропорции и обрезая лишнее.

#### Правило 4: overflow: hidden ТОЛЬКО на .imageContainer

```css
/* ❌ НЕПРАВИЛЬНО - обрезает hand-drawn кружок */
.miniCalendar {
  overflow: hidden;  /* НЕ добавлять! */
}

.cycleItem {
  overflow: hidden;  /* НЕ добавлять! */
}

/* ✅ ПРАВИЛЬНО - только на контейнере картинки */
.imageContainer {
  overflow: hidden;  /* Скругляет углы картинки */
}
```

**Обоснование**: Hand-drawn SVG кружок имеет размер 140% от ячейки даты. `overflow: hidden` на родителях обрежет его. Скруглять нужно только правую зону с картинкой.

#### Правило 5: Кнопка удаления поверх картинки

```css
.deleteButton {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  color: #666;  /* Серый, НЕ синий */
  z-index: 10;
}
```

**Обоснование**: Кнопка накладывается на правый верхний угол картинки для экономии места. Серый цвет иконки нейтрален и не перетягивает внимание.

### 📝 Автоматическая подстановка картинок по месяцам

Файл: `src/components/ModernNastiaApp.tsx` (около строки 4590)

```tsx
const cycleDate = new Date(cycle.startDate);
const monthNumber = (cycleDate.getMonth() + 1).toString().padStart(2, '0');
const monthImageUrl = `${process.env.PUBLIC_URL}/images/calendar-months/${monthNumber}.png`;

<MiniCalendar
  date={cycleDate}
  imageUrl={monthImageUrl}
  onDelete={() => deleteCycle(cycle.id)}
/>
```

**Структура папки** `public/images/calendar-months/`:
```
01.png - Январь
02.png - Февраль
...
12.png - Декабрь
default.png - Заглушка (если картинка не загрузилась)
```

**Формат**: только PNG (не JPG!)

**Fallback**: При ошибке загрузки автоматически подставляется `default.png` через `onError` хендлер.

### 🔒 Почему эти параметры важны

1. **Пропорции 66.67% / 33.33%** - оптимальный баланс: календарь читаем, картинка видна, но не доминирует.
2. **Растягивание картинки на 100%** - убирает визуальные «дыры» и обеспечивает плотное заполнение.
3. **overflow: hidden только на картинке** - позволяет кружку выходить за границы без обрезки.
4. **Чёрный шрифт месяца** - лучшая контрастность, не конкурирует с красным кружком.
5. **Кнопка на картинке** - экономия места, интуитивное расположение для удаления всего цикла.

### 📄 Подробная документация

См. файл [public/images/calendar-months/README.md](./public/images/calendar-months/README.md) для требований к картинкам.

---

## 🪟 Структура модальных окон (Full-Screen Bottom Sheet)

### ❌ ЗАПРЕЩЕНО создавать центральные popup модалки для мобильной версии

**Универсальный компонент**: `src/components/FullScreenModal.tsx`

### ⚠️ КРИТИЧЕСКОЕ ПРАВИЛО: Все модальные окна = full-screen bottom sheet

**Мобильная версия (основная):**
- ✅ Открытие: slide up animation снизу вверх
- ✅ Закрытие: slide down animation вниз
- ✅ Размер: **весь экран** (width: 100%, height: 100vh)
- ✅ Без overlay (если модалка обязательна - например, неавторизованный пользователь)
- ✅ Структура: Header (title + close button) + Body (scrollable content)
- ❌ Никаких центральных popup с padding вокруг!

**Десктоп версия (опционально):**
- Можно центральный popup с закругленными углами (max-width: 600px)
- Применяется через media query `@media (min-width: 768px)`

### 📐 Обязательная структура

```tsx
import { FullScreenModal } from './FullScreenModal';

<FullScreenModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Заголовок модалки"
  closable={true}  // false если модалку нельзя закрыть
  backgroundColor="#FFF0F5"  // Lavender Blush (по умолчанию)
>
  {/* Контент модалки */}
  <div>...</div>
</FullScreenModal>
```

### ⚙️ Параметры FullScreenModal

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `isOpen` | boolean | ✅ | Открыта ли модалка |
| `onClose` | () => void | ✅ | Обработчик закрытия |
| `title` | string | ✅ | Заголовок (отображается в Header) |
| `children` | ReactNode | ✅ | Контент модалки (отображается в Body) |
| `closable` | boolean | ❌ | Можно ли закрыть (default: true) |
| `backgroundColor` | string | ❌ | Цвет фона (default: #FFF0F5) |
| `className` | string | ❌ | Дополнительный CSS класс |

### 🎨 Анимация

```css
/* FullScreenModal.module.css */
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.fullScreenModal {
  animation: slideUp 0.3s ease-out;
}
```

**Продолжительность**: 0.3s (как у Settings modal)
**Easing**: ease-out (плавное завершение)

### 📝 Эталон

**Settings Modal** (`src/components/ModernNastiaApp.tsx`, `src/components/NastiaApp.module.css`)

```tsx
// Пример использования FullScreenModal в AuthModal.tsx
<FullScreenModal
  isOpen={isOpen}
  onClose={onClose}
  title={mode === 'login' ? 'Вход' : 'Регистрация'}
  closable={false}  // Нельзя закрыть пока не авторизован
>
  {/* Tabs */}
  <div className={styles.tabs}>...</div>

  {/* Form */}
  <form className={styles.form}>...</form>
</FullScreenModal>
```

### 🔒 Почему именно bottom sheet?

1. **Mobile-first дизайн** - естественный паттерн для iOS/Android приложений
2. **Лучший UX на сенсорных экранах** - легко свайпнуть вниз для закрытия (будущая функциональность)
3. **Полноэкранность** - модалка не конкурирует с контентом позади (особенно важно для неавторизованных пользователей)
4. **Консистентность** - все модальные окна открываются одинаково (Settings, Period, Auth, Daily Horoscope и т.д.)
5. **Производительность** - нет лишних overlay слоев с blur эффектами

### ❌ Типичные ошибки

**НЕ делать так:**
```tsx
// ❌ НЕПРАВИЛЬНО - центральный popup
<div className={styles.modal}>
  <div className={styles.centeredPopup}>
    <h2>Заголовок</h2>
    <div>Контент</div>
  </div>
</div>
```

```css
/* ❌ НЕПРАВИЛЬНО */
.centeredPopup {
  max-width: 400px;
  margin: auto;
  border-radius: 24px; /* На мобилке закругление не нужно */
  padding: 2rem;
}
```

**Делать так:**
```tsx
// ✅ ПРАВИЛЬНО - FullScreenModal
<FullScreenModal
  isOpen={isOpen}
  onClose={onClose}
  title="Заголовок"
>
  <div>Контент</div>
</FullScreenModal>
```

### 🔄 Миграция существующих модалок

**План рефакторинга:**
1. ✅ AuthModal - переведен на FullScreenModal
2. ⏳ Settings Modal - уже использует full-screen паттерн (эталон)
3. ⏳ Period Modal - нужен рефакторинг
4. ⏳ Daily Horoscope Modal - нужен рефакторинг
5. ⏳ Notifications Modal - нужен рефакторинг

### 📄 Дополнительная документация

- **Компонент**: `src/components/FullScreenModal.tsx` (JSDoc с примерами)
- **Стили**: `src/components/FullScreenModal.module.css` (детальные комментарии)

---

## 📋 Другие правила дизайна

_(Этот раздел будет дополняться по мере необходимости)_

---

**Последнее обновление:** 2025-10-27
**Ответственный:** Sergey
