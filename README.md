# MebelLegal KZ

**Правовой контур для мебельного бизнеса Республики Казахстан**

[![CI](https://github.com/Murkin1980/mebel-legal-kz/actions/workflows/ci.yml/badge.svg)](https://github.com/Murkin1980/mebel-legal-kz/actions/workflows/ci.yml)

---

## ⚠️ ВАЖНО

**Этап 1. Юридические документы и проверка законодательства ещё не подключены.**

Система на первом этапе **не заменяет юриста**, **не гарантирует законность документа** и **не обещает исход судебного спора**.

---

## Назначение

MebelLegal KZ — правовой контур для мебельного бизнеса Республики Казахстан.

Система должна помогать:

- подготовить комплект документов мебельного заказа;
- проверить комплектность и известные риски;
- связать вывод с утверждённым официальным источником;
- зафиксировать конкретную версию договора, спецификации и эскиза;
- получить и доказуемо сохранить решение клиента;
- контролировать изменения заказа;
- передать утверждённые данные в соседние системы.

## Архитектура

- **Модульный монолит** на Next.js 16 (App Router) + Supabase PostgreSQL
- Мультитенантность через `organization_id` + Row Level Security
- Доменные команды с проверкой ролей и идемпотентностью
- Append-only audit log
- Деньги в тийинах (bigint)

## Структура проекта

```
src/
├── app/                    # Next.js App Router
│   ├── login/              # Экран входа
│   └── app/                # Основное приложение
│       ├── cases/          # Управление кейсами
│       └── audit/          # Журнал событий
├── modules/
│   ├── identity/           # Аутентификация
│   ├── organizations/      # Организации и участники
│   ├── cases/              # Юридические кейсы
│   ├── audit/              # Audit log
│   └── shared/             # Общие типы (Money, ошибки)
├── lib/
│   ├── supabase/           # Клиенты Supabase
│   └── errors/             # Стандартизированные ошибки
supabase/
└── migrations/             # SQL миграции
tests/
├── unit/                   # Unit тесты
├── integration/            # Integration тесты
└── security/               # Security тесты (RLS)
```

## Быстрый старт

```bash
# Клонировать репозиторий
git clone https://github.com/Murkin1980/mebel-legal-kz.git
cd mebel-legal-kz

# Установить зависимости
npm install

# Скопировать переменные окружения
cp .env.example .env.local

# Заполнить Supabase credentials в .env.local

# Выполнить миграции в Supabase Dashboard

# Запустить разработку
npm run dev
```

## Команды

```bash
npm run lint           # Линтер
npm run typecheck      # Проверка типов
npm run test           # Unit тесты
npm run test:integration  # Integration тесты
npm run test:security  # Security тесты (RLS)
npm run build          # Сборка проекта
```

## Технологии

- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Supabase PostgreSQL + Auth + RLS
- Zod (валидация)
- Vitest (тесты)
- ESLint

## Документация

| Документ | Назначение |
|---|---|
| [FOUNDATION.md](./FOUNDATION.md) | **Обязательный архитектурный договор проекта** |
| [PRODUCT.md](./PRODUCT.md) | Описание продукта |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Архитектурные решения |
| [COMPLIANCE.md](./COMPLIANCE.md) | Правовые ограничения |
| [SECURITY.md](./SECURITY.md) | Модель безопасности |
| [ROADMAP.md](./ROADMAP.md) | Дорожная карта |
| [CHECKLISTS.md](./CHECKLISTS.md) | Чек-листы этапов |
| [AI_INFRA_DECISION.md](./AI_INFRA_DECISION.md) | Решения по AI |
| [SESSION_NOTES.md](./SESSION_NOTES.md) | Заметки сессий |

## Границы систем

| Система | Владеет |
|---|---|
| **MebelLegal KZ** | Правовые источники, правила, шаблоны, кейсы, договоры, согласования, audit log |
| **Interactive KP** | Коммерческие предложения, варианты комплектации |
| **MebelDocs AI** | Счета, платежи, бухгалтерские документы, ЭСФ |

**Запрещён прямой доступ одной системы к таблицам другой.**

## Лицензия

Проприетарный проект. Все права защищены.
