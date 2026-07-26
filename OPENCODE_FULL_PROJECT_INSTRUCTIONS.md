# OpenCode: полная инструкция по завершению MebelDocs

## 0. Назначение документа

Этот файл — исполняемый контракт для OpenCode. Он должен выполнять этапы строго
последовательно, обновлять чек-листы и останавливаться после deployment каждого этапа
для независимого ревью Codex и визуальной приёмки владельцем.

OpenCode является **исполнителем**, а не финальным ревьюером. Галочка исполнителя означает
«реализовано и самопроверено», но не означает «принято».

## 1. Контекст продукта

MebelDocs — единый модуль документооборота мебельной компании Казахстана и будущий
плагин основной мебельной платформы.

- Верхний агрегат: **заказ**.
- Договор: необязательный документ.
- Счёт, акт, сроки, напоминания, файлы и аудит: связаны с заказом.
- MebelLegal: внутренний юридический модуль, а не отдельный general legal AI.
- Валюта: KZT; деньги хранятся в целых тиынах.
- Интерфейс: русский.
- Данные разных организаций никогда не смешиваются.

Не добавлять AI/RAG, ЭСФ, банковскую сверку, OCR, претензии в новом контуре или
публичные согласования без нового письменного решения владельца.

## 2. Каноническая рабочая копия и ветка

- Репозиторий: `C:\mebel-legal-kz`
- Remote: `https://github.com/Murkin1980/mebel-legal-kz.git`
- Рабочая ветка: `codex/complete-mebeldocs-release`
- Staging URL: `https://mebel-legal-kz.muriktl.workers.dev`
- Supabase staging project ref: `uctedpswcbcwufzegvhl`

Перед любой работой:

1. Прочитать полностью `AGENTS.md`, `FOUNDATION.md`, `ARCHITECTURE.md`,
   `SECURITY.md`, `ROADMAP.md`, `README.md`, `SESSION_NOTES.md`.
2. Выполнить `git status --short`, `git branch --show-current`, `git log -5 --oneline`.
3. Не перезаписывать чужие незакоммиченные изменения.
4. Не использовать кириллическую OneDrive-копию как каноническую.
5. Не выводить содержимое `.env*`, service role key, cookies или токены.

## 3. Источники дизайна Stitch

- Project ID: `1788030184315606092`
- Project URL: `https://stitch.withgoogle.com/u/3/projects/1788030184315606092`
- Design system: `assets/17146528653703552216`
- Главный эталон: `bc969ca8c25f4c0f85da330e3a52da84`

### Desktop

| Назначение | Stitch screen ID |
|---|---|
| Главный dashboard — основной эталон shell | `bc969ca8c25f4c0f85da330e3a52da84` |
| Реестр заказов | `aeef31edcc1748a28c55b1c6b8e4345a` |
| Карточка заказа | `1457210b81fd4b9dab3e3a2acbb1f223` |
| Документы заказа / split view | `1773740c8a374476b50c72622125d47c` |
| Сроки и напоминания | `4b2b92cdfda944a8b2fc17ced62ec31b` |
| MebelLegal | `939584efe73c42439ec0c2e8328927cf` |

### Mobile

| Назначение | Stitch screen ID |
|---|---|
| Заказы | `31cb3e0ee1334cc291b0aaa5fe5bfa44` |
| Карточка заказа | `3bc502e0ea7f4ad2810913284e50ea4e` |
| Документы | `5eeb2f1cbd48479fa409bccdbaed48e1` |
| Сроки | `a0264d5ade16423cb732e8bab607f2a6` |
| Юридическая проверка | `fd9a7075ba0042ee83909ce3e82d6a4a` |

### Обязательные токены

- Primary purple: `#5B347F`
- Dark plum: `#332C3B`
- Gold: `#C79A3B`
- Champagne: `#F3E7D1`
- Ivory: `#FBF8F2`
- Invoice: `#3F70C9`
- Act: `#C79A3B`
- Contract: `#7861B4`
- Invoice-factura (только визуальный резерв): `#B8664A`
- Deadline: `#C65B63`
- Legal: `#713D66`
- Font: Manrope
- Radius: 8px

Зелёный не использовать как основной или акцентный цвет. Цвет всегда сопровождается
текстовым статусом. Не копировать Stitch HTML буквально: извлекать композицию и токены,
сохраняя существующие Next.js-компоненты, server actions и accessibility.

## 4. Как передать Stitch OpenCode

Предпочтительный порядок:

1. Дать OpenCode этот файл и доступ к репозиторию.
2. Передать URL Stitch-проекта и таблицу screen ID выше.
3. Если OpenCode не умеет открывать Stitch, экспортировать только выбранные 11 экранов:
   - `screen-id.html`;
   - `screen-id.png`;
   - короткий `manifest.json` с title/device/screenId.
4. Положить экспорт временно в `design-handoff/stitch/`.
5. Создать `design-handoff/mebeldocs-stitch-handoff.zip`.

В ZIP запрещено включать `.env*`, `.git`, `node_modules`, `.next`, `.open-next`,
дампы БД, cookies, реальные документы клиентов и секреты. После реализации ZIP не является
runtime-зависимостью и не должен попадать в production bundle.

## 5. Ритуал каждого этапа

OpenCode обязан выполнить все пункты:

1. Зафиксировать исходный commit SHA и чистоту worktree.
2. В `PROGRESS.html` отметить этап как `in_progress`.
3. Реализовать **только один** этап.
4. Добавить/обновить тесты пропорционально риску.
5. Выполнить обязательные команды проверки.
6. Провести Foundation Check.
7. Создать desktop и mobile скриншоты в
   `output/playwright/stage-XX/`.
8. Обновить `SESSION_NOTES.md`, `ROADMAP.md` и этот чек-лист.
9. Создать `reports/stage-XX-opencode-report.md`.
10. Commit: один логический этап, без чужих изменений.
11. Push текущей ветки.
12. Выполнить Cloudflare staging deployment.
13. Выполнить live smoke.
14. В `PROGRESS.html` поставить исполнителю `[x]`, записать URL и Worker version.
15. **Остановиться.** Не начинать следующий этап до verdict Codex и визуального
    решения владельца.

## 6. Общие запреты

- Не выполнять `git reset --hard`, массовое удаление или переписывание истории.
- Не выполнять обычный `supabase db push`: миграции 002–029 имеют исторический drift.
- Не менять production/staging target.
- Не изменять/удалять реальные данные.
- Миграции только добавочные и обратимые; перед DDL требуется отдельная проверка.
- Не делать таблицы или Storage public.
- Service role только server-side.
- Не ослаблять RLS, tenant isolation, роли, аудит и идемпотентность.
- Не хранить деньги в `number`, float или строке тенге в БД.
- Не считать успешную сборку доказательством рабочего сценария.
- Не ставить галочку Codex review или Owner visual acceptance самостоятельно.

## 7. Обязательные проверки

Минимум для каждого этапа:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run test:security
npm audit --omit=dev
npm.cmd run build
npm.cmd run cf:build
```

Для auth/RLS/schema/import этапов дополнительно:

```powershell
npm.cmd run test:security:realdb
npm.cmd run test:e2e
```

Непройденную проверку нельзя скрывать. Указать команду, exit code, причину и влияние.

## 8. Этапы и тройная приёмка

Обозначения:

- `OC` — OpenCode реализовал и самопроверил.
- `CR` — Codex проверил фактический diff/тесты/deploy.
- `OV` — владелец визуально принял опубликованный этап.

### Stage 01 — единая продуктовая оболочка

- [ ] OC [ ] CR [ ] OV — dashboard, orders list/new/detail, documents, deadlines,
  settings, admin, import и MebelLegal используют одну дизайн-систему.
- [ ] OC [ ] CR [ ] OV — mobile navigation и responsive layout соответствуют Stitch.
- [ ] OC [ ] CR [ ] OV — loading/error/empty/focus состояния видимы и доступны.
- [ ] OC [ ] CR [ ] OV — desktop/mobile screenshots приложены.
- [ ] OC [ ] CR [ ] OV — staging deployment и live smoke выполнены.

Не менять бизнес-логику, schema или миграции.

### Stage 02 — законченная админка

- [ ] OC [ ] CR [ ] OV — список участников и статусы.
- [ ] OC [ ] CR [ ] OV — изменение роли с audit event.
- [ ] OC [ ] CR [ ] OV — disable/restore, запрет отключения последнего owner.
- [ ] OC [ ] CR [ ] OV — повторное приглашение и копирование ссылки.
- [ ] OC [ ] CR [ ] OV — cross-tenant и role tests.
- [ ] OC [ ] CR [ ] OV — deployment и тест реального invite flow.

### Stage 03 — законченный архивный импорт

- [ ] OC [ ] CR [ ] OV — история batch и детальная страница результата.
- [ ] OC [ ] CR [ ] OV — private download/signed URL с tenant check.
- [ ] OC [ ] CR [ ] OV — `processing/completed/failed`, безопасная компенсация ошибок.
- [ ] OC [ ] CR [ ] OV — заказ импортируется атомарно и повтор безопасен.
- [ ] OC [ ] CR [ ] OV — downloadable ZIP/manifest template.
- [ ] OC [ ] CR [ ] OV — E2E ZIP → preview → commit → order → file download.

### Stage 04 — рабочая надёжность заказов

- [ ] OC [ ] CR [ ] OV — несколько позиций в заказе.
- [ ] OC [ ] CR [ ] OV — изменения только новой версией/snapshot.
- [ ] OC [ ] CR [ ] OV — статусы и финализация/void документов.
- [ ] OC [ ] CR [ ] OV — статусы оплаты и закрытия заказа.
- [ ] OC [ ] CR [ ] OV — календарь выходных и праздников РК.
- [ ] OC [ ] CR [ ] OV — money/version/idempotency tests.

### Stage 05 — security и полный QA

- [ ] OC [ ] CR [ ] OV — новые real-DB RLS tests.
- [ ] OC [ ] CR [ ] OV — E2E critical path двух tenants.
- [ ] OC [ ] CR [ ] OV — accessibility desktop/mobile.
- [ ] OC [ ] CR [ ] OV — подтверждённые critical Supabase advisors устранены.
- [ ] OC [ ] CR [ ] OV — migration status согласован без массового repair.
- [ ] OC [ ] CR [ ] OV — полный preflight и deployment.

### Stage 06 — пилот и финальная передача

- [ ] OC [ ] CR [ ] OV — синтетическая pilot organization.
- [ ] OC [ ] CR [ ] OV — owner invite принят, пароль установлен.
- [ ] OC [ ] CR [ ] OV — demo archive импортирован end-to-end.
- [ ] OC [ ] CR [ ] OV — user/admin/import instructions готовы.
- [ ] OC [ ] CR [ ] OV — roadmap/status соответствуют факту.
- [ ] OC [ ] CR [ ] OV — финальный Cloudflare rollout и smoke report.

## 9. Формат отчёта OpenCode

Создавать `reports/stage-XX-opencode-report.md`:

```markdown
# OpenCode report — Stage XX

## Commit и deployment
- Base SHA:
- Result SHA:
- Branch:
- Cloudflare URL:
- Worker version:

## Реализовано
- требование → файлы → наблюдаемый результат

## Изменённые файлы
- путь — назначение изменения

## Миграции и данные
- что изменено;
- куда применено;
- как проверены RLS/grants;
- rollback/compensation.

## Автоматические проверки
| Команда | Exit | Результат |

## Ручные сценарии
| Сценарий | Desktop | Mobile | Доказательство |

## Визуальные артефакты
- screenshot paths;
- viewport;
- проверенный URL.

## Foundation Check
- tenant isolation;
- server auth;
- money;
- audit;
- versioning;
- idempotency;
- secrets/real data;
- запрещённые функции не добавлены.

## Известные ограничения и отклонения
- без рекламных формулировок;
- всё непроверенное перечислить.

## Запрос ревью
- конкретные зоны повышенного риска для Codex;
- вопросы владельцу только если блокируют решение.
```

## 10. Инструкция ревьюерам

### Codex

Проверяет diff, архитектуру, security, фактические тесты, миграции, deployment и
визуальные артефакты. Выдаёт `ПРИНЯТО`, `ПРИНЯТО С ЗАМЕЧАНИЯМИ` или
`ТРЕБУЕТСЯ ДОРАБОТКА`. Исправления выполняются отдельным commit.

### Perplexity

Допустим как дополнительный внешний аналитик для проверки полноты сценариев,
терминологии РК и поиска актуальной документации. Не передавать ему секреты,
реальные данные, закрытые URL, полный `.env` или service role. Его ответ не заменяет
code review, real-DB тесты или визуальную приёмку.

### Владелец

Открывает staging URL после каждого этапа и проверяет визуальный сценарий. Его решение
фиксируется в `SESSION_NOTES.md` и колонке `OV`.

## 11. Правило остановки

OpenCode обязан остановиться, если:

- требуется destructive migration или изменение реальных данных;
- обнаружен конфликт с `FOUNDATION.md`;
- непонятно, staging это или production;
- тесты показывают cross-tenant доступ, потерю истории или денежную ошибку;
- нужного Stitch-экрана нет в handoff;
- следующий шаг расширяет этап;
- deployment завершился неуспешно.

В остальных случаях OpenCode делает разумный минимальный выбор, документирует его и
заканчивает текущий этап.

