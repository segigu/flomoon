# MCP Setup Guide - Настройка MCP-серверов

**Дата создания:** 2025-10-27
**Проект:** flomoon
**Цель:** Однозначная инструкция по настройке MCP-серверов для Claude Code

---

## 📋 Содержание

1. [Основы MCP](#основы-mcp)
2. [Типы конфигураций](#типы-конфигураций)
3. [Команды управления](#команды-управления)
4. [Настроенные MCP-серверы](#настроенные-mcp-серверы)
5. [Добавление нового MCP](#добавление-нового-mcp)
6. [Troubleshooting](#troubleshooting)

---

## Основы MCP

**MCP (Model Context Protocol)** - протокол для подключения внешних инструментов к Claude Code.

### Ключевые правила

1. ✅ **ВСЕГДА используй `--scope local`** для проектных MCP-серверов
2. ✅ **ВСЕГДА перезапускай VS Code** после изменения конфигурации
3. ✅ **Проверяй статус** через `claude mcp list`
4. ❌ **НЕ редактируй** `.claude.json` вручную (только через CLI)

---

## Типы конфигураций

### Local (рекомендуется)
**Scope:** `local` - конфигурация привязана к проекту
**Хранится:** `~/.claude.json` (секция для конкретного проекта)
**Команда:** `claude mcp add --scope local ...`

**Преимущества:**
- Конфигурация не теряется при переключении проектов
- Разные credentials для разных проектов
- Изоляция между проектами

### Global (НЕ используем)
**Scope:** `global` - конфигурация для всех проектов
**Команда:** `claude mcp add --scope global ...`

**Минусы:**
- Конфликты между проектами
- Сложно управлять разными credentials

---

## Команды управления

### Список всех MCP-серверов
```bash
claude mcp list
```

**Вывод:**
```
Checking MCP server health...

context7: npx -y @upstash/context7-mcp - ✓ Connected
figma-desktop: http://127.0.0.1:3845/mcp (HTTP) - ✓ Connected
supabase: npx -y @supabase/mcp-server-supabase@latest --access-token sbp_... - ✓ Connected
```

### Детали конкретного MCP
```bash
claude mcp get <name>
```

Пример:
```bash
claude mcp get supabase
```

### Удаление MCP
```bash
claude mcp remove "<name>" -s local
```

Пример:
```bash
claude mcp remove "supabase" -s local
```

### Добавление MCP
См. раздел [Добавление нового MCP](#добавление-нового-mcp)

---

## Настроенные MCP-серверы

### 1. Supabase (база данных)

**Статус:** ✓ Connected
**Тип:** stdio
**Scope:** local

**Команда добавления:**
```bash
claude mcp add --scope local --transport stdio supabase -- \
  npx -y @supabase/mcp-server-supabase@latest \
  --access-token sbp_3f84fb99c621f6d548649378cc722dde601233bd
```

**Важно:**
- Использует **Personal Access Token** (начинается с `sbp_`)
- НЕ использует Project API keys (anon/service_role)
- Personal Access Token получается здесь: https://supabase.com/dashboard/account/tokens

**Проверка:**
```bash
claude mcp get supabase
```

**Инструменты (доступны после перезапуска VS Code):**
- `mcp__supabase__execute_query` - выполнить SQL
- `mcp__supabase__list_tables` - список таблиц
- `mcp__supabase__get_schema` - схема БД
- и другие

---

### 2. Context7 (документация библиотек)

**Статус:** ✓ Connected
**Тип:** stdio
**Scope:** local

**Команда добавления:**
```bash
claude mcp add --scope local --transport stdio context7 \
  --env SUPABASE_URL=https://mbocfgtfkrlclmqjezfv.supabase.co \
  --env SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... -- \
  npx -y @upstash/context7-mcp
```

**Важно:**
- Использует Supabase для хранения контекста (интересная архитектура!)
- Требует service_role key (не anon)

**Проверка:**
```bash
claude mcp get context7
```

**Инструменты:**
- `mcp__context7__resolve-library-id` - поиск библиотеки
- `mcp__context7__get-library-docs` - получение документации

---

### 3. Figma Desktop (дизайн)

**Статус:** ✓ Connected
**Тип:** HTTP
**Scope:** local

**Команда добавления:**
```bash
claude mcp add --scope local --transport http figma-desktop \
  http://127.0.0.1:3845/mcp
```

**Важно:**
- Требует запущенное Figma Desktop приложение
- Работает только когда Figma открыт

**Проверка:**
```bash
claude mcp get figma-desktop
```

**Инструменты:**
- `mcp__figma__*` - работа с файлами Figma

---

## Добавление нового MCP

### Шаг 1: Определить тип транспорта

**stdio (командная строка)** - npx, node, python
```bash
claude mcp add --scope local --transport stdio <name> -- <command> <args>
```

**HTTP (локальный сервер)** - URL
```bash
claude mcp add --scope local --transport http <name> <url>
```

**SSE (Server-Sent Events)** - удаленный сервер
```bash
claude mcp add --scope local --transport sse <name> <url>
```

---

### Шаг 2: Собрать credentials

**Для Supabase MCP:**
- Personal Access Token: https://supabase.com/dashboard/account/tokens
- НЕ Project API keys!

**Для других MCP:**
- Читать документацию конкретного MCP
- Обычно это API keys или tokens

---

### Шаг 3: Добавить MCP

**Пример 1: stdio с токеном**
```bash
claude mcp add --scope local --transport stdio my-service -- \
  npx -y @my/mcp-server@latest \
  --access-token my_token_here
```

**Пример 2: stdio с env переменными**
```bash
claude mcp add --scope local --transport stdio my-service \
  --env API_KEY=my_key \
  --env PROJECT_ID=my_project -- \
  npx -y @my/mcp-server@latest
```

**Пример 3: HTTP**
```bash
claude mcp add --scope local --transport http my-service \
  http://localhost:8080/mcp
```

---

### Шаг 4: Проверить статус

```bash
claude mcp list
```

Должен показать `✓ Connected`

---

### Шаг 5: **ПЕРЕЗАПУСТИТЬ VS Code**

**КРИТИЧЕСКИ ВАЖНО:** MCP-серверы загружаются только при старте VS Code!

1. Сохрани все файлы
2. Закрой VS Code полностью (`Cmd+Q` на Mac)
3. Открой VS Code снова
4. Открой проект flomoon

---

### Шаг 6: Проверить инструменты

После перезапуска инструменты `mcp__<name>__*` должны быть доступны в Claude Code.

---

## Troubleshooting

### ❌ "Failed to connect"

**Причина 1:** Неправильные credentials
```bash
# Проверь детали
claude mcp get <name>

# Удали и пересоздай с правильными credentials
claude mcp remove "<name>" -s local
claude mcp add --scope local ...
```

**Причина 2:** MCP-сервер требует запущенное приложение (Figma, Docker, etc.)
```bash
# Убедись, что приложение запущено
```

**Причина 3:** Неправильная команда или аргументы
```bash
# Проверь документацию MCP-сервера
# Например, Supabase требует --access-token, а не env переменные
```

---

### ❌ "Invalid API key"

**Для Supabase MCP:**
- Проверь, что используешь **Personal Access Token** (`sbp_...`)
- НЕ используй Project API keys (anon/service_role)
- Получи новый токен: https://supabase.com/dashboard/account/tokens

**Для других MCP:**
- Проверь формат токена в документации
- Убедись, что токен не истёк

---

### ❌ Инструменты `mcp__*` недоступны

**Решение:** Перезапусти VS Code!

MCP-серверы загружаются только при старте. После добавления нового MCP **ВСЕГДА** нужен перезапуск.

---

### ❌ "Unknown option --help"

Некоторые MCP-серверы не поддерживают `--help`. Читай документацию на GitHub.

---

### ❌ Конфликт между local и global конфигурациями

**Решение:** Используй только local конфигурации.

```bash
# Удали global конфигурацию
claude mcp remove "<name>" -s global

# Добавь заново как local
claude mcp add --scope local ...
```

---

## 📚 Полезные ссылки

- **Supabase MCP:** https://github.com/supabase/mcp-server-supabase
- **Context7 MCP:** https://github.com/upstash/context7-mcp
- **Figma MCP:** https://github.com/modelcontextprotocol/servers
- **MCP Protocol:** https://modelcontextprotocol.io/

---

## 📝 Чеклист добавления нового MCP

- [ ] Определить тип транспорта (stdio/http/sse)
- [ ] Получить credentials (токены, API keys)
- [ ] Выполнить команду `claude mcp add --scope local ...`
- [ ] Проверить статус: `claude mcp list`
- [ ] **ПЕРЕЗАПУСТИТЬ VS Code**
- [ ] Проверить доступность инструментов `mcp__<name>__*`
- [ ] Задокументировать в этом файле (секция "Настроенные MCP-серверы")

---

## ⚠️ Критические ошибки (НЕ ДЕЛАЙ ТАК)

### ❌ Редактирование ~/.claude.json вручную
```bash
# НИКОГДА не редактируй ~/.claude.json напрямую!
# Используй только CLI команды
```

### ❌ Использование Project API keys для Supabase MCP
```bash
# ❌ НЕПРАВИЛЬНО
--env SUPABASE_URL=...
--env SUPABASE_SERVICE_ROLE_KEY=...

# ✅ ПРАВИЛЬНО
--access-token sbp_...
```

### ❌ Забыть перезапустить VS Code
```bash
# Добавил MCP → сразу перезапусти VS Code!
# Иначе инструменты не появятся
```

### ❌ Использовать global scope для проектных MCP
```bash
# ❌ НЕПРАВИЛЬНО
claude mcp add --scope global ...

# ✅ ПРАВИЛЬНО
claude mcp add --scope local ...
```

---

**Вопросы?** Смотри секцию [Troubleshooting](#troubleshooting) или проверяй `claude mcp --help`

---

**Последнее обновление:** 2025-10-27
**Автор:** Claude Code + Sergey
