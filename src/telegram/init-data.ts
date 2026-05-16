import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ValidatedInitData {
  user: TelegramWebAppUser;
  authDate: number;
  startParam?: string;
  queryId?: string;
}

/** Validates Telegram.WebApp.initData per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86_400,
): ValidatedInitData | null {
  const token = botToken.trim();
  const params = new URLSearchParams(initData.trim());
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();

  const calculated = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  try {
    const a = Buffer.from(calculated, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    return null;
  }

  const userRaw = params.get("user");
  if (!userRaw) return null;

  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    return null;
  }

  if (!user?.id) return null;

  return {
    user,
    authDate,
    startParam: params.get("start_param") ?? undefined,
    queryId: params.get("query_id") ?? undefined,
  };
}
