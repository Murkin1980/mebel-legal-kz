# SESSION_NOTES.md — MebelLegal KZ

## Сессия: Этап 0–1 — Инициализация и мультитенантное ядро

**Дата:** 20 июля 2026 года
**Статус:** Завершена

---

### Foundation Check

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

### Результаты команд CI

| Команда | Статус | Детали |
|---|---|---|
| `npm run lint` | ✅ Pass | 0 errors, 0 warnings |
| `npm run typecheck` | ✅ Pass | 0 errors |
| `npm run test` | ✅ Pass | 73 tests, 4 files |
| `npm run build` | ✅ Pass | 8 routes generated |

---

### Количество тестов

| Категория | Количество |
|---|---|
| Unit тесты (Money) | 22 |
| Unit тесты (State Machine) | 30 |
| Unit тесты (Validation) | 10 |
| Unit тесты (Errors) | 11 |
| **Итого unit** | **73** |
| Integration тесты | 1 (case-commands) |
| Security тесты | 1 (rls-policies) |

---

### Дерево ключевых файлов

```
mebel-legal-kz/
├── FOUNDATION.md                    # Обязательный архитектурный договор
├── README.md                        # Основной документ проекта
├── PRODUCT.md                       # Описание продукта
├── ARCHITECTURE.md                  # Архитектурные решения
├── COMPLIANCE.md                    # Правовые ограничения
├── SECURITY.md                      # Модель безопасности
├── ROADMAP.md                       # Дорожная карта
├── CHECKLISTS.md                    # Чек-листы этапов
├── AI_INFRA_DECISION.md             # Решения по AI
├── AGENTS.md                        # Инструкции для AI-кодеров
├── SESSION_NOTES.md                 # Заметки сессий
├── .env.example                     # Шаблон переменных окружения
├── .gitignore                       # Исключения Git
├── .github/workflows/ci.yml         # GitHub Actions CI
├── vitest.config.ts                 # Конфигурация Vitest
├── vitest.config.integration.ts     # Конфигурация integration тестов
├── vitest.config.security.ts        # Конфигурация security тестов
├── tsconfig.json                    # TypeScript конфигурация
├── package.json                     # Зависимости и скрипты
├── docs/
│   ├── adr/001-system-boundaries.md # ADR: границы систем
│   └── MIGRATION_PROVENANCE.md      # Таблица происхождения
├── supabase/migrations/
│   ├── 001_extensions_and_functions.sql
│   ├── 002_organizations_and_memberships.sql
│   ├── 003_legal_cases.sql
│   ├── 004_audit_events.sql
│   ├── 005_rls_policies.sql
│   ├── 006_grants_and_revokes.sql
│   ├── 007_indexes_and_constraints.sql
│   └── 008_seed_data.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Root page (redirect)
│   │   ├── login/page.tsx           # Экран входа
│   │   └── app/
│   │       ├── layout.tsx           # App layout
│   │       ├── page.tsx             # Список организаций
│   │       ├── cases/
│   │       │   ├── page.tsx         # Список кейсов
│   │       │   ├── new/page.tsx     # Создание кейса
│   │       │   └── [id]/page.tsx    # Детали кейса
│   │       └── audit/page.tsx       # Журнал аудита
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
    └── security/
        └── rls-policies.test.ts
```

---

### Таблица RLS-политик

| Таблица | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| organizations | Мembers только свои org | Anyone (auth) | Owners自己的org | No one |
| organization_memberships | Members自己的org | Owners自己的org | Owners自己的org | Owners自己的org |
| legal_cases | Members自己的org | Owner/Manager/Designer自己的org | Owner/Manager/Designer自己的org | No one |
| audit_events | Members自己的org | Anyone (service) | No one (append-only) | No one (append-only) |

---

### Таблица происхождения модулей

| Модуль | Источник | Изменения |
|---|---|---|
| Money | MebelDocs AI | Адаптирован для Next.js |
| Audit Service | MebelDocs AI | Добавлены RLS-проверки |
| Organization Service | Interactive KP | Добавлены роли |
| Case Service | MebelDocs AI | Добавлена state machine |
| Validation | Interactive KP | Унифицированы схемы |

---

### Известные ограничения

1. **Supabase credentials** — проект требует настройки `.env.local` с реальными ключами Supabase
2. **RLS-тесты** — требуют работающего Supabase instance для полной проверки
3. **Интеграционные тесты** — требуют подключения к базе данных
4. **Seed data** — содержит синтетические данные, требующие авторизованного пользователя
5. **UI** — базовый, без продвинутого дизайна
6. **Аутентификация** — реализована через Supabase Auth, требует настройки проекта

---

### Риски перед этапом 2

1. **Нет работающего Supabase** — нужно создать проект и настроить credentials
2. **RLS-политики не протестированы** — требуют интеграционных тестов
3. **Нет cron для проверки источников** — будет добавлено в этапе 2
4. **Нет механизма публикации правил** — будет добавлено в этапе 2

---

### Следующий шаг

Этап 2: Реестр правовых источников (только после отдельного разрешения владельца).
