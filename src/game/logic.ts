import type { FarmRow } from "../db/store.js";
import { cropById, CROPS } from "./crops.js";
import { GAME } from "./constants.js";

export { GAME } from "./constants.js";
export { CROPS, cropById } from "./crops.js";

export type CropStatus = "empty" | "growing" | "ready";

export function plotStatus(row: FarmRow, now = Date.now()): CropStatus {
  if (!row.planted_at || !row.planted_crop) return "empty";
  const crop = cropById(row.planted_crop);
  if (!crop) return "empty";
  return now - row.planted_at >= crop.growMs ? "ready" : "growing";
}

export function plotProgress(row: FarmRow, now = Date.now()): number {
  if (!row.planted_at || !row.planted_crop) return 0;
  const crop = cropById(row.planted_crop);
  if (!crop) return 0;
  return Math.min(1, (now - row.planted_at) / crop.growMs);
}

export function growRemainingMs(row: FarmRow, now = Date.now()): number {
  if (!row.planted_at || !row.planted_crop) return 0;
  const crop = cropById(row.planted_crop);
  if (!crop) return 0;
  return Math.max(0, crop.growMs - (now - row.planted_at));
}

export interface PlotSnapshot {
  cropId: string | null;
  cropName: string | null;
  emoji: string | null;
  status: CropStatus;
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

export function toSnapshot(row: FarmRow, now = Date.now()): FarmSnapshot {
  const crop = row.planted_crop ? cropById(row.planted_crop) : undefined;
  const status = plotStatus(row, now);

  return {
    coins: row.coins,
    hasWarehouse: Boolean(row.has_warehouse),
    plot: {
      cropId: row.planted_crop,
      cropName: crop?.name ?? null,
      emoji: crop?.emoji ?? null,
      status,
      progress: plotProgress(row, now),
      growRemainingMs: growRemainingMs(row, now),
    },
    inventory: { ...row.inventory },
    unlockedCrops: [...row.unlocked_crops],
    selectedCrop: row.selected_crop,
    harvestedToday: row.harvested_today,
  };
}

export function shopCatalog(row: FarmRow): ShopCropView[] {
  return Object.values(CROPS).map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    unlocked: row.unlocked_crops.includes(c.id),
    unlockPrice: c.unlockPrice,
    seedPrice: c.seedPrice,
    sellPrice: c.sellPrice,
    growSec: Math.round(c.growMs / 1000),
    inStock: row.inventory[c.id] ?? 0,
  }));
}
