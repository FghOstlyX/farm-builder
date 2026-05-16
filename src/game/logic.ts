import type { FarmRow } from "../db/store.js";

export const GAME = {
  warehouseCost: 50,
  plantCost: 0,
  carrotGrowMs: 30_000,
  carrotReward: 15,
  warehouseBonus: 5,
  starterCoins: 100,
} as const;

export type CropStatus = "empty" | "growing" | "ready";

export function cropStatus(row: FarmRow, now = Date.now()): CropStatus {
  if (!row.carrot_planted_at) return "empty";
  const elapsed = now - row.carrot_planted_at;
  return elapsed >= GAME.carrotGrowMs ? "ready" : "growing";
}

export function cropProgress(row: FarmRow, now = Date.now()): number {
  if (!row.carrot_planted_at) return 0;
  return Math.min(1, (now - row.carrot_planted_at) / GAME.carrotGrowMs);
}

export function harvestReward(row: FarmRow): number {
  return GAME.carrotReward + (row.has_warehouse ? GAME.warehouseBonus : 0);
}

export interface FarmSnapshot {
  coins: number;
  hasWarehouse: boolean;
  cropStatus: CropStatus;
  cropProgress: number;
  carrotsHarvestedToday: number;
  growRemainingMs: number;
}

export function toSnapshot(row: FarmRow, now = Date.now()): FarmSnapshot {
  const status = cropStatus(row, now);
  const remaining =
    status === "growing" && row.carrot_planted_at
      ? Math.max(0, GAME.carrotGrowMs - (now - row.carrot_planted_at))
      : 0;

  return {
    coins: row.coins,
    hasWarehouse: Boolean(row.has_warehouse),
    cropStatus: status,
    cropProgress: cropProgress(row, now),
    carrotsHarvestedToday: row.carrots_harvested_today,
    growRemainingMs: remaining,
  };
}
