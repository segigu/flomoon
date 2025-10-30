# Текущая задача

**Last updated:** 2025-10-31T12:00:00Z

---

## TASK-027: Заменить заголовки на Flomoon и обновить название приложения 🏷️

**Категория:** chore | **Приоритет:** 🟡 medium | **Сложность:** simple

**Статус:** in-progress
**Начата:** 2025-10-31T12:00:00Z

### Описание

Обновить все заголовки и названия приложения на 'Flomoon' вместо старого названия 'Nastya' или 'Настя'.

### Требования

1. Обновить заголовок в `public/index.html` (`<title>Flomoon</title>`)
2. Обновить название приложения в `package.json` (name, description)
3. Проверить все метатеги (description, og:title, og:description) в index.html и manifest.json
4. Обновить текст в компонентах если есть ссылки на старое название в UI
5. Проверить файлы конфигурации и комментарии в коде
6. Обновить логирование и иные места где может быть упоминание старого названия

### Связанные файлы

- [public/index.html](../../public/index.html)
- [package.json](../../package.json)
- [public/manifest.json](../../public/manifest.json)
- [src/components/ModernNastiaApp.tsx](../../src/components/ModernNastiaApp.tsx)
- [src/App.tsx](../../src/App.tsx)

### Теги

branding, config, naming, chore, ui

---

### План действий

1. Обновить `public/index.html` - заголовок и метатеги
2. Обновить `package.json` - name и description
3. Обновить `public/manifest.json` - name, short_name, description
4. Найти упоминания "Nastya" в коде - grep поиск
5. Протестировать загрузку приложения

---

**Задача косметическая:** Согласованный брендинг приложения
