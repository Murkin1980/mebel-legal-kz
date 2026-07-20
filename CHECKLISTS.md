# CHECKLISTS.md — MebelLegal KZ

## Этап 0–1: Инициализация и мультитенантное ядро

### Репозиторий и документы

- [ ] Отдельный приватный репозиторий `mebel-legal-kz`
- [ ] `README.md` заполнен
- [ ] `PRODUCT.md` заполнен
- [ ] `ARCHITECTURE.md` заполнен
- [ ] `COMPLIANCE.md` заполнен
- [ ] `SECURITY.md` заполнен
- [ ] `ROADMAP.md` заполнен
- [ ] `CHECKLISTS.md` заполнен
- [ ] `AI_INFRA_DECISION.md` заполнен
- [ ] `AGENTS.md` заполнен
- [ ] `SESSION_NOTES.md` заполнен
- [ ] `FOUNDATION.md` в корне, связан с `README.md` и `AGENTS.md`
- [ ] `.env.example` создан
- [ ] `.gitignore` настроен
- [ ] `docs/adr/001-system-boundaries.md` создан
- [ ] `docs/MIGRATION_PROVENANCE.md` создан

### Технологический стек

- [ ] Next.js 16 (App Router)
- [ ] React 19
- [ ] TypeScript strict
- [ ] Supabase PostgreSQL
- [ ] Supabase Auth
- [ ] Row Level Security
- [ ] Zod для валидации
- [ ] Vitest для тестов
- [ ] ESLint

### Модульный монолит

- [ ] `src/modules/identity/`
- [ ] `src/modules/organizations/`
- [ ] `src/modules/cases/`
- [ ] `src/modules/audit/`
- [ ] `src/modules/shared/`

### Миграции

- [ ] extensions/helper functions
- [ ] organizations
- [ ] organization_memberships
- [ ] legal_cases
- [ ] audit_events
- [ ] RLS policies
- [ ] grants/revokes
- [ ] indexes/constraints

### Данные

- [ ] `organizations` с required полями
- [ ] `organization_memberships` с ролями
- [ ] `legal_cases` с state machine
- [ ] `audit_events` append-only
- [ ] RLS на каждой таблице
- [ ] Уникальность `organization_id + case_number`
- [ ] Ограничение `total_amount_tiyin >= 0`

### Деньги

- [ ] Тип `Money` с `amountTiyin: bigint`
- [ ] Тест: 390 000 ₸ × 70% = 273 000 ₸
- [ ] Тест: 390 000 ₸ × 30% = 117 000 ₸
- [ ] Тест: 273 000 + 117 000 = 390 000
- [ ] Тест: 270 000 + 117 000 ≠ 390 000

### Доменные команды

- [ ] `CreateOrganization`
- [ ] `AddOrganizationMember`
- [ ] `CreateLegalCase`
- [ ] `UpdateLegalCaseBasics`
- [ ] `TransitionLegalCaseStatus`

### State machine

- [ ] `draft → data_collection`
- [ ] `data_collection → draft`
- [ ] `data_collection → ready_for_review`
- [ ] `ready_for_review → data_collection`
- [ ] `ready_for_review → approved`
- [ ] `approved → suspended`
- [ ] `suspended → approved`
- [ ] `approved → closed`
- [ ] `draft → cancelled`
- [ ] `data_collection → cancelled`
- [ ] `ready_for_review → cancelled`

### Авторизация

- [ ] Матрица прав реализована
- [ ] Проверка роли на сервере
- [ ] Проверка tenant на сервере

### UI

- [ ] `/login` — вход
- [ ] `/app` — список организаций
- [ ] `/app/cases` — список кейсов
- [ ] `/app/cases/new` — создание кейса
- [ ] `/app/cases/[id]` — базовые поля и статус
- [ ] `/app/audit` — журнал событий
- [ ] Предупреждение об ограничениях этапа 1

### Тесты

- [ ] Unit: Money, state machine, optimistic concurrency, идемпотентность
- [ ] Integration: организация + owner, кейс + audit event, версия + конфликт
- [ ] Security: полная матрица RLS

### CI

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:integration`
- [ ] `npm run test:security`
- [ ] `npm run build`

### Запреты

- [ ] Нет ИПС «Әділет»
- [ ] Нет AI/LLM
- [ ] Нет генерации документов
- [ ] Нет публичных ссылок
- [ ] Нет реальных данных
- [ ] Нет интеграций
- [ ] Нет service role в браузере
- [ ] Нет денег в float/number

### Foundation Check

- [ ] Границы MebelLegal KZ / Interactive KP / MebelDocs AI не нарушены
- [ ] Tenant isolation и RLS сохранены/проверены
- [ ] Серверная авторизация присутствует
- [ ] Деньги не хранятся в float/JavaScript number
- [ ] State transitions выполняются доменной командой
- [ ] Юридически значимые действия идемпотентны
- [ ] Audit log дополнен и остаётся append-only
- [ ] Подтверждённые данные не перезаписываются, а версионируются
- [ ] AI не выполняет запрещённые решения
- [ ] В Git, логах и fixtures нет реальных данных и секретов
- [ ] Добавлены unit/integration/security/contract tests по риску изменения
- [ ] Изменение соответствует разрешённому текущему этапу
