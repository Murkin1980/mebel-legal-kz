# MebelDocs

Единый модуль документооборота мебельной компании. Верхний агрегат продукта — заказ:
договор необязателен, а счёт, акт, сроки и напоминания всегда связаны с заказом.
MebelLegal KZ сохранён как внутренний юридический модуль.

> Приложение помогает готовить рабочие документы, но не заменяет бухгалтера или юриста.
> Перед реальным использованием реквизиты и формы документов должны быть проверены ответственным специалистом.

## Что работает

- публичный адаптивный лендинг на `/`;
- авторизация и multi-tenant организации;
- список, создание и карточка заказа;
- данные клиента и позиции заказа;
- точные суммы в целых тиынах;
- опциональный договор;
- версионированные счёт и акт;
- экспорт счёта и акта в PDF и DOCX;
- реквизиты компании с версией и аудитом;
- сроки в рабочих днях и вычисляемые напоминания;
- RLS, серверная авторизация, атомарные команды и append-only аудит;
- адаптер `OrderSnapshotV1` для будущего импорта из основной мебельной платформы;
- внутренние модули MebelLegal: кейсы, шаблоны, источники, правила и согласования.

Не входят в текущий MVP: AI/RAG, правовые источники из внешних систем, претензии в новом
контуре заказов, публичные согласования, ЭСФ и банковская сверка.

## Быстрый старт

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Обязательные переменные:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Не помещайте реальные секреты или данные клиентов в Git. Для локальной разработки используйте
изолированную базу.

## Проверки

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run cf:build
```

Расширенные наборы:

```powershell
npm run test:integration
npm run test:security
npm run test:security:realdb
npm run test:e2e
npm run preflight
```

## Миграции

Новый контур находится в:

- `20260724205035_unified_order_documents_prototype.sql`;
- `20260726160000_lockdown_order_rpc_permissions.sql`.

Обе миграции применены к связанному staging-проекту Supabase. История старых миграций
002–029 расходится с таблицей миграций удалённой базы, поэтому обычный `supabase db push`
запрещён до инвентаризации и согласованного `migration repair`. Подробности:
[docs/MIGRATION_STATUS.md](./docs/MIGRATION_STATUS.md).

## Cloudflare

```powershell
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Деплой выполняется только после успешного preflight и проверки целевого окружения.
Инструкция: [docs/deployment/cloudflare-workers.md](./docs/deployment/cloudflare-workers.md).

## Документация

Начинайте с [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md). Обязательный архитектурный
контракт — [FOUNDATION.md](./FOUNDATION.md).

## Стек

Next.js 16, React 19, TypeScript, Supabase PostgreSQL/Auth/RLS, Zod, Vitest,
Playwright, OpenNext и Cloudflare Workers.

## Лицензия

Проприетарный проект. Все права защищены.
