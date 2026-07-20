# AGENTS.md — MebelLegal KZ

## Инструкции для AI-кодеров

### Обязательное чтение

Перед любой задачей прочитать:

1. **[FOUNDATION.md](./FOUNDATION.md)** — обязательный архитектурный договор проекта
2. `FIRST_STAGE_INSTRUCTION_MEBELLEGAL_KZ.md` — инструкция этапа 0–1

### Подтверждение перед работой

Перед началом задачи кодер должен включить в план строку:

> `FOUNDATION.md` прочитан. Для текущей задачи применимы разделы: [перечислить]. Конфликтов с фундаментом: [нет / описать].

### Foundation Check после работы

В конце каждой задачи кодер добавляет в `SESSION_NOTES.md`:

```markdown
### Foundation Check

- [ ] Границы MebelLegal KZ / Interactive KP / MebelDocs AI не нарушены.
- [ ] Tenant isolation и RLS сохранены/проверены.
- [ ] Серверная авторизация присутствует.
- [ ] Деньги не хранятся в float/JavaScript number.
- [ ] State transitions выполняются доменной командой.
- [ ] Юридически значимые действия идемпотентны.
- [ ] Audit log дополнен и остаётся append-only.
- [ ] Подтверждённые данные не перезаписываются, а версионируются.
- [ ] AI не выполняет запрещённые решения.
- [ ] В Git, логах и fixtures нет реальных данных и секретов.
- [ ] Добавлены unit/integration/security/contract tests по риску изменения.
- [ ] Изменение соответствует разрешённому текущему этапу.
```

### Правило коммитов

**После завершения каждого логического блока работы — коммитить и пушить.**
Блок = миграции, модули, UI, тесты одного этапа. Не копить изменения в working tree.
Пуш выполняется перед запуском валидации и перед передачей этапа на принятие.

### Технологический стек

- Next.js 16 (App Router)
- React 19
- TypeScript strict
- Supabase PostgreSQL + Auth + RLS
- Zod
- Vitest
- ESLint

### Принципы

1. **Tenant isolation** — `organization_id` + RLS везде.
2. **Доменные команды** — изменения через проверяемые команды.
3. **Append-only audit** — история не перезаписывается.
4. **Идемпотентность** — повтор не создаёт дубль.
5. **Деньги в тийинах** — bigint, не float/number.

### Запреты

- Нет прямого доступа к таблицам соседней системы;
- Нет пользовательской таблицы без RLS;
- Нет денег в float/JavaScript number;
- Нет тихого изменения или удаления истории;
- Нет публикации правила или шаблона без человека;
- Нет AI как единственного механизма юридического решения;
- Нет реальных договоров и реквизитов в Git;
- Нет service role в браузере;
- Нет повторной юридически значимой операции при повторном запросе.

### Структура проекта

```
src/
├── app/                    # Next.js App Router
├── modules/
│   ├── identity/           # Аутентификация
│   ├── organizations/      # Организации и участники
│   ├── cases/              # Юридические кейсы
│   ├── audit/              # Audit log
│   └── shared/             # Общие типы
├── lib/
│   ├── supabase/           # Клиенты Supabase
│   └── errors/             # Стандартизированные ошибки
```

### Команды CI

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:security
npm run build
```

Все команды должны завершаться успешно.

---

### Environment constraint

**Never use a working directory or file path containing Cyrillic or other non-ASCII characters.**

If the current project path contains non-ASCII characters, **stop immediately** and instruct the user to move the repo to an ASCII-only path (e.g. `C:\work\mebel-legal-kz`) before continuing.

All automation scripts, CLI wrappers, and coding agents must run only from ASCII-safe directories. Non-ASCII paths break:
- `wrangler dev` / `wrangler deploy`
- `opennextjs-cloudflare build`
- PowerShell `Select-String`, `Get-ChildItem -LiteralPath`
- `robocopy` and other Windows CLI tools
- Node.js `require()` / `import()` resolution

---

## Working Agreement for coder (Coder Bounded Execution Rule)

Обязательно для исполнения на каждом этапе.

### 1. Нет широкого исследования по умолчанию

- НЕ начинать с «Let me first explore the current codebase».
- НЕ сканировать весь репозиторий, если задача не требует discovery.
- Если контекст не хватает — **стоп и назвать** точный отсутствующий файл/модуль/инвариант.

### 2. Bounded execution для задач

Читать **только**:

1. `FOUNDATION.md`
2. `ROADMAP.md`
3. `SESSION_NOTES.md`
4. Файлы, явно перечисленные в задаче.

Первый вывод — план (макс. 7 пунктов). Затем — реализация **только** в пределах допустимого scope.

Нет рефакторингов вне scope, нет глобальной чистки, нет переписывания архитектуры.

### 3. Инварианты

- Границы систем не нарушать.
- RLS и tenant isolation сохранять.
- Audit log — append-only.
- Money и доменные правила — без изменений.
- AI/LLM — не добавлять туда, где запрещено.

### 4. Блокеры

Если контекста нет — **не расширять scope**. Вместо этого:

> Blocked: нужен `src/.../file.ts` для безопасного расширения существующего union-типа.

### 5. Повтор для каждого этапа

Для каждого нового этапа:

1. Вспомнить Coder Bounded Execution Rule.
2. Прочитать только stage-related заметки.
3. Применить bounded execution к задачам этапа.
