# Farm Builder — Telegram MVP Starter

Deployable **Bot + Mini App** starter for a farming simulator on Telegram (Node.js / TypeScript).

## What's included

| Spec section | Implementation |
|--------------|----------------|
| Bot `/start`, `/farm`, `/balance`, `/harvest` | `src/telegram/bot.ts` |
| Welcome + inline Web App buttons | `keyboards.ts`, `messages.ts` |
| `sendChatAction` + message edit ("Строю склад...") | `build_warehouse` callback |
| Webhook updates | `POST /webhook/:secret` |
| `initData` HMAC validation | `src/telegram/init-data.ts` + API middleware |
| Mini App (2.5D isometric canvas) | `miniapp/` |
| Telegram `MainButton` | `miniapp/main.ts` |
| SQLite progress | `src/db/`, `src/game/` |
| Stars invoice stub (`XTR`) | `src/telegram/payments.ts` |
| Referral `?startapp=friend{userId}` | `config.miniAppUrl`, `/api/me` |
| Harvest push notifications | `src/jobs/harvest-notify.ts` |

**Out of V1** (not implemented): player trading, guilds, seasons, DeFi, full 3D.

## Быстрый деплой (Windows)

1. Создайте бота: [docs/BOTFATHER-SETUP-RU.md](docs/BOTFATHER-SETUP-RU.md)
2. Вставьте `BOT_TOKEN` в `.env`
3. Запустите:

```powershell
cd C:\Windows\Temp\farm-builder
.\scripts\deploy-local.ps1
```

Скрипт поднимет сервер, Cloudflare Tunnel (HTTPS), настроит webhook и кнопку меню.

**Постоянный хост (ПК выключен):** [docs/DEPLOY-RENDER-RU.md](docs/DEPLOY-RENDER-RU.md)

Публикация в каталог: [docs/APPSS-SUBMIT-RU.md](docs/APPSS-SUBMIT-RU.md)

---

## Quick start

### 1. BotFather

1. Create bot via [@BotFather](https://t.me/BotFather)
2. Set commands: `npm run set-webhook` after `.env` is filled, or manually paste from `src/telegram/bot.ts`
3. **Bot Settings → Menu Button → Configure Mini App** → URL: `https://YOUR_HOST/miniapp`
4. **Bot Settings → Mini Apps → Enable** → create app short name `farm` (Direct Link: `t.me/YourBot/farm`)

### 2. Environment

```bash
cp .env.example .env
# Edit BOT_TOKEN, WEBAPP_URL (public HTTPS), WEBHOOK_SECRET
```

### 3. Run locally

```bash
npm install
npm run dev
```

Expose HTTPS (required for webhook & Mini App):

```bash
# Example: ngrok http 3000
# Set WEBAPP_URL=https://xxxx.ngrok-free.app
```

```bash
npm run build
npm run set-webhook
```

Open `https://t.me/YourBot/farm` in Telegram.

### 4. Production (Docker)

```bash
docker build -t farm-builder .
docker run -p 3000:3000 --env-file .env -v farm-data:/app/data farm-builder
npm run set-webhook
```

## Project layout

```
src/
  index.ts           # Express + webhook + static miniapp
  telegram/          # Bot handlers, initData, payments
  api/               # REST for Mini App (auth via initData header)
  game/              # Farm logic + SQLite repository
  jobs/              # "Урожай готов!" notifier
miniapp/             # Vite + Canvas isometric farm
scripts/set-webhook.ts
```

## API (Mini App)

All routes require header `X-Telegram-Init-Data` (from `Telegram.WebApp.initData`).

- `GET /api/me` — profile + farm snapshot + share link
- `POST /api/build/warehouse` — build warehouse (50 coins)
- `POST /api/plant/carrot` — plant (30s grow in MVP)
- `POST /api/harvest` — collect reward

## Referrals

Share link format: `t.me/farmbuilderbot/farm?startapp=friend123`

New users opening with that param receive `REFERRAL_BONUS_COINS` (default 50).

## Next steps

- Replace placeholder welcome image in `bot.ts`
- Wire Stars purchase to real speed boost in `payments.ts`
- Submit to [@appss](https://appss.pro/create-app) after bot is live
- Add inline mode for farm screenshots (viral loop)

## Docs

- [Bots](https://core.telegram.org/bots)
- [Mini Apps](https://core.telegram.org/bots/webapps)
- [Telegram Stars](https://core.telegram.org/bots/payments#telegram-stars)
