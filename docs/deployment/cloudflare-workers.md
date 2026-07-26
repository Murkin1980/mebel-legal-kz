# Cloudflare Workers runbook

Цель: `https://mebel-legal-kz.muriktl.workers.dev`.

## Перед релизом

1. Убедиться, что ветка и commit соответствуют согласованному релизу.
2. Проверить `NEXT_PUBLIC_APP_ENV=staging`.
3. Проверить наличие encrypted `SUPABASE_SERVICE_ROLE_KEY`, не выводя значение.
4. Проверить применённые версии в `docs/MIGRATION_STATUS.md`.
5. Выполнить:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run cf:build
```

Production bundle предпочтительно собирать в Cloudflare Builds/Linux. Windows-сборка годится
для локальной проверки, но OpenNext предупреждает о неполной совместимости Windows.

## Переменные

| Переменная | Видимость |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public, build-time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public, build-time |
| `NEXT_PUBLIC_APP_ENV` | public, `staging` |
| `SUPABASE_SERVICE_ROLE_KEY` | encrypted server secret |

## Деплой

```powershell
npm run cf:deploy
```

Не переключать production/staging Supabase и не менять Auth redirect URLs в рамках обычного
frontend-релиза.

## Smoke-check

- `/` — 200, публичный лендинг без редиректа на login;
- `/login` — 200;
- неавторизованный `/app/orders` переводит на login;
- вход тестовой учётной записью;
- `/app/orders`, `/app/orders/new`, `/app/settings/documents`;
- создание синтетического заказа;
- создание счёта и акта;
- PDF начинается с `%PDF`, DOCX с `PK`;
- сроки создают 4 вычисляемых напоминания;
- в консоли браузера нет product errors;
- в client JS/network нет service-role key.

## Rollback

1. Вернуть предыдущую Cloudflare Worker version.
2. Не откатывать добавочные таблицы автоматически: старый код их игнорирует.
3. Если новый код записал тестовые данные, оставить их до отдельного согласованного cleanup.
4. Зафиксировать причину и version id в `SESSION_NOTES.md`.

## Известные ограничения

- исторический Supabase migration drift 002–029;
- текущая форма заказа создаёт одну позицию, хотя схема поддерживает несколько;
- формы счёта/акта требуют юридической и бухгалтерской приёмки;
- пользовательские данные и production rollout не входят в smoke-test.
