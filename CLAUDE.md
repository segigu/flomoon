# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Flomoon** is a personal menstrual cycle tracking PWA built with React + TypeScript. The app features cycle tracking, AI-generated insights, astrology integration, interactive storytelling, and Supabase PostgreSQL backend with Row Level Security for multi-user support.

**Live app**: https://segigu.github.io/nastia-calendar/

## Workflow Methodology

Следуй универсальной методологии работы из глобального руководства: [~/.claude/docs/CLAUDE_WORKFLOW.md](~/.claude/docs/CLAUDE_WORKFLOW.md)

**Глобальные команды доступны в этом проекте:**
- `/format-task` - Форматирование неформальных задач в структурированный вид
- `/make-plan` - Создание детального плана реализации с TodoList
- `/code-review` - Комплексная проверка кода перед коммитом
- `/update-docs` - Автоматическое обновление документации

**Системные команды Claude Code:**
- `/review` - встроенная команда code review
- `/help` - встроенная справка Claude Code

**Проектные команды:**
- `/continue` (или `/resume`) - продолжить работу с текущей задачи (используй в начале новой сессии!)
- `/status` - показать статус проекта и текущую задачу
- `/plan` - показать весь мастер-план

**Управление задачами (Task Management):**
- `/add-task [описание]` - добавить новую задачу в бэклог (автоматический анализ категории/приоритета)
- `/tasks [filter]` - показать список задач (фильтр: категория/приоритет/статус/тег)
- `/next` - взять следующую задачу из очереди по приоритету
- `/done [TASK-ID]` - отметить задачу выполненной и переместить в архив

## 📚 Project Documentation

**⚠️ ВАЖНО для новых сессий:**

Когда пользователь начинает новую сессию, автоматически:
1. Прочитай **[docs/progress/CURRENT_TASK.md](docs/progress/CURRENT_TASK.md)** - текущая задача
2. Прочитай **[docs/MASTER_PLAN.md](docs/MASTER_PLAN.md)** - общий план проекта
3. Покажи краткий статус (фаза, задача, следующий шаг)
4. Спроси: "Готов продолжить с этой задачи?"
5. Если да - сразу начинай работу (без лишних вопросов!)

**Быстрый старт:** Пользователь может написать `/continue` - ты автоматически выполнишь шаги выше.

**Шпаргалка для пользователя:** [docs/QUICK_START.md](docs/QUICK_START.md) - что писать в начале сессии

**Структура документации:**
```
docs/
├── MASTER_PLAN.md           # Главный план (читай ВСЕГДА!)
├── MCP_SETUP.md             # Настройка MCP-серверов (ВАЖНО!)
├── roadmap/
│   ├── PHASE_1_FOUNDATION.md       # Универсализация (8 задач)
│   ├── PHASE_2_AI_AGENTS.md        # Агентская система (14 задач)
│   ├── PHASE_3_PERSONALIZATION.md  # Персонализация AI (6 задач)
│   └── PHASE_4_UI.md               # Пользовательский интерфейс (10 задач)
├── architecture/
│   ├── ADR-001-universal-user-profile.md
│   ├── ADR-002-ai-agent-tiers.md
│   ├── ADR-003-prompt-caching.md
│   └── AGENT_PROMPTS.md            # Все промпты агентов
├── progress/
│   ├── CURRENT_TASK.md             # Текущая задача (читай ВСЕГДА!)
│   ├── CHANGELOG.md                # История изменений
│   └── BLOCKERS.md                 # Проблемы и вопросы
└── tasks/                           # Система управления задачами (NEW!)
    ├── BACKLOG.json                # Бэклог задач (источник истины)
    ├── BACKLOG.md                  # Человекочитаемый вид (автогенерация)
    ├── CURRENT.md                  # Текущая задача в работе
    └── COMPLETED.md                # Архив выполненных задач
```

**Ключевые архитектурные решения:**
- Трёхуровневая система AI-агентов (Tier 1: Haiku, Tier 2: Haiku, Tier 3: Sonnet)
- Экономия токенов: 24x через агентскую систему + 80-90% через prompt caching
- Универсальная структура UserProfile для мультипользовательности
- Инкрементальные обновления (не анализируем всю историю каждый раз)

## Development Commands

### Core Commands
```bash
npm start          # Development server on localhost:3000
npm run build      # Production build
npm test           # Run Jest tests
npm run deploy     # Build and deploy to GitHub Pages
```

### Testing Specific Components
```bash
npm test -- --testPathPattern=<component-name>
npm test -- --watch  # Watch mode for test development
```

### Quick Workflow (КПД)
```bash
# КПД = Коммит, Пуш, Деплой - быстрая команда для публикации изменений
# Автоматически: версия +0.0.1 → коммит → пуш → deploy
npm run release
```

**Что делает `npm run release`:**
1. Автоматически увеличивает patch версию (0.3.1 → 0.3.2)
2. Создаёт git commit с версией
3. Создаёт git tag (v0.3.2)
4. Пушит коммит и теги в GitHub
5. Билдит и деплоит на GitHub Pages

**Важно:** Перед запуском убедись, что все изменения закоммичены!

## Task Management System

**Цель:** Структурированное управление бэклогом задач с автоматической категоризацией и приоритизацией.

### Файловая структура

```
docs/tasks/
├── BACKLOG.json          # Источник истины (JSON для агентов)
├── BACKLOG.md            # Автогенерируемый человекочитаемый вид
├── CURRENT.md            # Текущая задача в работе
└── COMPLETED.md          # Архив выполненных задач (последние 50)
```

### Структура задачи

```typescript
{
  id: "TASK-001",               // Автоинкремент ID
  title: "Короткое название",
  description: "Детальное описание",
  category: "bug|feature|refactor|test|docs|chore|ui|performance|security",
  priority: "critical|high|medium|low",  // Автоопределение AI
  status: "backlog|todo|in-progress|blocked|done",
  tags: ["ui", "auth", ...],
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp",
  relatedFiles: ["src/...", ...],
  estimatedComplexity: "trivial|simple|moderate|complex",
  blockedBy: ["TASK-002"],      // Зависимости
  notes: "Дополнительные заметки"
}
```

### Категории задач

- `bug` - исправление ошибки/бага
- `feature` - новая функциональность
- `refactor` - рефакторинг без изменения функциональности
- `test` - добавление/исправление тестов
- `docs` - документация
- `chore` - обслуживание (зависимости, конфигурация)
- `ui` - UI/UX улучшения
- `performance` - оптимизация производительности
- `security` - безопасность

### Приоритеты (автоматическое определение)

AI анализирует описание и определяет приоритет:

- `critical` - блокеры, критичные баги (приложение не работает)
- `high` - важные баги или основные фичи
- `medium` - улучшения, рефакторинг, средние фичи
- `low` - мелкие фиксы, документация, некритичные улучшения

**Правила определения:**
- Баги выше приоритетом, чем фичи (при прочих равных)
- Слова "срочно", "блокирует", "не работает" → приоритет выше
- Блокеры и критичные баги → `critical`
- Пользователь может явно указать приоритет в описании

### Workflow использования

#### 1. Добавление задачи

```bash
/add-task При тестировании нашел баг в календаре - рисованный круг обрезается на границе mini-calendar
```

**Что происходит:**
1. Task Analysis Agent анализирует описание
2. Определяет категорию (`bug`), приоритет (`high`), сложность (`simple`)
3. Извлекает теги (`ui`, `mini-calendar`)
4. Добавляет задачу в BACKLOG.json
5. Регенерирует BACKLOG.md
6. Показывает результат с назначенным ID

#### 2. Просмотр задач

```bash
/tasks              # Все активные задачи
/tasks bug          # Только баги
/tasks critical     # Критичные задачи
/tasks #ui          # Задачи с тегом ui
/tasks in-progress  # Задачи в работе
```

#### 3. Начало работы

```bash
/next  # Взять следующую задачу по приоритету
```

**Что происходит:**
1. Ищет задачу с наивысшим приоритетом (critical → high → medium → low)
2. Игнорирует заблокированные задачи (blockedBy не пустой)
3. Среди задач одного приоритета выбирает самую старую (FIFO)
4. Обновляет статус на `in-progress`
5. Сохраняет в CURRENT.md
6. Показывает детали и предлагает план действий
7. Спрашивает подтверждение перед началом работы

#### 4. Завершение задачи

```bash
/done           # Завершить текущую задачу
/done TASK-003  # Завершить конкретную задачу
```

**Что происходит:**
1. Обновляет статус на `done`
2. Добавляет запись в COMPLETED.md
3. Очищает CURRENT.md
4. Регенерирует BACKLOG.md
5. Предлагает взять следующую задачу

### Интеграция с существующими процессами

- **Master Plan** ([docs/MASTER_PLAN.md](docs/MASTER_PLAN.md)) - долгосрочное планирование (фазы/этапы)
- **Current Task** ([docs/progress/CURRENT_TASK.md](docs/progress/CURRENT_TASK.md)) - текущая большая задача из Master Plan
- **Task Backlog** ([docs/tasks/BACKLOG.json](docs/tasks/BACKLOG.json)) - **оперативные задачи** (баги, мелкие фичи, улучшения)

**Используй Task Backlog для:**
- Багов найденных при тестировании
- Мелких улучшений и рефакторинга
- Задач, которые не требуют долгосрочного планирования
- Быстрых фиксов и оптимизаций
- Технического долга

**Используй Master Plan для:**
- Больших фич (1+ день работы)
- Архитектурных изменений
- Стратегических улучшений
- Фазовых задач проекта

### Утилиты

**TypeScript утилиты:** [.claude/utils/taskManager.ts](.claude/utils/taskManager.ts)

Функции:
- `addTask()` - добавить задачу
- `updateTaskStatus()` - обновить статус
- `getTasks()` - получить задачи с фильтрацией
- `getNextTask()` - получить следующую задачу по приоритету
- `completeTask()` - завершить задачу
- `generateMarkdown()` - регенерировать BACKLOG.md
- `updateCurrent()` - обновить CURRENT.md

### Примеры использования

**Сценарий: Тестирование и нахождение багов**

```bash
# Тестируешь приложение, находишь 3 бага
/add-task Рисованный круг обрезается в mini-calendar
/add-task AI не генерирует контент для периода - ошибка 500
/add-task Кнопка "Свой вариант" не работает на iOS Safari

# Проверяешь бэклог
/tasks bug

# Начинаешь с критичного бага
/next  # Возьмет критичный баг (ошибка 500)

# Работаешь над багом...

# Завершаешь
/done

# Берешь следующий
/next
```

**Сценарий: Планирование фич**

```bash
# Добавляешь несколько фич
/add-task Добавить экспорт данных в PDF
/add-task Интеграция с Google Calendar
/add-task Push-уведомления для овуляции

# Смотришь все фичи
/tasks feature

# Смотришь только высокоприоритетные
/tasks high
```

## MCP Servers (Model Context Protocol)

**⚠️ ВАЖНО:** Полная документация по настройке MCP-серверов: [docs/MCP_SETUP.md](docs/MCP_SETUP.md)

### Настроенные MCP-серверы в проекте

1. **Supabase** - работа с базой данных
   - Тип: stdio
   - Credentials: Personal Access Token (sbp_...)
   - Инструменты: `mcp__supabase__*`
   - Статус: ✓ Connected

2. **Context7** - документация библиотек
   - Тип: stdio
   - Credentials: Supabase (URL + service_role key)
   - Инструменты: `mcp__context7__*`
   - Статус: ✓ Connected

3. **Figma Desktop** - интеграция с Figma
   - Тип: HTTP (localhost:3845)
   - Требует: Запущенное Figma приложение
   - Инструменты: `mcp__figma__*`
   - Статус: ✓ Connected

### Проверка статусa MCP
```bash
# Список всех MCP-серверов
claude mcp list

# Детали конкретного сервера
claude mcp get supabase
```

### Добавление нового MCP

**ВСЕГДА используй `--scope local`** для проектных MCP-серверов!

```bash
# Пример: stdio с токеном
claude mcp add --scope local --transport stdio <name> -- \
  npx -y @package/mcp-server@latest \
  --access-token your_token_here

# Пример: HTTP
claude mcp add --scope local --transport http <name> \
  http://localhost:8080/mcp
```

**После добавления ОБЯЗАТЕЛЬНО перезапусти VS Code!**

Подробности: [docs/MCP_SETUP.md](docs/MCP_SETUP.md)

## Architecture Overview

### Entry Points
- [src/index.tsx](src/index.tsx) → [src/App.tsx](src/App.tsx) → [src/components/ModernNastiaApp.tsx](src/components/ModernNastiaApp.tsx)
- Main app component: `ModernNastiaApp` (~1500 lines) - handles all UI state, tabs, modals, and data flow

### Data Flow & Storage
- **Supabase PostgreSQL**: Primary backend with Row Level Security (RLS) for multi-user support
  - **User profiles**: [src/utils/supabaseProfile.ts](src/utils/supabaseProfile.ts) - User profile and partner CRUD operations
  - **Cycles**: [src/utils/supabaseCycles.ts](src/utils/supabaseCycles.ts) - Cycle CRUD operations with automatic user isolation via RLS
  - **Authentication**: [src/components/AuthModal.tsx](src/components/AuthModal.tsx) - Login/signup with Supabase Auth
  - **Profile setup**: [src/components/ProfileSetupModal.tsx](src/components/ProfileSetupModal.tsx) - First-time profile creation after signup
- **Legacy localStorage**: [src/utils/storage.ts](src/utils/storage.ts) - ⚠️ PARTIALLY DEPRECATED - still used for horoscopeMemory and psychContractHistory (not critical for multi-user)
- **Data structure**: [src/types/index.ts](src/types/index.ts) defines `NastiaData` with `cycles`, `settings`, `horoscopeMemory`, `psychContractHistory`

### Working with User Data

**⚠️ CRITICAL: Use Supabase data, NOT hardcoded profiles!**

#### User Data Architecture

The app uses **real user data from Supabase** for all AI-generated content and personalization:

1. **Data Source**: `userProfile` and `userPartner` from Supabase (loaded in ModernNastiaApp state)
2. **Helper Utilities**: [src/utils/userContext.ts](src/utils/userContext.ts) - Extract names from Supabase data
3. **Type Definitions**: `UserProfileData`, `PartnerData` from [src/types/index.ts](src/types/index.ts)

#### userContext.ts Helper Functions

```typescript
// src/utils/userContext.ts
import { UserProfileData, PartnerData } from '../types';

/**
 * Extract user name from Supabase UserProfileData
 * Falls back to getCurrentUser() if userProfile is null (backward compatibility)
 */
export function getUserName(userProfile: UserProfileData | null | undefined): string {
  if (!userProfile) {
    const user = getCurrentUser();
    return user.name;
  }
  return userProfile.display_name || 'Настя';
}

/**
 * Extract partner name from Supabase PartnerData
 * @param userPartner - Partner data from Supabase (can be null if no partner)
 * @param defaultName - Fallback name if partner is null
 */
export function getPartnerName(
  userPartner: PartnerData | null | undefined,
  defaultName: string = 'Партнёр'
): string {
  if (!userPartner) {
    return defaultName;
  }
  return userPartner.name || userPartner.partner_name || defaultName;
}
```

#### Proper Usage Pattern

**✅ CORRECT - Pass userProfile/userPartner as parameters:**

```typescript
// In AI utility functions (horoscope.ts, historyStory.ts, etc.)
export async function generateAIContent(
  // ... other parameters
  language = 'ru',
  userProfile?: UserProfileData | null,  // ✅ Add optional parameters
  userPartner?: PartnerData | null,      // ✅ Add optional parameters
): Promise<AIResponse> {
  // Extract names using userContext.ts helpers
  const userName = getUserName(userProfile);
  const partnerName = getPartnerName(userPartner, 'Партнёр');

  // Use in prompts
  const prompt = `Generate content for ${userName}...`;
  // ...
}

// In ModernNastiaApp.tsx - pass state to AI functions
const horoscope = await fetchDailyHoroscope(
  isoDate,
  signal,
  claudeApiKey,
  claudeProxyUrl,
  openAIApiKey,
  cycles,
  i18n.language,
  userProfile,    // ✅ Pass from component state
  userPartner,    // ✅ Pass from component state
);
```

**❌ INCORRECT - Using deprecated getCurrentUser():**

```typescript
// ❌ DEPRECATED - Don't use this pattern in new code!
import { getCurrentUser } from '../data/userProfile.deprecated';

function generateContent() {
  const user = getCurrentUser();  // ❌ Returns hardcoded "Настя" and "Сергей"
  const userName = user.name;     // ❌ Ignores Supabase data
}
```

#### Migration Guide

If you find code using `getCurrentUser()`, refactor it following these steps:

1. **Add optional parameters** to the function signature:
   ```typescript
   function myFunction(
     // ... existing parameters
     userProfile?: UserProfileData | null,
     userPartner?: PartnerData | null
   ) { ... }
   ```

2. **Replace getCurrentUser() calls** with helper functions:
   ```typescript
   // Before:
   const user = getCurrentUser();
   const userName = user.name;
   const partnerName = user.partnerName;

   // After:
   const userName = getUserName(userProfile);
   const partnerName = getPartnerName(userPartner, 'Партнёр');
   ```

3. **Update function calls** to pass parameters:
   ```typescript
   // Before:
   const result = myFunction(param1, param2);

   // After:
   const result = myFunction(param1, param2, userProfile, userPartner);
   ```

4. **Fallback compatibility** (optional, for gradual migration):
   ```typescript
   const userName = getUserName(userProfile);  // Already has fallback inside
   ```

#### Deprecated Files

- **[src/data/userProfile.deprecated.ts](src/data/userProfile.deprecated.ts)** - ⚠️ DEPRECATED! Contains hardcoded data, kept ONLY for fallback compatibility. DO NOT use `getCurrentUser()` in new code!

#### Why This Matters

- **Multi-user support**: Each user sees their own name and partner's name
- **Personalization**: AI-generated content uses real user data from database
- **Bug prevention**: Eliminates hardcoded "Настя" and "Сергей" appearing for all users
- **Localization**: Partner names are transliterated correctly based on user's language setting

### AI Integration

**Hybrid Mode Architecture (Phase 3):**
- **Local Dev**: Direct API calls (fast, requires keys in `.env.local`)
- **Production**: Supabase Edge Functions (secure, no CORS, keys in Supabase Secrets)

**Mode Control:**
```bash
# .env.local
REACT_APP_USE_EDGE_FUNCTIONS=false  # Local dev (default)
# or
REACT_APP_USE_EDGE_FUNCTIONS=true   # Production (Edge Functions)
```

**Implementation:**
- **Unified client**: [src/utils/aiClient.ts](src/utils/aiClient.ts)
  - `callAI()` - Main entry point, checks `USE_EDGE_FUNCTIONS` flag
  - `callSupabaseEdgeFunction()` - Calls Edge Function `/functions/v1/generate-ai-content`
  - `callClaudeAPI()` - Direct Claude API (local dev only, CORS issues in browser)
  - `callOpenAIAPI()` - Direct OpenAI API (local dev fallback)
  - Auto-fallback: Claude (primary) → OpenAI (fallback) in both modes

- **Edge Function**: [supabase/functions/generate-ai-content/index.ts](supabase/functions/generate-ai-content/index.ts)
  - Deployed to Supabase (status: ACTIVE)
  - Secrets: `CLAUDE_API_KEY`, `OPENAI_API_KEY` (configured in Supabase Dashboard)
  - JWT authentication via Supabase Auth (automatic)
  - Server-side API calls (no CORS issues)
  - Same fallback logic as client

- **Content generation**:
  - [src/utils/aiContent.ts](src/utils/aiContent.ts) - Period modal content generation
  - [src/utils/insightContent.ts](src/utils/insightContent.ts) - Daily insight descriptions
  - [src/utils/historyStory.ts](src/utils/historyStory.ts) - Interactive story generation with psychological contracts

**Environment Variables:**
- Local dev (`.env.local`): `REACT_APP_CLAUDE_API_KEY`, `REACT_APP_OPENAI_API_KEY`
- Production: Keys stored in Supabase Secrets (not in client bundle)

**IMPORTANT**: Always use model **`claude-haiku-4-5`** (Haiku 4.5) for all Claude API requests - it provides the best balance of speed and quality for this application

**CORS Limitation (Local Dev):**
- Claude API blocks browser requests (no `Access-Control-Allow-Origin`)
- OpenAI fallback works in local dev
- Edge Functions bypass CORS (server-side calls)

### Validation & Utilities
- **Date validation**: [src/utils/dateValidation.ts](src/utils/dateValidation.ts) - Birth date validation (1900-today)
- **AI geocoding**: [src/utils/geocoding.ts](src/utils/geocoding.ts) - Place validation with coordinates via Claude Haiku 4.5
- **Geolocation**: [src/utils/geolocation.ts](src/utils/geolocation.ts) - Current position via Geolocation API

### Astrology Features
- **Natal charts**: [src/utils/astro.ts](src/utils/astro.ts) - Uses `astronomy-engine` for planetary positions, aspects, houses
- **Profiles**: [src/data/astroProfiles.ts](src/data/astroProfiles.ts) - Pre-defined natal chart configurations
- **Horoscopes**: [src/utils/horoscope.ts](src/utils/horoscope.ts) - Daily/weekly horoscope generation with memory system
- **Integration**: Horoscope memory (`HoroscopeMemoryEntry[]`) tracks past readings to maintain narrative consistency

### Interactive History/Storytelling
- **Core logic**: [src/utils/historyStory.ts](src/utils/historyStory.ts)
- **Psychological contracts**: [src/data/psychologicalContracts.ts](src/data/psychologicalContracts.ts) - Narrative frameworks with scenarios
- **History tracking**: [src/utils/psychContractHistory.ts](src/utils/psychContractHistory.ts) - Remembers used contracts/scenarios to avoid repetition
- **Flow**: User sees story segments → picks options → AI generates next segment based on contract + astro context + previous choices

### Push Notifications
- **Main API**: [src/utils/pushNotifications.ts](src/utils/pushNotifications.ts) - VAPID keys, subscription management
- **Service worker**: [src/service-worker.ts](src/service-worker.ts) - Handles push events, caching
- **Local storage**: [src/utils/notificationsStorage.ts](src/utils/notificationsStorage.ts) - Local notification storage (browser-only, no backend sync)

### Cycle Calculations
- [src/utils/cycleUtils.ts](src/utils/cycleUtils.ts) - Average length, fertile window, ovulation prediction
- [src/utils/dateUtils.ts](src/utils/dateUtils.ts) - Date formatting, comparison utilities

### UI Components
- **Main app**: [src/components/ModernNastiaApp.tsx](src/components/ModernNastiaApp.tsx) + [src/components/NastiaApp.module.css](src/components/NastiaApp.module.css)
- **Tab navigation**: [src/components/GlassTabBar.tsx](src/components/GlassTabBar.tsx) - Glass morphism bottom tab bar
- **Chart**: [src/components/CycleLengthChart.tsx](src/components/CycleLengthChart.tsx) - Uses Recharts for cycle visualization
- **Mini calendar**: [src/components/MiniCalendar.tsx](src/components/MiniCalendar.tsx) + [src/components/MiniCalendar.module.css](src/components/MiniCalendar.module.css) - Compact month calendar widget for cycle list items

## Critical Design Rules (DO NOT MODIFY)

### Glass Tab Bar Styling
**File**: [src/components/GlassTabBar.module.css](src/components/GlassTabBar.module.css)

**NEVER change these values** without explicit approval:
```css
/* .glassTabBar */
margin: 12px 32px;
padding: 6px;
border-radius: 40px;
background: rgba(253, 242, 248, 0.12);
backdrop-filter: blur(16px) saturate(180%) brightness(105%);
border: 1px solid rgba(255, 255, 255, 0.8);

/* .tabButton */
gap: 3px;
padding: 6px 4px;
min-height: 52px;
```

**Rationale**: These parameters were meticulously tuned for iOS-style glass morphism with optimal transparency and content visibility. See [DESIGN_RULES.md](DESIGN_RULES.md) for full details.

### Auto-scroll in Interactive History
**File**: [src/components/ModernNastiaApp.tsx](src/components/ModernNastiaApp.tsx:1350-1392)

**Critical rule**: Always scroll `window`, NOT the container!

```tsx
// ✅ CORRECT
window.scrollTo({
  top: document.documentElement.scrollHeight,
  behavior: 'smooth'
});

// ❌ INCORRECT - container doesn't have overflow: scroll
container.scrollTo({ ... });
```

**Implementation**:
- Two separate `useEffect` hooks for different story phases (`generating` and `ready`)
- Triple `requestAnimationFrame` to ensure DOM elements are fully rendered before scrolling
- See [AUTOSCROLL_FIX.md](AUTOSCROLL_FIX.md) for complete technical explanation

### Modal Window Structure (Full-Screen Bottom Sheet)
**Universal Component**: [src/components/FullScreenModal.tsx](src/components/FullScreenModal.tsx)

**❌ CRITICAL RULE**: NEVER create centered popup modals for mobile version!

**✅ ALL modals MUST:**
- Use `<FullScreenModal>` component (NOT custom div structures)
- Open with slide-up animation from bottom (0.3s ease-out)
- Fill entire screen on mobile (width: 100%, height: 100vh)
- Have Header (title + close button) + Body (scrollable content)
- Use Settings Modal as reference example

**Example:**
```tsx
<FullScreenModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Modal Title"
  closable={true}  // false if modal can't be closed
>
  {/* Content here */}
</FullScreenModal>
```

**Rationale**: Mobile-first design pattern, consistent UX across all modals, better performance. See [DESIGN_RULES.md - Modal Window Structure](DESIGN_RULES.md#-структура-модальных-окон-full-screen-bottom-sheet) for detailed documentation.

### Cycle List Mini Calendar Design (Two-Zone Layout)
**Files**:
- [src/components/MiniCalendar.tsx](src/components/MiniCalendar.tsx)
- [src/components/MiniCalendar.module.css](src/components/MiniCalendar.module.css)
- [src/components/NastiaApp.module.css](src/components/NastiaApp.module.css) (`.cycleItem`)
- [public/images/calendar-months/](public/images/calendar-months/) - month images directory

**NEVER change these design parameters** without explicit approval (see [DESIGN_RULES.md](DESIGN_RULES.md)):

#### Two-Zone Layout Structure

```tsx
// MiniCalendar.tsx structure
<div className={styles.miniCalendar}>
  {/* Left zone: Calendar grid (2/3 width) */}
  <div className={styles.calendarContent}>
    <div className={styles.monthName}>Январь 2025</div>
    <div className={styles.weekDays}>...</div>
    <div className={styles.daysGrid}>...</div>
  </div>

  {/* Right zone: Month image (1/3 width) */}
  {imageUrl && (
    <div className={styles.imageContainer}>
      <img src={imageUrl} className={styles.image} />
      {onDelete && (
        <button className={styles.deleteButton}>
          {/* Trash icon */}
        </button>
      )}
    </div>
  )}
</div>
```

#### Critical CSS Parameters

```css
/* MiniCalendar.module.css */
.miniCalendar {
  display: flex;
  align-items: stretch;  /* Both zones same height */
  width: 100%;
  max-width: 100%;
  /* NO overflow: hidden - clips hand-drawn circle */
}

.calendarContent {
  flex: 0 0 66.67%;  /* Exactly 2/3 width */
  padding: 0.75rem 1rem;
  border-top-left-radius: 1rem;
  border-bottom-left-radius: 1rem;
  box-sizing: border-box;
}

.monthName {
  font-size: 13px;
  font-weight: 700;
  color: #000000;  /* Black, NOT purple */
  text-align: left;
}

.imageContainer {
  position: relative;  /* For absolute delete button */
  flex: 0 0 33.33%;  /* Exactly 1/3 width */
  padding: 0;
  border-top-right-radius: 1rem;
  border-bottom-right-radius: 1rem;
  overflow: hidden;  /* ONLY here, rounds image corners */
  box-sizing: border-box;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;  /* Fills entire container */
  object-position: center center;
  display: block;
}

.deleteButton {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  color: #666;  /* Gray, NOT blue */
  z-index: 10;
}
```

#### Hand-drawn Circle SVG

```tsx
// Appears on target day only
{dayInfo.isTarget && (
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
)}
```

**Circle styling**:
```css
.handDrawnCircle {
  position: absolute;
  width: 140%;  /* Overflows cell */
  height: 140%;
  transform: translate(-50%, -50%);
  color: var(--nastia-red);
  opacity: 0.8;
  animation: drawCircle 0.6s ease-out;
}
```

#### Auto-loading Month Images

**Integration** (ModernNastiaApp.tsx:~4590):
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

**Image directory structure**:
```
public/images/calendar-months/
├── 01.png  - January
├── 02.png  - February
├── ...
├── 12.png  - December
└── default.png  - Fallback if image fails to load
```

**Fallback logic** (MiniCalendar.tsx):
```tsx
<img
  src={imageUrl}
  onError={(e) => {
    const target = e.target as HTMLImageElement;
    target.src = `${process.env.PUBLIC_URL}/images/calendar-months/default.png`;
  }}
/>
```

**Image requirements**:
- Format: PNG only (not JPG)
- Recommended size: ~500×1000px (vertical orientation)
- Max file size: 500KB per image
- Transparency: Supported

#### Rationale

1. **66.67% / 33.33% proportions**: Optimal balance for mobile (iPhone 375px width) - calendar remains readable, image provides visual interest without dominating
2. **Black month name**: Maximum contrast on light backgrounds, doesn't compete with red circle
3. **Image fills 100% of container**: No visual gaps, professional look with `object-fit: cover`
4. **overflow: hidden ONLY on imageContainer**: Allows hand-drawn circle (140% size) to overflow cell without clipping
5. **Delete button over image**: Space-efficient, intuitive placement for deleting entire cycle
6. **Hand-drawn circle**: Quadratic Bézier curves (Q, T) create organic aesthetic, animation (0.6s ease-out) provides satisfying feedback
7. **Auto-mapping by month**: `startDate` month → `{01-12}.png`, seamless integration without manual configuration

#### Common Mistakes

❌ **Don't add `overflow: hidden` to `.miniCalendar` or `.cycleItem`** - clips the hand-drawn circle
❌ **Don't use fixed pixel widths** - breaks on different screen sizes
❌ **Don't change month name color back to purple** - reduces contrast
❌ **Don't use JPG format for images** - PNG required for consistency

## Environment Variables

### Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your credentials in `.env.local`:**

```bash
# ============================================================================
# Supabase Configuration (REQUIRED)
# ============================================================================
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here

# ============================================================================
# AI Configuration (OPTIONAL - at least one provider required)
# ============================================================================

# Claude API (Primary provider, recommended)
REACT_APP_CLAUDE_API_KEY=sk-ant-your-key-here
REACT_APP_CLAUDE_PROXY_URL=  # Optional: custom proxy

# OpenAI API (Fallback provider)
REACT_APP_OPENAI_API_KEY=sk-your-openai-key-here
REACT_APP_OPENAI_PROXY_URL=  # Optional: custom proxy

# ============================================================================
# GitHub Pages (configured in package.json)
# ============================================================================
# PUBLIC_URL is set via homepage field in package.json
```

3. **Restart dev server after changes:**
   ```bash
   npm start
   ```

### Where to get credentials:

- **Supabase** (REQUIRED): https://supabase.com/dashboard/project/_/settings/api
  - Copy "Project URL" → `REACT_APP_SUPABASE_URL`
  - Copy "anon public" key → `REACT_APP_SUPABASE_ANON_KEY`

- **Claude API** (Recommended): https://console.anthropic.com/
  - Create API key → `REACT_APP_CLAUDE_API_KEY`
  - Model used: `claude-haiku-4-5` (Haiku 4.5)

- **OpenAI API** (Fallback): https://platform.openai.com/api-keys
  - Create API key → `REACT_APP_OPENAI_API_KEY`

### AI Provider Fallback

The app uses **automatic fallback**:
1. **Try Claude first** (if `REACT_APP_CLAUDE_API_KEY` is set)
2. **Fall back to OpenAI** (if Claude fails or key not set)
3. **Show error** (if both fail or neither configured)

**Minimum requirement:** At least ONE AI provider (Claude OR OpenAI) must be configured.

## Data Storage Keys

localStorage keys used:
- `nastia-app-data` - ⚠️ LEGACY: horoscopeMemory, psychContractHistory (cycles migrated to Supabase)
- `nastia-notification-settings` - Push notification preferences
- `nastia-push-subscription` - Push subscription data
- `nastia-notifications-local` - Local notifications cache
- `nastia-notifications-read-set` - Read notification IDs

## Supabase Database Schema

### Table: `users`
User profiles with birth information and coordinates for astrology.

Columns:
- `id` (UUID, PK) - Supabase auth user ID
- `email` (TEXT, NOT NULL) - User email
- `display_name` (TEXT) - Display name
- `birth_date` (DATE) - Birth date (ISO format)
- `birth_time` (TIME) - Birth time (HH:MM format)
- `birth_place` (TEXT) - Birth place (city, country)
- `birth_latitude` (DECIMAL(9,6)) - Birth latitude (-90 to 90)
- `birth_longitude` (DECIMAL(9,6)) - Birth longitude (-180 to 180)
- `current_latitude` (DECIMAL(9,6)) - Current latitude (for "here and now")
- `current_longitude` (DECIMAL(9,6)) - Current longitude
- `timezone` (TEXT) - User timezone
- `locale` (TEXT) - User locale
- `created_at` (TIMESTAMPTZ) - Created timestamp
- `updated_at` (TIMESTAMPTZ) - Updated timestamp

### Table: `partners`
Partner profiles linked to users.

Columns:
- `id` (UUID, PK) - Partner ID
- `user_id` (UUID, FK → users.id) - Owner user ID
- `name` (TEXT, NOT NULL) - Partner name
- `partner_name` (TEXT, NOT NULL) - Legacy column (same as name)
- `birth_date` (DATE) - Birth date
- `birth_time` (TIME) - Birth time
- `birth_place` (TEXT) - Birth place
- `birth_latitude` (DECIMAL(9,6)) - Birth latitude
- `birth_longitude` (DECIMAL(9,6)) - Birth longitude
- `created_at` (TIMESTAMPTZ) - Created timestamp
- `updated_at` (TIMESTAMPTZ) - Updated timestamp

**Migrations**: See [migrations/add_coordinates_columns.sql](migrations/add_coordinates_columns.sql) for coordinate fields migration.

## Important Files

### Documentation
- [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md) - Detailed technical documentation
- [DESIGN_RULES.md](DESIGN_RULES.md) - Critical design rules (DO NOT VIOLATE)
- [DISCOVER_TAB.md](DISCOVER_TAB.md) - "Узнай себя" tab complete documentation (DiscoverTabV2)
- [AUTOSCROLL_FIX.md](AUTOSCROLL_FIX.md) - Auto-scroll implementation details
- [VOICE_RECORDING.md](VOICE_RECORDING.md) - Voice recording functionality ("Свой вариант" button)
- [PUSH_NOTIFICATIONS_SETUP.md](PUSH_NOTIFICATIONS_SETUP.md) - Push notifications setup
- [PROJECT_HISTORY.md](PROJECT_HISTORY.md) - Development history

### Configuration
- [nastia-config.example.json](nastia-config.example.json) - Example config structure
- [tsconfig.json](tsconfig.json) - TypeScript configuration

## Key Features to Understand

### Horoscope Memory System
The app maintains conversation continuity across horoscope sessions:
1. Each horoscope (daily/weekly) generates a `HoroscopeMemoryEntry` with summary, key themes, phrases to avoid
2. Stored in `NastiaData.horoscopeMemory[]`
3. When generating new content, past memories are included in prompts to maintain consistency
4. Merging logic in [src/utils/horoscope.ts](src/utils/horoscope.ts) prevents duplicates

### Psychological Contract History
Interactive stories use contracts to avoid repetition:
1. Contracts and scenarios tracked in `PsychContractHistory`
2. Limits: 10 contracts, 30 scenarios, 5 scenarios per contract
3. When generating stories, recently used contracts/scenarios are deprioritized
4. Normalization in [src/utils/storage.ts](src/utils/storage.ts) enforces limits

### Supabase Auth & Data Flow
1. **First visit**: User sees AuthModal → registers with email/password
2. **After signup**: Supabase Auth creates user → ProfileSetupModal opens → user fills profile (name, birth data) → saved to `users` table
3. **Login**: AuthModal → Supabase Auth validates → loads user profile from `users` table
4. **Cycles**: User adds/deletes cycles → saved to `cycles` table with `user_id` → RLS policies ensure isolation
5. **Settings**: User can edit profile (name, birth data, partner) → updates `users` and `partners` tables
6. **Logout**: Clears Supabase session, returns to AuthModal
7. **Row Level Security**: All tables have RLS policies (`auth.uid() = user_id`) - users can only access their own data

### Discover Tab ("Узнай себя")
**⚠️ See [DISCOVER_TAB.md](DISCOVER_TAB.md) for complete documentation**

Interactive psychological game with astrology and voice recording:
1. **Lifecycle**: Idle Screen → Planet Dialogue → Interactive Story (7 arcs) → Finale
2. **Architecture**: DiscoverTabV2 → ChatManager → ChatChoices (centralized state management)
3. **Planet Dialogue**: Personalized animated dialogue (based on natal chart) while AI generates story
4. **Interactive Story**: User makes 7 choices, AI generates segments using psychological contracts
5. **Finale**: Dual interpretation (human + astrological) of user's choices
6. **Reveal Scroll**: Special scroll mechanism - show all buttons → scroll back to message start
7. **Voice Recording**: "Свой вариант" button for recording custom story continuations

**URL for testing v2**: `?newDiscover=true` (старая версия без параметра)

**Critical rules**:
- Always use `window.scrollTo()`, NOT `container.scrollTo()` (no overflow on container)
- Reveal scroll timing: 500ms/button animation + 800ms pause before scroll back
- Padding-bottom: 16px prevents overlap with glass tab bar

### Voice Recording ("Свой вариант")
**⚠️ CRITICAL: Props-based architecture - see [VOICE_RECORDING.md](VOICE_RECORDING.md) for full details**

The "Свой вариант" button allows users to record their own story continuation via voice:
1. **State ownership**: `DiscoverTabV2` owns `customOption`, `customStatus`, `customRecordingLevel`
2. **Props flow**: State passed as props → `ChatManager` → `ChatChoices` (NO state in intermediaries!)
3. **Recording flow**: MediaRecorder API → Whisper transcription → AI generation (title/description)
4. **States**: idle → recording → transcribing → generating → ready/error

**Common mistake**: Using `setChoices()` in useEffect creates infinite loop. Always pass state via props!

## Testing Notes

- Tests use `@testing-library/react` and Jest
- Run tests before deployment
- Service worker caching can affect tests - clear cache if issues occur

## Deployment

```bash
npm run deploy
```

This builds the app and deploys to GitHub Pages (`gh-pages` branch). The live URL is configured in `package.json` homepage field.

## Common Pitfalls

1. **Don't modify glass tab bar CSS** without reading [DESIGN_RULES.md](DESIGN_RULES.md)
2. **Don't change window.scrollTo to container.scrollTo** in history auto-scroll
3. **Always test AI fallback** - ensure both Claude and OpenAI keys work or graceful degradation occurs
4. **Handle Date serialization** - localStorage converts Date to string, always deserialize in `loadData()`
5. **Modal structure** - follow existing pattern for consistency
6. **Horoscope memory** - don't exceed reasonable limits, implement pruning if needed
7. **Push notifications** - require HTTPS in production, test locally with `localhost`

## Color Palette

```css
--nastia-pink: #FFB6C1;      /* Light Pink */
--nastia-purple: #DDA0DD;    /* Plum */
--nastia-light: #FFF0F5;     /* Lavender Blush */
--nastia-dark: #8B008B;      /* Dark Magenta */
--nastia-red: #ff6b9d;       /* Period days */
```

## Support & Issues

This is a personal project. Refer to documentation files for detailed information on specific features.
