export interface PlotSnapshot {
  cropId: string | null;
  cropName: string | null;
  emoji: string | null;
  status: "empty" | "growing" | "ready";
  progress: number;
  growRemainingMs: number;
}

export interface FarmSnapshot {
  coins: number;
  hasWarehouse: boolean;
  plot: PlotSnapshot;
  inventory: Record<string, number>;
  unlockedCrops: string[];
  selectedCrop: string;
  harvestedToday: number;
}

export interface ShopCropView {
  id: string;
  name: string;
  emoji: string;
  unlocked: boolean;
  unlockPrice: number;
  seedPrice: number;
  sellPrice: number;
  growSec: number;
  inStock: number;
}

export interface MeResponse {
  userId: number;
  farm: FarmSnapshot;
  shop: ShopCropView[];
  shareLink: string;
}

const API_ROOT = new URL("../api", window.location.href).pathname.replace(/\/$/, "");

const ERROR_LABELS: Record<string, string> = {
  missing_init_data: "Нет авторизации Telegram",
  invalid_init_data: "Сессия устарела — закройте и откройте Mini App снова",
  insufficient_coins: "Недостаточно монет",
  warehouse_exists: "Склад уже построен",
  crop_growing: "Урожай ещё растёт",
  harvest_first: "Сначала соберите урожай",
  nothing_planted: "Грядка пуста",
  not_ready: "Ещё не созрело",
  crop_locked: "Культура не разблокирована",
  not_enough_stock: "Недостаточно на складе",
  already_unlocked: "Уже разблокировано",
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function api<T>(
  path: string,
  initData: string,
  init?: RequestInit,
): Promise<T> {
  const method = init?.method ?? "GET";
  const body =
    method === "POST"
      ? JSON.stringify({
          initData,
          ...(init?.body ? JSON.parse(String(init.body)) : {}),
        })
      : undefined;

  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(`${API_ROOT}${path}`, {
        ...init,
        method,
        body,
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Init-Data": initData,
          ...init?.headers,
        },
        signal: AbortSignal.timeout(45_000),
      });

      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error("server_wakeup");
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        const code = payload.error ?? res.statusText;
        throw new Error(ERROR_LABELS[code] ?? code);
      }

      return (await res.json()) as T;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error("network");
      const retryable =
        lastErr.message === "server_wakeup" ||
        lastErr.name === "TimeoutError" ||
        lastErr.message === "Failed to fetch";
      if (!retryable || attempt === 5) break;
      await sleep(1500 * (attempt + 1));
    }
  }

  throw lastErr ?? new Error("network");
}

export function fetchMe(initData: string): Promise<MeResponse> {
  return api<MeResponse>("/me", initData);
}

export function selectCrop(initData: string, cropId: string): Promise<MeResponse> {
  return api<MeResponse>("/select-crop", initData, {
    method: "POST",
    body: JSON.stringify({ cropId }),
  });
}

export function buildWarehouse(initData: string): Promise<MeResponse> {
  return api<MeResponse>("/build/warehouse", initData, { method: "POST" });
}

export function plant(initData: string, cropId?: string): Promise<MeResponse> {
  return api<MeResponse>("/plant", initData, {
    method: "POST",
    body: JSON.stringify(cropId ? { cropId } : {}),
  });
}

export function harvest(initData: string): Promise<MeResponse> {
  return api<MeResponse>("/harvest", initData, { method: "POST" });
}

export function unlockCrop(initData: string, cropId: string): Promise<MeResponse> {
  return api<MeResponse>("/shop/unlock", initData, {
    method: "POST",
    body: JSON.stringify({ cropId }),
  });
}

export function sellCrop(initData: string, cropId: string, qty = 1): Promise<MeResponse> {
  return api<MeResponse>("/shop/sell", initData, {
    method: "POST",
    body: JSON.stringify({ cropId, qty }),
  });
}
