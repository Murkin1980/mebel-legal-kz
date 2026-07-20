# MIGRATION_PROVENANCE.md — MebelLegal KZ

## Таблица происхождения модулей и идей

| Новый модуль/файл | Проект-источник | Исходная идея/файл | Что изменено | Какие тесты добавлены |
|---|---|---|---|---|
| `src/modules/shared/money.ts` | MebelDocs AI | Тип Money в тийинах | Адаптирован для Next.js, добавлены операции сравнения | Unit: 390 000 ₸, проценты, округление |
| `src/modules/shared/errors.ts` | MebelDocs AI | Стандартизированные ошибки | Упрощён для MVP, добавлены коды ошибок | Unit: создание и сериализация ошибок |
| `src/modules/audit/audit.service.ts` | MebelDocs AI | Append-only audit event | Адаптирован для Supabase, добавлена RLS-проверка | Integration: создание в транзакции |
| `src/modules/organizations/organization.service.ts` | Interactive KP | Tenant ownership checks | Добавлены роли и проверка membership | Security: RLS-тесты |
| `src/modules/cases/case.service.ts` | MebelDocs AI | Доменные команды | Добавлена state machine и optimistic concurrency | Unit: переходы статусов |
| `src/lib/supabase/client.ts` | Interactive KP | Supabase Auth/RLS подход | Адаптирован для Next.js 16 | — |
| `src/lib/supabase/server.ts` | Interactive KP | Серверная авторитетность | Добавлена проверка service role | Security: отсутствие в браузере |
| `src/modules/shared/validation.ts` | Interactive KP | Zod-валидация | Унифицированы схемы для всех команд | Unit: валидация входных данных |

---

## Принципы переноса

1. **Не копировать целиком** — только выборочные идеи и паттерны.
2. **Адаптировать** — изменять под контекст MebelLegal KZ.
3. **Документировать** — фиксировать происхождение каждой идеи.
4. **Тестировать** — добавлять тесты для перенесённого кода.

## Запреты на перенос (этап 1)

- UI Interactive KP;
- Таблицы `kps`, `kp_items`, `kp_item_variants`;
- Публичные токены и подтверждения;
- Генерация PDF/DOCX;
- Бухгалтерские сущности и ЭСФ;
- Archive intake;
- AI-помощник;
- `node:fs`-хранилище;
- Реальные документы и реквизиты.
