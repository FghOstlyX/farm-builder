import type { FarmRow } from "../db/store.js";
import type { JsonStore } from "../db/store.js";
import { cropById, STARTER_CROPS } from "./crops.js";
import { GAME } from "./constants.js";
import { growRemainingMs, plotStatus } from "./logic.js";

function migrateRow(row: FarmRow): FarmRow {
  if (!row.inventory) row.inventory = {};
  if (!row.unlocked_crops?.length) {
    row.unlocked_crops = [...STARTER_CROPS];
  }
  if (!row.selected_crop) row.selected_crop = "carrot";
  if (row.harvested_today == null) {
    row.harvested_today = (row as { carrots_harvested_today?: number }).carrots_harvested_today ?? 0;
  }
  if (row.carrot_planted_at && !row.planted_at) {
    row.planted_at = row.carrot_planted_at;
    row.planted_crop = row.planted_crop ?? "carrot";
    delete row.carrot_planted_at;
  }
  return row;
}

export class FarmRepository {
  constructor(private readonly store: JsonStore) {}

  get(userId: number): FarmRow | undefined {
    const row = this.store.getFarm(userId);
    return row ? migrateRow(row) : undefined;
  }

  private save(row: FarmRow): FarmRow {
    const next = migrateRow(row);
    this.store.setFarm(next);
    return next;
  }

  ensure(
    userId: number,
    options?: { referrerId?: number; referralBonus?: number },
  ): FarmRow {
    let row = this.get(userId);
    if (row) {
      this.maybeResetDaily(row);
      return this.get(userId)!;
    }

    const bonus = options?.referrerId ? (options.referralBonus ?? 0) : 0;
    const today = new Date().toISOString().slice(0, 10);
    row = migrateRow({
      user_id: userId,
      coins: GAME.starterCoins + bonus,
      has_warehouse: 0,
      planted_crop: null,
      planted_at: null,
      inventory: {},
      unlocked_crops: [...STARTER_CROPS],
      selected_crop: "carrot",
      harvested_today: 0,
      last_daily_reset: today,
      referred_by: options?.referrerId ?? null,
      created_at: new Date().toISOString(),
    });
    this.store.setFarm(row);

    if (options?.referrerId) {
      this.store.addReferral(options.referrerId, userId);
    }

    return row;
  }

  private maybeResetDaily(row: FarmRow): void {
    const today = new Date().toISOString().slice(0, 10);
    if (row.last_daily_reset === today) return;
    row.harvested_today = 0;
    row.last_daily_reset = today;
    this.save(row);
  }

  selectCrop(userId: number, cropId: string): { ok: true; row: FarmRow } | { ok: false; error: string } {
    const row = this.ensure(userId);
    const crop = cropById(cropId);
    if (!crop) return { ok: false, error: "unknown_crop" };
    if (!row.unlocked_crops.includes(cropId)) return { ok: false, error: "crop_locked" };
    row.selected_crop = cropId;
    return { ok: true, row: this.save(row) };
  }

  buildWarehouse(userId: number): { ok: true; row: FarmRow } | { ok: false; error: string } {
    const row = this.ensure(userId);
    if (row.has_warehouse) return { ok: false, error: "warehouse_exists" };
    if (row.coins < GAME.warehouseCost) return { ok: false, error: "insufficient_coins" };
    row.coins -= GAME.warehouseCost;
    row.has_warehouse = 1;
    return { ok: true, row: this.save(row) };
  }

  plant(userId: number, cropId?: string): { ok: true; row: FarmRow } | { ok: false; error: string } {
    const row = this.ensure(userId);
    const id = cropId ?? row.selected_crop;
    const crop = cropById(id);
    if (!crop) return { ok: false, error: "unknown_crop" };
    if (!row.unlocked_crops.includes(id)) return { ok: false, error: "crop_locked" };

    const status = plotStatus(row);
    if (status === "growing") return { ok: false, error: "crop_growing" };
    if (status === "ready") return { ok: false, error: "harvest_first" };
    if (row.coins < crop.seedPrice) return { ok: false, error: "insufficient_coins" };

    row.coins -= crop.seedPrice;
    row.planted_crop = id;
    row.planted_at = Date.now();
    row.selected_crop = id;
    return { ok: true, row: this.save(row) };
  }

  harvest(userId: number): { ok: true; row: FarmRow; amount: number; cropId: string } | { ok: false; error: string } {
    const row = this.ensure(userId);
    if (!row.planted_at || !row.planted_crop) return { ok: false, error: "nothing_planted" };
    if (plotStatus(row) !== "ready") return { ok: false, error: "not_ready" };

    const crop = cropById(row.planted_crop)!;
    const bonus = row.has_warehouse ? GAME.warehouseBonus : 0;
    const coins = crop.harvestCoins + bonus;

    row.coins += coins;
    row.inventory[crop.id] = (row.inventory[crop.id] ?? 0) + 1;
    row.harvested_today += 1;
    const cropId = row.planted_crop;
    row.planted_crop = null;
    row.planted_at = null;

    return { ok: true, row: this.save(row), amount: 1, cropId };
  }

  unlockCrop(userId: number, cropId: string): { ok: true; row: FarmRow } | { ok: false; error: string } {
    const row = this.ensure(userId);
    const crop = cropById(cropId);
    if (!crop) return { ok: false, error: "unknown_crop" };
    if (row.unlocked_crops.includes(cropId)) return { ok: false, error: "already_unlocked" };
    if (row.coins < crop.unlockPrice) return { ok: false, error: "insufficient_coins" };
    row.coins -= crop.unlockPrice;
    row.unlocked_crops.push(cropId);
    return { ok: true, row: this.save(row) };
  }

  sellCrop(userId: number, cropId: string, qty = 1): { ok: true; row: FarmRow; earned: number } | { ok: false; error: string } {
    const row = this.ensure(userId);
    const crop = cropById(cropId);
    if (!crop) return { ok: false, error: "unknown_crop" };
    const have = row.inventory[cropId] ?? 0;
    if (have < qty) return { ok: false, error: "not_enough_stock" };
    const earned = crop.sellPrice * qty;
    row.inventory[cropId] = have - qty;
    row.coins += earned;
    return { ok: true, row: this.save(row), earned };
  }

  parseReferrerFromStartParam(startParam?: string): number | undefined {
    if (!startParam) return undefined;
    const match = /^friend(\d+)$/i.exec(startParam);
    if (!match) return undefined;
    const id = Number(match[1]);
    return Number.isFinite(id) ? id : undefined;
  }

  isReadyForNotify(row: FarmRow, now = Date.now()): boolean {
    if (!row.planted_at || !row.planted_crop) return false;
    return growRemainingMs(row, now) <= 0;
  }
}
