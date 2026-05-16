import type { FarmRow } from "../db/store.js";
import type { JsonStore } from "../db/store.js";
import { GAME } from "./logic.js";

export class FarmRepository {
  constructor(private readonly store: JsonStore) {}

  get(userId: number): FarmRow | undefined {
    return this.store.getFarm(userId);
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
    row = {
      user_id: userId,
      coins: GAME.starterCoins + bonus,
      has_warehouse: 0,
      carrot_planted_at: null,
      carrots_harvested_today: 0,
      last_daily_reset: today,
      referred_by: options?.referrerId ?? null,
      created_at: new Date().toISOString(),
    };
    this.store.setFarm(row);

    if (options?.referrerId) {
      this.store.addReferral(options.referrerId, userId);
    }

    return row;
  }

  private maybeResetDaily(row: FarmRow): void {
    const today = new Date().toISOString().slice(0, 10);
    if (row.last_daily_reset === today) return;
    row.carrots_harvested_today = 0;
    row.last_daily_reset = today;
    this.store.setFarm(row);
  }

  buildWarehouse(userId: number): { ok: true; row: FarmRow } | { ok: false; error: string } {
    const row = this.ensure(userId);
    if (row.has_warehouse) return { ok: false, error: "warehouse_exists" };
    if (row.coins < GAME.warehouseCost) return { ok: false, error: "insufficient_coins" };

    row.coins -= GAME.warehouseCost;
    row.has_warehouse = 1;
    this.store.setFarm(row);
    return { ok: true, row };
  }

  plantCarrot(userId: number): { ok: true; row: FarmRow } | { ok: false; error: string } {
    const row = this.ensure(userId);
    if (row.carrot_planted_at) {
      const elapsed = Date.now() - row.carrot_planted_at;
      if (elapsed < GAME.carrotGrowMs) {
        return { ok: false, error: "crop_growing" };
      }
    }

    row.carrot_planted_at = Date.now();
    this.store.setFarm(row);
    return { ok: true, row };
  }

  harvest(userId: number): { ok: true; row: FarmRow; reward: number } | { ok: false; error: string } {
    const row = this.ensure(userId);
    if (!row.carrot_planted_at) return { ok: false, error: "nothing_planted" };

    const elapsed = Date.now() - row.carrot_planted_at;
    if (elapsed < GAME.carrotGrowMs) return { ok: false, error: "not_ready" };

    const reward = GAME.carrotReward + (row.has_warehouse ? GAME.warehouseBonus : 0);
    row.coins += reward;
    row.carrot_planted_at = null;
    row.carrots_harvested_today += 1;
    this.store.setFarm(row);

    return { ok: true, row, reward };
  }

  parseReferrerFromStartParam(startParam?: string): number | undefined {
    if (!startParam) return undefined;
    const match = /^friend(\d+)$/i.exec(startParam);
    if (!match) return undefined;
    const id = Number(match[1]);
    return Number.isFinite(id) ? id : undefined;
  }
}
