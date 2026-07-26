# ARCHITECTURE

## Решение

Модульный монолит Next.js, Supabase PostgreSQL/Auth/RLS и Cloudflare Workers.
Заказ — верхний агрегат документооборота; MebelLegal — внутренний юридический модуль.

## Модули

```text
src/app
├─ /                       публичный лендинг
├─ /login                  вход
└─ /app
   ├─ /orders              основной рабочий маршрут
   ├─ /settings/documents  реквизиты компании
   ├─ /cases               внутренний legal-модуль
   ├─ /templates           legal-шаблоны
   ├─ /approvals           внутренние согласования
   ├─ /legal               источники и правила
   └─ /audit               журнал

src/modules
├─ orders                  заказ, документы, сроки, импорт, экспорт
├─ organizations           tenant и memberships
├─ audit                   append-only история
├─ cases / templates / ... внутренний MebelLegal
└─ shared                  деньги, ошибки, общие типы
```

## Данные заказа

```text
organizations
├─ organization_document_profiles
└─ orders
   ├─ order_items
   ├─ order_documents
   └─ order_deadlines
      └─ order_reminders
```

- все tenant-owned таблицы содержат `organization_id` и защищены RLS;
- деньги хранятся как `bigint` в тиынах;
- документ имеет номер, тип, статус и версию;
- `content_snapshot` фиксирует реквизиты, клиента и позиции версии;
- договор — один из типов документа, но не prerequisite заказа;
- удаление рабочих сущностей запрещено политиками.

## Команды

Создание заказа, документа, срока и профиля выполняется атомарными PostgreSQL RPC:
бизнес-сущность и audit event записываются в одной транзакции. Функции:

- проверяют `auth.uid()` и активную membership;
- ограничивают роли;
- используют `SECURITY DEFINER` только для атомарного audit;
- имеют пустой `search_path` и явные schema-qualified ссылки;
- запрещены для `PUBLIC` и `anon`;
- доступны `authenticated`.

## Документы

PDF и DOCX генерируются на сервере из снимка версии. Если у старого документа нет полного
снимка, используется текущий профиль/позиции как fallback. Экспорт доступен только
авторизованному участнику tenant; ответы помечены `private, no-store`.

Формы счёта и акта являются рабочими формами продукта и требуют проверки бухгалтером/юристом
до использования с реальными контрагентами.

## Интеграция

Основная мебельная платформа не получает прямого доступа к таблицам. Будущий импорт использует
версионированный `OrderSnapshotV1`, idempotency и внешний идентификатор/версию заказа.
Фактические модули внешнего MebelDocs нельзя предполагать без отдельной инвентаризации.

## Инфраструктура

- Next.js 16 / React 19 / strict TypeScript;
- OpenNext для Cloudflare Workers;
- Supabase SSR cookies;
- R2 incremental cache binding (не источник бизнес-данных);
- секрет service-role только на сервере;
- deployable build предпочтительно создаётся в Linux/Cloudflare Builds.

## Запреты

- прямой cross-system доступ к таблицам;
- float/JavaScript number для денег;
- secrets в Git или клиентском bundle;
- реальная персональная информация в fixtures;
- обычный `supabase db push --include-all` до устранения исторического drift;
- изменение подтверждённой версии документа;
- AI/RAG, ЭСФ, банк и публичные согласования в текущем релизе.
