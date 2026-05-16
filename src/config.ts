import "dotenv/config";

function env(name: string, fallback?: string): string {
  return process.env[name] ?? fallback ?? "";
}

function resolveWebappUrl(): string {
  let url =
    env("WEBAPP_URL") ||
    env("RENDER_EXTERNAL_URL") ||
    (process.env.RENDER ? env("RENDER_SERVICE_URL") : "");
  if (!url) return "http://localhost:3000";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/$/, "");
}

export const config = {
  botToken: env("BOT_TOKEN"),
  botUsername: env("BOT_USERNAME", "farmbuilderbot"),
  webappUrl: resolveWebappUrl(),
  webhookSecret: env("WEBHOOK_SECRET", "dev-secret"),
  miniAppShortName: env("MINI_APP_SHORT_NAME", "farm"),
  port: Number(process.env.PORT ?? 3000),
  databasePath: env("DATABASE_PATH", "./data/farm.json"),
  referralBonusCoins: Number(process.env.REFERRAL_BONUS_COINS ?? 50),
};

export function assertConfig(): void {
  if (!config.botToken) {
    throw new Error("Missing BOT_TOKEN — copy .env.example to .env");
  }
  if (
    process.env.NODE_ENV === "production" &&
    !config.webappUrl.startsWith("https://")
  ) {
    throw new Error("WEBAPP_URL must be HTTPS in production");
  }
}

export function miniAppUrl(startParam?: string): string {
  const base = `https://t.me/${config.botUsername}/${config.miniAppShortName}`;
  return startParam ? `${base}?startapp=${encodeURIComponent(startParam)}` : base;
}

export function webAppDirectLink(startParam?: string): string {
  const path = startParam
    ? `?startapp=${encodeURIComponent(startParam)}`
    : "";
  return `${config.webappUrl}/miniapp/${path}`;
}
