import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export interface FarmRow {
  user_id: number;
  coins: number;
  has_warehouse: number;
  carrot_planted_at: number | null;
  carrots_harvested_today: number;
  last_daily_reset: string;
  referred_by: number | null;
  created_at: string;
}

interface DbFile {
  farms: Record<string, FarmRow>;
  referrals: Record<string, { referrer_id: number; referred_id: number }>;
}

export class JsonStore {
  private data: DbFile;
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    this.data = existsSync(path)
      ? (JSON.parse(readFileSync(path, "utf8")) as DbFile)
      : { farms: {}, referrals: {} };
  }

  save(): void {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), "utf8");
  }

  getFarm(userId: number): FarmRow | undefined {
    return this.data.farms[String(userId)];
  }

  setFarm(row: FarmRow): void {
    this.data.farms[String(row.user_id)] = row;
    this.save();
  }

  hasReferral(referredId: number): boolean {
    return Boolean(this.data.referrals[String(referredId)]);
  }

  addReferral(referrerId: number, referredId: number): void {
    if (this.hasReferral(referredId)) return;
    this.data.referrals[String(referredId)] = {
      referrer_id: referrerId,
      referred_id: referredId,
    };
    this.save();
  }

  listGrowingFarms(): { user_id: number; carrot_planted_at: number }[] {
    return Object.values(this.data.farms)
      .filter((f) => f.carrot_planted_at != null)
      .map((f) => ({
        user_id: f.user_id,
        carrot_planted_at: f.carrot_planted_at!,
      }));
  }
}

export function openStore(path: string): JsonStore {
  return new JsonStore(path);
}
