export interface FarmSnapshot {
  coins: number;
  hasWarehouse: boolean;
  cropStatus: "empty" | "growing" | "ready";
  cropProgress: number;
  carrotsHarvestedToday: number;
  growRemainingMs: number;
}

export interface MeResponse {
  userId: number;
  farm: FarmSnapshot;
  shareLink: string;
  referralBonus: number;
  costs: { warehouse: number; carrotGrowMs: number };
}

const API_ROOT = new URL("../api", window.location.href).pathname.replace(/\/$/, "");

const ERROR_LABELS: Record<string, string> = {
  missing_init_data: "Нет данных авторизации Telegram",
  invalid_init_data: "Ошибка авторизации — перезапустите Mini App",
  insufficient_coins: "Недостаточно монет",
  warehouse_exists: "Склад уже построен",
  crop_growing: "Урожай ещё растёт",
  nothing_planted: "Сначала посадите морковь",
  not_ready: "Урожай ещё не созрел",
};

async function api<T>(
  path: string,
  initData: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
      ...init?.headers,
    },
    body:
      init?.method === "POST"
        ? JSON.stringify({ initData, ...(init.body ? JSON.parse(String(init.body)) : {}) })
        : init?.body,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const code = body.error ?? res.statusText;
    throw new Error(ERROR_LABELS[code] ?? code);
  }
  return res.json() as Promise<T>;
}

export function fetchMe(initData: string): Promise<MeResponse> {
  return api<MeResponse>("/me", initData);
}

export function buildWarehouse(initData: string): Promise<{ farm: FarmSnapshot }> {
  return api("/build/warehouse", initData, { method: "POST" });
}

export function plantCarrot(initData: string): Promise<{ farm: FarmSnapshot }> {
  return api("/plant/carrot", initData, { method: "POST" });
}

export function harvest(initData: string): Promise<{ farm: FarmSnapshot; reward: number }> {
  return api("/harvest", initData, { method: "POST" });
}
