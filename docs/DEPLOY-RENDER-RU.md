# Постоянный хост на Render (ПК можно выключить)

Render даёт бесплатный HTTPS-URL вида `https://farm-builder-xxxx.onrender.com`. Бот и Mini App работают 24/7 без туннелей и VPN.

> **VPN:** на локальном ПК Cloudflare Tunnel часто ломается — на Render это не важно.

## 1. GitHub

```powershell
cd C:\Windows\Temp\farm-builder
git add .
git commit -m "Farm Builder MVP"
```

Создайте репозиторий на https://github.com/new (без README), затем:

```powershell
git remote add origin https://github.com/FghOstlyX/farm-builder.git
git push -u origin main
```

## 2. Render

1. https://dashboard.render.com → **New +** → **Blueprint**
2. Подключите репозиторий `farm-builder`
3. Render прочитает `render.yaml`
4. При создании введите **BOT_TOKEN** (из @BotFather)
5. **Create resources** → дождитесь Deploy (5–10 мин)

После деплоя скопируйте URL сервиса, например:
`https://farm-builder-abc1.onrender.com`

## 3. Переменные (если нужно поправить)

В Render → сервис → **Environment**:

| Key | Value |
|-----|--------|
| `BOT_TOKEN` | токен бота |
| `BOT_USERNAME` | `MyFarmBuilderBot` |
| `WEBAPP_URL` | `https://farm-builder-abc1.onrender.com` (ваш URL **без** слэша в конце) |
| `AUTO_SETUP_TELEGRAM` | `true` |

При `AUTO_SETUP_TELEGRAM=true` webhook и кнопка меню настраиваются при старте.

Если `WEBAPP_URL` из Blueprint не подхватился — задайте вручную полный HTTPS-URL.

## 4. BotFather (один раз)

**Configure Mini App** → URL:

```
https://farm-builder-abc1.onrender.com/miniapp
```

(подставьте свой Render-URL)

## 5. Проверка

- https://ВАШ-URL.onrender.com/api/health → `{"ok":true}`
- Telegram → @MyFarmBuilderBot → `/start` → «ЗАПУСТИТЬ ФЕРМУ»
- Должны появиться **💰 100** и кнопка «Посадить морковь»

## 6. appss.pro

Стабильная ссылка для каталога:

```
https://t.me/MyFarmBuilderBot/farm
```

Скриншоты и тексты — [APPSS-SUBMIT-RU.md](./APPSS-SUBMIT-RU.md)

## Замечания

- **Free tier** засыпает после ~15 мин без трафика; первый запрос 30–60 сек. Для продакшена — платный план Render.
- Данные фермы в JSON на бесплатном диске могут сброситься при redeploy — для продакшена позже подключите Postgres.
