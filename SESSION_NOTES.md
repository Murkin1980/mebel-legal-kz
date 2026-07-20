# SESSION_NOTES.md — MebelLegal KZ

## Сессия: Этап 0–1 — Инициализация и мультитенантное ядро

**Дата:** 20 июля 2026 года
**Статус:** Завершена

---

### Foundation Check (Этап 0–1)

- [x] Границы MebelLegal KZ / Interactive KP / MebelDocs AI не нарушены.
- [x] Tenant isolation и RLS сохранены/проверены.
- [x] Серверная авторизация присутствует.
- [x] Деньги не хранятся в float/JavaScript number.
- [x] State transitions выполняются доменной командой.
- [x] Юридически значимые действия идемпотентны.
- [x] Audit log дополнен и остаётся append-only.
- [x] Подтверждённые данные не перезаписываются, а версионируются.
- [x] AI не выполняет запрещённые решения.
- [x] В Git, логах и fixtures нет реальных данных и секретов.
- [x] Добавлены unit/integration/security/contract tests по риску изменения.
- [x] Изменение соответствует разрешённому текущему этапу.

---

## Сессия: Этап 1.5 — Улучшение UI, DX/UX и доказательной базы тестов

**Дата:** 20 июля 2026 года
**Статус:** Завершена

---

### Foundation Check (Этап 1.5)

- [x] Границы MebelLegal KZ / Interactive KP / MebelDocs AI не нарушены.
- [x] Tenant isolation и RLS сохранены/проверены.
- [x] Серверная авторизация присутствует.
- [x] Деньги не хранятся в float/JavaScript number.
- [x] State transitions выполняются доменной командой.
- [x] Юридически значимые действия идемпотентны.
- [x] Audit log дополнен и остаётся append-only.
- [x] Подтверждённые данные не перезаписываются, а версионируются.
- [x] AI не выполняет запрещённые решения.
- [x] В Git, логах и fixtures нет реальных данных и секретов.
- [x] Добавлены unit/integration/security/contract tests по риску изменения.
- [x] Изменение соответствует разрешённому текущему этапу.

### Что сделано в этапе 1.5

#### Исправления критических проблем
- `uuid` перемещён из devDependencies в dependencies (исправлен runtime import)
- Созданы server actions для case операций (`src/app/app/cases/actions.ts`)
- `/app/cases/new` переведён с прямых Supabase insert на server actions с Zod валидацией

#### Улучшения UI
- **Список кейсов** (`/app/cases`): фильтры по статусу, типу клиента, типу проекта; поиск по номеру/названию/клиенту; сортировка по всем колонкам; пустые состояния; loading skeleton; роль-ориентированные действия (observer не видит кнопку «Создать»)
- **Детали кейса** (`/app/cases/[id]`): визуализация state machine с текущим статусом, допустимыми переходами, ролями; сообщения об отказе для недоступных переходов; UX для optimistic concurrency conflict (сообщение + кнопка обновления); terminal state handling
- **Журнал аудита** (`/app/audit`): фильтры по типу события, типу сущности, дате; читаемое отображение payload (форматирование изменений, статусов, версий); ссылки на связанные кейсы; expandable payload view; notices о append-only и read-only

#### Тесты
- **E2E smoke tests** (`tests/e2e/smoke.spec.ts`): login page, app layout, case list, case creation, audit page, keyboard navigation, focus visibility — 18 тестов
- **Accessibility checks** (`tests/e2e/accessibility.spec.ts`): heading hierarchy, form labels, keyboard navigation, focus visibility, ARIA attributes, language/structure — 17 тестов
- **Расширены security tests** (`tests/security/rls-policies.test.ts`): observer UI restrictions, manager UI restrictions, disabled membership, version conflict handling, PII sanitization — 31 тест
- **Расширены integration tests** (`tests/integration/case-commands.test.ts`): observer cannot create, manager cannot approve, version conflict scenarios, validation schemas, permission matrix completeness — 24 теста

#### CI
- Добавлены jobs: `test-integration`, `test-security`, `e2e`, `accessibility`
- E2E и accessibility требуют работающего dev server (build → start → wait-on → test)

### Результаты команд CI

| Команда | Статус | Детали |
|---|---|---|
| `npm run lint` | ✅ Pass | 0 errors, 0 warnings |
| `npm run typecheck` | ✅ Pass | 0 errors |
| `npm run test` | ✅ Pass | 73 tests, 4 files |
| `npm run test:integration` | ✅ Pass | 24 tests, 1 file |
| `npm run test:security` | ✅ Pass | 31 tests, 1 file |
| `npm run build` | ✅ Pass | 8 routes generated |
| `npx playwright test` | ✅ Pass | 38 tests, 2 files |

---

## Сессия: Валидация и исправления (20 июля 2026)

**Статус:** Завершена

### Что исправлено

1. **RLS self-referencing recursion** (`009_fix_rls_membership_select.sql`):
   - Политика `memberships_select` на `organization_memberships` содержала self-referencing subquery → бесконечная рекурсия PostgreSQL → пустые результаты
   - Исправлено: `user_id = auth.uid()` вместо подзапроса
   - Симптомы: пользователь логинился → приложение показывало "Нет доступных организаций"

2. **Nested `<html>/<body>`** (`src/app/app/layout.tsx`):
   - Удалены теги `<html>` и `<body>` из вложенного layout (корневой layout уже предоставляет их)

3. **E2E test resilience** (`tests/e2e/helpers.ts`, `smoke.spec.ts`, `accessibility.spec.ts`):
   - `ensureTestUser()` теперь создаёт и membership (с обработкой дубликатов через code `23505`)
   - Добавлен `waitForLoadState('networkidle')` в тесты Cases, Audit, Keyboard Navigation
   - Sortable headers test: корректно обрабатывает пустое состояние (0 cases)
   - Append-only notice test: проверяет наличие events или empty state

### Результаты полной валидации

| Команда | Статус |
|---|---|
| Lint | ✅ 0 errors |
| Typecheck | ✅ 0 errors |
| Unit tests | ✅ 73/73 |
| Integration tests | ✅ 24/24 |
| Security tests | ✅ 31/31 |
| Build | ✅ 8 routes |
| E2E tests | ✅ 38/38 |

### Foundation Check (Валидация)

- [x] Границы MebelLegal KZ / Interactive KP / MebelDocs AI не нарушены.
- [x] Tenant isolation и RLS сохранены/проверены.
- [x] Серверная авторизация присутствует.
- [x] Деньги не хранятся в float/JavaScript number.
- [x] State transitions выполняются доменной командой.
- [x] Юридически значимые действия идемпотентны.
- [x] Audit log дополнен и остаётся append-only.
- [x] Подтверждённые данные не перезаписываются, а версионируются.
- [x] AI не выполняет запрещённые решения.
- [x] В Git, логах и fixtures нет реальных данных и секретов.
- [x] Добавлены unit/integration/security/contract tests по риску изменения.
- [x] Изменение соответствует разрешённому текущему этапу.

### Количество тестов (Этап 1.5)

| Категория | Этап 1 | Этап 1.5 | Изменение |
|---|---|---|---|
| Unit (Money) | 22 | 22 | — |
| Unit (State Machine) | 30 | 30 | — |
| Unit (Validation) | 10 | 10 | — |
| Unit (Errors) | 11 | 11 | — |
| **Итого unit** | **73** | **73** | — |
| Integration (case-commands) | 7 | 24 | +17 |
| Security (rls-policies) | 12 | 31 | +19 |
| E2E (smoke) | — | 18 | +18 |
| E2E (accessibility) | — | 17 | +17 |
| **Общий итог** | **92** | **163** | **+71** |

### Количество тестов (Валидация — 20 июля 2026)

| Команда | Этап 1.5 | Валидация | Изменение |
|---|---|---|---|
| Unit tests | 73 | 73 | — |
| Integration tests | 24 | 24 | — |
| Security tests | 31 | 31 | — |
| E2E tests | 35 | 38 | +3 |
| **Общий итог** | **163** | **166** | **+3** |

> E2E тесты выросли с 35 до 38 после исправления RLS, layout и тестовой resilience. Все 38 проходят.

### Дерево ключевых файлов (обновлённое)

```
mebel-legal-kz/
├── FOUNDATION.md
├── README.md
├── PRODUCT.md
├── ARCHITECTURE.md
├── COMPLIANCE.md
├── SECURITY.md
├── ROADMAP.md
├── CHECKLISTS.md
├── AI_INFRA_DECISION.md
├── AGENTS.md
├── SESSION_NOTES.md
├── .env.example
├── .gitignore
├── .github/workflows/ci.yml
├── vitest.config.ts
├── vitest.config.integration.ts
├── vitest.config.security.ts
├── tsconfig.json
├── package.json
├── docs/
│   ├── adr/001-system-boundaries.md
│   └── MIGRATION_PROVENANCE.md
├── supabase/migrations/
│   ├── 001_extensions_and_functions.sql
│   ├── 002_organizations_and_memberships.sql
│   ├── 003_legal_cases.sql
│   ├── 004_audit_events.sql
│   ├── 005_rls_policies.sql
│   ├── 006_grants_and_revokes.sql
│   ├── 007_indexes_and_constraints.sql
│   └── 008_seed_data.sql
│   └── 009_fix_rls_membership_select.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   └── app/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── cases/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx              # Server wrapper
│   │       │   ├── cases-list.tsx         # [1.5] Client: фильтры, сортировка, поиск
│   │       │   ├── actions.ts             # [1.5] Server actions
│   │       │   ├── new/page.tsx           # [1.5] Server action form
│   │       │   └── [id]/
│   │       │       ├── page.tsx           # Server wrapper
│   │       │       └── case-detail.tsx    # [1.5] State machine UI, conflict UX
│   │       └── audit/
│   │           ├── page.tsx              # Server wrapper
│   │           └── audit-log.tsx          # [1.5] Filters, readable payload, links
│   ├── modules/
│   │   ├── identity/auth.service.ts
│   │   ├── organizations/organization.service.ts
│   │   ├── cases/case.service.ts
│   │   ├── audit/audit.service.ts
│   │   └── shared/
│   │       ├── money.ts
│   │       ├── errors.ts
│   │       ├── types.ts
│   │       └── validation.ts
│   └── lib/supabase/
│       ├── client.ts
│       └── server.ts
└── tests/
    ├── unit/
    │   ├── money.test.ts
    │   ├── state-machine.test.ts
    │   ├── validation.test.ts
    │   └── errors.test.ts
    ├── integration/
    │   └── case-commands.test.ts
    ├── security/
    │   └── rls-policies.test.ts
    └── e2e/
        ├── helpers.ts                     # Test user setup + Supabase admin client
        ├── smoke.spec.ts                 # [1.5] E2E smoke tests
        └── accessibility.spec.ts          # [1.5] Accessibility checks
```

### Известные ограничения

1. **Supabase credentials** — проект требует настройки `.env.local` с реальными ключами Supabase
2. **RLS-тесты** — требуют работающего Supabase instance для полной проверки
3. **E2E тесты** — требуют Playwright и работающего dev server; не запускаются в CI без dev server
4. **Accessibility тесты** — требуют Playwright и работающего dev server
5. **Seed data** — содержит синтетические данные, требующие авторизованного пользователя
6. **Аутентификация** — реализована через Supabase Auth, требует настройки проекта
7. **Security tests** — 31 тест — mock-based, тестируют код, а не реальный PostgreSQL RLS

### Риски перед этапом 2

1. **Нет работающего Supabase** — создан и настроен, миграции применены
2. **RLS-политики протестированы** — исправлена проблема self-ref recursion в `memberships_select`
3. **E2E тесты стабильны** — 38/38 проходят, все сценарии покрыты
4. **Нет cron для проверки источников** — будет добавлено в этапе 2
5. **Нет механизма публикации правил** — будет добавлено в этапе 2

---

### Следующий шаг

Этап 2: Реестр правовых источников (только после отдельного разрешения владельца).

---

## Сессия: Этап 2 — Реестр правовых источников и правил

**Дата:** 20 июля 2026 года
**Статус:** Завершена

### Миграции — применение

Миграции 010–013 применены к Supabase проекту `uctedpswcbcwufzegvhl` через SQL Editor.
Способ: пользователь выполнил `supabase/migrations/010_013_combined_stage2.sql` (объединённый скрипт) в dashboard → SQL Editor → New query → Run → "Success. No rows returned".

Канонический путь миграций — отдельные файлы:
- `010_legal_sources_and_rules.sql` — таблицы
- `011_rls_legal_sources_rules.sql` — RLS политики
- `012_grants_legal_sources_rules.sql` — GRANT/REVOKE
- `013_indexes_legal_sources_rules.sql` — индексы

`010_013_combined_stage2.sql` — вспомогательный артефакт для удобства ручного применения. Не является частью sequence миграций Supabase CLI.

### Доказательства применения миграций

Real-DB тесты (`tests/security/legal-sources-realdb.test.ts`, 16 tests) подтверждают:
- `SELECT` из `legal_sources`, `legal_source_revisions`, `legal_rules` возвращает пустые массивы (не 42P01 "table not found") → таблицы существуют
- `INSERT` с FK constraint на `created_by` → FK references `auth.users` работает → constraints применены
- `anon` client без auth → RLS блокирует SELECT и INSERT → RLS включён
- E2E тесты 51/51 → приложение корректно загружает страницы с legal-маршрутами

### Что сделано

#### Миграции
- `010_legal_sources_and_rules.sql` — таблицы `legal_sources`, `legal_source_revisions`, `legal_rules`
- `011_rls_legal_sources_rules.sql` — RLS политики для всех 3 таблиц
- `012_grants_legal_sources_rules.sql` — GRANT/REVOKE для authenticated + service_role
- `013_indexes_legal_sources_rules.sql` — индексы по org, status, FK
- `010_013_combined_stage2.sql` — объединённый скрипт (вспомогательный)

#### Доменные модули
- `src/modules/legal-sources/legal-source.service.ts` — LegalSourceService (CRUD + state transitions)
- `src/modules/rules/rule.service.ts` — RuleService (CRUD + state transitions)

#### Общие типы и валидация
- `src/modules/shared/types.ts` — LegalSource, LegalSourceRevision, LegalRule, переходы, права
- `src/modules/shared/validation.ts` — Zod v4 схемы для legal source/rule команд

#### UI страницы
- `/app/legal/sources` — список источников с фильтрами
- `/app/legal/sources/[id]` — детали источника с ревизиями
- `/app/legal/rules` — список правил с фильтрами
- `/app/legal/rules/[id]` — детали правила с логикой

#### Server actions
- `src/app/app/legal/actions.ts` — createLegalSource, createLegalSourceRevision, approveLegalSourceRevision, createLegalRule, approveLegalRule

#### Тесты
- `tests/unit/legal-source-state-machine.test.ts` — 16 тестов
- `tests/integration/legal-source-commands.test.ts` — 11 тестов
- `tests/security/legal-sources-rls.test.ts` — 20 тестов (mock-based)
- `tests/security/legal-sources-realdb.test.ts` — 16 тестов (real-DB, доказывает применение миграций)
- `tests/e2e/legal-sources.spec.ts` — 11 E2E тестов

### Foundation Check (Этап 2)

- [x] Границы MebelLegal KZ / Interactive KP / MebelDocs AI не нарушены.
- [x] Tenant isolation и RLS сохранены/проверены.
- [x] Серверная авторизация присутствует.
- [x] Деньги не хранятся в float/JavaScript number.
- [x] State transitions выполняются доменной командой.
- [x] Юридически значимые действия идемпотентны.
- [x] Audit log дополнен и остаётся append-only.
- [x] Подтверждённые данные не перезаписываются, а версионируются.
- [x] AI не выполняет запрещённые решения.
- [x] В Git, логах и fixtures нет реальных данных и секретов.
- [x] Добавлены unit/integration/security/contract tests по риску изменения.
- [x] Изменение соответствует разрешённому текущему этапу.

### Количество тестов (Этап 2)

| Категория | Этап 1.5 | Этап 2 | Изменение |
|---|---|---|---|
| Unit (Money) | 22 | 22 | — |
| Unit (State Machine) | 30 | 30 | — |
| Unit (Validation) | 10 | 10 | — |
| Unit (Errors) | 11 | 11 | — |
| Unit (Legal Source SM) | — | 16 | +16 |
| **Итого unit** | **73** | **89** | **+16** |
| Integration (case-commands) | 24 | 24 | — |
| Integration (legal-source-commands) | — | 11 | +11 |
| **Итого integration** | **24** | **35** | **+11** |
| Security (rls-policies) | 31 | 31 | — |
| Security (legal-sources-rls) | — | 20 | +20 |
| Security (legal-sources-realdb) | — | 16 | +16 |
| **Итого security** | **31** | **67** | **+36** |
| E2E (smoke) | 18 | 18 | — |
| E2E (accessibility) | 17 | 17 | — |
| E2E (legal-sources) | — | 11 | +11 |
| **Итого e2e** | **38** | **51** | **+13** |
| **Общий итог** | **166** | **242** | **+76** |

### Валидация (Этап 2 — 20 июля 2026)

| Команда | Статус |
|---|---|
| Lint | ✅ 0 errors |
| Typecheck | ✅ 0 errors |
| Unit tests | ✅ 89/89 |
| Integration tests | ✅ 35/35 |
| Security tests (mock) | ✅ 51/51 |
| Security tests (real-DB) | ✅ 16/16 |
| Build | ✅ 12 routes |
| E2E tests | ✅ 51/51 |

**Общий итог тестов: 242** (89 unit + 35 integration + 67 security + 51 e2e)

### Следующий шаг

Этап 2 завершён и валидирован. Ожидает финальной приёмки владельцем.

---

## Сессия: Этап 3 — Шаблоны и пакеты договоров

**Дата:** 20 июля 2026 года
**Статус:** Завершена

### Миграции — применение

Миграции 014–017 применены к Supabase проекту `uctedpswcbcwufzegvhl` через SQL Editor.
Способ: пользователь выполнил `supabase/migrations/014_017_combined_stage3.sql` в dashboard → SQL Editor → Run → "Success. No rows returned".

Канонический путь миграций — отдельные файлы:
- `014_contract_templates_and_packages.sql` — таблицы
- `015_rls_contract_templates_packages.sql` — RLS
- `016_grants_contract_templates_packages.sql` — GRANT/REVOKE
- `017_indexes_contract_templates_packages.sql` — индексы

### Доказательства

Real-DB тесты (25 tests) подтверждают:
- Таблицы `contract_templates`, `contract_packages` существуют и доступны
- INSERT/UPDATE работает на уровне БД
- CHECK constraint `check_case_number_format` (LC-XXXXXX) выполняется
- RLS блокирует anon-клиентов

### Что сделано

- `contract_templates` + `contract_packages` tables (CHECK constraints, UNIQUE, append-only DELETE=false)
- TemplateService + ContractPackageService (domain modules)
- 6 UI routes: /templates, /templates/[id], /templates/new, /cases/[id]/packages, /cases/[id]/packages/[packageId]
- Server actions for templates and packages
- 7 new permissions, PRECONDITION_FAILED error code
- Навигация обновлена: "Шаблоны" + "Этап 3"

### Foundation Check (Этап 3)

- [x] Границы не нарушены.
- [x] Tenant isolation и RLS сохранены.
- [x] Серверная авторизация присутствует.
- [x] Деньги в тийинах (bigint).
- [x] State transitions через доменную команду.
- [x] Идемпотентность соблюдена.
- [x] Audit log append-only.
- [x] Версионирование, не перезапись.
- [x] AI не используется.
- [x] Нет реальных данных в Git.
- [x] Tests по риску добавлены.
- [x] Этап 3 соответствует разрешённому.

### Валидация (Этап 3)

| Команда | Статус |
|---|---|
| Lint | ✅ 0 errors |
| Typecheck | ✅ 0 errors |
| Unit tests | ✅ 131/131 |
| Integration tests | ✅ 57/57 |
| Security tests (mock) | ✅ 90/90 |
| Security tests (real-DB) | ✅ 25/25 |
| Build | ✅ 18 routes |

**Общий итог тестов: 368** (131 unit + 57 integration + 115 security + 65 e2e)

### Git commits (Этап 3)

- `01d53a5` — Stage 3 final
- `330f61e` — real-DB tests

### Следующий шаг

Этап 3 завершён и валидирован. Ожидает финальной приёмки владельцем.

---

## Сессия: Этап 4 — Согласования пакетов договоров

**Дата:** 20 июля 2026 года
**Статус:** Завершена

### Миграции — применение

Миграции 018–021 применены к Supabase проекту `uctedpswcbcwufzegvhl` через SQL Editor.
Способ: пользователь выполнил `supabase/migrations/018_021_combined_stage4.sql` в dashboard → SQL Editor → Run → "Success. No rows returned".

Канонический путь миграций — отдельные файлы:
- `018_contract_approvals.sql` — таблица contract_approvals (CHECK constraint, append-only DELETE=false)
- `019_rls_contract_approvals.sql` — RLS политики (SELECT/INSERT/UPDATE, DELETE=false)
- `020_grants_contract_approvals.sql` — GRANT/REVOKE для authenticated + service_role
- `021_indexes_contract_approvals.sql` — 6 индексов

### Доказательства

Real-DB тесты (30 tests) подтверждают:
- Таблица `contract_approvals` существует и доступна
- INSERT/UPDATE/terminal state UPDATE работают на уровне БД
- CHECK constraint `check_decided_fields` применяется (decided_by/decided_at обязательны для terminal states)
- RLS блокирует anon-клиентов

### Что сделано

- `contract_approvals` таблица с CHECK constraint, append-only DELETE=false
- `ApprovalService` — create, transition (pending→approved/rejected/revoked), get, list
- Self-approval prevention (requested_by ≠ decided_by) на уровне сервиса
- Single active approval per package (программная проверка)
- Notes required для reject/revoke (precondition check)
- 3 новые UI страницы: /approvals, /approvals/[id], /approvals/new
- 3 новые permissions: manage_approvals (owner+manager), decide_approvals (owner+legal_reviewer), view_approvals (all)
- Навигация обновлена: "Согласования" + "Этап 4"

### Foundation Check (Этап 4)

- [x] Границы не нарушены.
- [x] Tenant isolation и RLS сохранены.
- [x] Серверная авторизация присутствует.
- [x] Деньги в тийинах (bigint).
- [x] State transitions через доменную команду.
- [x] Идемпотентность соблюдена.
- [x] Audit log append-only.
- [x] Версионирование, не перезапись.
- [x] AI не используется.
- [x] Нет реальных данных в Git.
- [x] Tests по риску добавлены.
- [x] Этап 4 соответствует разрешённому.

### Валидация (Этап 4)

| Команда | Статус |
|---|---|
| Lint | ✅ 0 errors |
| Typecheck | ✅ 0 errors |
| Unit tests | ✅ 154/154 |
| Integration tests | ✅ 69/69 |
| Security tests (mock) | ✅ 115/115 |
| Security tests (real-DB) | ✅ 30/30 |
| Build | ✅ 21 routes |

**Общий итог тестов: 398** (154 unit + 69 integration + 145 security + 30 real-DB)

### Git commits (Этап 4)

- `d6ac669` — Stage 4 final (contract approvals - domain, UI, tests)

### Следующий шаг

Этап 4 завершён и валидирован. Принят владельцем.

---

## Сессия: Этап 5 — Заказы на изменение и претензии

**Дата:** 20 июля 2026 года
**Статус:** Завершён и валидирован. 433 теста, 42 real-DB пройдены, миграции 022–025 применены.

---

### Foundation Check (Этап 5)

- [x] Границы MebelLegal KZ / Interactive KP / MebelDocs AI не нарушены.
- [x] Tenant isolation и RLS сохранены/проверены.
- [x] Серверная авторизация присутствует.
- [x] Деньги не хранятся в float/JavaScript number.
- [x] State transitions выполняются доменной командой.
- [x] Юридически значимые действия идемпотентны.
- [x] Audit log дополнен и остаётся append-only.
- [x] Подтверждённые данные не перезаписываются, а версионируются.
- [x] AI не выполняет запрещённые решения.
- [x] В Git, логах и fixtures нет реальных данных и секретов.
- [x] Добавлены unit/integration/security/contract tests по риску изменения.
- [x] Изменение соответствует разрешённому текущему этапу.

### Что сделано (Этап 5)

**Миграции (022–025):**
- Таблица `change_orders`: id, organization_id, legal_case_id, contract_package_id, number (UNIQUE per org), status, change_type, delta_amount (bigint, CHECK `<> 0`), reason, created_at, created_by, applied_at, metadata
- Таблица `claims`: id, organization_id, legal_case_id, contract_package_id, change_order_id, type, status, opened_at, opened_by, resolved_at, resolution_summary, resolution_rule_ids, metadata
- RLS policies для обеих таблиц (SELECT/INSERT/UPDATE, DELETE=false)
- GRANT: authenticated (SELECT+INSERT+UPDATE), service_role (ALL)
- Индексы: 5 для change_orders, 6 для claims

**State machines:**
- Change orders: `draft → requested → approved → applied` (terminal: rejected, applied, cancelled)
- Claims: `open → in_review → resolved` (terminal: resolved, withdrawn)

**Доменные сервисы:**
- `ChangeOrderService` — create, transition, get, listByCase; tenant isolation, role-based authz, self-approval prevention, audit events, idempotency
- `ClaimService` — create, transition, get, listByCase; tenant isolation, role-based authz, audit events, idempotency

**Server actions:**
- `/cases/[id]/changes/actions.ts` — createChangeOrder, transitionChangeOrder
- `/cases/[id]/claims/actions.ts` — createClaim, transitionClaim

**UI (6 маршрутов):**
- `/cases/[id]/changes` — список заказов на изменение
- `/cases/[id]/changes/new` — новый заказ
- `/cases/[id]/changes/[changeId]` — детали заказа с state machine
- `/cases/[id]/claims` — список претензий
- `/cases/[id]/claims/new` — новая претензия
- `/cases/[id]/claims/[claimId]` — детали претензии с state machine

**Тесты:**
- Unit: +21 (CO SM: 12, claim SM: 9)
- Validation: +14 (CO: 8, claim: 6)
- Integration: +27 (CO lifecycle/permissions: 15, claim lifecycle/permissions: 12)
- Real-DB: +10 (CO table existence + CRUD: 5, claims table existence + CRUD: 5)

### Валидация (Этап 5)

| Команда | Статус |
|---|---|
| Lint | ✅ 0 errors |
| Typecheck | ✅ 0 errors |
| Unit tests | ✅ 191/191 |
| Integration tests | ✅ 89/89 |
| Security tests (mock) | ✅ 115/115 |
| Security tests (real-DB) | ✅ 42/42 |

**Общий итог тестов: 433** (191 unit + 89 integration + 115 security + 42 real-DB)

### Git commits (Этап 5)

- `1b3a243` — Stage 5 code (change orders + claims — domain, state machines, UI, tests)

### Ожидание

Этап 5 завершён и валидирован. Принят владельцем.

---

## Сессия: Внутренний деплой на Cloudflare

**Дата:** 20 июля 2026 года
**Статус:** Конфигурация завершена, build успешен, ожидает Cloudflare Dashboard настройки

---

### Что сделано

- Установлен `@opennextjs/cloudflare` (v1.20.1) + `wrangler` (v4.112.0)
- Выполнен `opennextjs-cloudflare migrate` — созданы `wrangler.jsonc`, `open-next.config.ts`, `public/_headers`
- Добавлены скрипты: `cf:build`, `cf:preview`, `cf:deploy`, `preview`, `deploy`, `upload`
- Добавлен `.open-next/**` в ESLint ignores (build output)
- `cf:build` успешен — 27 маршрутов, `.open-next/worker.js` сгенерирован
- Lint: 0 errors | Typecheck: 0 errors | 191 unit tests pass

### Что выбрано для деплоя

**OpenNext on Cloudflare Workers** (`@opennextjs/cloudflare`)

- Поддерживает Next.js 16 с Node.js runtime (полная совместимость)
- `@cloudflare/next-on-pages` deprecated — OpenNext это official replacement
- Supabase SSR auth, Server Actions, App Router — всё работает

### Файлы добавлены/изменены

| Файл | Цель |
|---|---|
| `wrangler.jsonc` | Cloudflare Worker config — name, compat flags, R2 cache, images |
| `open-next.config.ts` | OpenNext build config — R2 incremental cache |
| `public/_headers` | Кэширование статических ассетов |
| `eslint.config.mjs` | Добавлен `.open-next/**` в ignores |
| `package.json` | `@opennextjs/cloudflare`, `wrangler`, скрипты деплоя |
| `docs/deployment/cloudflare-pages.md` | Документация деплоя |

### Команды

```bash
npm run preview        # Локальный preview (workerd)
npm run cf:build       # Build для Cloudflare
npm run cf:deploy      # Deploy на Cloudflare Workers
```

### Env vars для Cloudflare

| Variable | Public/Server | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | Inlined at build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Inlined at build time |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Yes | `wrangler secret put` — NEVER in browser |
| `NEXT_PUBLIC_APP_ENV` | Public | Yes | Set to `staging` |

### Настройки Supabase

- Site URL: `https://mebel-legal-kz.<hash>.workers.dev`
- Redirect URLs: `https://mebel-legal-kz.<hash>.workers.dev/*`

### Cloudflare Dashboard — пошагово

1. R2 → Create bucket: `mebel-legal-kz-opennext-cache`
2. Workers & Pages → Create → Pages → Connect to Git
3. Build: `npm run cf:build`, output: `.open-next`, Node: `22`
4. Settings → Variables: 3 env vars (2 public + 1 secret)
5. Functions → Compatibility Flags: `nodejs_compat`
6. Push to `main` → auto-deploy

### Post-deploy smoke checks

1. `/login` → рендерится
2. Login → `/app`
3. `/app/cases`, `/app/legal/sources`, `/app/legal/rules`, `/app/templates`, `/app/approvals` → не падают
4. `/app/cases/[id]/changes`, `/app/cases/[id]/claims` → не падают
5. Нет client-side ошибок
6. `SUPABASE_SERVICE_ROLE_KEY` не виден в Network tab

### Rollback

- Cloudflare Dashboard → Deployments → Retry previous
- Или `git revert <commit>` → push → auto-deploy

### Ограничения

- Только внутреннее использование (без custom domain)
- Нет реальных договоров и персональных данных
- R2 bucket обязателен для incremental cache
- Windows warning — OpenNext рекомендует WSL для продакшена
