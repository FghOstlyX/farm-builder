/**
 * One-shot Telegram setup: commands, menu button (Mini App), webhook.
 * Usage: npx tsx scripts/setup-telegram.ts
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const token = process.env.BOT_TOKEN;
let webappUrl = process.env.WEBAPP_URL?.replace(/\/$/, "");
let webhookSecret = process.env.WEBHOOK_SECRET;

if (!token) {
  console.error("❌ BOT_TOKEN missing in .env");
  process.exit(1);
}

if (!webappUrl) {
  console.error("❌ WEBAPP_URL missing — нужен публичный HTTPS (ngrok / Render / Cloudflare Tunnel)");
  process.exit(1);
}

const envPath = resolve(process.cwd(), ".env");

if (!webhookSecret) {
  webhookSecret = randomBytes(16).toString("hex");
  console.log(`Generated WEBHOOK_SECRET=${webhookSecret}`);
  upsertEnv("WEBHOOK_SECRET", webhookSecret);
}

const miniappUrl = `${webappUrl}/miniapp`;
const webhookUrl = `${webappUrl}/webhook/${webhookSecret}`;

async function api(method: string, body?: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!data.ok) {
    throw new Error(`${method}: ${data.description ?? "unknown error"}`);
  }
  return data.result;
}

function upsertEnv(key: string, value: string) {
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  content = re.test(content)
    ? content.replace(re, line)
    : content
      ? `${content.trim()}\n${line}\n`
      : `${line}\n`;
  writeFileSync(envPath, content);
}

async function main() {
  const me = (await api("getMe")) as { username: string; first_name: string };
  console.log(`✅ Bot: @${me.username} (${me.first_name})`);

  if (!process.env.BOT_USERNAME) {
    upsertEnv("BOT_USERNAME", me.username);
    console.log(`   Saved BOT_USERNAME=${me.username}`);
  }

  await api("setMyCommands", {
    commands: [
      { command: "start", description: "Начать / приветствие" },
      { command: "farm", description: "Открыть ферму" },
      { command: "balance", description: "Баланс монет" },
      { command: "harvest", description: "Собрать урожай удалённо" },
    ],
  });
  console.log("✅ Commands set");

  await api("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "🌾 Открыть ферму",
      web_app: { url: miniappUrl },
    },
  });
  console.log(`✅ Menu button → ${miniappUrl}`);

  await api("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query", "pre_checkout_query"],
    drop_pending_updates: true,
  });
  console.log(`✅ Webhook → ${webhookUrl}`);

  const shortName = process.env.MINI_APP_SHORT_NAME ?? "farm";
  console.log("\n--- Ручной шаг в @BotFather ---");
  console.log("1. /mybots → ваш бот → Bot Settings → Configure Mini App");
  console.log(`2. Short name: ${shortName} (ссылка t.me/${me.username}/${shortName})`);
  console.log(`3. Web App URL: ${miniappUrl}`);
  console.log(`4. Direct link: https://t.me/${me.username}/${shortName}`);
  console.log("\n--- Проверка ---");
  console.log(`Откройте бота: https://t.me/${me.username}`);
  console.log(`Mini App: https://t.me/${me.username}/${shortName}`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
