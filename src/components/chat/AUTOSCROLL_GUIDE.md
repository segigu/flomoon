# Руководство по автоскроллу в ChatManager

## Проблема

При добавлении сообщений в чат нужно автоматически прокручивать область вниз, чтобы новое сообщение было видно пользователю.

## Архитектура решения

### В основном приложении (ModernNastiaApp)

ChatManager использует **`window.scrollTo()`** для скролла всей страницы. Это работает, потому что приложение занимает весь viewport.

```typescript
// useChatScroll.ts - автоскролл для основного приложения
window.scrollTo({
  top: document.documentElement.scrollHeight - window.innerHeight + 80,
  behavior: 'smooth',
});
```

**80px** - отступ для tab bar внизу экрана.

### В песочнице (тестовая среда)

ChatManager находится внутри ограниченного контейнера с фиксированной высотой. Нужно скроллить **контейнер**, а не window.

## Решение для песочницы

### 1. Структура контейнеров

```jsx
<div style={{ height: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
  <div ref={chatScrollRef} style={{ flex: 1, overflow: 'auto' }}>
    <ChatManager onMessagesChange={handleMessagesChange} />
  </div>
</div>
```

**Важно:**
- Внешний div имеет **фиксированную высоту** (`height: 400px`)
- Внешний div имеет `overflow: hidden` (скрывает переполнение)
- Внутренний div имеет `flex: 1` (занимает всё доступное пространство)
- Внутренний div имеет `overflow: auto` (показывает scrollbar при переполнении)

### 2. Callback onMessagesChange

ChatManager уведомляет родителя при любых изменениях в чате:

```typescript
// ChatManager.tsx
useEffect(() => {
  if (onMessagesChange) {
    onMessagesChange();
  }
}, [chat.messages.length, chat.typingAuthor, onMessagesChange]);
```

**Важно:** Callback срабатывает:
- ✅ Когда добавляется новое сообщение (`messages.length` изменился)
- ✅ Когда появляется/исчезает индикатор печати (`typingAuthor` изменился)

Это гарантирует, что скролл срабатывает **ДО появления текста**, пока показываются три точки "..."

### 3. Автоскролл в песочнице

```typescript
const handleMessagesChange = useCallback(() => {
  // Тройной requestAnimationFrame для надёжности
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (chatScrollRef.current) {
          // Просто скроллим до конца контента
          // Tab bar учитывается через paddingBottom внешнего контейнера
          chatScrollRef.current.scrollTo({
            top: chatScrollRef.current.scrollHeight,
            behavior: 'smooth',
          });
          console.log(
            '[Sandbox] Auto-scroll to:',
            chatScrollRef.current.scrollHeight,
            'Tab Bar:',
            showTabBar ? 'ON (padding-bottom applied)' : 'OFF'
          );
        }
      });
    });
  });
}, [showTabBar]);
```

**Важно:** Песочница использует `paddingBottom` на КОНТЕНТЕ внутри scrollable контейнера (`chatScrollRef`). ChatManager обёрнут в `<div style={{ paddingBottom: showTabBar ? '80px' : '0px' }}>`, что создаёт дополнительное пространство внизу, чтобы последнее сообщение не скрывалось за fixed tab bar. Автоскролл просто скроллит до `scrollHeight` без дополнительных расчётов.

**Почему тройной RAF?**
1. **1-й RAF**: React начинает обновлять виртуальный DOM
2. **2-й RAF**: Браузер применяет изменения к реальному DOM
3. **3-й RAF**: DOM получает финальные размеры → `scrollHeight` актуален → скроллим

## Настройка отступа для плавающего меню

Если внизу экрана есть плавающее меню (например, tab bar), нужно скроллить **чуть выше**, чтобы последнее сообщение не скрывалось за меню.

### Для window.scrollTo (основное приложение)

```typescript
const TAB_BAR_HEIGHT = 80; // высота tab bar

window.scrollTo({
  top: document.documentElement.scrollHeight - window.innerHeight + TAB_BAR_HEIGHT,
  behavior: 'smooth',
});
```

### Для контейнера (песочница)

```typescript
const BOTTOM_MENU_HEIGHT = 60; // высота меню

chatScrollRef.current.scrollTo({
  top: chatScrollRef.current.scrollHeight - chatScrollRef.current.clientHeight + BOTTOM_MENU_HEIGHT,
  behavior: 'smooth',
});
```

Или добавь `padding-bottom` к ChatManager:

```css
.historyChatMessages {
  padding-bottom: 60px; /* высота меню */
}
```

## Отладка

### Консольные логи

В песочнице включены логи автоскролла:

```typescript
console.log('[Sandbox] Auto-scroll to:', chatScrollRef.current.scrollHeight);
```

В `useChatScroll.ts` также есть логи:

```typescript
console.log('[useChatScroll] Phase: dialogue, scrolling to BOTTOM');
console.log('[useChatScroll] Scrolling to MOON, targetTop:', targetTop);
```

### Проверка scrollHeight

В DevTools:

```javascript
// Текущая позиция
chatScrollRef.current.scrollTop

// Максимальная высота контента
chatScrollRef.current.scrollHeight

// Высота видимой области
chatScrollRef.current.clientHeight

// Проверка: scrollTop + clientHeight ≈ scrollHeight → скроллено до конца
```

## Частые ошибки

### ❌ Контейнер растёт бесконечно

**Проблема:** Забыли задать фиксированную высоту контейнеру.

```jsx
// НЕПРАВИЛЬНО
<div style={{ minHeight: '400px' }}> // контейнер растёт!

// ПРАВИЛЬНО
<div style={{ height: '400px' }}> // фиксированная высота
```

### ❌ Скролл происходит ДО обновления DOM

**Проблема:** Вызываете `scrollTo()` сразу после `addMessage()`, но DOM ещё не обновился.

```typescript
// НЕПРАВИЛЬНО
chatRef.current?.addMessage(message);
chatScrollRef.current?.scrollTo({ top: scrollHeight }); // scrollHeight старый!

// ПРАВИЛЬНО
chatRef.current?.addMessage(message);
// ChatManager вызовет onMessagesChange ПОСЛЕ рендера
```

### ❌ Скроллите не тот элемент

**Проблема:** Скроллите внешний div вместо внутреннего.

```jsx
<div ref={wrongRef}> // ❌ этот не скроллится (overflow: hidden)
  <div ref={chatScrollRef}> // ✅ этот скроллится (overflow: auto)
```

## Тестирование

### В песочнице

1. Открой `http://localhost:3000/?sandbox`
2. Нажми **🎬 Симуляция диалога планет**
3. Смотри в консоль логи `[Sandbox] Auto-scroll to: ...`
4. Проверь, что контейнер скроллится вниз плавно
5. **Тестирование с Tab Bar:**
   - Включи Tab Bar кнопкой "Tab Bar: ON"
   - Нажми **📖 Симуляция истории с кнопками**
   - Убедись, что последняя кнопка выбора не скрывается за нижней панелью
   - Выключи Tab Bar и проверь, что скролл работает без отступа

### В основном приложении

1. Открой `http://localhost:3000/`
2. Перейди на вкладку **Узнай себя**
3. Нажми **Начать**
4. Смотри в консоль логи `[useChatScroll] ...`
5. Проверь, что страница скроллится вниз

## Резюме

| Контекст | Метод скролла | Ref | Отступ для меню |
|----------|---------------|-----|-----------------|
| Основное приложение | `window.scrollTo()` | Не нужен | `+ 80` в `top` |
| Песочница | `containerRef.scrollTo()` | `chatScrollRef` | `padding-bottom` или `+ 60` в `top` |

**Ключевой принцип:** Скроллите тот элемент, у которого `overflow: auto` или `overflow: scroll`.
