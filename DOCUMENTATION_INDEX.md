# Индекс документации

## Что читать в первую очередь

1. `FOUNDATION.md` — обязательные границы продукта, данных и безопасности.
2. `README.md` — фактическое состояние, запуск, проверки и релиз.
3. `PRODUCT.md` — узкая продуктовая рамка MebelDocs.
4. `ARCHITECTURE.md` — модули, контракты и владение данными.
5. `SECURITY.md` — модель угроз, RLS, секреты и реальные данные.
6. `docs/MIGRATION_STATUS.md` — состояние удалённой схемы и правила миграций.

## Корневые Markdown-файлы

| Файл | Назначение |
|---|---|
| `AGENTS.md` | Обязательные правила работы кодеров и агентов. |
| `AI_INFRA_DECISION.md` | Решение об AI-инфраструктуре; AI не входит в текущий MVP. |
| `ARCHITECTURE.md` | Целевая модульная архитектура и границы данных. |
| `CHECKLISTS.md` | Контрольные списки разработки, безопасности и релиза. |
| `CLAUDE.md` | Указатель на `AGENTS.md` для совместимости инструментов. |
| `COMPLIANCE.md` | Правовые оговорки и требования к данным/документам. |
| `DOCUMENTATION_INDEX.md` | Этот навигатор и приоритет документов. |
| `FOUNDATION.md` | Главный архитектурный контракт; имеет приоритет. |
| `MERGE_MEBELDOCS_MEBELLEGAL_INSTRUCTIONS.md` | План объединения и безопасной миграции двух проектов. |
| `OPENCODE_FULL_PROJECT_INSTRUCTIONS.md` | Исполняемый поэтапный handoff OpenCode с тройной приёмкой и Stitch-картой. |
| `PRODUCT.md` | Актуальное продуктовое определение единого MebelDocs. |
| `README.md` | Быстрый старт и фактический статус реализации. |
| `ROADMAP.md` | Ближайшие релизы и явно отложенные функции. |
| `SECURITY.md` | Модель доступа, RLS, секреты и аудит. |
| `SESSION_NOTES.md` | Хронологический журнал решений и проверок. |

## Каталог `docs`

- `docs/MIGRATION_STATUS.md` — применённые версии и известный дрейф истории.
- `docs/MIGRATION_PROVENANCE.md` — происхождение старых SQL-миграций.
- `docs/adr/001-system-boundaries.md` — границы систем.
- `docs/adr/002-unified-order-document-workflow.md` — решение «заказ как корень».
- `docs/deployment/cloudflare-workers.md` — сборка и развёртывание Cloudflare.
- `design-handoff/stitch/manifest.json` — машинно-читаемая карта утверждённых Stitch-экранов.
- `reports/OPENCODE_STAGE_REPORT_TEMPLATE.md` — обязательный шаблон отчёта исполнителя.

## Приоритет при конфликте

`FOUNDATION.md` → `SECURITY.md` → ADR → `ARCHITECTURE.md` → `PRODUCT.md` →
`README.md`/runbook → исторические записи `SESSION_NOTES.md`.
