import type { Bot } from "grammy";
import type { JsonStore } from "../db/store.js";
import { GAME } from "../game/logic.js";
import { notifyHarvestReady } from "../telegram/bot.js";

const notified = new Set<string>();

/** MVP: poll store and ping users when carrots are ready */
export function startHarvestNotifier(bot: Bot, store: JsonStore): void {
  const intervalMs = 15_000;

  setInterval(() => {
    const rows = store.listGrowingFarms();
    const now = Date.now();

    for (const row of rows) {
      const elapsed = now - row.carrot_planted_at;
      if (elapsed < GAME.carrotGrowMs) continue;

      const key = `${row.user_id}:${row.carrot_planted_at}`;
      if (notified.has(key)) continue;
      notified.add(key);

      notifyHarvestReady(bot, row.user_id).catch((err) => {
        console.warn(`Harvest notify failed for ${row.user_id}:`, err);
        notified.delete(key);
      });
    }

    if (notified.size > 10_000) notified.clear();
  }, intervalMs);
}
