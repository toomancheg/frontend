# Phystrainer — Frontend (Next.js)

Клиентское приложение для сервиса тренировки физики: регистрация/вход, личный кабинет, теория, практика, экзамен.

## Требования

- Node.js 18+ (рекомендуется LTS)
- npm (или совместимый менеджер пакетов)

## Установка и запуск

Из **этой** папки (`frontend/`), не из родительской `homeproj/`:

```bash
cd frontend
npm install
```

Переменные окружения (опционально):

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

Запуск dev-сервера:

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Режим разработки |
| `npm run build` | Production-сборка |
| `npm run start` | Запуск после `build` |
| `npm run lint` | ESLint (при ошибке конфигурации см. примечание ниже) |

## Связь с API

Браузер обращается к backend по адресу из `NEXT_PUBLIC_API_URL` (по умолчанию в коде — `http://localhost:8000`). Убедитесь, что Symfony API запущен и CORS разрешает origin фронтенда (`CORS_ALLOW_ORIGIN` в `backend/.env` или переменные compose).

## Маршруты приложения

| Путь | Назначение |
|------|------------|
| `/` | Главная, ссылки на разделы |
| `/auth/login`, `/auth/register` | Вход и регистрация |
| `/dashboard` | Личный кабинет и статистика |
| `/theory` | Теория по темам |
| `/practice` | Практика (режимы объяснения / интерактив / проверка) |
| `/exam` | Проверочная работа |

## Примечание про ESLint

Если `npm run lint` падает с ошибкой вида «Converting circular structure to JSON» в `.eslintrc.json`, это проблема конфигурации/версий ESLint в окружении, а не обязательно ошибки в исходниках. Проверяйте также диагностику IDE.

## Дополнительно

- [Next.js Documentation](https://nextjs.org/docs)
- Общая документация проекта: [../README.md](../README.md)
