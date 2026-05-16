# Деплой Farm Builder в Telegram

## Шаг 1 — Создайте бота (@BotFather)

1. Откройте [@BotFather](https://t.me/BotFather) → `/newbot`
2. Имя: `Farm Builder`, username: например `YourFarmBuilderBot`
3. Скопируйте **токен** в `.env`:

```env
BOT_TOKEN=123456789:AAH...
BOT_USERNAME=YourFarmBuilderBot
```

4. `/newapp` → выберите бота → название **Farm Builder** → short name **`farm`**
5. Загрузите иконку 640×640 (можно временно любую PNG)
6. URL приложения укажете после деплоя (шаг 3)

## Шаг 2 — Публичный HTTPS

Mini App и webhook **требуют HTTPS**. Выберите один вариант.

### A) Локально + Cloudflare Tunnel (быстрый тест)

```powershell
# Терминал 1 — сервер
cd C:\Windows\Temp\farm-builder
npm install
npm run build
npm run dev

# Терминал 2 — туннель (установите cloudflared)
cloudflared tunnel --url http://localhost:3000
```

Скопируйте URL вида `https://xxxx.trycloudflare.com` в `.env`:

```env
WEBAPP_URL=https://xxxx.trycloudflare.com
```

### B) Render.com (постоянный хостинг, бесплатный tier)

1. Залейте репозиторий на GitHub
2. [render.com](https://render.com) → New → Web Service → подключите репо
3. Build: `npm install && npm run build`, Start: `npm start`
4. Environment: `BOT_TOKEN`, `WEBHOOK_SECRET`, `WEBAPP_URL=https://your-app.onrender.com`
5. После деплоя `WEBAPP_URL` = URL сервиса Render

## Шаг 3 — Настройка Telegram одной командой

```powershell
cd C:\Windows\Temp\farm-builder
copy .env.example .env
# заполните BOT_TOKEN и WEBAPP_URL

npm run setup:telegram
```

Скрипт выставит команды, кнопку меню «Открыть ферму», webhook.

## Шаг 4 — Проверка в Telegram

| Действие | Ожидание |
|----------|----------|
| `/start` | Фото + кнопка «ЗАПУСТИТЬ ФЕРМУ» |
| Кнопка меню внизу | Открывается Mini App |
| `t.me/БОТ/farm` | Direct link Mini App |
| Посадить морковь → 30 сек | «Урожай готов!» в чате |
| `/balance` | Монеты и статус грядки |
| `/harvest` | Сбор урожая вне Mini App |

Health-check: откройте в браузере `https://ВАШ_HOST/api/health` → `{"ok":true}`

## Шаг 5 — Публикация на appss

См. [APPSS-SUBMIT-RU.md](./APPSS-SUBMIT-RU.md)
