# Stitch handoff

Главный источник требований:
[`OPENCODE_FULL_PROJECT_INSTRUCTIONS.md`](../../OPENCODE_FULL_PROJECT_INSTRUCTIONS.md).

`manifest.json` перечисляет только утверждённые экраны. Если OpenCode не имеет доступа
к Stitch, владелец или ревьюер экспортирует для каждого ID:

- `<screen-id>.html`;
- `<screen-id>.png`.

После экспорта архив создаётся из содержимого `design-handoff/stitch/`, но не из корня
репозитория. Это предотвращает попадание секретов, сборок и реальных данных.

Пример PowerShell из корня проекта:

```powershell
Compress-Archive -Path design-handoff\stitch\* `
  -DestinationPath design-handoff\mebeldocs-stitch-handoff.zip -Force
```

Не коммитить ZIP без необходимости: HTML/PNG могут быть большими и являются только
дизайн-референсом, а не runtime-зависимостью.
