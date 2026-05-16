# Создание бота за 5 минут (@BotFather)

## 1. Новый бот

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте: `/newbot`
3. **Display name:** `Farm Builder`
4. **Username:** должен заканчиваться на `bot`, например `MyFarmBuilderBot`
5. Скопируйте **HTTP API token** (формат `123456789:AAH...`)

## 2. Mini App

1. `/newapp` → выберите созданного бота
2. **Title:** Farm Builder
3. **Description:** Строй ферму, собирай урожай
4. **Photo:** любая картинка 640×640 (иконка)
5. **Demo GIF:** `/empty` (можно пропустить)
6. **Short name:** `farm` (важно — для ссылки `t.me/бот/farm`)
7. **Web App URL:** пока `https://example.com` — замените после деплоя

## 3. Токен в проект

```powershell
cd C:\Windows\Temp\farm-builder
copy .env.example .env
notepad .env
```

Заполните:

```env
BOT_TOKEN=вставьте_токен_сюда
BOT_USERNAME=MyFarmBuilderBot
```

Сохраните файл и напишите в чат: **«токен в .env»** — запустим деплой автоматически.

## 4. Описание и команды (опционально)

В BotFather:

- `/setdescription` → «Строй ферму, выращивай урожай, зарабатывай монеты»
- `/setabouttext` → «Farm Builder — фермерский симулятор в Telegram»
- `/setuserpic` → загрузите иконку 512×512

Команды и webhook выставит скрипт `npm run setup:telegram`.
