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
```

По умолчанию запросы идут на `/api/...` того же хоста, что и фронт; Next.js проксирует их на backend (`API_PROXY_TARGET`, обычно `http://127.0.0.1:8000`). Явный `NEXT_PUBLIC_API_URL` нужен, если API открыт на другом origin и вы не используете прокси.

Авторизация в web-клиенте работает через HttpOnly-cookie, которые выставляет backend (`/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, OAuth callback).  
Токены в `localStorage` не используются.

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

Backend должен быть запущен (например, `docker compose up` из корня репозитория или `php -S` из `backend/`). Без API при регистрации/входе будет ошибка сети.

Если задан `NEXT_PUBLIC_API_URL`, браузер ходит на него напрямую (нужен корректный `CORS_ALLOW_ORIGIN` на backend). Если переменная не задана, используется прокси Next.js — CORS для этого сценария не нужен.

Для сценария OAuth (например, VK) на backend должны быть настроены `VK_CLIENT_ID`, `VK_CLIENT_SECRET`, `VK_REDIRECT_URI`.

## Маршруты приложения

| Путь | Назначение |
|------|------------|
| `/` | Главная, ссылки на разделы |
| `/auth/login`, `/auth/register` | Вход и регистрация |
| `/auth/login` (кнопка VK) | Старт OAuth VK через backend `/api/auth/oauth/vk/start` |
| `/dashboard` | Личный кабинет и статистика |
| `/theory` | Теория по темам |
| `/practice` | Практика (режимы объяснения / интерактив / проверка) |
| `/exam` | Проверочная работа |

## Примечание про ESLint

Если `npm run lint` падает с ошибкой вида «Converting circular structure to JSON» в `.eslintrc.json`, это проблема конфигурации/версий ESLint в окружении, а не обязательно ошибки в исходниках. Проверяйте также диагностику IDE.

## Дополнительно

- [Next.js Documentation](https://nextjs.org/docs)
- Общая документация проекта: [../README.md](../README.md)
